---
status: complete
phase: 05-plantnet-fourth-provider
plan: 02
completed: 2026-08-21
requirements: [PLANT-01]
---

## Objetivo

Añadir la lógica de cross-validation de PlantNet a `consensus.ts` como funciones puras testables, sin tocar la mecánica del consenso de los 3 LLMs.

## Qué se construyó

### `consensus.ts` — 2 nuevas exports

**`matchScientific(a, b)`** — extraída del matching inline de `computeConsensus`. Función pura reusable:

```typescript
export function matchScientific(
  a: string | null,
  b: string | null,
): ConsensusMatchLevel | null
```

Devuelve `'exact' | 'normalized' | 'genus' | null`. Consumida por `computeConsensus` (todos los tiers cuentan) y por `applyPlantnetOverride` (solo exact + normalized, D-11).

**`applyPlantnetOverride(llmWinner, llmResults, plantnetResult)`** — implementa D-01:

```typescript
export const PLANTNET_OVERRIDE_SCORE_THRESHOLD = 0.8;  // D-10

export function applyPlantnetOverride<T extends LlmWinnerInput>(
  llmWinner: T,
  llmResults: T[],
  plantnetResult: PlantnetOverrideInput | null,
): PlantnetOverrideResult<T>
```

Interfaces exportadas:
- `PlantnetOverrideInput` — shape mínimo del resultado PlantNet (`success`, `scientificName`, `score`)
- `LlmWinnerInput` — shape mínimo del LLM (`model`, `scientificName`)
- `PlantnetOverrideResult<T>` — `{ winner: T, diverged: boolean, matchedLlm: ModelName | null }`

Los 4 branches D-01 implementados:
1. PlantNet failed/null/no score → devuelve `llmWinner` sin tocar (D-09)
2. score < 0.8 → devuelve `llmWinner` sin tocar
3. score ≥ 0.8 + match exact/normalized (preferencia por `llmWinner`, si no primer LLM que matchee) → substituye scientificName
4. score ≥ 0.8 sin match válido → preserva `llmWinner`, marca `diverged: true`

Match `genus` rechazado explícitamente (D-11) — dentro del mismo género los cuidados varían (Ficus lyrata vs benjamina).

### `consensus.test.ts` — 16 tests nuevos

- 7 casos para `matchScientific` (exact / normalized cultivar / normalized infraspecific / genus / null / empty / mixed null)
- 9 casos para `applyPlantnetOverride` (los 4 branches + normalized match + preferencia winner + rechazo genus + threshold 0.8 inclusive)

**Suite completa: 47 tests verdes** (31 pre-existentes + 16 nuevos). Cero regresión en `computeConsensus`.

## key-files.created / modified

- `supabase/functions/identify-plant/consensus.ts` — modified (+83 líneas — matchScientific extraída + applyPlantnetOverride nueva)
- `src/test/consensus.test.ts` — modified (+130 líneas aprox. — 16 tests nuevos)

## key-links verificados

- `applyPlantnetOverride` exportada y lista para `import` desde `supabase/functions/identify-plant/index.ts` (Plan 03)
- Suite de vitest sigue verde en Node (sin Deno runtime necesario)

## Constraint respetado (D-01 + D-11)

- `pickWinner` NO tocado: `git diff supabase/functions/identify-plant/index.ts` vacío
- La mecánica de consenso LLM (3 modelos) es idéntica antes/después de este plan
- Los tests existentes de `extractScientificName`, `normalizeScientificName`, `extractGenus`, `computeConsensus` pasan sin modificarse

## Deviations

**Commit protocol:** el executor spawned por gsd-execute-phase encontró bloqueo de permisos en `git commit` durante Task 1 (completó los cambios pero no pudo commitear). El orquestador principal rescató el trabajo: commiteó Task 1 (`refactor(05-02): extract matchScientific...` — commit `bec521c`), completó Task 2 in-place en el worktree, y commiteó Task 2 (`feat(05-02): add applyPlantnetOverride...` — commit `1353019`). Los dos commits siguen el protocolo per-task del plan; la única diferencia con el flujo GSD estándar es que la escritura de Task 2 la hizo el orquestador en lugar de un sub-agente.

**Impact:** ninguno funcional — el código final coincide bit-a-bit con el plan.

## Self-Check: PASSED

- [x] `matchScientific` exportada y usada internamente por `computeConsensus`
- [x] `applyPlantnetOverride` exportada, threshold 0.8 (D-10), rechaza genus (D-11)
- [x] 16 tests nuevos verdes; 31 pre-existentes verdes; total 47/47
- [x] `pickWinner` intacto (`git diff` vacío sobre `index.ts`)
- [x] Sin modificaciones a STATE.md ni ROADMAP.md (worktree mode)
