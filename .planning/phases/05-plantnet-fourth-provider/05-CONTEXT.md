# Phase 5: PlantNet as Fourth Voter (Cross-Validated) — Context

**Original gathered:** 2026-08-15 (silent observer scope)
**Reshape:** 2026-08-18 (active voter with cross-validation)
**Status:** Ready for planning

> **Reshape note (2026-08-18):** El scope original era añadir PlantNet como **observador silencioso** que registrase su respuesta en DB y se analizase vía queries SQL de accuracy top-1 contra el golden set. Durante latency benchmark (10 iteraciones × 4 proveedores, ver `05-BENCHMARK.md`) descubrimos que:
> 1. **PlantNet es 3-6× más rápido que los LLMs** (p50 307ms vs 917-1843ms) — invalida la preocupación original de que su vote no llegase a tiempo al SSE first-winner.
> 2. **El golden set está contaminado** (bootstrapped con PlantNet en mayo 2026) — invalida cualquier query de accuracy PlantNet vs LLMs porque PlantNet compite consigo mismo.
>
> La CPO decidió repivotar: PlantNet **sí vota activamente** en el consenso, con una regla de **cross-validation** que preserva coherencia entre el nombre mostrado y los cuidados del LLM. Las queries de accuracy se descartan; se sustituyen por queries de **divergencia** (cuándo PlantNet difiere de los LLMs, para análisis futuro).

<domain>
## Phase Boundary

Extender `supabase/functions/identify-plant/` para llamar a la API de **PlantNet** en paralelo con los 3 LLMs actuales (Claude Sonnet 4, Gemini 2.5 Flash Lite, GPT-4o). PlantNet **vota** en el consenso siguiendo la regla de cross-validation (D-11). Su respuesta JSON completa se persiste en la DB. Se añade una columna `plantnet_diverged bool` a `plant_searches` para marcar los casos donde PlantNet difiere del winner LLM. Se dispara un evento PostHog `plantnet_divergence` en esos casos. Se extiende `docs/model-evaluation-queries.sql` con una query nueva para revisar los casos de divergencia.

**UX visible al usuario: cero cambios respecto a hoy.** El nombre común español y todos los campos de cuidados los sigue aportando el LLM ganador. PlantNet solo puede sobrescribir el nombre científico, y solo cuando hay cross-validation exitosa (D-10 + D-11).

**Deliverable de análisis:** query SQL documentada en `docs/model-evaluation-queries.sql` que responde a "¿en qué casos PlantNet difirió de los LLMs y quién tenía razón?". La CPO ejecuta la query en Supabase SQL Editor cuando quiere revisar divergencias. NO benchmark de accuracy (descartado por contaminación del golden set).

**NO entrega:**
- Cambios visibles al usuario en el flujo de identificación (sin badges, sin señales, sin cambio de UI)
- Queries de accuracy top-1 vs golden set (descartado)
- Kill-switch (no hay arquitectura crítica que revertir; si PlantNet falla, degrada silenciosamente a 3 LLMs)
- Benchmark automatizado
- Reemplazo de ningún LLM
- Rediseño de `pickWinner` o cambio de la lógica de mayoría de los LLMs (el consenso LLM existente se mantiene; PlantNet se inserta como capa adicional según D-01)
- Traducción de nombres comunes desde el JSON de PlantNet (los LLMs siguen aportando el común español)

</domain>

<decisions>
## Implementation Decisions

### Rol de PlantNet (post-reshape)

- **D-01: Votante activo con regla de cross-validation.** PlantNet participa en el consenso siguiendo esta lógica exacta:
  - **Si `score ≥ 0.8` Y ≥1 LLM devuelve el mismo científico (match exacto o normalizado, ver D-11)** → PlantNet **manda el nombre científico**; el LLM alineado aporta el nombre común español + care + diagnosis + watering + description. Coherencia garantizada.
  - **Si `score ≥ 0.8` Y ningún LLM coincide** → **mandan los LLMs** (mayoría normal entre los 3); PlantNet queda sin efecto en este caso. Se registra la divergencia (D-12). Este caso protege contra la incoherencia de "nombre PlantNet + cuidados LLM de otra especie".
  - **Si `score < 0.8`** → PlantNet cuenta como **1 voto de 4**; la mayoría gana. Si empate 2-2, el consenso queda "low confidence" (comportamiento existente).
  - **Si PlantNet falla (timeout, quota, 4xx/5xx)** → **3 LLMs deciden como hoy** (D-09). Sin cambio percibido.

