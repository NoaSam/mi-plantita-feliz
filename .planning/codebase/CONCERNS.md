# Codebase Concerns

**Analysis Date:** 2026-04-22

## Tech Debt

**Type-unsafe mocking in auth service tests:**
- Issue: Test file `src/services/auth.service.test.ts` uses `as any` casts in 13 places for Supabase client mocks, bypassing type checking
- Files: `src/services/auth.service.test.ts` (lines 38, 50, 62, 73, 87, 99, 110, 121)
- Impact: Makes refactoring auth logic unsafe; test changes won't catch breaking changes to service signatures
- Fix approach: Create proper typed mock factory or use `vitest.mocked()` helper for stricter type safety; validate against actual Supabase types from `@supabase/supabase-js`

**Inconsistent error handling in async operations:**
- Issue: Error handlers silently swallow exceptions in critical paths without logging or user feedback
- Files: `src/lib/anonymous-id.ts` (lines 24, 30 - localStorage failures ignored), `src/hooks/use-plant-history.ts` (line 38 - fetch errors logged but not propagated)
- Impact: Users may lose anonymous ID or plant history without knowing; makes debugging production issues harder
- Fix approach: Add structured error reporting; distinguish between transient (localStorage quota) and permanent (DB) failures; expose granular error states to UI

**Base64 image storage in localStorage and database:**
- Issue: Full uncompressed base64 images stored in both localStorage (for anonymous users) and database (in `plant_searches.image_url` column), consuming excessive storage and network bandwidth
- Files: `src/hooks/use-plant-identifier.ts` (lines 114, 126 - localStorage write), `supabase/functions/identify-plant/index.ts` (line 346 - image_url stored directly)
- Impact: Degraded performance on mobile with limited storage/bandwidth; localStorage full quota errors; expensive database storage; slower history page load times
- Fix approach: Move images to Supabase Storage; store only public signed URLs in database; implement storage cleanup policy for old searches

**Untyped response parsing from edge function:**
- Issue: Edge function response handling (lines 88-94 in `use-plant-identifier.ts`) attempts JSON.parse on strings without schema validation; `as any` cast used
- Files: `src/hooks/use-plant-identifier.ts` (lines 88-94)
- Impact: Silent data corruption if API response format changes; string/object type confusion can cause runtime errors
- Fix approach: Define strict TypeScript interface for edge function response; use runtime validation with Zod/io-ts before casting; add response shape tests

## Known Bugs

**Anonymous search history not preserved on signup:**
- Symptoms: When anonymous user creates an account, their prior searches disappear; only new searches after login appear
- Files: `src/hooks/use-plant-history.ts` (reads from localStorage if no user), `src/services/auth.service.ts` (claimAnonymousSearches RPC call)
- Trigger: (1) Visit as anonymous, identify plant, (2) Sign up with email, (3) Verify email and login, (4) Go to history
- Workaround: Search is still in localStorage until user clears browser storage; can be manually recovered by checking localStorage in DevTools
- Impact: Lost user history is frustrating; claimAnonymousSearches RPC exists but only called in specific auth flow, not consistently

**Consensus algorithm can return no winner with 2+ failed models:**
- Symptoms: If all models fail to parse JSON or hit rate limits, response is 500 with generic error; user sees "could not identify plant" even if consensus was attempted
- Files: `supabase/functions/identify-plant/index.ts` (lines 323-336 - fallback when !winner)
- Trigger: Rate limit hit on all 3 AI models simultaneously, OR all models return invalid JSON
- Impact: Unclear error messaging; no distinction between "AI overloaded" vs "image not a plant"
- Fix approach: Return more granular error codes; expose individual model failures in response; retry logic on client

**Image compression can fail silently:**
- Symptoms: If canvas.toDataURL() throws or returns empty string during compression, the error is caught but original uncompressed image still sent
- Files: `src/hooks/use-plant-identifier.ts` (lines 25-48 - compressImage promise)
- Trigger: Very large images (8MP+) on low-memory devices; canvas context creation fails
- Impact: May send 5MB+ base64 strings to edge function, causing request timeout or quota issues
- Fix approach: Return explicit compression error to caller; skip compression and warn user rather than send huge image

## Security Considerations

**Database stores full base64 images without size limits:**
- Risk: Malicious or accidental huge image uploads can exhaust storage quota and degrade performance for all users; DDoS vector
- Files: `supabase/functions/identify-plant/index.ts` (line 346 - image stored as is)
- Current mitigation: Client-side 10MB validation (easy to bypass); no server-side size check or quarantine
- Recommendations: (1) Add Supabase Storage bucket for images with size/type policy, (2) Server-side size validation before DB insert, (3) Implement rate limiting per user_id/anonymous_id on `/identify-plant` function, (4) Add periodic cleanup of images older than 90 days

