# Phase 2: Prompt Optimization — Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Reescribir el `SYSTEM_PROMPT` del edge function `supabase/functions/identify-plant/index.ts` para que:

1. **Devuelva `watering_interval_days` como campo numérico estructurado** en el JSON response (cumple PROM-01, desbloquea Phase 3 Calendar v0). El resto del JSON (`name`, `description`, `care`, `diagnosis`) mantiene su contrato actual.
2. **Mejore precisión de identificación** de plantas comunes del hogar mediante iteración del prompt (sin cambiar modelos ni añadir steps de validación).

Acompaña el cambio con una **herramienta recurrente de benchmark** (script + golden set committeado) que valida la mejora antes/después de forma reproducible.

**No entra en esta fase:** Calendar UI (Phase 3), persistencia DB + backfill de filas históricas (queda como gray area abierta para el planner — ver `<deferred>`), cambio de modelos, paso de validación cruzada.

</domain>

<decisions>
## Implementation Decisions

### Alcance del JSON estructurado

- **D-01:** **Solo `watering_interval_days`** se añade al JSON. El resto del contrato (`name`, `description`, `care`, `diagnosis`) queda intacto. El campo `care` markdown sigue siendo la fuente canónica para la UI (`PlantResultView` lo renderiza). Razón: mínimo viable que cumple PROM-01 y desbloquea Calendar v0; no añadimos campos sin consumer claro.
- **D-02:** **Tipo del campo: `number | null`.** Si el modelo no puede determinar la frecuencia con confianza, devuelve `null`. Calendar v0 (Phase 3) mostrará al usuario un default genérico editable en lugar del valor. La IA admite no saber; el producto decide qué mostrar. No inventamos números.
- **D-03:** **Valor que llega al cliente cuando los 3 modelos disienten en frecuencia: el del winner del consenso de nombre.** Consistente con cómo se eligen hoy `care`, `description` y `diagnosis` (función `pickWinner` en `supabase/functions/identify-plant/index.ts`). Cero lógica nueva en `consensus.ts`. Si confiamos en la identificación del modelo ganador, confiamos en su frecuencia.
- **D-04:** **Semántica del número: frecuencia promedio anual** para una planta de interior en condiciones típicas (luz indirecta, 20-22°C). El prompt instruye explícitamente esta semántica. Calendar v0 muestra ese valor base; el ajuste manual estacional y por entorno se difiere a v1+ (alineado con `RIEG-02` parcial y RIEG-08 v2).

### Estrategia para 'más precisión'

- **D-05:** **Solo iterar el system prompt.** No se cambian modelos (Claude Sonnet 4 / Gemini 2.5 Flash Lite / GPT-4o se mantienen), no se añade paso de validación cruzada ni re-prompt. Iteración rápida, cero coste extra, cero cambio de stack.
- **D-06:** **Prompt único compartido para los 3 modelos.** Sigue el patrón actual (un solo `SYSTEM_PROMPT` inyectado a `callClaude`, `callGemini`, `callOpenAI`). Evita drift y deuda de mantenimiento. Si un modelo se porta peor, se mejora el prompt global o se discute cambiar el modelo en otra fase — no se mantienen 3 prompts paralelos.
- **D-07:** **Few-shot solo de nombres canónicos (5-10 plantas comunes).** Lista en el prompt con pares `nombre común español canónico ↔ nombre científico` para reducir drift de nomenclatura entre modelos (e.g. evitar que un modelo diga "potus", otro "pothos", otro "póthos" — rompe el match del consensus). **NO se incluyen valores de `watering_interval_days` en los examples** para no sesgar al modelo hacia números preestablecidos; el riego queda a juicio del modelo. Coste de tokens mínimo (~100-200 extra una vez).
- **D-08:** **Manejo de incertidumbre en identificación.** Instrucción explícita al modelo: si no estás seguro, devuelve la planta más probable e indica claramente en `description` que la confianza es baja y por qué (e.g. "esta podría ser X, pero por Y no estoy del todo seguro"). `watering_interval_days` puede ser `null` o el de la mejor opción. El usuario tiene info útil; el consensus algorithm ya filtra: si los 3 modelos disienten, no hay match level alto y el output refleja la incertidumbre real.

### Medición del 'más preciso'

