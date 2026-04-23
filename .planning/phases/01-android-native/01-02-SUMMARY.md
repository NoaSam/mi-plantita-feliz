---
plan: 02
phase: 01-android-native
status: complete
subsystem: android-native
tags: [capacitor, camera, geolocation, preferences, auth-storage, permissions]
dependency_graph:
  requires: [01-01]
  provides: [native-camera, native-geolocation, native-auth-storage]
  affects:
    - src/components/PhotoCapture.tsx
    - src/hooks/use-geolocation.ts
    - src/integrations/supabase/client.ts
tech_stack:
  added: []
  patterns:
    - Dynamic import of Capacitor plugins (avoids browser context throws)
    - isNative() guard from platform.ts as single source of truth (PATTERNS.md Key Constraint #3)
    - DataUrl → fetch → blob → File conversion to preserve frozen onCapture(File, Coords) contract
    - buildCapacitorStorage() adapter implementing getItem/setItem/removeItem for Supabase auth
key_files:
  created: []
  modified:
    - src/components/PhotoCapture.tsx
    - src/hooks/use-geolocation.ts
    - src/integrations/supabase/client.ts
decisions:
  - Dynamic imports used for all Capacitor plugins to prevent browser-context throws
  - CameraSource.Prompt selected so one button covers both camera and gallery in native
  - getLocationSilently in native context calls readPositionNative directly (no browser permission check needed)
  - "Do not edit it directly" comment removed from client.ts — file is now manually maintained
metrics:
  duration: "~10 minutes"
  completed: "2026-04-23T07:30:00Z"
  tasks_completed: 2
  files_modified: 3
  commit: 79d7359
---

# Phase 01 Plan 02: Native Plugin Wiring Summary

Capacitor Camera (with permission handling), Geolocation, and Preferences auth storage adapter wired into existing React components via isNative() guards and dynamic plugin imports.

## What was done

- **PhotoCapture.tsx**: Added `handleNativeCapture` async function that dynamically imports `@capacitor/camera`, checks/requests camera permissions before opening, calls `Camera.getPhoto` with `CameraResultType.DataUrl` + `CameraSource.Prompt`, converts DataUrl result to `File` via fetch/blob to preserve the frozen `onCapture(file: File, coords: Coords | null)` contract. Added `permissionDenied` state with a user-facing message in Spanish directing users to device Settings. Camera button `onClick` routes to `handleNativeCapture` when `isNative()` is true. Hidden `<input type="file">` elements and separate gallery button suppressed in native mode (CameraSource.Prompt already offers both camera and gallery).

- **use-geolocation.ts**: Added `readPositionNative()` function using dynamic import of `@capacitor/geolocation`. Modified `readPosition()` to delegate to native path when `isNative()` returns true. `useGeolocation()` hook public API (`getLocation`, `getLocationSilently`) and `isBrowserPermissionGranted` export unchanged — no caller changes needed. Import of `isNative` from `@/lib/platform` (no inline `window.Capacitor` checks).

- **client.ts**: Added `buildCapacitorStorage()` function implementing the `{ getItem, setItem, removeItem }` interface required by Supabase `auth.storage`, backed by `@capacitor/preferences` via dynamic import. Added `isNative` import from `@/lib/platform`. Storage selection: `isNative() ? buildCapacitorStorage() : localStorage`. All storage operations wrapped in try/catch per project convention. Removed auto-generated "Do not edit it directly" comment.

## Files modified

- `src/components/PhotoCapture.tsx` — Added Capacitor Camera branch, permission check, denied UI, DataUrl→File conversion
- `src/hooks/use-geolocation.ts` — Added Capacitor Geolocation branch via isNative() guard
- `src/integrations/supabase/client.ts` — Added Capacitor Preferences auth storage adapter

## Verification

1. `npx tsc --noEmit` — PASSED. No TypeScript errors.
2. `npm run build` — PASSED. PWA build succeeds, generates dist/sw.js and dist/workbox-*.js unchanged.
3. `Camera.getPhoto` with `CameraResultType.DataUrl` present in PhotoCapture.tsx — CONFIRMED.
4. `checkPermissions` call before camera access present in PhotoCapture.tsx — CONFIRMED.
5. `permissionDenied` state and UI block present in PhotoCapture.tsx — CONFIRMED.
6. `use-geolocation.ts` imports `isNative` from `@/lib/platform`, no inline `window.Capacitor` — CONFIRMED.
7. `client.ts` imports `isNative` from `@/lib/platform`, no inline `window.Capacitor` — CONFIRMED.
8. `client.ts` uses `Preferences.get/set/remove` via `buildCapacitorStorage()` — CONFIRMED.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Surface Scan

No new network endpoints or auth paths introduced. The `buildCapacitorStorage()` adapter replaces `localStorage` with `@capacitor/preferences` (Android SharedPreferences), which is app-sandboxed by the OS — this is the T-01-04 mitigation specified in the plan's threat model. No new threat surface identified beyond what the plan already modeled.

## Self-Check: PASSED

- `src/components/PhotoCapture.tsx` contains `Camera.getPhoto`, `checkPermissions`, `permissionDenied`
- `src/hooks/use-geolocation.ts` contains `Geolocation`, `getCurrentPosition`, `isNative` from platform.ts
- `src/integrations/supabase/client.ts` contains `Preferences`, `buildCapacitorStorage`, `isNative` from platform.ts
- Commit 79d7359 exists with 3 files changed, no unexpected deletions