**Anonymous ID spoofing allows history takeover:**
- Risk: Any user can guess or reuse another user's anonymous_id and claim their plant searches via `claim_anonymous_searches` RPC
- Files: `src/lib/anonymous-id.ts` (uses crypto.randomUUID which is secure), `src/services/auth.service.ts` (line 22-23 calls claim_anonymous_searches without rate limiting)
- Current mitigation: UUID is cryptographically random (good), but no server-side validation that anonymous_id belongs to session
- Recommendations: (1) Add anonymous_id to session cookie with HttpOnly flag, (2) Server-side RPC must validate anonymous_id matches session cookie, (3) Add rate limiting (1 claim per anonymous_id, max 10/hour per IP)

**User authentication state persists in localStorage:**
- Risk: If device is shared, any app with access to localStorage can read auth tokens and impersonate user
- Files: `src/integrations/supabase/client.ts` (line 13 - storage: localStorage)
- Current mitigation: Supabase handles session refresh and expiration
- Recommendations: (1) Use SessionStorage instead of localStorage (expires when browser closes), (2) Add warning on login about shared device security, (3) Implement logout on tab visibility change, (4) Consider biometric lock for PWA

**API keys exposed in edge function code:**
- Risk: ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY are accessed from Deno.env but not validated for presence before use
- Files: `supabase/functions/identify-plant/index.ts` (lines 74, 118, 157 - env checks)
- Current mitigation: Supabase secrets are not committed; edge function runs server-side
- Recommendations: (1) Add .env validation schema at function startup, (2) Implement API key rotation schedule, (3) Add request signing to prevent direct invocation from other services, (4) Log all API calls for audit trail

## Performance Bottlenecks

**Serial model calls instead of parallel consensus:**
- Problem: Even though Promise.all() is used (line 305), edge function waits for all 3 models sequentially within callModelTimed; consensus is only useful if all models respond
- Files: `supabase/functions/identify-plant/index.ts` (lines 247-280, 305-309)
- Cause: Edge function has a hard timeout (~60s for Supabase Free tier); calling Claude (4s) + Gemini (3s) + OpenAI (3s) = ~10s baseline, but if one model is slow, others are blocked
- Improvement path: (1) Implement timeout per model (5-8s), (2) Return result from fastest 2 models if 1 is slow, (3) Cache previous identifications for duplicate images to skip API calls

**Full plant history loaded on every page visit:**
- Problem: History page fetches all plant_searches for user without pagination; renders entire list even if user only views first few
- Files: `src/hooks/use-plant-history.ts` (lines 28-33 - no limit/offset in query)
- Cause: Supabase query `.select("*")` with no `.limit()`
- Improvement path: (1) Add pagination with `.limit(50)` and `.offset()`, (2) Implement lazy loading as user scrolls, (3) Add computed "view count" and "popular searches" to avoid full table scan

**Image re-compression on every identify call:**
- Problem: compressImage runs canvas operations even if image is already under 100KB; wastes CPU on mobile
- Files: `src/hooks/use-plant-identifier.ts` (lines 20-48)
- Cause: No size check before attempting compression; always compresses to quality 0.7
- Improvement path: (1) Skip compression if fileSize < 200KB, (2) Adaptive quality based on device capabilities, (3) Lazy compression only when edge function reports image too large

## Fragile Areas

**Consensus algorithm depends on name parsing heuristics:**
- Files: `supabase/functions/identify-plant/consensus.ts` (lines 30-53 extraction, 65-73 normalization)
- Why fragile: If AI model changes response format (e.g., returns "Pothos - Epipremnum aureum" instead of "Pothos (Epipremnum aureum)"), consensus breaks silently and all searches marked no_consensus
- Safe modification: (1) Add comprehensive test suite for edge cases (cultivars, hybrids, non-binomial names), (2) Add consensus telemetry to product analytics to detect format drift, (3) Add fallback name extraction from description text if parentheses format fails
- Test coverage: `src/test/consensus.test.ts` covers main paths but missing edge cases like multiple cultivars, Unicode genus names

**Edge function response parsing is brittle:**
- Files: `supabase/functions/identify-plant/index.ts` (lines 402-414 response construction)
- Why fragile: Response structure is inferred from ad-hoc field selection; no schema validation that required fields exist
- Safe modification: (1) Define explicit TypeScript interface for response, (2) Use `as const` for response keys, (3) Add runtime validation before returning to client
- Test coverage: No tests for edge function; only client-side hook tests

**Plant history query doesn't handle deleted records:**
- Files: `src/hooks/use-plant-history.ts` (lines 28-33)
- Why fragile: If RLS policy allows other users' deletes or stale cache exists, history shows ghost entries
- Safe modification: (1) Add created_at >= NOW() - interval 90 days to prevent stale data, (2) Implement optimistic delete with rollback, (3) Add conflict detection on concurrent deletes
- Test coverage: No tests for concurrent delete scenarios

## Scaling Limits

