# Codebase Structure

**Analysis Date:** 2026-04-22

## Directory Layout

```
mi-plantita-feliz/
├── src/                           # Frontend source code
│   ├── components/                # React components
│   │   ├── ui/                    # shadcn/ui primitives (Button, Dialog, Card, etc.)
│   │   ├── auth/                  # Auth-specific components (AuthForms, RequireAuth)
│   │   ├── PhotoCapture.tsx       # Camera/gallery input with location consent
│   │   ├── PlantResultView.tsx    # Result display with care/diagnosis
│   │   ├── BottomTabBar.tsx       # Mobile navigation tabs
│   │   ├── LoadingScreen.tsx      # Loading state animation
│   │   ├── LocationConsentModal.tsx # Geolocation permission dialog
│   │   ├── CookieConsentBanner.tsx # Cookie/analytics consent banner
│   │   └── LegalFooter.tsx        # Links to legal pages
│   ├── pages/                     # Page views
│   │   ├── Index.tsx              # Home/plant identification page
│   │   ├── History.tsx            # My plants history (auth-protected)
│   │   ├── Settings.tsx           # User settings
│   │   ├── NotFound.tsx           # 404 page
│   │   └── legal/                 # Legal page components
│   │       ├── PrivacyPolicy.tsx
│   │       ├── CookiePolicy.tsx
│   │       ├── TermsOfService.tsx
│   │       ├── LegalNotice.tsx
│   │       └── LegalPageLayout.tsx
│   ├── hooks/                     # Custom React hooks
│   │   ├── use-auth.ts            # AuthContext consumer
│   │   ├── use-plant-identifier.ts # Plant ID logic + AI call
│   │   ├── use-plant-history.ts   # Fetch/delete plant history
│   │   ├── use-geolocation.ts     # Browser geolocation API wrapper
│   │   ├── use-consent.ts         # Cookie consent state
│   │   └── use-toast.ts           # Toast notifications (shadcn)
│   ├── contexts/                  # React Context providers
│   │   └── AuthContext.tsx        # Global auth state
│   ├── services/                  # Business logic & API calls
│   │   ├── auth.service.ts        # signIn, signUp, claimAnonymousSearches
│   │   └── auth.service.test.ts   # Tests for auth service
│   ├── lib/                       # Utilities and helpers
│   │   ├── track.ts               # PostHog analytics wrapper
│   │   ├── anonymous-id.ts        # Anonymous user ID management
│   │   ├── geo-permission.ts      # Location permission tracking
│   │   ├── platform.ts            # Device detection (iOS/Android)
│   │   ├── utils.ts               # General utilities (cn, etc.)
│   │   ├── anonymous-id.test.ts
│   │   ├── geo-permission.test.ts
│   │   └── platform.test.ts
│   ├── layouts/                   # Layout wrappers
│   │   └── AppLayout.tsx          # Main app layout (BottomTabBar, LegalFooter)
│   ├── integrations/              # External service clients
│   │   └── supabase/
│   │       ├── client.ts          # Supabase client initialization
│   │       └── types.ts           # Generated TypeScript types from schema
│   ├── test/                      # Test configuration & helpers
│   │   ├── setup.ts               # Vitest setup (jsdom, testing library)
│   │   ├── example.test.ts
│   │   └── consensus.test.ts
│   ├── App.tsx                    # Root component (routing setup)
│   ├── main.tsx                   # React root render
│   └── index.css                  # Global Tailwind styles
│
├── supabase/                      # Supabase backend
│   ├── functions/                 # Edge functions (Deno runtime)
│   │   └── identify-plant/
│   │       ├── index.ts           # Multi-model AI coordination
│   │       └── consensus.ts       # Model consensus algorithm
│   └── migrations/                # Database schema migrations
│       ├── 20260404000000_create_plant_searches.sql
│       ├── 20260405000000_add_model_to_plant_searches.sql
│       ├── 20260405100000_create_profiles.sql
│       ├── 20260405200000_add_anonymous_search_support.sql
│       ├── 20260407000000_create_model_evaluations.sql
│       ├── 20260409000000_add_location_to_plant_searches.sql
│       └── 20260413000000_add_consensus_match_level.sql
│
├── e2e/                           # End-to-end tests (Playwright)
│   └── [test files]
│
├── .claude/                       # Claude Code agent configuration
│
├── public/                        # Static assets
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker
│   └── [icons]
│
├── vite.config.ts                 # Vite build config
├── tsconfig.json                  # TypeScript config (paths: @ → src/)
├── tsconfig.app.json              # App-specific TS config
├── tsconfig.node.json             # Build tools TS config
├── tailwind.config.js             # Tailwind CSS config
├── postcss.config.js              # PostCSS plugins (tailwind, autoprefixer)
├── package.json                   # Dependencies & scripts
└── CLAUDE.md                      # Project instructions
```

## Directory Purposes

