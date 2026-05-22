# Plan 03-03 — SUMMARY

**Status:** Complete
**Executed:** 2026-05-22
**Branch:** `feat/phase-3-calendar-v0`

## Tasks

| # | Task | Commit | Files |
|---|---|---|---|
| 1 | Migration `last_watered_at` (D-06) + apply + regenerate types | `prev-commit` | `supabase/migrations/20260518000000_add_last_watered_at_to_plant_searches.sql`, `src/integrations/supabase/types.ts` |
| 2 | Pure functions `computeDaysRemaining` + `computeStatus` (TDD, 14 tests) | `prev-commit` | `src/lib/watering-countdown.ts`, `src/lib/watering-countdown.test.ts` |
| 3 | Extend `useHomePlants` with `lastWateredAt` + `mp:plant-watered` listener | `e980aab` | `src/hooks/use-home-plants.ts`, `src/hooks/use-home-plants.test.ts` |
| 4 | Hook `useLogWatering` (log + revert + dispatch + 5 tests) | `prev-commit` | `src/hooks/use-log-watering.ts`, `src/hooks/use-log-watering.test.ts` |
| 5 | Keyframe `flash-success` in `tailwind.config.ts` | `f1b914b` | `tailwind.config.ts` |
| 6 | Wire `PlantWateringCard` with `computeStatus` + Sonner toast + flash | `d11ed6c` | `src/components/PlantWateringCard.tsx` |
| 7 | Wire `RegarPage` with `useLogWatering` + urgency sort (D-09) | `4b3ff5a` | `src/pages/RegarPage.tsx` |

(Commits 1, 2, 4 hashes available via `git log feat/phase-3-calendar-v0`.)

## Verification gates

- `npx tsc --noEmit` → 0 errors ✓
- `npm test` → 137/137 pass (was 117 — 20 new tests: 14 countdown + 5 useLogWatering + 1 useHomePlants extension) ✓
- `npm run build` → clean ✓
- `supabase db push` applied to prod, `last_watered_at` confirmed in `plant_searches` ✓

## Decisions reflected

- **D-06** `last_watered_at` nullable timestamptz, no GRANT (existing table), RLS UPDATE policy from 20260515 already gates writes.
- **D-08** Countdown formula in pure function `computeDaysRemaining`; status derived in `computeStatus`. Tested across all branches (null, X>0, X=0, X<0, midnight edges).
- **D-09** Sort by urgency (overdue → urgent → normal → pending-first) with locale-aware alphabetical tie-break in RegarPage `useMemo`.
- **D-10** Button copy state-dependent: "Regada" if X>0, "Regar" otherwise.
- **D-11** Button full-width at the bottom of each card (unchanged from 3-02).
- **D-12** Optimistic update → 1s flash green → Sonner toast 4s with Deshacer → revert path on undo or DB error.
- **D-15** Soft warm yellow badges for urgent/overdue (no red), empathetic copy: "Toca regar hoy", "Lleva N días esperándote".

## VERIFICATION adjustments applied

- **Ajuste #1** (midnight flakiness): the `computeDaysRemaining` smoke test uses `vi.useFakeTimers + vi.setSystemTime` instead of relying on the wall clock.
- **Ajuste #2** (double-tap guard): `handleWater` in `PlantWateringCard` early-returns when `flashing` is true.
- **Ajuste #3** (migration rollback): documented as a SQL comment at the bottom of the migration file.

## Out of scope for 3-03 (deferred per plan)

- Frequency picker UI (sub-phase 3-04 — tap on "Cada N días" is currently a no-op).
- Pending-first → picker → log chain when `intervalDays = null` (sub-phase 3-04).
- PostHog tracking (sub-phase 3-05).
- E2E Playwright happy path (sub-phase 3-05).

## Deviations from plan

None substantive. All tasks executed inline (no subagent — orchestrator owned the work after wave-2 subagent interruption pattern carried over). Plan content followed verbatim except for minor whitespace / comment cleanup in copied code blocks.

## Next

Wave 4 (Plan 03-04) adds the `WateringFrequencyPicker` bottom sheet, the `useEditWateringInterval` hook, and the pending-first → picker → log chain (D-13 + D-14).