- **D-02: 100% invisible al usuario en el flujo de identificación.** Sin badges, sin señales de "confirmado por PlantNet", sin cambio de UI. El usuario ve exactamente lo mismo que hoy — nombre común español + nombre científico (a veces "corregido" por PlantNet, pero de forma opaca) + care + diagnosis + watering.

### Persistencia de la respuesta

- **D-03: Guardar el JSON completo de PlantNet** en `model_evaluations.raw_response` (columna nueva `jsonb`). No top-1 recortado — respuesta entera. Coste ~2-5KB por identificación, asumible al volumen actual (~15-30 identificaciones/día). Razón: máximo detalle para futuras métricas que hoy no imaginamos.

- **D-04: Extender `model_evaluations`** con `model='plantnet'` como 4º valor + añadir columna nueva `raw_response jsonb`. Adicionalmente: añadir columna `plantnet_diverged bool default false` a `plant_searches` para marcar casos de divergencia (D-12). Migración con GRANT explícitos donde aplique según `supabase/MIGRATION_CONVENTIONS.md` (ALTER TABLE sobre tablas existentes NO requiere GRANTs nuevos por la cláusula "existing tables keep their grants").

### Regla de cross-validation y matching

- **D-10: Umbral de score para "PlantNet manda" = 0.8.** Elegido como balance entre conservador (0.9 = casi nunca pisa) y agresivo (0.6 = pisa demasiado en fotos ambiguas). Precedente en el código: `scripts/bootstrap-golden-set.ts` usa `SCORE_THRESHOLD = 0.5` para ground truth; usamos 0.8 más estricto para el override en producción. Reversible sin migración (constante en código).

- **D-11: Regla de match entre PlantNet y LLM = exacto O normalizado; NO género.** Reutilizar la función `matchScientific` existente en `supabase/functions/identify-plant/consensus.ts` que ya tiene 3 niveles (`exact`, `normalized`, `genus`). Para el cross-validation solo cuentan `exact` y `normalized`. Match `genus` NO cuenta — razón: dentro del mismo género los cuidados pueden variar mucho (Ficus lyrata vs Ficus benjamina) y aceptar match a nivel de género rompería la garantía de coherencia entre nombre y cuidados.

### Métricas y análisis

- **D-07: Query SQL nueva de DIVERGENCIA en `docs/model-evaluation-queries.sql`.** Sustituye a las queries originales de accuracy (descartadas por D-06 removed). La query nueva responde: "¿en qué identificaciones PlantNet difirió del LLM winner? ¿con qué frecuencia? ¿en qué familias de plantas ocurre más?". La CPO ejecuta manualmente en Supabase SQL Editor cuando quiere revisar. Copy-pasteable, comentario en español, estilo consistente con las 12 queries existentes.

- **D-12: Registro de divergencia — DOS canales:**
  - **Flag en DB:** columna `plant_searches.plantnet_diverged bool default false`. Se marca `true` cuando `score ≥ 0.8` y ningún LLM coincide con PlantNet. Consultable vía la query nueva de D-07.
  - **Evento PostHog:** `plantnet_divergence` disparado desde la edge function en esos mismos casos. Payload sugerido: `{plantnet_scientific, plantnet_score, llm_winner_scientific, llm_winner_model, plant_search_id}`. Permite a la CPO consumir divergencias en el dashboard PostHog sin abrir SQL. Consistente con `docs/posthog-events.md` (planner debe documentar el evento nuevo ahí).

### Latencia y observabilidad de rendimiento

- **D-13: Latency medida en benchmark 2026-08-18 confirma que PlantNet no gate el SSE first-winner.** Datos:
  - PlantNet: p50 **307ms**, p95 695ms, siempre gana el race (10/10)
  - GPT-4o: p50 1009ms, p95 1335ms
  - Gemini: p50 917ms, p95 3585ms (con outlier)
  - Claude: p50 1843ms, p95 2975ms (nunca gana)
  - **Consecuencia:** PlantNet llega ~600ms ANTES que cualquier LLM. Su vote está siempre disponible cuando el primer LLM completa. Cero latencia extra para el usuario. Ver `05-BENCHMARK.md` para el detalle completo.

### Tier + failure mode