**`src/components/`:**
- Purpose: Reusable React components
- Contains: UI primitives (shadcn), feature-specific components (PhotoCapture, PlantResultView), auth flows
- Key files: `PhotoCapture.tsx` (image input), `PlantResultView.tsx` (result display), `BottomTabBar.tsx` (navigation)

**`src/components/ui/`:**
- Purpose: shadcn/ui component library (primitives)
- Contains: 50+ unstyled, accessible UI components (Button, Dialog, Card, etc.)
- Generated from: shadcn CLI; do not edit manually — regenerate from CLI

**`src/pages/`:**
- Purpose: Page-level components corresponding to routes
- Contains: Index (home), History (plant list), Settings, NotFound, legal pages
- Key pattern: Wrap with `AppLayout` to get BottomTabBar and footer

**`src/hooks/`:**
- Purpose: Custom React hooks for reusable stateful logic
- Contains: Auth access (`use-auth`), plant identification (`use-plant-identifier`), history fetching (`use-plant-history`), location (`use-geolocation`), consent (`use-consent`)
- Key files: `use-plant-identifier.ts` (encapsulates AI call logic), `use-plant-history.ts` (Supabase query + localStorage fallback)

**`src/contexts/`:**
- Purpose: React Context providers for global state
- Contains: AuthContext for user/session/loading state
- Key file: `AuthContext.tsx` — sets up auth state listener, handles email verification flow, tracks user identification

**`src/services/`:**
- Purpose: Business logic separated from React
- Contains: Auth operations (sign in/up), anonymous-to-authenticated migration
- Key file: `auth.service.ts` — normalizes Supabase auth errors to Spanish, implements claim flow
- Testing: `auth.service.test.ts` for unit tests

**`src/lib/`:**
- Purpose: Utility functions and helpers
- Contains: Analytics (`track.ts`), anonymous ID management (`anonymous-id.ts`), location permission tracking (`geo-permission.ts`), platform detection (`platform.ts`)
- Naming: snake_case files for utility modules (convention from original Lovable)
- Testing: Co-located `.test.ts` files

**`src/layouts/`:**
- Purpose: Page layout wrappers
- Contains: `AppLayout.tsx` — wraps pages with BottomTabBar, LegalFooter, max-width container
- Usage: Wrapped around page components in App.tsx routes

**`src/integrations/supabase/`:**
- Purpose: Supabase client and types
- Contains: `client.ts` (creates Supabase instance), `types.ts` (auto-generated TypeScript schema types)
- Key setup: Auth uses localStorage, auto-refreshes token, persists session
- Generated: `types.ts` is auto-generated from Supabase schema — do not edit manually

**`supabase/functions/identify-plant/`:**
- Purpose: Edge function for plant identification
- Contains: `index.ts` (main handler, multi-model AI calls), `consensus.ts` (agreement algorithm)
- Runs on: Deno runtime; can invoke Anthropic/Google/OpenAI APIs directly
- Trigger: Called from frontend via `supabase.functions.invoke("identify-plant", { body })`
- Data written: `plant_searches` and `model_evaluations` tables

**`supabase/migrations/`:**
- Purpose: Database schema version control
- Contains: SQL migrations for plant_searches, model_evaluations, profiles tables
- Naming: `YYYYMMDDHHMMSS_description.sql` — applied in order
- Key tables:
  - `plant_searches`: user identification results (user_id or anonymous_id, plant name, care, diagnosis)
  - `model_evaluations`: per-model results (which model was used, success/failure, response time, consensus data)
  - `profiles`: user profile data (future: preferences, settings)

**`src/test/`:**
- Purpose: Test configuration and helpers
- Contains: `setup.ts` (Vitest config for jsdom + testing-library), example tests, consensus tests
- Run commands: `npm run test` (one-time), `npm run test:watch` (watch mode)

**`e2e/`:**
- Purpose: End-to-end tests via Playwright
- Contains: Test files for browser automation
- Run: `npm run test:e2e`, `npm run test:e2e:ui` (headed mode)

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React root; initializes PostHog, registers service worker
- `src/App.tsx`: App root with routing setup; defines all routes

**Configuration:**
- `vite.config.ts`: Vite build config; PWA plugin, React plugin
- `tsconfig.json`: TypeScript config; path aliases (`@/*` → `src/*`)
- `tailwind.config.js`: Tailwind theme, colors, fonts, animations
- `package.json`: Dependencies, scripts (dev, build, test, lint, e2e)

**Core Logic:**
- `src/hooks/use-plant-identifier.ts`: Plant identification flow (image compress, AI call, error handling)
- `src/hooks/use-plant-history.ts`: History fetch (Supabase vs localStorage based on auth)
- `src/services/auth.service.ts`: Auth logic (sign in/up, error normalization, anonymous claim)
- `supabase/functions/identify-plant/index.ts`: Multi-model AI coordination, consensus, DB write

**UI/Presentation:**
- `src/pages/Index.tsx`: Main plant search page
- `src/pages/History.tsx`: Plant history with search/filter
- `src/components/PhotoCapture.tsx`: Image input with platform-aware capture
- `src/components/PlantResultView.tsx`: Result display (name, care, diagnosis)

