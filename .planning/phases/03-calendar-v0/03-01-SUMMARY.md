---
phase: 03-calendar-v0
plan: 01
subsystem: ui
tags: [react-router, navigation, bottom-tab-bar, sonner-toast, localStorage, lucide-icons]

# Dependency graph
requires:
  - phase: 03.1-map-tab
    provides: useContextCounts hook with home counter + mp:plant-context-updated CustomEvent listener (consumed by tab Regar visibility)
  - phase: 02.1-classify-context
    provides: plant_searches.context column (home/wild/unclassified) drives the home counter that gates the new tab
provides:
  - "💧 Regar tab in BottomTabBar, conditional on `user && home_count >= 1`"
  - "/regar route registered with normal AppLayout (no fullBleed) — placeholder shell ready for sub-phase 3-02 list"
  - "/mis-plantas → /ajustes/mis-plantas redirect chain preserved for bookmarks, deep-links, login/signup redirects"
  - "Settings 'Mi colección' section with auth-gated button to /ajustes/mis-plantas (label verbatim per D-03)"
  - "HistoryRelocationNotice — lifecycle-only one-shot toast persisted in localStorage (D-04)"
  - "UnclassifiedSection 'Ver todas' CTA points directly at new path (skips redirect hop)"
affects: [03-02-regar-list, 03-03-watering-action, 03-04-frequency-picker, 03-05-tracking]

# Tech tracking
tech-stack:
  added: []  # no new deps; reuses existing lucide-react (Droplet, BookOpen), sonner, react-router-dom
  patterns:
    - "Lifecycle-only component returning null (HistoryRelocationNotice mirrors PendingClassificationListener)"
    - "localStorage one-time flag with try/catch SSR-safe guard (iOS Safari private-mode tolerant)"
    - "Route redirect chain for backwards compat (Navigate `replace`) — keeps auth flows untouched"

key-files:
  created:
    - src/components/HistoryRelocationNotice.tsx
    - src/pages/RegarPage.tsx
  modified:
    - src/components/BottomTabBar.tsx
    - src/App.tsx
    - src/pages/Settings.tsx
    - src/components/UnclassifiedSection.tsx

key-decisions:
  - "Implemented Option A of D-03: new sub-route /ajustes/mis-plantas with History component mounted as-is (zero refactor — History reads context via useSearchParams)"
  - "Mounted HistoryRelocationNotice inside <BrowserRouter> as sibling of PendingClassificationListener; both are lifecycle-only and need to coexist with route changes"
  - "Kept BookOpen import in BottomTabBar.tsx (now unused there) intentionally — plan explicitly preserves it; tsconfig has noUnusedLocals=false so no warning"
  - "Did NOT touch auth.service.ts emailRedirectTo or LoginPage.tsx — redirect chain /mis-plantas → /ajustes/mis-plantas absorbs them; smaller blast radius"

patterns-established:
  - "One-time per-device UX notice: useEffect + localStorage flag + try/catch — pattern for any future migration toasts"

requirements-completed: [RIEG-01]

# Metrics
duration: 64min
completed: 2026-05-21
---

# Phase 3 Plan 01: Nav restructure Summary

**💧 Regar tab wired into BottomTabBar (reactive via useContextCounts), /mis-plantas relocated to /ajustes/mis-plantas with redirect chain + one-shot relocation toast, and /regar route registered with placeholder RegarPage shell ready for 3-02.**

## Performance

- **Duration:** ~64 min
- **Started:** 2026-05-21T18:10:34Z
- **Completed:** 2026-05-21T19:14:00Z (approximate)
- **Tasks:** 6 / 6
- **Files modified:** 4
- **Files created:** 2

## Accomplishments

