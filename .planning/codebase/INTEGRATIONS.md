# External Integrations

**Analysis Date:** 2026-04-22

## APIs & External Services

**Plant Identification (Multi-Model):**
- Claude 3.5 Sonnet (Anthropic) - Image analysis for plant identification
  - SDK/Client: Native fetch to `https://api.anthropic.com/v1/messages`
  - Auth: `ANTHROPIC_API_KEY` (server-side, in Edge Function env)
  - Model: `claude-sonnet-4-20250514`
  - Max tokens: 2048

- Gemini 2.5 Flash Lite (Google) - Image analysis fallback
  - SDK/Client: Native fetch to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`
  - Auth: `GEMINI_API_KEY` (server-side, in Edge Function env)
  - Max tokens: 2048

- GPT-4o (OpenAI) - Image analysis fallback
  - SDK/Client: Native fetch to `https://api.openai.com/v1/chat/completions`
  - Auth: `OPENAI_API_KEY` (server-side, in Edge Function env)
  - Model: `gpt-4o`
  - Max tokens: 2048

**Note:** All three models are called in parallel. Consensus voting determines the winning result. See `supabase/functions/identify-plant/consensus.ts` and `supabase/functions/identify-plant/index.ts` for consensus logic.

## Data Storage

**Databases:**
- Supabase PostgreSQL - Primary database
  - Connection: Via `@supabase/supabase-js` client
  - Client: `src/integrations/supabase/client.ts`
  - Auth keys: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (client)
  - Server key: `SUPABASE_SERVICE_ROLE_KEY` (Edge Functions only)

**Tables:**
- `auth.users` - Supabase Auth users (managed by Supabase)
- `public.profiles` - User profile metadata
  - Columns: `id` (UUID, PK, FK to auth.users), `created_at`
- `public.plant_searches` - Plant identification search history
  - Columns: `id`, `user_id` (FK), `anonymous_id`, `name`, `description`, `care`, `diagnosis`, `image_url`, `model`, `lat`, `lng`, `created_at`
  - RLS enabled: Users can only access their own searches
- `public.model_evaluations` - Multi-model evaluation records
  - Columns: `id`, `plant_search_id` (FK), `model`, `raw_name`, `scientific_name`, `description`, `care`, `diagnosis`, `response_ms`, `success`, `error_message`, `is_winner`, `consensus_group`, `consensus_match_level`, `created_at`

**File Storage:**
- Supabase Storage - Plant photos stored as base64 in `image_url` field of `plant_searches` table
  - Currently stored inline as data URLs (base64 encoded JPEG)
  - Max size limit: 10 MB per image (enforced client-side in `src/hooks/use-plant-identifier.ts`)
  - Images compressed before sending: max width 400px, quality 0.7 JPEG

**Caching:**
- Browser localStorage - Anonymous search history
  - Key: `plant-history` - Stores up to 20 most recent searches as JSON array
  - Client-side only, migrated to Supabase on sign-in via `claimAnonymousSearches()`
- No server-side caching (Supabase Edge Functions are stateless)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (email/password)
  - Implementation: `src/services/auth.service.ts`
  - Session storage: Browser localStorage with auto-refresh
  - Email confirmation: Redirect to `/mis-plantas?email_confirmed=true`

**Anonymous Identity:**
- Anonymous ID generation via `src/lib/anonymous-id.ts`
  - UUID v4 stored in localStorage for non-logged-in users
  - Searches linked to `anonymous_id` before sign-in
  - Claimed via `claim_anonymous_searches()` RPC function on sign-in

## Monitoring & Observability

**Analytics:**
- PostHog - Product analytics and event tracking
  - SDK: `posthog-js 1.365.0`
  - Initialization: `src/lib/track.ts`
  - Key: `phc_p3FGSVLkKb7iQPUb5cyVQ2BCWfs2o488wzdofj4tZDsh`
  - API host: `https://eu.i.posthog.com`
  - Opt-in: Only initialized if user grants consent via `isAnalyticsAllowed()`
  - Disabled on localhost

**Error Tracking:**
- Console logging only (no external error tracking service)
- Errors logged in Edge Function: `supabase/functions/identify-plant/index.ts`

**Logs:**
- Supabase Edge Function logs (accessible via Supabase dashboard)
- Browser console logs (development only)

## CI/CD & Deployment

**Hosting:**
- Vercel - Frontend deployment
  - Build command: `npm run build`
  - Output directory: `dist/`
  - Config: `vercel.json`

**CI Pipeline:**
- None detected (GitHub Actions not configured)
- Playwright E2E tests run locally before deployment (manual)

**Deployment Configuration:**
- Rewrites in `vercel.json` for PostHog proxy (EU instance) and SPA routing

## Environment Configuration

**Required env vars (Frontend):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase publishable API key

**Required env vars (Backend/Edge Functions):**
- `SUPABASE_URL` - Supabase project URL (for service role client)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (bypasses RLS)
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude
- `GEMINI_API_KEY` - Google Gemini API key
- `OPENAI_API_KEY` - OpenAI API key

**Secrets location:**
- Frontend: `.env` file (Vite loads via `import.meta.env`)
- Backend: Supabase project secrets (accessed via `Deno.env.get()`)
- All secrets gitignored (never committed)

## Webhooks & Callbacks

**Incoming:**
- Email confirmation callback: User redirected to `/mis-plantas?email_confirmed=true` after email verification

**Outgoing:**
- None detected

## Data Flow

**Plant Identification Request:**

1. User selects image (camera or gallery input)
2. Frontend (`src/hooks/use-plant-identifier.ts`) compresses image to base64
3. Calls Supabase Edge Function: `identify-plant` with request body:
   ```json
   {
     "image": "data:image/jpeg;base64,...",
     "user_id": "uuid (if logged in)" OR
     "anonymous_id": "uuid (if not logged in)",
     "lat": number (optional),
     "lng": number (optional)
   }
   ```
4. Edge Function (`supabase/functions/identify-plant/index.ts`):
   - Calls Claude, Gemini, GPT-4o in parallel
   - Computes consensus from 3 model results
   - Selects winning model (consensus winner or fastest)
   - Writes `plant_searches` row with winning result
   - Writes `model_evaluations` rows (one per model, includes consensus data)
   - Returns result to frontend

5. Frontend stores result in:
   - React state (display)
   - localStorage (if anonymous, for history page)
   - Supabase (automatic via edge function)

**Analytics Flow:**

1. `track()` calls in UI code and services
2. PostHog initialized on app load (consent-dependent)
3. Events sent to `https://eu.i.posthog.com`
4. Vercel rewrites `/ingest/*` to EU PostHog instance for privacy

## Rate Limiting

**Claude API:**
- Rate limit: 429 error handled specially
- Error message to user: "Demasiadas consultas. Espera un momento y vuelve a intentarlo."

**Gemini API:**
- Rate limit: 429 error handled in parallel call

**OpenAI API:**
- Rate limit: 429 error handled in parallel call

---

*Integration audit: 2026-04-22*