- **D-08: Free tier PlantNet (500 requests/día) inicialmente.** El volumen actual (~15-30 identificaciones/día en producción) cabe con margen amplio. Si en algún momento se roza el techo, planner define path a paid ($30/mes por 5K/día). Comportamiento en quota exhaustion: se aplica D-09 (fallo silencioso, 3 LLMs deciden).

- **D-09: PlantNet falla silenciosamente.** Si la API cae, timeout excedido, quota superada, o cualquier error 4xx/5xx → esa identificación guarda `null` en la fila de PlantNet en `model_evaluations`. NO bloquea al usuario, NO cambia el flujo de los 3 LLMs (deciden solos como hoy), NO se muestra error. El usuario recibe su identificación exactamente igual que hoy. Este comportamiento es consecuencia natural del cross-validation (D-01): si no hay PlantNet, no hay override, mandan los LLMs.

### Claude's Discretion (planner/researcher deciden)

- **Timeout de la llamada a PlantNet.** Recomendación: 5s (holgado sobre p95 medido de 695ms). No debe bloquear el consenso final; si tarda más de 5s → aplica D-09.
- **Payload multipart** con blob local (patrón ya probado en `scripts/bootstrap-golden-set.ts` líneas 100-112). NO usar URL pública del bucket (mixed content, dependencia extra).
- **Retry policy en 429 rate-limit.** Recomendación: NO retry, aceptar el fallo silencioso (más simple, coherente con D-09 y consistente con el patrón actual de los LLMs).
- **Variable de entorno para la API key.** Convención: `PLANTNET_API_KEY` en Supabase Function Secrets (mismo patrón que `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`).
- **Modificación de `consensus.ts`.** Requiere añadir función nueva de cross-validation. Preservar `pickWinner` y `computeConsensus` existentes (los 3 LLMs siguen decidiendo entre sí exactamente como hoy). La lógica de override PlantNet se aplica DESPUÉS del pickWinner LLM, no dentro de él.
- **Structure exacta del PostHog event.** Planner define keys/valores del payload en base al patrón de `docs/posthog-events.md`. Debe incluir suficiente info para debuggear un caso concreto sin abrir DB.
- **Extracción de `results[0].species.scientificNameWithoutAuthor`** del JSON de PlantNet. Edge cases: `results[]` vacío → tratar como fallo (D-09); score < 0.8 sin candidates altos → aplica D-01 branch 3 (vota como uno más).

### Removed decisions (superseded by reshape 2026-08-18)

- ~~**D-05: Métrica principal = top-1 exact match** contra golden set~~ — golden set contaminado, PlantNet vota directo, no necesitamos esta métrica.
- ~~**D-06: Reutilizar golden set de Phase 2**~~ — contaminación (bootstrap con PlantNet) invalida cualquier comparación PlantNet vs LLMs sobre ese set. Se abandona el uso del golden set para esta fase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked scope + phase context
- `.planning/ROADMAP.md` § Phase 5 — a actualizar tras el reshape para reflejar "4º proveedor votante" en lugar de "observador silencioso".
- `.planning/REQUIREMENTS.md` — `PLANT-01/02/03` ya formalizados (commit `4e5acdf`). El planner puede necesitar reformular PLANT-02 (era "queries copy-pasteables"; ahora es "query de divergencia + evento PostHog").
- `.planning/phases/05-plantnet-fourth-provider/05-BENCHMARK.md` — resultados del latency benchmark 2026-08-18 que justifican D-13 (a generar por el planner o al final de la fase).
- `.planning/phases/05-plantnet-fourth-provider/05-RESEARCH.md` — mayormente válido (API contract, migration conventions, patrones de código). **Ignorar:** Pitfall #1 sobre golden set (ya no aplica, no vamos a hacer accuracy queries) y las 4 queries SQL de accuracy propuestas (sustituidas por la query única de divergencia).
- `.planning/phases/05-plantnet-fourth-provider/05-PATTERNS.md` — patrones de código analog siguen válidos (self-analog para orchestration, migration analog).
- `.planning/phases/02-prompt-optimization/02-CONTEXT.md` — precedente del enfoque de benchmark (Phase 2 introdujo el golden set y `model_evaluations`).

