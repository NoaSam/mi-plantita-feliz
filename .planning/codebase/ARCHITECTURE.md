# Architecture

**Analysis Date:** 2026-04-22

## Pattern Overview

**Overall:** Client-server architecture with React frontend, Supabase backend, and edge functions for AI integration.

**Key Characteristics:**
- Mobile-first React SPA with client-side state management for plant identification flow
- Supabase edge function (`identify-plant`) handles multi-model AI consensus for plant analysis
- Hybrid data persistence: localStorage for anonymous users, Supabase for authenticated users
- Progressive authentication flow supporting anonymous searches that convert to authenticated
- Analytics instrumentation (PostHog) with cookie consent gating

## Layers

**Presentation Layer:**
- Purpose: Render UI and handle user interactions
- Location: `src/components/`, `src/pages/`
- Contains: React components (UI primitives from shadcn, feature components, page views)
- Depends on: Custom hooks, services, lib utilities
- Used by: React Router for page routing

**State Management Layer:**
- Purpose: Manage application state (auth, plant history, plant identification results)
- Location: `src/contexts/AuthContext.tsx`, custom hooks (`src/hooks/`)
- Contains: AuthContext provider, hooks like `usePlantIdentifier`, `usePlantHistory`, `useGeolocation`
- Depends on: Supabase client, localStorage for anonymous data
- Used by: Presentation components

**Service Layer:**
- Purpose: Business logic and API communication
- Location: `src/services/`, `src/lib/`
- Contains: `auth.service.ts` (sign in/up/anonymous claim), tracking (`track.ts`), utilities (`anonymous-id.ts`, `geo-permission.ts`, `platform.ts`)
- Depends on: Supabase client, PostHog
- Used by: Hooks and AuthContext

**Integration Layer:**
- Purpose: External service communication
- Location: `src/integrations/supabase/`
- Contains: Supabase client initialization, generated TypeScript types
- Depends on: @supabase/supabase-js
- Used by: Services and hooks

**Backend/Edge Functions:**
- Purpose: Server-side plant identification AI coordination
- Location: `supabase/functions/identify-plant/`
- Contains: Multi-model AI calls (Claude, Gemini, GPT-4o), consensus computation, database writes
- Depends on: Anthropic, Google Generative AI, OpenAI APIs; Supabase admin client
- Used by: Frontend via `supabase.functions.invoke()`

## Data Flow

**Plant Identification Flow:**

1. User captures or selects image via `PhotoCapture` component
2. Location permission check (`useGeolocation`) → user may accept/decline location sharing
3. `usePlantIdentifier.identify()` invokes `supabase.functions.invoke("identify-plant")`
4. Edge function:
   - Calls Claude, Gemini, and GPT-4o in parallel with base64-encoded image
   - Parses JSON responses for plant info (name, care, diagnosis, description)
   - Computes consensus across models to determine winner
   - Inserts winner result into `plant_searches` table
   - Inserts evaluation metadata into `model_evaluations` table for 3 models
   - Returns winning plant info + model metadata to client
5. Frontend stores result in component state → `PlantResultView` renders result
6. For authenticated users: data persists in Supabase via edge function
7. For anonymous users: result added to localStorage `plant-history` key

**User Authentication Flow:**

1. User enters email/password on login/signup form
2. `signIn()` or `signUp()` called from `src/services/auth.service.ts`
3. Supabase auth updates session, triggers `onAuthStateChange` in `AuthContext`
4. On sign-in, `claimAnonymousSearches()` runs to move localStorage searches to user account
5. `useAuth()` hook provides `user`, `session`, `isLoading` to consumers
6. Protected routes wrapped in `RequireAuth` component

**History Retrieval:**

- Authenticated users: `usePlantHistory` fetches from `plant_searches` table ordered by date
- Anonymous users: `usePlantHistory` reads from localStorage `plant-history` key
- History displayed in `History.tsx` with filtering by name and month

**State Management:**

- Global auth state: React Context (`AuthContext`) — user, session, loading, emailVerified flags
- Plant identification state: Component-level (`usePlantIdentifier`) — isLoading, result, error
- History state: Component-level (`usePlantHistory`) — history array, isLoading, deletePlants callback
- Location permissions: localStorage key `geo_permission_consent` — tracks user acceptance decision
- Anonymous ID: localStorage key `anonymous_id` — UUID for anonymous user tracking
- Cookie consent: localStorage key `cookie_consent_analytics` — controls PostHog initialization