- **D-09:** **Golden set + comparación antes/después.** Criterio cuantitativo: el prompt nuevo gana al baseline en accuracy de identificación. Reproducible, defendible, sirve para futuras iteraciones de prompt. Sin esto la fase no tiene success criteria objetivo.
- **D-10:** **Construcción del golden set: muestra real de `model_evaluations` existing.** Sacar 20-25 filas históricas con su `image_url`, etiquetar manualmente. Pros: datos reales de la app, fotos con la misma distribución que los usuarios. Contras: requiere triaging manual.
- **D-11:** **Etiquetado: solo nombre, no riego.** Para cada foto del set, se etiqueta ground truth de identificación (nombre científico esperado). Para `watering_interval_days` NO hay etiqueta de verdad — se mide **coherencia** del consensus: ¿los 3 modelos están más de acuerdo entre sí en frecuencia que antes? Reduce trabajo de etiquetado a la mitad y evita inventarse "el riego correcto" para cada planta. Métrica principal: % de fotos donde ≥2 modelos identifican el nombre científico correcto. Métrica secundaria: stddev de `watering_interval_days` entre los 3 modelos (más bajo = más coherente).
- **D-12:** **Herramienta recurrente en el repo.** Script en `scripts/` (o ubicación equivalente decidida por el planner) + golden set como JSON committeado. Cualquier futuro cambio de prompt o modelo puede correr el benchmark contra el mismo set. ROI alto si vuelves a tocar prompts. Etiquetado manual del set: ~1-2h de la dueña del producto (la curación queda fuera del scope del executor — esta fase produce la herramienta y el golden set inicial).

### Claude's Discretion (planner/researcher deciden)

- **Persistencia en DB de `watering_interval_days` + backfill de filas históricas.** No se discutió en esta sesión. El planner debe decidir: (a) columna `watering_interval_days int` nueva en `plant_searches` con migración explicit-GRANT (sigue `supabase/MIGRATION_CONVENTIONS.md`), (b) si las filas históricas se quedan NULL (Calendar v0 las ignora hasta nueva identificación) o se backfillean (regex sobre `care` markdown / re-llamar IA). Recomendación heurística para el planner: columna nueva nullable + NULL para históricas en esta fase; backfill se difiere a v1+ tras feedback real de Calendar v0.
- **Modelo concreto en Claude Sonnet 4 (`claude-sonnet-4-20250514`).** El planner puede evaluar (sin obligación) si conviene actualizar a una versión más reciente del mismo tier mientras se toca el archivo. No es objetivo de la fase pero es low-cost si la API lo permite.
- **Formato exacto de los few-shot examples en el prompt** (lista markdown vs JSON inline vs YAML) y selección concreta de las 5-10 plantas — el planner / executor eligen siguiendo best practices del modelo.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked requirements
- `.planning/REQUIREMENTS.md` § Prompts — `PROM-01` (`watering_interval_days` numérico estructurado) y `PROM-02` (precisión). Locked.
- `.planning/ROADMAP.md` § Phase 2 — Goal y success criteria oficiales.

### Migration conventions
- `supabase/MIGRATION_CONVENTIONS.md` — Si esta fase añade columna a `plant_searches`, la migración DEBE incluir GRANT explícitos (`authenticated` + `service_role`) y RLS, según la convención obligatoria desde el 30 oct 2026.

### Files to be modified (read before changing)
- `supabase/functions/identify-plant/index.ts` — Contiene `SYSTEM_PROMPT` (líneas 16-48), `USER_MESSAGE` (línea 50), tipos `PlantInfo` / `ModelResult`, parseo y consensus. El cambio principal vive aquí: nuevo SYSTEM_PROMPT + extender `PlantInfo` con `watering_interval_days: number | null` + extender `parseAIResponse` para validar/coerce el nuevo campo.
- `supabase/functions/identify-plant/consensus.ts` — Lógica de `extractScientificName` y `computeConsensus`. NO se modifica en esta fase (D-03 reutiliza el winner existente; coherencia de riego se mide fuera, no afecta selección).
- `src/integrations/supabase/types.ts` — Regenerar tras migración (`supabase gen types`) si se añade columna a `plant_searches` (discreción del planner).
- `src/hooks/use-plant-identifier.ts` — Consume la respuesta del edge function. Probable que necesite reflejar el nuevo campo en su tipo de respuesta (sin lógica nueva: solo passthrough).
- `src/types/` — Si existe un tipo `PlantData` o `PlantResult` compartido cliente↔server, debe extenderse.