### Files to be modified (read before changing)
- `supabase/functions/identify-plant/index.ts` — orquestación actual de 3 LLMs con `Promise.race` first-winner + persistencia en `model_evaluations`. Aquí se añade la 4ª llamada a PlantNet + la lógica de cross-validation post-race. Reutilizar patrones de `callClaude`/`callGemini`/`callOpenAI` para `callPlantnet` (ver `05-RESEARCH.md` L~238-308 para la función escrita verbatim, adaptable).
- `supabase/functions/identify-plant/consensus.ts` — **SÍ se modifica en esta fase** (nuevo comportamiento vs CONTEXT original). Añadir función `applyPlantnetOverride(llmWinner, plantnetResult): { winner, diverged }` que implementa D-01 usando `matchScientific` existente (D-11). Preservar `pickWinner` y `computeConsensus` (los 3 LLMs siguen decidiendo entre sí como hoy; el override PlantNet es una capa POSTERIOR).
- `docs/model-evaluation-queries.sql` — se extiende con **1 query nueva** de divergencia PlantNet vs LLMs (no 4 como en CONTEXT original). Copy-pasteable, comentario español, estilo consistente.
- `docs/posthog-events.md` — se extiende con documentación del evento nuevo `plantnet_divergence` (nombre, payload keys, cuándo dispara). Consistente con formato existente.
- `src/integrations/supabase/types.ts` — regenerar tras migración (`supabase gen types typescript --project-id sdxrgxfmurshrnrnvhda`) para reflejar columnas nuevas (`raw_response`, `plantnet_diverged`).

### Migration conventions
- `supabase/MIGRATION_CONVENTIONS.md` — ALTER TABLE sobre `model_evaluations` (widen CHECK + add column) y sobre `plant_searches` (add column) NO requieren GRANTs nuevos por la cláusula "existing tables keep their grants". Migración simple.

### Codebase intelligence
- `.planning/codebase/ARCHITECTURE.md` — flujo actual (cliente → edge function → 3 modelos → consensus → SSE + DB).
- `.planning/codebase/CONVENTIONS.md` — naming, error handling en español, path alias `@/`.
- `.planning/codebase/TESTING.md` — Vitest, tests co-located. Tests actuales de `identify-plant/` mockean fetch completo; añadir 4ª llamada no rompe (verificado en `05-RESEARCH.md`).

### External APIs
- PlantNet API docs — https://my.plantnet.org/doc/api/identify. Endpoint `/v2/identify/{project}` con project=`all`. Auth vía query string `api-key`.
- PlantNet console — https://my.plantnet.org/account/api. **API key ya generada por la CPO** durante el benchmark (2026-08-18). CPO debe añadirla como `PLANTNET_API_KEY` a Supabase Function Secrets antes de execute.