## Key Abstractions

**PlantResult:**
- Purpose: Represents a single plant identification result
- Examples: `src/hooks/use-plant-identifier.ts`, `src/hooks/use-plant-history.ts`
- Pattern: TypeScript interface defining id, name, description, care, diagnosis, imageUrl, date, model
- Used throughout app for type-safe plant data handling

**useAuth Hook:**
- Purpose: Expose auth context value to components without Context.useContext boilerplate
- Examples: `src/hooks/use-auth.ts`
- Pattern: Custom hook wrapping `useContext(AuthContext)` with undefined check
- Used by: Any component needing auth state

**usePlantIdentifier Hook:**
- Purpose: Encapsulate plant identification logic (image compression, API call, error handling, tracking)
- Examples: `src/hooks/use-plant-identifier.ts`
- Pattern: Custom hook with callback-based `identify()` function, returns isLoading/result/error state
- Used by: Index page for plant search flow

**Edge Function Consensus:**
- Purpose: Coordinate three AI models, compute agreement on plant identification
- Examples: `supabase/functions/identify-plant/consensus.ts` (computeConsensus, extractScientificName)
- Pattern: Runs all models in parallel, compares scientific names, picks winner based on consensus + speed
- Reduces hallucinations via multi-model voting

**Anonymous-to-Authenticated Migration:**
- Purpose: Move anonymous user searches to account when user logs in
- Examples: `src/lib/anonymous-id.ts`, `src/services/auth.service.ts` (claimAnonymousSearches)
- Pattern: anonymous_id tracked in localStorage; on sign-in, RPC call `claim_anonymous_searches()` updates rows in DB
- Ensures seamless UX for users who try app, then create account

## Entry Points

**Web Entry (`src/main.tsx`):**
- Location: `src/main.tsx`
- Triggers: Browser loads app
- Responsibilities: Initialize PostHog (if analytics consent granted), register service worker for PWA, render React root

**App Root (`src/App.tsx`):**
- Location: `src/App.tsx`
- Triggers: After React root render
- Responsibilities: Set up routing via BrowserRouter, wrap pages in AuthProvider and TooltipProvider, define routes (/,/mis-plantas, /ajustes, legal pages), render cookie banner

**Page Routes:**
- `Index` (`src/pages/Index.tsx`): Main plant identification page — PhotoCapture + result view
- `History` (`src/pages/History.tsx`): Authenticated plant history with search/filter/delete
- `Settings` (`src/pages/Settings.tsx`): User settings (logout, email change, etc.)
- Legal pages (`src/pages/legal/`): Privacy, cookies, terms, legal notice

## Error Handling

**Strategy:** Try-catch with user-friendly error messages, non-blocking failures where possible.

**Patterns:**
- API errors normalized to Spanish messages via `ERROR_MAP` in `auth.service.ts`
- Plant identification errors caught in `usePlantIdentifier.identify()` — show error banner in Index page
- Edge function AI call failures: attempt all 3 models, return success flag + error message for each
- Model evaluation DB write failures: non-fatal (user still sees result), logged to console
- Supabase query errors logged, returned as empty state (e.g., empty history) rather than crash
- PostHog failures silently ignored (analytics non-critical)

## Cross-Cutting Concerns

**Logging:**
- Client-side: console.error/warn for auth errors, edge function errors, hook failures
- Edge function: console.error for API calls, DB operations
- No centralized logging service; relies on browser DevTools and Deno logs

**Validation:**
- Image validation: file type check (must be image/*), size check (≤10MB) in `usePlantIdentifier`
- Form validation: zod + react-hook-form (imported but usage in AuthForms component)
- Location data validation: geolocation coords checked for valid lat/lng ranges in edge function

**Authentication:**
- Supabase Auth handles session persistence via localStorage
- AuthContext tracks auth state and provides to app
- RequireAuth wrapper redirects unauthenticated users
- Anonymous users tracked via anonymous_id in localStorage

**Analytics:**
- PostHog initialized on app start if user granted cookie consent
- Key events tracked: plant_identified, plant_identification_failed, search_completed, user_signed_in/up, plants_deleted
- Event properties include metadata (plant_name, models used, consensus_reached, has_location, error messages)
- Analytics consent checked via `isAnalyticsAllowed()` hook before tracking
