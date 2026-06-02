# Plan 03-04 — SUMMARY

**Status:** Complete
**Executed:** 2026-05-22
**Branch:** `feat/phase-3-calendar-v0`

## Tasks

| # | Task | Commit | Files |
|---|---|---|---|
| 1 | Hook `useEditWateringInterval` + 3 unit tests | `287929c` | `src/hooks/use-edit-watering-interval.ts`, `src/hooks/use-edit-watering-interval.test.ts` |
| 2 | Extend `useHomePlants` listener with `mp:plant-frequency-updated` | `bb69f3a` | `src/hooks/use-home-plants.ts` |
| 3 | Create `WateringFrequencyPicker` (shadcn Sheet bottom, input 1-60) | `bb69f3a` | `src/components/WateringFrequencyPicker.tsx` |
| 4 | Refactor `PlantWateringCard` — `onWaterRequiringFrequency` + D-14 branch | `766dc95` | `src/components/PlantWateringCard.tsx` |
| 5 | Wire `RegarPage` — picker singleton + edit/frequency-then-water flows | `6891cd3` | `src/pages/RegarPage.tsx` |

## Verification gates

- `npx tsc --noEmit` → 0 errors ✓
- `npm test -- --run` → 140/140 pass (3 new tests covering useEditWateringInterval success, error, and boundary values) ✓
- `npm run build` → clean (PWA precache regenerated) ✓
- Plan verify scripts → all checks pass ✓

## Decisions reflected

- **D-07** `watering_interval_days` overwritten in-place via UPDATE — no shadow column for "original IA value". Trade-off documented in CONTEXT.md and accepted for v0.
- **D-13** Edit-frequency flow: tap on "Cada N días" / "Sin frecuencia" opens bottom sheet (shadcn `<Sheet side="bottom">`); numeric input clamped client-side to [1, 60] with belt-and-suspenders DB CHECK constraint; Cancelar (outline) + Guardar (hero) stacked vertically with `min-h-11` touch targets; auto-focus + select on open; safe-area inset padding for iOS.
- **D-14 case 1** Plant with `intervalDays != null` & `lastWateredAt = null` → tap "Regar" goes directly to `logWatering` (no picker). Handled by the non-null branch in `PlantWateringCard.handleWater`.
- **D-14 case 2** Plant with `intervalDays === null` → tap "Regar" routes to `onWaterRequiringFrequency`; `RegarPage` opens the picker in `frequency-then-water` mode; Guardar persists the interval, then automatically chains `logWatering`. Single user-perceived flow; two internal UPDATEs. Cancelar in this mode aborts both writes — the plant is NOT marked as watered.

## Architectural shape

- **New event channel:** `mp:plant-frequency-updated` (analog to `mp:plant-watered` from 3-03). `useEditWateringInterval` dispatches with `{ plant_search_id, new_interval_days }`; `useHomePlants` listens and refetches.
- **Picker singleton:** one `<WateringFrequencyPicker>` instance mounted at the bottom of `RegarPage` JSX, controlled by a discriminated-union `PickerState`. Three card-level entry points (tap interval, tap Regar with null interval) all funnel through the same component.
- **Card → parent contract change:** `onEditFrequency` signature changed from `(plantId: string) => void` to `(plant: HomePlant) => void` so the parent can pre-fill the picker without a lookup. Breaking, but only `RegarPage` consumes `PlantWateringCard`, so contained.
- **handleWater branching order:** the null-interval check fires *before* the no-onWater early return, so the D-14 path triggers even in environments where `onWater` is unwired (e.g., previews).

## Toast copy

- Picker save success: `Frecuencia actualizada · Cada N días` (3s, no Deshacer)
- Picker save failure: `No se pudo guardar la frecuencia. Inténtalo de nuevo.`
- Chained log success (frequency-then-water): `✓ Regada · Siguiente riego en N días` (4s)
- Chained log failure: `La frecuencia se guardó, pero no se pudo registrar el riego. Inténtalo de nuevo.`

## Threat model spot-checks

- T-03-17 (Tampering) — RLS UPDATE policy from Phase 02.1 already gates writes by `auth.uid() = user_id`; the new UPDATE on `watering_interval_days` inherits the same protection.
- T-03-18 (Input validation) — Client clamps via `min`/`max` + `parseInt` + range guard; DB CHECK `1-60` enforces server-side. `onSave` only fires for in-range parsed values; out-of-range shows inline `role="alert"` error.
- T-03-19 (XSS) — `plantName` rendered via React text node escaping; no `dangerouslySetInnerHTML`.

## What's left for Plan 03-05 (Wave 5)

- PostHog tracking for `mp:plant-frequency-updated` and the frequency-then-water flow.
- E2E coverage for the D-13 and D-14 case 2 paths.
- Microcopy review pass on the picker + toast strings.
- Phase 3 final docs.