### Tracking and analytics
- `docs/posthog-events.md` — añadir evento `plantnet_divergence` según D-12. Payload debe incluir suficiente info para debuggear un caso concreto (`plantnet_scientific`, `plantnet_score`, `llm_winner_scientific`, `llm_winner_model`, `plant_search_id`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`matchScientific` function** en `consensus.ts` con 3 niveles (`exact`, `normalized`, `genus`). Se reutiliza para D-11 filtrando a solo `exact + normalized`.
- **`pickWinner` + `computeConsensus`** en `consensus.ts` — se preservan intactos. El cross-validation es una capa nueva que se aplica POST-pickWinner.
- **`model_evaluations` table + patrón de 1 fila por modelo por identificación** — se extiende con `model='plantnet'` (4º valor) + columna `raw_response jsonb`.
- **`docs/model-evaluation-queries.sql`** — 12 queries existentes, estilo español, patrón `GROUP BY model`. Se extiende con 1 query nueva de divergencia.
- **Promise.race + SSE first-winner** (Phase 4) — se preserva. PlantNet entra en un `Promise.allSettled` paralelo pero NO participa en el `race` que dispara SSE al usuario (el race sigue siendo entre los 3 LLMs para respetar el patrón de streaming; PlantNet completa antes que cualquier LLM per D-13, así su resultado está siempre listo cuando se calcula el consenso final).
- **Convención `<PROVIDER>_API_KEY`** en Supabase Function Secrets → aplicar `PLANTNET_API_KEY`.
- **PostHog client** ya integrado (v1.3.0 en producción, ver `docs/posthog-events.md`). Añadir evento nuevo siguiendo el patrón existente.

### Established Patterns
- **Fallo silencioso por modelo:** cada LLM tiene su propio `try/catch` que registra fallo en `model_evaluations` sin propagar. PlantNet sigue el mismo patrón (D-09).
- **Persistencia por modelo:** 3 filas hoy → 4 con PlantNet. Columnas comunes: `model`, `success`, `response_ms`, `raw_name`, `consensus_group`, `consensus_match_level`. `raw_response` es columna nueva (D-04) para el JSON completo.
- **Cross-validation es nuevo:** este patrón no existe hoy. Se introduce como función pura `applyPlantnetOverride(llmWinner, plantnetResult)` en `consensus.ts` para poder testearlo unitariamente.

### Integration Points
- **Edge function `identify-plant`** — punto único de orquestación. Añadir 4ª promesa + llamada a `applyPlantnetOverride` + set flag `plantnet_diverged` + dispatch PostHog event `plantnet_divergence` en su caso.
- **Migración SQL** — 1 migración con: widen CHECK constraint en `model_evaluations.model` (3→4), add `raw_response jsonb`, add `plant_searches.plantnet_diverged bool default false`.
- **`docs/model-evaluation-queries.sql`** — append 1 query nueva al final.
- **`docs/posthog-events.md`** — append documentación del evento nuevo.

</code_context>

<specifics>
## Specific Ideas

- **Cross-validation elimina la incoherencia:** el usuario nunca ve "Ficus lyrata + cuidados de Ficus benjamina". Si PlantNet difiere del LLM ganador → mandan los LLMs (coherentes consigo mismos). Ver el ejemplo trabajado en la conversación de 2026-08-18.
- **PlantNet aporta más valor cuando los LLMs se pelean:** en escenarios donde los 3 LLMs devuelven especies distintas (ej: calatheas parecidas), PlantNet actúa de árbitro y elegimos el LLM alineado con él. Sin PlantNet, esos casos hoy son "low confidence" opaco.
- **Benchmark 2026-08-18:** PlantNet p50 307ms, gana race 10/10, ~600ms antes que cualquier LLM. Ver `05-BENCHMARK.md`. Este dato es lo que desbloqueó el pivote de "silent observer" a "active voter" — la preocupación original de "PlantNet llegará tarde" quedó desmentida empíricamente.
- **PostHog + DB flag son redundantes intencionalmente:** DB flag para consultas ad-hoc SQL (retrospectiva completa); PostHog event para dashboards y alertas en tiempo casi-real. Los dos existen porque tienen consumo distinto.

</specifics>

<deferred>
## Deferred Ideas

- **Phase 5.1 candidate — Eliminar Claude.** Hallazgo del benchmark 2026-08-18: Claude **nunca gana el race** (0/10 iteraciones), p50 1843ms vs Gemini 917ms / GPT-4o 1009ms. Es el LLM más caro y el más lento. Su "voto" en el consenso llega siempre tarde para el SSE (pero cuenta para el consenso post-facto). Merece decisión futura: ¿mantenerlo por diversidad de opinión o retirarlo por coste/latencia? Revisar tras 2-4 semanas de datos de divergencia (Phase 5 ya rodando).

- **Phase 5.2 candidate — Reemplazo de arquitectura 3-LLM por PlantNet + 1 LLM.** La visión original (Pl@ntNet + 1 LLM sustituyendo los 3) queda diferida. Solo tiene sentido si datos post-Phase 5 respaldan que el consenso simplificado (PlantNet + 1) no degrada calidad vs 4 votantes. Rescatar solo con evidencia.

- **Ajuste del umbral 0.8 con datos reales.** D-10 se fija en 0.8 por convención. Tras 2-4 semanas de tráfico, revisar si 0.8 produce demasiados overrides o demasiados pocos y ajustar. Cambio trivial (constante en código, no migración).

- **Dashboard visual de divergencias.** Descartado — CPO prefiere SQL + PostHog events. Reactivar solo si compartir hallazgos con terceros lo pide.

- **Recalibrar el golden set (o crear uno nuevo).** No aplica para Phase 5 (no usamos golden set). Si en futuras fases necesitamos ground truth fiable, bootstrap con criterio manual o con un modelo distinto a PlantNet.

- **Traducción del nombre común español desde el JSON de PlantNet.** Los LLMs siguen aportando el común (D-02, D-01). Si Phase 5.1 elimina Claude o simplifica, revisar si el común del LLM ganador es suficiente en todos los casos.

### Reviewed Todos (not folded)
None — no había todos matcheando el scope de Phase 5.

</deferred>

---

*Phase: 5-plantnet-fourth-provider*
*Context originally gathered: 2026-08-15*
*Reshaped: 2026-08-18 (post-benchmark + cross-validation decision)*