**Testing:**
- `src/hooks/use-plant-identifier.test.ts`: Hook tests
- `src/lib/anonymous-id.test.ts`, `geo-permission.test.ts`, `platform.test.ts`: Utility tests
- `src/services/auth.service.test.ts`: Auth service tests
- `src/test/consensus.test.ts`: Consensus algorithm tests

## Naming Conventions

**Files:**
- Components: PascalCase, `.tsx` (e.g., `PhotoCapture.tsx`, `PlantResultView.tsx`)
- Hooks: camelCase with `use-` prefix, `.ts` (e.g., `use-plant-identifier.ts`, `use-auth.ts`)
- Utilities: camelCase with `-` separators, `.ts` (e.g., `anonymous-id.ts`, `geo-permission.ts`)
- Tests: `[name].test.ts` co-located with source (e.g., `use-plant-identifier.test.ts`)
- Pages: PascalCase, `.tsx` (e.g., `Index.tsx`, `History.tsx`)
- Services: camelCase `.service.ts` (e.g., `auth.service.ts`)

**Directories:**
- Plural for collections: `components/`, `pages/`, `hooks/`, `services/`, `migrations/`, `functions/`
- Feature-grouped: `components/auth/`, `pages/legal/`
- Lowercase, hyphenated for multi-word: `src/integrations/supabase/`, `supabase/functions/`

## Where to Add New Code

**New Plant Identification Feature:**
- Primary code: `src/hooks/use-plant-identifier.ts` (logic), `src/components/PlantResultView.tsx` (display)
- Tests: `src/hooks/use-plant-identifier.test.ts`
- Edge function: `supabase/functions/identify-plant/index.ts` (if modifying AI calls)
- DB: Add migration in `supabase/migrations/` if adding new plant_searches columns

**New Page/Route:**
- Implementation: Create file in `src/pages/[PageName].tsx`
- Routing: Add route in `src/App.tsx` Routes
- Layout: Wrap with `<AppLayout>` in route if it should have BottomTabBar/footer
- Auth: Wrap with `<RequireAuth>` in page if authentication required

**New UI Component:**
- Reusable component: `src/components/[ComponentName].tsx`
- Primitives from shadcn: Add via `npx shadcn-ui@latest add [component-name]`
- Tests: Add `src/components/[ComponentName].test.tsx` if complex logic

**New Hook:**
- Location: `src/hooks/use-[feature].ts`
- Pattern: Export hook function, optionally export types used (PlantResult, Coords, etc.)
- Tests: Co-locate as `src/hooks/use-[feature].test.ts`

**Utilities/Helpers:**
- Location: `src/lib/[utility-name].ts`
- Tests: Co-locate as `src/lib/[utility-name].test.ts`
- Examples: `anonymous-id.ts`, `geo-permission.ts`, `platform.ts`

**Services (Business Logic):**
- Location: `src/services/[service-name].service.ts`
- Pattern: Export async functions, kept thin (call Supabase, normalize errors, return result)
- Tests: Co-locate as `src/services/[service-name].service.test.ts`

**Edge Functions:**
- Location: `supabase/functions/[function-name]/index.ts`
- Dependencies: Imported from npm via esm.sh (e.g., `https://esm.sh/@supabase/supabase-js@2`)
- Handler: `Deno.serve(async (req) => ...)` function
- Testing: Add tests in `src/test/` if complex algorithm (e.g., `consensus.test.ts`)

**Database Changes:**
- Migration file: `supabase/migrations/[YYYYMMDDHHMMSS]_[description].sql`
- Pattern: CREATE TABLE, ALTER TABLE, INSERT... UP/DOWN reversibility
- Applied: Automatically via Supabase on push

## Special Directories

**`node_modules/`:**
- Purpose: Installed npm dependencies
- Generated: Yes (via npm install)
- Committed: No (in .gitignore)

**`dist/`:**
- Purpose: Build output from Vite
- Generated: Yes (via npm run build)
- Committed: No (in .gitignore)

**`supabase/.temp/`:**
- Purpose: Temporary Supabase CLI files
- Generated: Yes (Supabase CLI creates during development)
- Committed: No (in .gitignore)

**`.claude/`:**
- Purpose: Claude Code agent configuration and skills
- Generated: No (checked in)
- Committed: Yes
- Contains: Project-specific instructions, agent prompts, skill definitions

**`public/`:**
- Purpose: Static assets served directly (PWA manifest, service worker, icons)
- Generated: No (manually created)
- Committed: Yes
- Key files: `manifest.json` (PWA), `sw.js` (service worker), favicons

## Import Aliases

**Path alias `@/`:**
- Resolves to: `src/`
- Usage: `import { supabase } from "@/integrations/supabase/client"`
- Configured in: `tsconfig.json` paths
- Benefit: Cleaner imports, easier refactoring vs. relative paths
