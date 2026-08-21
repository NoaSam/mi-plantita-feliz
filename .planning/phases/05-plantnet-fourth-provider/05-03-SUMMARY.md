---
phase: 05-plantnet-fourth-provider
plan: "03"
subsystem: edge-function-integration
tags: [edge-function, plantnet, cross-validation, posthog, deno]
dependency_graph:
  requires: [05-01-schema-migration-file, 05-02-consensus-override, 05-01-types-bridge]
  provides: [plantnet-4th-caller, override-integration, plantnet-row-persistence, divergence-flag, divergence-event]
  affects: [production-identify-plant-endpoint]
tech_stack:
  added: [plantnet-api, posthog-server-side-capture]
  patterns: [promise-allsettled-4-callers, split-llm-vs-plantnet, fire-and-forget-analytics, fail-open-secret]
key_files:
  created: []
  modified:
    - supabase/functions/identify-plant/index.ts
decisions:
  - "PlantNet corre en paralelo con los 3 LLMs vía Promise.allSettled (4 promesas totales), timeout 10s < LLM 15s"
  - "pickWinner sigue recibiendo SOLO llmResults — consensus.ts intacto (D-01)"
  - "applyPlantnetOverride wire post-pickWinner: sustituye scientific_name del winner alineado si score ≥ 0.8 + match exact/normalized"
  - "Divergencia (score ≥ 0.8 sin match) marca plantnet_diverged=true + dispara evento PostHog server-side"
  - "El name mostrado al usuario mantiene el string original del LLM alineado (D-02: 100% invisible al usuario)"
  - "Fail-open en POSTHOG_PROJECT_API_KEY: warn + skip evento; DB flag sigue funcionando (canales redundantes)"
metrics:
  duration: "~10 min ejecución"
  completed_tasks: 2
  total_tasks: 5
  deferred_tasks: 3
  completed_date: "2026-08-21"
---

# Phase 5 Plan 03: Edge Function — 4ª Llamada PlantNet + Cross-Validation

**One-liner:** El edge function `identify-plant` llama a PlantNet como 4º proveedor en paralelo con los 3 LLMs, aplica cross-validation (D-01/D-10/D-11), persiste una 4ª fila con `raw_response` completo, marca divergencias en `plant_searches.plantnet_diverged`, dispara evento PostHog server-side. El response al cliente NO cambia (D-02).

## Cambios en `supabase/functions/identify-plant/index.ts`

**+244 líneas / -48 líneas** — todo dentro del mismo archivo.

### Task 1 — `callPlantnetTimed` + Promise.allSettled a 4