### Codebase intelligence
- `.planning/codebase/ARCHITECTURE.md` — Flujo de identificación (cliente → edge function → 3 modelos → consensus → DB + response).
- `.planning/codebase/CONVENTIONS.md` — Patrones de error handling en Spanish, naming, path alias `@/`.
- `.planning/codebase/CONCERNS.md` — Issue documentado: "Untyped response parsing from edge function" (`use-plant-identifier.ts` líneas 88-94, sin schema validation). Esta fase es buena oportunidad para añadir validación runtime del nuevo campo (no obligatorio; planner decide alcance).
- `.planning/codebase/TESTING.md` — Vitest, tests co-located (`*.test.ts(x)`). El test existente `src/hooks/use-plant-identifier.test.ts` debe actualizarse para reflejar el nuevo campo.

### Tracking and analytics
- `docs/posthog-events.md` — Contrato de eventos existente. **Esta fase no añade eventos nuevos** (no es feature visible al usuario; cambio backend transparent salvo el dato extra). Si el planner detecta necesidad de un evento de telemetría para tracking de coherencia (e.g. `prompt_uncertainty_returned`), confirmarlo antes.

### Phase context downstream (no son inputs, son consumers)
- `.planning/phases/02.1-foundations-classification-result-actions-reveal/02.1-CONTEXT.md` — Phase 02.1 dejó claro que **NO** edita `watering_interval_days` ni interfiere con esta fase. Su scope (columna `context`) es ortogonal.
- Phase 3 (Calendar v0) — Consumer principal del nuevo campo. Las decisiones de esta fase deben ser suficientes para que Phase 3 pueda planear sin re-abrir el contrato.

### Project conventions
- `CLAUDE.md` — UI en español, código en inglés, mobile-first, API keys solo en server (edge functions), accesibilidad básica.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`SYSTEM_PROMPT` constant** (`supabase/functions/identify-plant/index.ts` líneas 16-48) — fuente única de verdad del prompt. Compartido entre los 3 modelos. Reescribir aquí.
- **`callModelTimed` wrapper** — captura latencia y errores por modelo. Sin cambios necesarios; el nuevo prompt se inyecta vía la constante.
- **`parseAIResponse`** (líneas 218-241) — parser con `toStr` helper. Extender con un `toIntOrNull` (o equivalente) para `watering_interval_days`; rechazar valores fuera de rango razonable (e.g. < 1 o > 60 días → null).
- **`isFallbackResult`** — detecta cuando el parseo devolvió todo fallback. El nuevo campo no debería entrar en la detección de fallback (su null es legítimo).
- **`computeConsensus` y `pickWinner`** — selección del modelo ganador. Sin cambios. D-03 reutiliza este winner para el valor de `watering_interval_days` que llega al cliente.
- **`model_evaluations` tabla** — ya guarda `raw_name`, `scientific_name`, `description`, `care`, `diagnosis`, `response_ms`, `success`, `error_message`, `is_winner`, `consensus_group`, `consensus_match_level` por modelo. Es la fuente para extraer el golden set (D-10) y posiblemente para guardar `watering_interval_days` por modelo (decisión del planner: extender el schema de `model_evaluations` o solo medirlo en runtime del benchmark).

### Established Patterns

- **Prompt sharing pattern:** una sola constante de prompt → inyectada a los 3 modelos vía sus respectivas APIs. Mantener.
- **Strict JSON contract:** prompt instruye "SOLO con un JSON válido (sin texto antes ni después)" + `parseAIResponse` hace fallback graceful si parsing falla. Mantener este contrato: el nuevo campo `watering_interval_days` se añade dentro del mismo objeto JSON.
- **Spanish output / English code:** todos los strings que ve el usuario (description, care, diagnosis, fallbacks) en español; código, comentarios, identifiers en inglés. El nuevo campo es un número, no necesita traducción.
- **Error handling Spanish:** mensajes de error user-facing en español, errores técnicos en logs.
- **Edge function devuelve JSON o stream SSE** (Phase 4 introdujo SSE). Cualquier extensión del shape del JSON debe reflejarse en ambos paths de respuesta.

### Integration Points

