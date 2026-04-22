# Coding Conventions

**Analysis Date:** 2026-04-22

## Naming Patterns

**Files:**
- Components: PascalCase with .tsx extension (e.g., `PhotoCapture.tsx`, `PlantResultView.tsx`, `LocationConsentModal.tsx`)
- Hooks: kebab-case prefixed with `use-` (e.g., `use-plant-identifier.ts`, `use-plant-history.ts`, `use-geolocation.ts`)
- Services: kebab-case with `.service.ts` suffix (e.g., `auth.service.ts`)
- Libraries/utilities: kebab-case (e.g., `anonymous-id.ts`, `geo-permission.ts`, `platform.ts`)
- Test files: match source file name with `.test.ts` or `.test.tsx` suffix (e.g., `auth.service.test.ts`, `anonymous-id.test.ts`)

**Functions:**
- Regular functions: camelCase (e.g., `getAnonymousId()`, `hasAnonymousId()`, `compressImage()`, `fileToBase64()`)
- React components: PascalCase (e.g., `PhotoCapture`, `PlantResultView`, `export default function PhotoCapture()`)
- Hook exports: camelCase (e.g., `usePlantIdentifier`, `useGeolocation`)
- Helper/utility functions: camelCase (e.g., `normalizeError()`, `shouldAskForLocation()`)

**Variables:**
- Local state/variables: camelCase (e.g., `isLoading`, `result`, `error`, `cameraRef`, `modalOpen`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`, `STORAGE_KEY`, `MAX_DECLINES`)
- React state setters: `set` + PascalCase (e.g., `setIsLoading`, `setResult`, `setError`)
- Boolean variables: prefix with `is`, `has`, `should` (e.g., `isLoading`, `hasAnonymousId`, `shouldAskForLocation`)

**Types:**
- Interfaces: PascalCase (e.g., `PlantResult`, `PhotoCaptureProps`, `StoredState`, `LocationConsentModalProps`)
- Type aliases: PascalCase (e.g., `Coords`, `ConsentPreferences`)
- Extracted types from zod: same pattern (e.g., `type LoginValues = z.infer<typeof loginSchema>`)

## Code Style

**Formatting:**
- No explicit prettier config found — uses ESLint default formatting
- Line length: no strict limit observed
- Indentation: 2 spaces (standard for TypeScript/React projects)

**Linting:**
- ESLint with TypeScript support via `typescript-eslint`
- Config: `eslint.config.js` using ESLint flat config
- Key enforced rules:
  - `react-refresh/only-export-components` (warn) — components should be default exports only
  - `@typescript-eslint/no-unused-vars` is disabled (allows flexibility during development)
  - React Hooks rules enforced (e.g., dependencies array validation)

## Import Organization

**Order:**
1. React and framework imports (e.g., `import { useState, useCallback } from "react"`)
2. External packages (e.g., `import { Camera } from "lucide-react"`, `import { createClient } from '@supabase/supabase-js'`)
3. Internal absolute imports using `@/` alias (e.g., `import { Button } from "@/components/ui/button"`)
4. Type imports (e.g., `import type { PlantResult } from "@/hooks/use-plant-identifier"`)
5. Relative imports for same-folder utilities (rare, prefer absolute)

**Path Aliases:**
- `@/` = `src/` — all internal imports use absolute path alias
- Configured in `vitest.config.ts` and used throughout the codebase

## Error Handling

**Patterns:**
- Error objects are checked with `instanceof Error` and message extracted
- Fallback messages when error type is unknown: `e instanceof Error ? e.message : "Error desconocido"`
- Service functions return tuple-like object pattern: `{ user: ..., error: ... }` (see `auth.service.ts`)
- Supabase responses checked for `.error` property and handled individually
- Edge function errors extracted from response body when available: `body?.error || fnError.message`
- Try/catch blocks with empty catch handlers for graceful degradation (e.g., localStorage access): `catch { /* ignore */ }`
- Error messages are localized to Spanish for user-facing strings

## Logging

**Framework:** console (no structured logging library)

**Patterns:**
- `console.warn()` for non-fatal issues (e.g., `console.warn("claim_anonymous_searches failed:", error.message)`)
- No `console.log()` in production code for business logic
- Analytics tracking via `track()` function from `@/lib/track` (PostHog integration)
- Error tracking via `track("plant_identification_failed", { error: msg })`
- Success tracking: `track("plant_identified", { plant_name, logged_in, ... })`

## Comments

**When to Comment:**
- Explain "why" not "what" — code should be self-documenting
- Complex algorithms or non-obvious logic chains (e.g., consensus matching, image compression)
- Workarounds for platform-specific issues (e.g., iOS vs Android camera input handling)
- Critical state transitions (e.g., location consent workflow)

**JSDoc/TSDoc:**
- Minimal usage observed — interfaces and functions have type signatures instead
- Public API exports (hooks, services) have brief doc comments in some cases
- No formal comment pattern enforced; focus on clear function/interface names

**Example from codebase:**
```typescript
// Resolve identity — edge function handles the DB write
const { data: { session } } = await supabase.auth.getSession();
const loggedIn = !!session?.user;

// Extract actual error from edge function response body when possible
if (fnError) {
  const body = typeof rawData === "string" ? (() => { try { return JSON.parse(rawData); } catch { return null; } })() : rawData;
  throw new Error(body?.error || fnError.message);
}
```

## Function Design

**Size:** Functions typically 5-50 lines; hooks and service functions can reach 100+ lines for complex orchestration

**Parameters:**
- Destructured props for React components (e.g., `{ onCapture, isLoading }`)
- Simple scalars for utilities (e.g., `maxWidth = 400, quality = 0.7`)
- Optional trailing comma style: included

**Return Values:**
- Hooks return object with state and handlers: `{ identify, isLoading, result, error, setResult }`
- Service functions return nullable/error tuple: `{ user: ..., error: ... }`
- Utility functions return typed values matching signature

## Module Design

**Exports:**
- Named exports for utilities and helpers (e.g., `export function getAnonymousId()`)
- Default exports for React components (e.g., `export default function PhotoCapture()`)
- Named exports for types alongside implementations (e.g., `export interface PlantResult`)
- Mix of named and default is acceptable (no barrel files pattern observed in src/)

**Barrel Files:**
- Not used in main `src/` directory
- UI components in `src/components/ui/` use barrel exports internally but no top-level index

**File Organization:**
- Components folder contains UI components and feature components mixed
- Hooks folder contains all custom React hooks
- Services folder contains business logic (auth, plant identification)
- Lib folder contains pure utilities and helpers
- Integration folder for external service clients (Supabase)

---

*Convention analysis: 2026-04-22*