**Consensus evaluation stored per model per search:**
- Current capacity: At 100 searches/day, 3 models per search = 300 model_evaluations/day; 1 year = 110K rows
- Limit: Supabase Free tier has 1M rows per table; 9+ years before quota; will become expensive at production scale
- Impact: Query performance degrades; need archival strategy
- Scaling path: (1) Partition model_evaluations by year/month, (2) Archive old evaluations to cold storage after 6 months, (3) Add aggregated daily summary table instead of storing all evals

**Anonymous searches stored without cleanup:**
- Current capacity: No limit on anonymous_id rows; localStorage full when 50+ searches per user
- Limit: localStorage ~5-10MB per origin; Supabase Free tier 1M rows
- Impact: Slow history page; localStorage quota errors prevent new searches
- Scaling path: (1) Implement 20-search limit for anonymous users (clip history after signup), (2) Add 90-day expiration for anonymous searches in DB, (3) Encourage signup to keep more history

**Image blob column unsuitable for large scale:**
- Current capacity: 1MB avg image × 100/day = 3GB/month
- Limit: Supabase Free 5GB total storage; Production tiers can handle 100GB+ but costs scale linearly
- Impact: Expensive storage; slow API responses; backup bloat
- Scaling path: (1) Migrate to Supabase Storage (cheaper, CDN-backed), (2) Delete image_url from plant_searches, store only signed URLs, (3) Implement 30-day image expiration

## Dependencies at Risk

**Supabase Auth to email provider integration:**
- Risk: Email delivery failures (provider downtime, rate limits) block signup flow completely; no fallback
- Impact: Users cannot verify email, cannot claim anonymous searches, stuck in pending state
- Migration plan: (1) Implement SMS OTP as fallback verification method, (2) Add manual verification code display in UI, (3) Extend email token lifetime from 24h to 72h for reliability

**Multiple AI model providers (Claude, Gemini, OpenAI):**
- Risk: Code is tightly coupled to 3 providers; adding new provider requires careful consensus refactoring
- Impact: Difficult to swap providers or add redundancy; vendor lock-in on API contracts
- Migration plan: (1) Extract common AI interface/adapter pattern, (2) Move prompt engineering to data layer (prompt_variants table), (3) Add provider abstraction for easier swaps

**React Router v6 with app structure:**
- Risk: Router is outdated; many projects moving to Vite + SSR frameworks; lazy routes not used
- Impact: Bundle size; no code splitting; poor lighthouse scores on slow networks
- Migration plan: (1) Evaluate TanStack Router v2 as drop-in replacement, (2) Implement lazy route loading with React.lazy(), (3) Consider Remix or Astro for next major refactor if SEO becomes priority

## Missing Critical Features

**No offline-first architecture despite PWA manifest:**
- Problem: Plant history requires network; edge function calls are not cached; app is unusable offline
- Blocks: Offline plant identification (users can't browse history when hiking), offline history browsing
- Gap: No service worker caching strategy; localStorage fallback only for anonymous users

**No image editing or cropping before identification:**
- Problem: User can't remove background or zoom to plant; blurry/cluttered photos get poor results
- Blocks: Users with cluttered home backgrounds, photos taken from distance
- Gap: No Canvas-based crop tool; would improve identification accuracy significantly

**No API rate limiting or quota tracking per user:**
- Problem: Power users or bots could exhaust API quotas; no usage dashboard
- Blocks: Per-user limits (e.g., 10 searches/day on free tier), metering for paid tier
- Gap: No quota_usage table; no endpoint to check remaining searches

**No plant care reminders or notifications:**
- Problem: Plant history is view-only; users don't get watering reminders
- Blocks: Freemium upsell (premium = notifications), habit-building features
- Gap: No notifications infrastructure; would require push notifications (WebPush API)

## Test Coverage Gaps

**Edge function not tested:**
- What's not tested: Model consensus logic runs in production; all 3 API integrations untested; error handling paths
- Files: `supabase/functions/identify-plant/index.ts` (entire file except consensus.ts)
- Risk: Silent failures in production; rate limit handling untested; malformed responses could crash client
- Priority: **High** - This is the core business logic

**Plant history deletion not tested:**
- What's not tested: Concurrent delete, UI state after delete, RLS policy enforcement
- Files: `src/hooks/use-plant-history.ts` (deletePlants function)
- Risk: Users can't delete their history safely; concurrent deletes could cause data corruption
- Priority: **High** - Core user-facing feature

**Authentication flow not end-to-end tested:**
- What's not tested: Signup → email confirmation → login → claim anonymous searches → history merge
- Files: `src/pages/LoginPage.tsx`, `src/services/auth.service.ts` (auth flow)
- Risk: Email verification bypass, anonymous history loss, session hijacking
- Priority: **High** - Security-critical

**Geolocation permission flow not tested:**
- What's not tested: Permission denial, accuracy degradation, privacy policy consent
- Files: `src/lib/geo-permission.ts` (has tests but incomplete)
- Risk: Users denied location may not understand why; privacy violations if location mishandled
- Priority: **Medium** - Privacy-related

---

*Concerns audit: 2026-04-22*
