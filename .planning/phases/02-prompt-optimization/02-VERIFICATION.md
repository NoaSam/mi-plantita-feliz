---
phase: 02-prompt-optimization
verifier: inline-orchestrator
status: human_needed
phase_goal: "La identificación por IA devuelve datos estructurados y fiables que el calendario puede consumir"
requirements_verified:
  - id: PROM-01
    status: passed
    evidence: "watering_interval_days returned as int|null by edge function, persisted in plant_searches, propagated through hook"
  - id: PROM-02
    status: human_needed
    evidence: "SYSTEM_PROMPT rewritten with 10-plant few-shot + uncertainty handling; benchmark tool committed but golden-set hand-labeling pending owner work (~1-2h)"
success_criteria:
  - criterion: "Cada identificación incluye un campo numérico watering_interval_days (no embebido en prosa)"
    status: passed
  - criterion: "Las identificaciones de plantas comunes del hogar son notablemente más precisas"
    status: human_needed
    note: "Tooling and prompt are in place; quantitative confirmation requires running npm run benchmark:prompt against a populated golden set"
plans_complete: 3
plans_total: 3
human_verification_items: 2
verified_at: 2026-05-17
note: "Produced inline by the orchestrator instead of spawning gsd-verifier subagent — two prior Wave 1 subagents stalled at 600s and this fallback avoids cost. Goal-backward analysis against ROADMAP success criteria + per-plan must-haves."
---

# Phase 02: prompt-optimization — Verification Report

## Phase Goal (from ROADMAP)
> La identificación por IA devuelve datos estructurados y fiables que el calendario puede consumir

## Success Criteria

### ✓ Criterion 1 — Numeric `watering_interval_days` field (not embedded in prose)
**Status: PASSED**

End-to-end evidence the field is structured and reachable by Phase 3 Calendar v0:

| Layer | Evidence |
|-------|----------|
| Database | `plant_searches.watering_interval_days integer NULL CHECK (1..60)` — migration `20260517000000_add_watering_interval_days_to_plant_searches.sql` applied to linked Supabase project (commit `7dd9562`) |
| Edge function | `parseAIResponse → toIntOrNull` coerces non-finite/out-of-range to `null`; `PlantInfo`, INSERT, Response JSON all carry the field (6 lines × 9 occurrences in `supabase/functions/identify-plant/index.ts`) |
| TypeScript types | `src/integrations/supabase/types.ts` has 3 occurrences (Row/Insert/Update) — generated via `supabase gen types --linked` |
| Client hook | `PlantResult.watering_interval_days: number \| null`; `data.watering_interval_days ?? null` passthrough in `src/hooks/use-plant-identifier.ts`; 3 vitest cases cover positive/null/missing-field paths |
| Lockstep | `scripts/benchmark-prompt.ts SYSTEM_PROMPT` byte-identical to edge function; both files carry matching `// IMPORTANT` sync comments |

### ⚠ Criterion 2 — Identifications of common home plants are notably more precise
**Status: HUMAN_NEEDED**

What shipped:
- SYSTEM_PROMPT rewritten with a 10-plant Spanish↔scientific few-shot block (Potus, Monstera, Sansevieria, Ficus lyrata, Chamaedorea, Calathea, Dracaena, Spathiphyllum, Echeveria, Cactaceae)
- Explicit uncertainty instruction added (model must say in `description` when confidence is low)
- Reusable measurement tool: `npm run benchmark:prompt` (Node CLI computing PRIMARY accuracy, SECONDARY watering coherence, SANITY non-null %) committed at `scripts/benchmark-prompt.ts`

What is **not** verifiable from the codebase:
- A quantitative before/after comparison. The plan deliberately deferred the golden-set hand-labeling to the product owner (~1-2h work, per Plan 02-02 D-12). The benchmark exits 0 with "Golden set is empty" until `scripts/.benchmark-golden-set.json` `items` is populated with 20-25 representative `model_evaluations` rows.

## Per-plan must_haves audit