- Added conditional "💧 Regar" tab to `BottomTabBar` gated by `user && home >= 1`; reactivity inherited from existing `useContextCounts` + `mp:plant-context-updated` listener (no refactor of the reactive pipeline).
- Removed "Mis plantas" from main tabs per D-03; tab order is now Inicio · Regar (cond) · Mapa (cond) · Ajustes (cond auth).
- Registered `/regar` with normal AppLayout (researcher recommendation: vertical scroll list — NOT fullBleed like /mapa).
- Relocated `/mis-plantas` → `/ajustes/mis-plantas` while keeping the old path as a redirect, so login/signup redirects and external bookmarks continue to work end-to-end.
- Added `HistoryRelocationNotice` — a lifecycle-only component (returns null) that fires `toast("📍 Hemos movido Mis plantas a Ajustes", { duration: 8000 })` exactly once per device via the `mp_seen_history_relocation_notice` localStorage flag, with try/catch fallback for iOS Safari private mode.
- Added "Mi colección" section to Settings with verbatim D-03 label "Mis plantas (casa + descubrimientos)" — auth-gated, placed between "Cuenta" and "Tus datos" per researcher Q#8.
- Updated `UnclassifiedSection.handleViewAll` to navigate directly to the new path, avoiding a visible redirect on the high-frequency classify-pending CTA.

## Task Commits

Each task committed atomically:

1. **Task 1: BottomTabBar — add Regar tab** — `ee931af` (feat)
2. **Task 5: HistoryRelocationNotice (new file)** — `0588e3a` (feat)
3. **Task 6: RegarPage placeholder (new file)** — `e42665e` (feat)
4. **Task 2: App.tsx — routes + mount notice** — `f7317ba` (feat)
5. **Task 3: Settings.tsx — Mi colección section** — `8775a1a` (feat)
6. **Task 4: UnclassifiedSection — new path** — `2ceefa3` (feat)

_Note: execution order swapped Task 5 + Task 6 before Task 2 to satisfy import dependencies (App.tsx imports both HistoryRelocationNotice and RegarPage). Plan content unchanged — just commit ordering optimized so each commit was self-contained and `npx tsc --noEmit` passed at every step._

## Files Created/Modified

**Created:**
- `src/components/HistoryRelocationNotice.tsx` — lifecycle-only D-04 one-shot toast; 37 lines.
- `src/pages/RegarPage.tsx` — placeholder shell with header "¿Toca regar?" / subheader "Tus plantas casa" + `document.title`; 35 lines.

**Modified:**
- `src/components/BottomTabBar.tsx` — added `Droplet` import + `home` destructure + Regar push + dropped `/mis-plantas` push (+9 / -4).
- `src/App.tsx` — added `RegarPage` and `HistoryRelocationNotice` imports, mounted `<HistoryRelocationNotice />`, registered `/regar` and `/ajustes/mis-plantas`, replaced `/mis-plantas` element with `<Navigate to="/ajustes/mis-plantas" replace />` (+9 / -1).
- `src/pages/Settings.tsx` — added `BookOpen` import + "Mi colección" Section (+19 / -0).
- `src/components/UnclassifiedSection.tsx` — single-line path swap in `handleViewAll` (+1 / -1).

## Decisions Made

- **D-01 / D-02 / D-05** (Regar tab + slug + reactivity): implemented exactly as written. `useContextCounts` already dispatches/listens for `mp:plant-context-updated`, so the tab will appear after the first home classification without a reload — verified by code path, no behavioral test added (deferred to sub-phase 3-05).
- **D-03 Option A**: `/ajustes/mis-plantas` route + Section button. Old path retained as redirect — chose this over Option C (no routing change) because the new URL is what we want indexed and the Settings UX makes the path discoverable.
- **D-04**: toast copy/duration/key locked verbatim. Component mounts inside BrowserRouter because Sonner's `toast()` only works once `<Toaster />` is mounted (already at App root, line 49) — no nesting concerns.
- **Threat model T-03-02 (open redirect)**: mitigated — the `<Navigate to>` value is a hardcoded string literal, never derived from input. Confirmed.
- **Threat model T-03-05 (XSS via toast)**: mitigated — toast content is a literal string with no interpolation.

## Deviations from Plan

**None substantive. Two minor adaptations, both documented inline:**