- **Imports:** añadidos `applyPlantnetOverride` + `type PlantnetOverrideInput` desde `./consensus.ts`
- **Constante:** `PLANTNET_TIMEOUT_MS = 10_000` (comentada como más corto que LLM_TIMEOUT_MS por diseño D-13)
- **Interface + función `callPlantnetTimed`** (~82 líneas nuevas):
  - `PlantnetEvaluationResult` incluye `score: number | null` (necesario para D-10 threshold)
  - Multipart FormData con blob desde base64, `organs=auto`, `nb-results=5`, `lang=es`
  - Sin `include-related-images` (evita inflación storage — Pitfall #6 de RESEARCH.md)
  - Fail silencioso (D-09): PLANTNET_API_KEY faltante devuelve `success=false`, no throw
  - Timeout normalizado a `TIMEOUT:plantnet:10000ms`; 429 → `RATE_LIMIT:plantnet:429`
- **Promise.allSettled ampliado:** ahora tiene 4 elementos (3 LLMs + `callPlantnetTimed`)
- **Split explícito:** `llmSettled` (3 items ModelResult) + `plantnetSettled` (1 item PlantnetEvaluationResult)
- **`llmResults`** y **`plantnetResult`** derivados del split; `allResults` eliminado
- **Log `perModelSummary`:** rehecho como IIFE para incluir la línea plantnet con score

### Task 2 — Override + persistencia + PostHog

- **STEP 2b nuevo (post-pickWinner):** construye `plantnetInput` (adapta `PlantnetEvaluationResult` a `PlantnetOverrideInput`), llama `applyPlantnetOverride(winner, llmResults, plantnetInput)`, extrae `finalWinner` + `diverged`
- **Logs de observabilidad:** cuando hay override o cuando hay divergencia, log explícito con LLM winner original + PlantNet + score
- **STEP 4 (plant_searches):** usa `finalWinner`, añade `plantnet_diverged: diverged` (D-12)
- **STEP 5 (model_evaluations):**
  - LLM rows: mantienen todos los campos + `raw_response: null`
  - Nueva `plantnetRow`: `model: 'plantnet'`, `is_winner: false` (D-01), `raw_response: plantnetResult.rawResponse` (D-03), sin description/care/diagnosis
  - Combinadas en `evaluationRows = plantnetRow ? [...llmRows, plantnetRow] : llmRows`
  - Insert fire-and-forget como antes
- **STEP 5b — PostHog dispatch:** `fetch("https://eu.i.posthog.com/capture/", ...)` con `event: "plantnet_divergence"` + payload de 5 propiedades (matchea documentación de Plan 04). `AbortSignal.timeout(2_000)` + `.catch` — nunca bloquea al usuario. Fail-open: si `POSTHOG_PROJECT_API_KEY` no está, log warn y sigue
- **STEP 6 (response):** `modelsSummary` construido de `llmResults` (3 items, plantnet NO expuesto — D-02), `is_winner` referenciado contra `finalWinner.model`, `consensusReached` mira consenso del `finalWinner.model`

### `pickWinner` intacto

`pickWinner(llmResults)` — nunca recibe plantnet. La mecánica LLM sigue siendo idéntica a pre-Phase-5.

## Ajuste vs plan original

**Bridge de types.ts:** el plan asumía que Task 3 de 05-01 ya había regenerado `types.ts` con las columnas nuevas. La CPO deferió `supabase db push` (Opción 3 del checkpoint). Para que 05-03 pudiera compilar, el orquestador **augmentó `types.ts` manualmente** con `raw_response: Json | null` en `model_evaluations` y `plantnet_diverged: boolean` en `plant_searches` (commit `6a382e3`). Este bridge es aditivo y matchea el output esperado de `supabase gen types`. Cuando la CPO regenere post-push, `git diff` debería ser vacío en estos campos.

## Tareas pendientes (CPO manual)

| Task | Descripción | Bloqueante para |
|------|-------------|-----------------|
| 3 | Verificar `POSTHOG_PROJECT_API_KEY` en Function Secrets (o skip) | Solo evento PostHog (fail-open) |
| 4 | `supabase functions deploy identify-plant --project-ref sdxfxkqzgnonxfshbjfc` | Que PlantNet actúe en producción |
| 5 | Smoke test manual — 3-5 identificaciones reales | Validar UX invisible + 4 filas + raw_response |

**Precondición crítica antes del deploy (Task 4):** la migración de Plan 01 debe estar aplicada. Sin ella, los INSERTs con `raw_response`/`plantnet_diverged` fallarán por columnas inexistentes. Ver `05-01-SUMMARY.md § Task 3 pendiente`.

**Orden sugerido para la CPO cuando vuelva al terminal:**
```bash
# 1. Aplicar migración de Plan 01
npx supabase link --project-ref sdxfxkqzgnonxfshbjfc
npx supabase db push --linked
npx supabase gen types typescript --project-id sdxfxkqzgnonxfshbjfc > src/integrations/supabase/types.ts
git diff src/integrations/supabase/types.ts    # debería ser vacío en las columnas nuevas
git add -A && git commit -m "chore(05-01): regenerate supabase types after db push"

# 2. Verificar/registrar POSTHOG_PROJECT_API_KEY en Dashboard Secrets (o skip)

# 3. Deploy edge function
npx supabase functions deploy identify-plant --project-ref sdxfxkqzgnonxfshbjfc

# 4. Smoke test manual (Task 5 de 05-03 + Plan 05 completo)
```

## Verificación automática

- [x] `callPlantnetTimed` añadido
- [x] `PLANTNET_TIMEOUT_MS = 10_000` definido y usado
- [x] `applyPlantnetOverride` importado y aplicado
- [x] Promise.allSettled con 4 promesas
- [x] `pickWinner(llmResults)` (sin plantnet)
- [x] `plantnet_diverged` insertado en `plant_searches`
- [x] 4ª fila `model: 'plantnet'` con `raw_response`
- [x] `event: "plantnet_divergence"` dispatched en divergencia
- [x] `modelsSummary` construido desde `llmResults` (3 items, plantnet invisible)
- [x] `npm run test -- --run`: **195/195 verdes**
- [x] `npm run build`: OK

## Self-Check: PASSED (código); PARTIAL (fase — deploy + smoke test pending)

Todo lo automatizable está hecho. Los 3 pasos manuales quedan documentados y con comandos exactos para copy-paste.
