# Phase 5: PlantNet as Fourth Identification Provider — Context

**Gathered:** 2026-08-15
**Status:** Ready for planning

> **Nota sobre el reshape:** El ROADMAP original describía Phase 5 como "Identification Engine v2 — Pl@ntNet + 1 LLM" con reemplazo total de la arquitectura 3-LLM. En discuss-phase (2026-08-15) la CPO redirigió el scope: en vez de reemplazar, **añadir Pl@ntNet como 4º proveedor en paralelo** manteniendo los 3 LLMs actuales, y validar con datos si merece la pena migrar la arquitectura en una fase posterior. La versión "reemplazo total" queda como candidate futuro (posible Phase 5.1).

<domain>
## Phase Boundary

Extender `supabase/functions/identify-plant/` para llamar a la API de **PlantNet** en paralelo con los 3 LLMs actuales (Claude Sonnet 4, Gemini 2.5 Flash Lite, GPT-4o). La respuesta JSON completa de PlantNet se persiste en la DB siguiendo el patrón de `model_evaluations`. Se extiende `docs/model-evaluation-queries.sql` con consultas nuevas para analizar la accuracy de PlantNet vs los 3 LLMs sobre el golden set existente de Phase 2.

**PlantNet corre como observador silencioso:** su respuesta se guarda pero NO influye en el consenso ni en lo que ve el usuario en producción. La UX de identificación se mantiene exactamente igual a hoy. El único cambio observable por el usuario podría ser una leve variación de latencia (Promise.race first-winner sigue devolviendo el primer LLM ganador, PlantNet completa en paralelo sin bloquear).

**Deliverable de análisis:** al final de la fase existen queries SQL documentadas en `docs/model-evaluation-queries.sql` que responden a "¿acierta PlantNet más que los 3 LLMs en accuracy top-1 sobre el golden set?". La decisión de si PlantNet gana voto real (o reemplaza a algún LLM) se difiere a Phase 5.1 candidate en función de esos datos.

**NO entrega:**
- Cambios en el consenso actual (`consensus.ts` intacto)
- Cambios visibles al usuario
- Kill-switch (no hay arquitectura que revertir; si PlantNet falla, se guarda `null` para esa fila y ya)
- Benchmark automatizado (queries SQL manuales, patrón existente)
- Reemplazo de ningún LLM

</domain>

<decisions>
## Implementation Decisions

### Rol de PlantNet en el sistema

- **D-01: Observador silencioso.** PlantNet corre en paralelo con los 3 LLMs actuales pero NO participa en el consenso ni en lo que ve el usuario. Los 3 LLMs siguen decidiendo el `winner` y el output visible es idéntico a hoy. Razón: cero riesgo de regresión en producción; queremos DATOS antes de darle voto real. Si el análisis revela que PlantNet es notablemente mejor, se abre Phase 5.1 candidate para darle voto real (o reemplazar arquitectura).
- **D-02: 100% invisible al usuario en el flujo de identificación.** Sin badges, sin señales, sin cambio de UI. Coherente con el modo observador silencioso — no confundir al usuario con un proveedor cuya influencia real está aún por decidir.

### Persistencia de la respuesta

- **D-03: Guardar el JSON completo de PlantNet** (no top-1, no top-3 — response entera). Coste: ~2-5KB por identificación → asumible al volumen actual (~15-30 identificaciones/día = ~150KB/día). Razón: máximo detalle para futuras métricas que hoy no imaginamos (top-5 con scores, alternativas parecidas, familias, distribuciones geográficas si PlantNet las devuelve). La decisión de qué extraer se toma en tiempo de análisis, no en tiempo de escritura.
- **D-04: Siguiendo el patrón existente de `model_evaluations`.** Recomendación fuerte al planner: extender esa tabla con `model = 'plantnet'` como 4º valor posible, reutilizar la columna `raw_name` para el nombre científico top-1 (facilita queries sin JSON introspection) y añadir columna nueva `raw_response jsonb` para el JSON completo. Alternativa peor: tabla nueva `plantnet_evaluations` — duplica esquema, complica queries agregadas. Planner valida esta recomendación contra el schema actual.

### Métricas y análisis

- **D-05: Métrica principal = top-1 exact match** del nombre científico devuelto por PlantNet contra el ground truth del golden set. Directamente comparable con los LLMs (que también devuelven un único nombre). Métrica estricta pero limpia.
- **D-06: Reutilizar el golden set existente de Phase 2** (~24 fotos etiquetadas en `scripts/`, ver `scripts/bootstrap-golden-set.ts` y `scripts/benchmark-prompt.ts`). No re-etiquetar. Si el planner detecta que 24 fotos es muestra insuficiente para diferencia estadísticamente significativa, puede proponer ampliar el set (esa decisión sube a la CPO).
- **D-07: Deliverable de análisis = queries SQL documentadas en `docs/model-evaluation-queries.sql`.** Siguiendo el patrón que ya existe para los 3 LLMs (tasa de éxito, latencia, tasa de consenso, match levels). Ampliar ese archivo con secciones nuevas específicas de PlantNet: (a) tasa de éxito PlantNet vs LLMs, (b) top-1 accuracy contra golden set, (c) latencia PlantNet vs LLMs, (d) casos donde PlantNet difiere del winner LLM y merecen revisión manual. NO benchmark script propio, NO dashboard, NO report automatizado — CPO corre las queries en Supabase SQL Editor cuando quiere insights.

