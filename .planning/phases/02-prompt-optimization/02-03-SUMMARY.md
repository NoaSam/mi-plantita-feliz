---
phase: 02-prompt-optimization
plan: 03
subsystem: ui
tags: [client, hook, types, tests, tdd, react, vitest]

requires:
  - phase: 02-prompt-optimization
    provides: "Plan 02-01 — edge function returns watering_interval_days: number | null in its Response JSON"
provides:
  - "PlantResult.watering_interval_days: number | null exposed to all hook consumers"
  - "Defensive ?? null fallback in the constructor for transient deploy windows"
  - "3 vitest cases covering positive number, explicit null, missing field"
affects: [03-calendar-v0, future PlantResultView changes]

tech-stack:
  added: []
  patterns:
    - "Passthrough-only field extension: trust server boundary, no client-side re-validation when edge function already coerces (toIntOrNull)"
    - "TDD discipline: failing tests committed first, then implementation"

key-files:
  created: []
  modified:
    - src/hooks/use-plant-identifier.ts
    - src/hooks/use-plant-identifier.test.ts

key-decisions:
  - "No zod schema — edge function toIntOrNull is the type guarantee (CONTEXT.md canonical_refs left this explicitly optional)"
  - "No PostHog payload extension — CONTEXT.md canonical_refs § Tracking: no new events in this phase"
  - "No localStorage migration — additive field, downstream Phase 3 consumers must `?? null` when reading old entries (documented contract)"

patterns-established:
  - "Additive hook field with defensive ?? null: positive + explicit null + missing-field test triad becomes the template for future PlantResult extensions"

requirements-completed: [PROM-01]

duration: ~3min
completed: 2026-05-17
---

# Phase 02 Plan 03: usePlantIdentifier watering_interval_days passthrough Summary

**`PlantResult` interface and the hook constructor now passthrough `watering_interval_days` from the edge function with `?? null` fallback; 3 vitest cases (positive 7, explicit null, missing field) cover the contract**

## Performance

- **Duration:** ~3 min
- **Completed:** 2026-05-17
- **Tasks:** 1 / 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- `PlantResult` interface extended with `watering_interval_days: number | null` between `diagnosis` and `imageUrl`
- `plantResult` constructor in the hook gained one line: `watering_interval_days: data.watering_interval_days ?? null`
- Three vitest cases added/extended in `successful identification`:
  - Existing `fetches JSON and sets result` now asserts `=== 7` after MOCK_JSON_RESPONSE bump
  - New `passes watering_interval_days=null when model is unsure` — explicit null path
  - New `defaults watering_interval_days to null when field is missing from response` — defensive deploy-window path
- Full suite: **94/94 tests pass** (was 92 before; +2 new tests, +1 assertion in existing test)
- TypeScript compiles clean
- Out-of-scope guard files untouched: `use-plant-by-id.ts`, `use-plant-history.ts`, `PlantResultView.tsx`, `track("plant_identified")` payload

## Task Commits

1. **Task 1: TDD RED** — `6a10986` (test) — failing tests committed first
2. **Task 1: TDD GREEN** — `cc00b95` (feat) — minimal implementation makes all tests pass

## Files Created/Modified
- `src/hooks/use-plant-identifier.ts` — 2 line additions (1 interface field, 1 constructor passthrough)
- `src/hooks/use-plant-identifier.test.ts` — MOCK extension + 1 assertion + 2 new `it()` blocks

## Decisions Made
- Followed plan as specified. No deviations.

## Deviations from Plan
None — plan executed exactly as written, including TDD RED → GREEN discipline.

## Issues Encountered
None.

## User Setup Required
None.

## Forward Contract for Phase 3
- **Calendar v0 consumers MUST treat `undefined` as `null`** when reading pre-Phase-2 `plant-history` localStorage entries (or pre-deploy `plant_searches` rows). The hook does NOT backfill historical data.
- The new field is `number | null` only — never undefined when read from the hook's `result` (the `?? null` constructor fallback guarantees that contract).

## Next Phase Readiness
- Phase 02 verification ready.
- Phase 03 (Calendar v0) unblocked: can read `watering_interval_days` from the hook result, from `plant_searches.watering_interval_days` rows, and from new localStorage entries.

---
*Phase: 02-prompt-optimization*
*Completed: 2026-05-17*