- **Edge function → Cliente:** El cliente (`src/hooks/use-plant-identifier.ts`) consume el JSON del edge function via SSE stream. El nuevo campo `watering_interval_days` llega como propiedad adicional del objeto winner; passthrough simple.
- **Edge function → DB (`plant_searches`):** El INSERT actual (`index.ts` líneas 386-400) escribe `name`, `description`, `care`, `diagnosis`, `image_url`, `model`, `user_id|anonymous_id`, `lat`, `lng`, `context`. Si el planner decide persistir `watering_interval_days` como columna (recomendación heurística), el INSERT añade `watering_interval_days: winner.plantInfo!.watering_interval_days`.
- **Edge function → DB (`model_evaluations`):** Inserta una fila por modelo. Si el planner decide trackear `watering_interval_days` por modelo (útil para la métrica de coherencia D-11), añadir la columna al schema y al INSERT.
- **Benchmark script → modelos:** El nuevo script reusa la lógica de `callClaude`, `callGemini`, `callOpenAI` (probablemente vía import desde `supabase/functions/identify-plant/index.ts` o duplicación controlada). Lee golden set JSON, llama los 3 modelos por cada foto, computa accuracy + coherencia, emite reporte. El planner decide si vive en `scripts/` o `tools/` o similar.

</code_context>

<specifics>
## Specific Ideas

- **Plantas candidatas para el few-shot de nombres (D-07):** potus, monstera deliciosa, sansevieria, ficus, palmera de salón (chamaedorea), calathea, dracena, espatifilo, suculentas (echeveria), cactus. Lista de referencia para el planner/executor; la selección final puede ajustarse según frecuencia real en `model_evaluations`.
- **Rango aceptable de `watering_interval_days`:** entre 1 y 60 días. Valores fuera del rango → coerce a `null` (probablemente alucinación del modelo).
- **Tamaño del golden set:** 20-25 fotos (suficiente para detectar regresiones, manejable para etiquetado manual).
- **Métricas del benchmark:**
  - **Primaria:** % de fotos donde ≥2 de 3 modelos devuelven `scientific_name` que matchea el ground truth (a nivel exact / normalized / genus — reutilizar `MATCH_LEVEL_RANK` existente).
  - **Secundaria:** stddev de `watering_interval_days` entre los 3 modelos (proxy de coherencia ante ausencia de ground truth).
  - **Sanity:** % de modelos que devuelven `watering_interval_days` no-null (que el prompt esté efectivamente activando el campo).
- **Criterio de "notablemente más preciso":** prompt nuevo gana al baseline en métrica primaria por al menos +10 puntos porcentuales, o reduce stddev de la métrica secundaria en al menos 30%, sin regresiones en sanity.

</specifics>

<deferred>
## Deferred Ideas

- **Persistencia DB de `watering_interval_days` + backfill de filas históricas** — no se discutió en esta sesión; queda como discreción del planner (ver `<decisions>` § Claude's Discretion). Si el planner detecta ambigüedad alta, replantear vía `/gsd-discuss-phase 2 --update`.
- **Estructurar más campos del care** (light_level, temperature_range, fertilizer_frequency_days) — descartado en D-01 por no tener consumer claro. Reabrir si Calendar v1+ o cards de home necesitan datos estructurados adicionales.
- **Cambiar modelos** (Claude Sonnet → Opus, Gemini Flash Lite → Pro) — descartado en D-05 por coste y latencia. Reabrir si tras Phase 2 el benchmark muestra que el prompt no es suficiente.
- **Paso de validación cruzada / re-prompt para casos ambiguos** — descartado en D-05. Reabrir si tras Phase 2 hay un patrón claro de falsos positivos que un segundo round corregiría.
- **Prompts especializados por modelo** — descartado en D-06. Reabrir si un modelo concreto se comporta consistentemente peor.
- **Eventos PostHog de telemetría del prompt** (e.g. `prompt_uncertainty_returned`, `watering_null_returned`) — no decidido. Discreción del planner si detecta valor de tracking.
- **Backfill de `model_evaluations` con `watering_interval_days`** — solo si el planner decide extender ese schema. Para esta fase, basta con que el benchmark mida coherencia en runtime sin necesidad de columna histórica.
- **Editar `watering_interval_days` manualmente desde el cliente** — Phase 3 / Phase v1+ (RIEG-02 marca esto como "editable por el usuario", pero v0 solo lee la sugerencia de la IA).

### Reviewed Todos (not folded)

Ninguno — no había todos pendientes que cruzaran con el scope de esta fase.

</deferred>

---

*Phase: 02-prompt-optimization*
*Context gathered: 2026-05-17*
