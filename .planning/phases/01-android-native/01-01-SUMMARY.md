---
plan: 01-01
phase: 01-android-native
status: complete
subsystem: android-native
tags: [capacitor, android, platform-detection, service-worker, vite, pwa]
dependency_graph:
  requires: []
  provides: [capacitor-foundation, platform-detection, android-build]
  affects: [vite.config.ts, src/main.tsx, package.json]
tech_stack:
  added:
    - "@capacitor/core@^8.3.1"
    - "@capacitor/android@^8.3.1"
    - "@capacitor/camera@^8.1.0"
    - "@capacitor/splash-screen@^8.0.1"
    - "@capacitor/status-bar@^8.0.2"
    - "@capacitor/preferences@^8.0.1"
    - "@capacitor/geolocation@^8.2.0"
    - "@capacitor/cli@^8.3.1 (dev)"
    - "@capacitor/assets@^3.0.5 (dev)"
  patterns:
    - Conditional Vite base path via VITE_CAPACITOR env var
    - isNative() guard pattern for native-only behavior
    - VitePWA excluded from Android builds to avoid SW conflicts
key_files:
  created:
    - capacitor.config.ts
  modified:
    - package.json
    - .gitignore
    - src/lib/platform.ts
    - src/main.tsx
    - vite.config.ts
    - index.html
decisions:
  - appId set to com.miplantitafeliz.app (not com.mijardin.app)
  - appName set to "Mi jardin" per user decision
  - android/ directory excluded from git — generated per-machine from capacitor.config.ts + dist/
  - isNative() uses inline window.Capacitor check in main.tsx (not imported from platform.ts) to keep top-level side-effect-free
metrics:
  duration: "~2 minutes"
  completed: "2026-04-23T07:06:20Z"
  tasks_completed: 2
  files_modified: 8
  commit: e60d8d6
---

# Phase 01 Plan 01: Capacitor Foundation Summary

Capacitor 8 installed and configured with appId `com.miplantitafeliz.app`, platform detection utilities, SW guard, and conditional Vite base path for Android builds.

## What was done

- Installed 9 Capacitor 8 packages: core, android, camera, splash-screen, status-bar, preferences, geolocation (as dependencies), plus cli and assets (as devDependencies)
- Created `capacitor.config.ts` at project root with appId `com.miplantitafeliz.app`, appName "Mi jardin", splash screen config (backgroundColor #FDFCF8, 2s duration), and status bar config (dark style, #2D5A27 background)
- Added three npm scripts: `build:android` (sets VITE_CAPACITOR=true), `android` (build + cap sync + open), `cap:sync` (build + sync)
- Added `android/`, `*.keystore`, `*.jks`, `android/keystore.properties`, and `capacitor.config.ts.bak` to `.gitignore` (mitigates threat T-01-01 — prevents accidental keystore commits)
- Extended `src/lib/platform.ts` with `isAndroid()` (UA-based) and `isNative()` (Capacitor bridge check) exports alongside the existing `isIOS()`
- Added `isCapacitor` detection guard in `src/main.tsx` that wraps the entire SW registration block — prevents "Plugin not implemented" errors caused by SW intercepting Capacitor bridge requests
- Modified `vite.config.ts` to use `base: "./"` when `VITE_CAPACITOR=true`, `base: "/"` otherwise; VitePWA plugin excluded from Android builds so no service worker is generated in Android dist output
- Added `viewport-fit=cover` to `index.html` viewport meta tag — required for Android notch/cutout safe area CSS insets

## Files modified

- `capacitor.config.ts` (created) — Capacitor root configuration
- `package.json` — Added 9 Capacitor packages + 3 Android build scripts
- `package-lock.json` — Updated lock file
- `.gitignore` — Added Android/Capacitor exclusions
- `src/lib/platform.ts` — Added `isAndroid()` and `isNative()` exports
- `src/main.tsx` — Added Capacitor SW guard wrapping existing SW registration
- `vite.config.ts` — Conditional base path + conditional VitePWA plugin
- `index.html` — Added `viewport-fit=cover` to viewport meta

## Verification

1. `npm run build` — PASSED. PWA build still works, generates dist/sw.js and dist/workbox-*.js unchanged.
2. `npm run build:android` (VITE_CAPACITOR=true) — PASSED. dist/index.html uses relative paths (`./assets/...`).
3. `npx tsc --noEmit` — PASSED. No TypeScript errors.
4. `grep -c "isNative\|isAndroid\|isIOS" src/lib/platform.ts` — Returns 5 (3 function definitions + 2 regex uses in isIOS/isAndroid; all 3 exports confirmed present).
5. `grep "viewport-fit=cover" index.html` — PASSED. Meta tag found.
6. Package verification — PASSED. All 9 required Capacitor packages present in dependencies/devDependencies.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `capacitor.config.ts` exists at project root
- `src/lib/platform.ts` exports isIOS, isAndroid, isNative
- `src/main.tsx` contains isCapacitor SW guard
- `vite.config.ts` contains conditional base path
- Commit e60d8d6 exists and verified clean (no unexpected deletions)