### Tier de PlantNet

- **D-08: Free tier (500 requests/día) inicialmente.** El volumen actual (~15-30 identificaciones/día en producción) cabe con margen amplio. El benchmark contra el golden set de 24 fotos ni acerca al límite. Si en algún momento la app crece y roza el techo, el planner define el path a paid ($30/mes por 5K/día). Sin sorpresas al inicio: si excedes el límite un día, esa identificación guarda `null` para PlantNet (no bloquea al usuario, sigue funcionando con los 3 LLMs actuales).

### Failure mode

- **D-09: PlantNet falla silenciosamente.** Si la API cae, timeout excedido, quota superada, o cualquier error 4xx/5xx → esa identificación guarda `null` en el registro de PlantNet. NO bloquea al usuario, NO cambia el flujo de los 3 LLMs, NO se muestra error. El usuario recibe su identificación exactamente igual que hoy. Este comportamiento es consecuencia natural del modo observador silencioso (D-01).

### Claude's Discretion (planner/researcher deciden)

- **Timeout de la llamada a PlantNet.** Recomendación: similar a los LLMs actuales (~5-10s). No debe bloquear el Promise.race first-winner del SSE.
- **Esquema exacto de persistencia.** Recommendation en D-04 es extender `model_evaluations` con `model='plantnet'` + columna `raw_response jsonb`. Planner verifica contra el schema actual y confirma o propone alternativa. Si añade columna, migración con GRANT explícitos por `supabase/MIGRATION_CONVENTIONS.md`.
- **Extracción del nombre científico top-1 de la response** para la columna `raw_name` (facilita queries). El planner define la lógica de extracción según el JSON schema real de PlantNet API.
- **Variable de entorno para la API key.** Convención probable: `PLANTNET_API_KEY` en Supabase Function Secrets (mismo patrón que `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`).
- **Retry policy en 429 rate-limit.** Planner decide si hay retry con backoff o si se acepta el fallo silencioso (más simple, coherente con D-09).
- **Estructura exacta del payload que se envía a PlantNet** (URL de imagen vs upload directo del blob) — depende del schema de la API. Reutilizar la URL HTTPS del bucket `plant-images` si PlantNet acepta URL público.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked scope + phase context
- `.planning/ROADMAP.md` § Phase 5 — Será actualizado tras esta discussion para reflejar el reshape (añadir PlantNet como 4º proveedor). La versión "reemplazo total" queda como Phase 5.1 candidate.
- `.planning/REQUIREMENTS.md` — No hay requirements formales para Phase 5 aún. Se derivarán de este CONTEXT.md durante planning.
- `.planning/phases/02-prompt-optimization/02-CONTEXT.md` — Precedente directo del enfoque de benchmark de esta fase. D-11 (métrica: % top-1 match) y D-12 (benchmark tool en `scripts/`) son la base sobre la que se construye.

### Files to be modified (read before changing)
- `supabase/functions/identify-plant/index.ts` — Contiene la orquestación actual de 3 LLMs (`callClaude`, `callGemini`, `callOpenAI`) con `Promise.race` para first-winner SSE + persistencia en `model_evaluations`. Aquí se añade la 4ª llamada a PlantNet en paralelo. Fixture: NO se toca `consensus.ts` (D-01 observador silencioso).
- `supabase/functions/identify-plant/consensus.ts` — NO se modifica en esta fase. Los 3 LLMs siguen decidiendo el consenso como hoy. PlantNet no vota.
- `docs/model-evaluation-queries.sql` — Se extiende con secciones nuevas: (a) success rate PlantNet vs 3 LLMs, (b) top-1 accuracy PlantNet contra golden set, (c) latencia comparada, (d) casos de divergencia PlantNet vs winner LLM. Seguir el estilo existente (comentarios en español, queries copy-pasteables a Supabase SQL Editor).
- `scripts/benchmark-prompt.ts` — Si el planner decide extender el script para incluir PlantNet en la ejecución del benchmark (opcional; las queries SQL directamente sobre `model_evaluations` pueden bastar). Planner decide si tocar o no.
- `scripts/bootstrap-golden-set.ts` — Referencia del schema del golden set. NO se toca (se reutiliza el set existente).
- `src/integrations/supabase/types.ts` — Regenerar tras migración si se añade columna a `model_evaluations` (`supabase gen types`).

### Migration conventions
- `supabase/MIGRATION_CONVENTIONS.md` — Si esta fase añade columna a `model_evaluations` (probable per D-04), la migración DEBE incluir GRANT explícitos (`authenticated` + `service_role`) y RLS, según la convención obligatoria desde 2026-10-30.