### Plan 02-01 — Edge function + migration + types
| Must-have | Status |
|-----------|--------|
| D-01: `watering_interval_days` int\|null in edge function response | ✓ |
| D-02: Column nullable + check 1-60; toIntOrNull coerces out-of-range to null | ✓ |
| D-03: `consensus.ts` untouched | ✓ (zero diff vs phase base) |
| D-04: SYSTEM_PROMPT documents semantic ("frecuencia promedio anual de riego en días, planta de interior, luz indirecta, 20-22°C") | ✓ |
| D-05: Strategy = prompt-only iteration; the 3 models, pickWinner, Phase 4 SSE not touched | ✓ |
| D-06: Single shared SYSTEM_PROMPT injected to all 3 callers | ✓ |
| D-07: 10-plant few-shot, NO watering values in few-shot examples | ✓ |
| D-08: Explicit uncertainty handling | ✓ |
| `isFallbackResult` does NOT reference `watering_interval_days` | ✓ |
| `model_evaluations` schema NOT extended | ✓ |
| `npx tsc --noEmit` exit 0 | ✓ |

### Plan 02-02 — Benchmark CLI + golden set
| Must-have | Status |
|-----------|--------|
| D-09: Reproducible before/after metric possible | ✓ (tool committed) |
| D-10: Golden set sourced from `model_evaluations` (sampling SQL documented in `notes`) | ✓ (skeleton + recipe; population pending owner) |
| D-11: 3 metrics (PRIMARY accuracy ≥2/3 consensus, SECONDARY stddev, SANITY non-null %) | ✓ |
| D-12: Tool committed as recurring resource | ✓ |
| Env-var gating with clear error | ✓ |
| Read-only — zero `.from("plant_searches")` or `.from("model_evaluations")` calls | ✓ |
| `extractScientificName` + `normalizeScientificName` imported from `consensus.ts` | ✓ |
| Empty items → exit 0 (not 1) | ✓ |
| No new npm dependencies | ✓ |

### Plan 02-03 — Hook passthrough + tests
| Must-have | Status |
|-----------|--------|
| D-02: `PlantResult.watering_interval_days: number \| null` with `?? null` passthrough | ✓ |
| Existing happy-path test asserts `=== 7` | ✓ |
| New test for explicit null (model unsure) | ✓ |
| New defensive test for missing field (deploy window) | ✓ |
| Phase 3 consumers (`use-plant-by-id`, `use-plant-history`, `PlantResultView`) untouched | ✓ |
| PostHog `plant_identified` payload not extended | ✓ |
| `npm test` exit 0 | ✓ (94/94 pass) |

## Requirement traceability

| ID | Phase frontmatter | Verified |
|----|-------------------|----------|
| PROM-01 | 02-01, 02-03 | ✓ — full pipeline carries the field |
| PROM-02 | 02-01, 02-02 | ⚠ — qualitative ship (new prompt + measurement tool) done; quantitative confirmation depends on owner-populated golden set |

## Cross-phase smoke
- `consensus.ts` zero diff vs phase base (D-03) ✓
- `model_evaluations` schema untouched ✓
- No drift in `PlantResultView.tsx`, `use-plant-by-id.ts`, `use-plant-history.ts` ✓
- 3 model callers (`callClaude` / `callGemini` / `callOpenAI`) still present ✓ (`grep -c "^async function call"` returns 4 — includes `callModelTimed`)

## Human verification items
The phase ships **everything the codebase can guarantee on its own**. Two items need owner action to fully close the success criteria:

### 1. Deploy the edge function update to Supabase
**Expected:** `curl` against the live `identify-plant` function returns a JSON response that includes `watering_interval_days: <int|null>` for any test image.

**Required because:** This phase modified the edge function source but the workflow does not auto-deploy. The DB migration is already live; the function code is not. Run `supabase functions deploy identify-plant` from the project root (or trigger via CI/CD if configured).

### 2. Populate the benchmark golden set and run baseline vs new prompt
**Expected:** With 20-25 labeled images in `scripts/.benchmark-golden-set.json`, `npm run benchmark:prompt` reports:
- PRIMARY identification accuracy is **notably higher** than the same metric measured against the pre-Phase-2 prompt
- SECONDARY watering stddev is bounded (e.g., < 5 days on most photos)
- SANITY non-null rate is ≥ 80% for clearly identifiable plants

**Required because:** This is the only way to falsify "more precise identifications of common home plants" (PROM-02 / Success Criterion 2). The plan deliberately scoped golden-set labeling out of executor work.

## Verdict
**HUMAN_NEEDED** — All code-deliverable success criteria pass cleanly. Two items require external action (function deploy + golden-set labeling + benchmark run) to fully close the phase goal.

If the owner confirms both items pass after manual testing, the phase can be marked PASSED. Otherwise, gaps surface real defects that warrant a `--gaps` re-plan.

---
*Verified: 2026-05-17 inline by orchestrator (gsd-verifier subagent stall fallback)*