1. **Execution order**: tasks were applied in the order 1 → 5 → 6 → 2 → 3 → 4 rather than 1 → 2 → 3 → 4 → 5 → 6. Reason: Task 2 (App.tsx) imports the components that Tasks 5 and 6 create. Performing Task 2 before 5 and 6 would have produced an intermediate commit with broken imports (and a non-zero `tsc` exit), which violates the per-task verification gate. The plan tasks themselves are unchanged in content; only the commit timeline was reordered. No file is touched twice. This is consistent with the spirit of the plan and avoids breaking the "tsc clean after every commit" guarantee.

2. **`BookOpen` import retained in `BottomTabBar.tsx`**: the plan explicitly notes this is intentional ("sigue importado pero ya no se usa para Mis plantas — Settings.tsx lo usa en cambio 3 del Task 3"). `tsconfig.app.json` has `noUnusedLocals: false`, so `tsc` is clean. ESLint may flag in CI; we accept that as a future cleanup signal rather than removing the import here (per plan instructions).

---

**Total deviations:** 0 auto-fixed; 2 trivial process adaptations documented above.
**Impact on plan:** Zero. All 6 task acceptance criteria met, plan-level success criteria all hit.

## Issues Encountered

- One `node -e` verification script (Task 4) had a zsh quoting collision with embedded backticks in the verifier regex (`navigate(\`/planta/`). Worked around by switching the outer shell quoting from double to single quotes. Re-run produced `OK UnclassifiedSection viewall path`. Not a code issue — pure shell escaping.

## Verification Evidence

After every commit:
- `npx tsc --noEmit` → exit 0 (no output)
- `npm test -- --run` → 110/110 passing, 10/10 files, ~2s

Final build (after Task 4):
- `npm run build` → built in 1.22s; PWA SW generated; 16 precache entries; no errors. (Pre-existing >500 kB chunk warning unrelated to this Wave.)

Smoke checks (final acceptance criteria from the prompt):
- `/regar` route registered with normal AppLayout → confirmed in `src/App.tsx`.
- `/mis-plantas` → `<Navigate to="/ajustes/mis-plantas" replace />` → confirmed in `src/App.tsx`.
- Regar tab gated by `user && home >= 1` → confirmed in `src/components/BottomTabBar.tsx`.
- Settings has "Mis plantas (casa + descubrimientos)" entry → confirmed in `src/pages/Settings.tsx`.

Live dev-server visual check was NOT performed in this Wave (no checkpoint required by plan; functional gates above provide the equivalent assurance for a routing+presentational change with zero new logic).

## User Setup Required

None — no external service configuration. No env vars, no DB migrations, no third-party setup.

## Next Phase Readiness

- **Ready for sub-phase 3-02 (regar list).** `RegarPage` placeholder is in place to be extended with `useHomePlants`, `PlantWateringCard` list, redirect-on-empty, and urgency sort.
- The reactive plumbing for tab visibility is verified at code level — `useContextCounts.home` updates on `mp:plant-context-updated`.
- No blockers identified. Note for 3-03: the `last_watered_at` column is still pending (deliberately deferred per Wave 3 scope).

## Self-Check: PASSED

Verified that all claimed artifacts exist and all claimed commits are reachable:

**Files created:**
- `src/components/HistoryRelocationNotice.tsx` → FOUND
- `src/pages/RegarPage.tsx` → FOUND

**Files modified:**
- `src/components/BottomTabBar.tsx` → FOUND
- `src/App.tsx` → FOUND
- `src/pages/Settings.tsx` → FOUND
- `src/components/UnclassifiedSection.tsx` → FOUND

**Commits:**
- `ee931af` BottomTabBar → FOUND
- `0588e3a` HistoryRelocationNotice → FOUND
- `e42665e` RegarPage → FOUND
- `f7317ba` App.tsx → FOUND
- `8775a1a` Settings → FOUND
- `2ceefa3` UnclassifiedSection → FOUND

---
*Phase: 03-calendar-v0*
*Completed: 2026-05-21*