### Codebase intelligence
- `.planning/codebase/ARCHITECTURE.md` — Flujo actual de identificación (cliente → edge function → 3 modelos → consensus → SSE + DB).
- `.planning/codebase/CONVENTIONS.md` — Patrones de naming, error handling en español, path alias `@/`.
- `.planning/codebase/TESTING.md` — Vitest, tests co-located.

### External APIs
- PlantNet API docs — https://my.plantnet.org/doc (schema del response, límites, autenticación por API key). Researcher debe leerlo antes de planificar el payload.
- PlantNet console — https://my.plantnet.org (registrar cuenta, sacar API key). La CPO debe hacer esto ANTES de execute (blocker manual, ~5 min).

### Tracking and analytics
- `docs/posthog-events.md` — Esta fase NO añade eventos PostHog nuevos por defecto. Si el planner detecta valor en trackear "plantnet_success" / "plantnet_disagreed" para analítica de producto, confirmarlo con la CPO antes de añadir.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `model_evaluations` table + `raw_name` + `raw_response` (si se añade) columns: patrón directo, extensión mínima para incluir PlantNet como 4º modelo
- `docs/model-evaluation-queries.sql`: patrón de análisis vía queries SQL documentadas; extender con secciones nuevas para PlantNet
- `scripts/bootstrap-golden-set.ts` + golden set etiquetado de Phase 2 (~24 fotos): reutilizable directamente para el benchmark de PlantNet
- Promise.race + SSE first-winner ya implementado (Phase 4): la 4ª llamada a PlantNet se suma sin cambiar el patrón de streaming
- Convención `<PROVIDER>_API_KEY` en Supabase Function Secrets: aplicar `PLANTNET_API_KEY`

### Established Patterns
- **Persistencia por modelo:** `model_evaluations` almacena una fila por modelo por identificación (3 hoy → 4 con PlantNet). Columnas comunes: `model`, `success`, `response_ms`, `raw_name`, `consensus_group`, `consensus_match_level`. La convención se mantiene.
- **Análisis por SQL directo:** el equipo (la CPO) analiza calidad de modelos con queries en Supabase SQL Editor, no con scripts CLI. Coherente con `docs/model-evaluation-queries.sql`.
- **Observer-only providers:** patrón nuevo introducido por esta fase. Es un provider más de identificación cuya respuesta se registra pero no altera el output visible. Base para futuras evaluaciones de proveedores externos (iNaturalist, Google Vision, etc.) sin regresión de producción.

### Integration Points
- Edge function `identify-plant` — punto único donde se orquestan los proveedores. Añadir 4ª promesa en paralelo.
- Migración SQL para añadir columna a `model_evaluations` — sigue `supabase/MIGRATION_CONVENTIONS.md`.
- `docs/model-evaluation-queries.sql` — extensión, no reescritura.

</code_context>

<specifics>
## Specific Ideas

- **"Como hasta ahora con las queries en SQL documentadas"** (CPO, 2026-08-15) — el análisis vive en `docs/model-evaluation-queries.sql`, no en un script CLI aparte ni en un dashboard. La CPO abre Supabase SQL Editor, copia-pega, obtiene números.
- **JSON completo** de PlantNet, no top-1 recortado. Razón: no sabemos hoy qué campos serán útiles mañana; guardar ancho es barato ahora, re-hacer la ingesta sería caro después.

</specifics>

<deferred>
## Deferred Ideas

- **Phase 5.1 candidate — Dar voto real a PlantNet en el consenso.** Si los datos que produzca Phase 5 (queries SQL sobre `model_evaluations`) muestran que PlantNet acierta significativamente más que los 3 LLMs en top-1 accuracy contra el golden set, abrir Phase 5.1 para (a) darle voto real, (b) definir threshold de score mínimo, (c) definir el peso relativo (igual a los LLMs, mayor por especialista). Trigger: >10 puntos de diferencia sostenida.
- **Phase 5.2 candidate — Reemplazo de la arquitectura 3-LLM.** La visión original de Phase 5 (Pl@ntNet + 1 LLM en vez de 3 LLMs) queda diferida indefinidamente. Solo tiene sentido si (a) datos de Phase 5 respaldan que PlantNet es especialista superior, Y (b) mantener 3 LLMs deja de aportar valor de consensus. Rescatar solo con datos.
- **Dashboard visual de PlantNet vs LLMs.** Descartado en discuss-phase por preferencia de la CPO por queries SQL. Reactivar solo si compartir hallazgos con terceros lo pide.
- **Ampliar golden set más allá de las 24 fotos originales de Phase 2.** No requerido hoy. Planner puede proponerlo si detecta necesidad estadística; queda como decisión abierta.
- **Traducción del nombre común español desde el JSON de PlantNet.** PlantNet devuelve nombres comunes en varios idiomas. Como es observador silencioso, no se muestra al usuario, y el LLM winner sigue devolviendo el nombre común en español. Si en Phase 5.1 PlantNet gana voto, esto pasa a ser gray area.

### Reviewed Todos (not folded)
None — no había todos matcheando el scope de Phase 5.

</deferred>

---

*Phase: 5-plantnet-fourth-provider*
*Context gathered: 2026-08-15*
