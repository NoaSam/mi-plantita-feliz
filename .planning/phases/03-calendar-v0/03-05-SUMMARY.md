# Plan 03-05 — SUMMARY

**Status:** Complete
**Executed:** 2026-05-22
**Branch:** `feat/phase-3-calendar-v0`

## Tasks

| # | Task | Commit | Files |
|---|---|---|---|
| 1 | Wire `calendar_opened` in RegarPage | `9b26716` | `src/pages/RegarPage.tsx` |
| 2 | Wire `watering_logged` + `watering_undone` in useLogWatering (signature → HomePlant) | `6cb7fcd` | `src/hooks/use-log-watering.ts`, `src/hooks/use-log-watering.test.ts` |
| 3 | Wire `watering_frequency_edited` in useEditWateringInterval + source derivation | `b4dc230`, `9b26716` | `src/hooks/use-edit-watering-interval.ts`, `src/hooks/use-edit-watering-interval.test.ts`, `src/pages/RegarPage.tsx` |
| 4 | Wire `calendar_card_navigated_to_detail` + tap-to-detail | `8a328c9`, `9b26716` | `src/components/PlantWateringCard.tsx`, `src/pages/RegarPage.tsx` |
| 5 | Document Phase 3 events + funnels | `8e8899a` | `docs/posthog-events.md` |
| 6 | E2E fixture + spec (happy path + empty redirect) | `56b7c13` | `e2e/fixtures.ts`, `e2e/regar.spec.ts` |
| 7 | Microcopy review (D-15/D-16) | n/a (read-only) | — |

## Verification gates

- `npx tsc --noEmit` → 0 errors ✓
- `npm test -- --run` → 142/142 pass (was 140 — 2 new: `logWatering: pending-first plant tracks was_first_time=true` + `editInterval: fires watering_frequency_edited track`) ✓
- `npm run build` → clean (PWA precache regenerated) ✓
- `npx playwright test e2e/regar.spec.ts --list` → 2 tests recognized (mobile-chrome + mobile-safari = 4 runs) ✓
- Plan verify scripts → all checks pass ✓
- Microcopy grep matrix → 0 violations of D-15 (`bg-destructive`/`text-destructive` not in card; `soft-warn-bg` present; no URGENTE/ATRASAD/!!!) and D-16 (no `según IA`/`tú decidiste`/`IA dijo`/`inicial IA`) ✓

## Decisions reflected

- **D-17 evento 1 (`calendar_opened`)** — Dispatched once per mount via local `trackedOpen` flag (verbatim MapPage pattern). Counts derived with `computeStatus` over the current `plants` array.
- **D-17 evento 2/3 (`watering_logged`/`watering_undone`)** — `useLogWatering` signature changed from `(plantId)` to `(plant: HomePlant)` so the hook can compute `days_remaining_before` (via `computeDaysRemaining`) and `was_first_time` (= `plant.lastWateredAt === null`) without a round-trip to DB. Tracking fires AFTER the UPDATE confirms ok=true and BEFORE the CustomEvent dispatch — ordering preserves "DB persisted → analytics emitted → UI reactively refetches" causality.
- **D-17 evento 4 (`watering_frequency_edited`)** — `useEditWateringInterval.editInterval` extended with `prevDays` and `source` parameters. Source derivation lives in `RegarPage.handlePickerSave` because the page has the plant state; hook stays a thin DB+tracking primitive. Three branches:
  - `prevDays === null` → `null_filled_in_by_user` (D-14 case 2 happy path).
  - `prevDays === newDays` → `ia_initial` (no-op edit; rare).
  - else → `user_override` (user changed an existing IA value).
- **D-17 evento 5 (`calendar_card_navigated_to_detail`)** — Tap on the card body (photo + name + frequency text + badge area) navigates to `/planta/:id`. Position is 0-based in the urgency-sorted list. `RegarPage.handleNavigateToDetail` tracks before `navigate()`.

## Architectural shape

- **`useLogWatering` signature breaking change** — `(plantId)` → `(plant: HomePlant)`. Only call site was RegarPage, contained.
- **`useEditWateringInterval` signature breaking change** — 2 args → 4 args (adds `prevDays`, `source`). Only call site was RegarPage, contained. `source` typed as exported `FrequencyEditSource`.
- **Nested click areas in PlantWateringCard** — HTML disallows `<button>` inside `<button>`. The card body is now a `<div role="button" tabIndex={0}>` with `onKeyDown` for Enter/Space; the inner frequency `<button>` uses `e.stopPropagation()` so a tap on the text doesn't bubble to the card-level navigate. The bottom Regar `<button>` sits as a sibling of the role=button div, so no stopPropagation needed there.
- **Frequency-then-water with updated interval in toast** — When the picker save chains a log (D-14 case 2), `handlePickerSave` passes a synthetic `{...plant, wateringIntervalDays: newDays}` to `logWatering` so the analytics event reports the just-set interval rather than the stale `null`.

## Funnel coverage (per `docs/posthog-events.md` Phase 3 section)

- Habitual: `calendar_opened (home_count >= 1) → watering_logged (was_first_time: false)`
- Onboarding: `plant_identified → classification_action_clicked (action: 'home') → classification_completed → calendar_opened (pending_first_time_count >= 1) → watering_frequency_edited (source: 'null_filled_in_by_user') → watering_logged (was_first_time: true)`
- Exploration: `calendar_opened → calendar_card_navigated_to_detail (low position) → result_section_click`
- Mistaps: `watering_logged → watering_undone (≤4s)` (high rate signals Regar button is too easy to tap)

## Threat model spot-checks

- T-03-23 — Track payloads only contain UUIDs (no PII); consent gating at `src/lib/track.ts` no-op's when analytics consent is denied.
- T-03-25 — `navigate(`/planta/${plant.id}`)` — `plant` comes from `useHomePlants` filtered by `user_id`; no user-controlled input. No open redirect.

## What's left for Phase 3 wrap

- Smoke check the PostHog dashboard once deployed to confirm the 5 events flow in.
- `npx playwright test e2e/regar.spec.ts` to run against `npm run dev` (CI gate).
- Phase 3 verifier run + final merge to `main`.
