# Phase 5: PlantNet as Fourth Identification Provider — Pattern Map

**Mapped:** 2026-08-15
**Files analyzed:** 4 (3 MODIFY + 1 CREATE)
**Analogs found:** 4 / 4 (100%, todos en el propio repo)

Rol de este documento: cada fichero nuevo o modificado tiene un análogo directo en el codebase. La estrategia es "copy-paste + extend", no "invent from scratch". No hay ficheros sin análogo — todos los patrones existen ya.

---

## File Classification

| Fichero | Rol | Data Flow | Analog más cercano | Match |
|---------|-----|-----------|--------------------|-------|
| `supabase/functions/identify-plant/index.ts` | edge function / provider orchestrator | request-response + fire-and-forget analytics | (mismo fichero, `callClaude` / `callGemini` / `callOpenAI` + `Promise.allSettled` STEP 1 + STEP 5 insert) | exact (self-analog) |
| `supabase/migrations/{ts}_add_plantnet_to_model_evaluations.sql` | DB migration (schema extension) | DDL | `supabase/migrations/20260413000000_add_consensus_match_level.sql` | exact (mismo tipo: ALTER TABLE + add column) |
| `docs/model-evaluation-queries.sql` | analytics doc | read-only SQL | (mismo fichero, secciones 1/2/3 existentes) | exact (self-analog, appending new section) |
| `src/integrations/supabase/types.ts` | generated types | N/A (regenerated from schema) | Comando `npx supabase gen types typescript --project-id <ID>` (RESEARCH.md L458-459) | no manual analog — auto-generated |

---

## Pattern Assignments

### 1. `supabase/functions/identify-plant/index.ts` (MODIFY)

**Rol:** edge function orchestrator (Deno runtime, Supabase Functions)
**Data Flow:** request-response al cliente + fire-and-forget insert a `model_evaluations` en paralelo
**Analog:** el propio fichero — patrón "N-way provider fan-out con Promise.allSettled + persistencia por fila". La cuarta llamada (PlantNet) sigue el mismo shape que `callClaude` con ajustes: multipart FormData en vez de JSON, extracción `scientificNameWithoutAuthor` en vez de parsear markdown, y `raw_response jsonb` en el insert.

**Copy from these excerpts:**

#### A. Import + timeout constant pattern (líneas 1-6, 95, 99-101)

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type ModelName,
  extractScientificName,
  computeConsensus,
} from "./consensus.ts";

const LLM_TIMEOUT_MS = 15_000;

function isAbortError(e: unknown): boolean {
  return e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError");
}
```

Añadir junto a `LLM_TIMEOUT_MS`:
```typescript
const PLANTNET_TIMEOUT_MS = 10_000;  // < 15s LLM para no ser cuello de botella (D-09)
```

#### B. Provider caller pattern — copiar shape de `callClaude` (líneas 103-152)

```typescript
async function callClaude(base64Data: string, mediaType: string): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      headers: { /* ... */ },
      body: JSON.stringify({ /* ... */ }),
    });
  } catch (e) {
    if (isAbortError(e)) throw new Error(`TIMEOUT:claude:${LLM_TIMEOUT_MS}ms`);
    throw e;
  }

  if (!response.ok) {
    const t = await response.text();
    console.error("claude API error:", response.status, t);
    throw new Error(
      response.status === 429
        ? "RATE_LIMIT:claude:429"
        : `API_ERROR:claude:${response.status}`
    );
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}
```

**Adaptar para PlantNet** (el researcher ya escribió esta función en RESEARCH.md líneas 238-308 — el planner debe copiarla verbatim). Diferencias clave respecto a `callClaude`:
- Devuelve `PlantnetEvaluationResult` (no `string`) — no hay parseo intermedio de JSON de LLM
- `body: FormData` con `images` + `organs=auto` (no JSON body)
- URL: `https://my-api.plantnet.org/v2/identify/all?api-key=...&nb-results=5&lang=es`
- Manejo de error idéntico: `RATE_LIMIT:plantnet:429` / `API_ERROR:plantnet:${status}` / `TIMEOUT:plantnet:${ms}ms`

#### C. Timed wrapper pattern (líneas 307-340) — NO reutilizable directamente

`callModelTimed` asume `caller: () => Promise<string>` con parseo markdown (LLM). PlantNet devuelve `unknown` (JSON). Crear `callPlantnetTimed` con el mismo esqueleto try/catch + `Date.now()` start/end, pero devolviendo `PlantnetEvaluationResult` directamente (sin `parseAIResponse` ni `isFallbackResult`).

#### D. Promise.allSettled fan-out (líneas 389-397)

```typescript
// STEP 1: Call all models in parallel (each guarded by LLM_TIMEOUT_MS).
// If one hangs / errors, the other two still produce a consensus.
const step1Start = Date.now();
const settled = await Promise.allSettled([
  callModelTimed("claude", () => callClaude(base64Data, mediaType)),
  callModelTimed("gemini", () => callGemini(base64Data, mediaType)),
  callModelTimed("gpt4o",  () => callOpenAI(base64Data, mediaType)),
]);
const step1Ms = Date.now() - step1Start;
```

**Extend to 4 promesas** (añadir 4º item):
```typescript
const settled = await Promise.allSettled([
  callModelTimed("claude", () => callClaude(base64Data, mediaType)),
  callModelTimed("gemini", () => callGemini(base64Data, mediaType)),
  callModelTimed("gpt4o",  () => callOpenAI(base64Data, mediaType)),
  callPlantnetTimed(base64Data, mediaType),  // 4ª, shape diferente
]);
```

Luego SPLIT (RESEARCH.md L200-210): `llmResults = settled.slice(0, 3)`, `plantnetResult = settled[3]`. `pickWinner(llmResults)` — NO tocar (D-01).

#### E. Per-model logging pattern (líneas 401-409)

```typescript
const perModelSummary = settled.map((s, i) => {
  const modelName = (["claude", "gemini", "gpt4o"] as const)[i];
  if (s.status === "fulfilled") {
    const r = s.value;
    return `${modelName}=${r.success ? "ok" : (r.errorMessage ?? "fail")}(${r.responseMs}ms)`;
  }
  return `${modelName}=REJECTED`;
}).join(" ");
console.log(`[identify] STEP 1 done in ${step1Ms}ms — ${perModelSummary}`);
```

**Extend:** cambiar tuple a `["claude", "gemini", "gpt4o", "plantnet"] as const`. `plantnetResult` no tiene `plantInfo` pero sí `success`/`errorMessage`/`responseMs` — el shape es lo suficientemente parecido para reutilizar el bloque con un cast local.

#### F. Fire-and-forget insert pattern (líneas 484-511)

```typescript
if (searchRow && allResults.length > 0) {
  const evaluationRows = allResults.map((r) => {
    const consensus = r.success ? (consensusGroups.get(r.model) ?? null) : null;
    return {
      plant_search_id: searchRow.id,
      model: r.model,
      raw_name: r.rawName,
      scientific_name: r.scientificName,
      description: r.plantInfo?.description ?? null,
      care: r.plantInfo?.care ?? null,
      diagnosis: r.plantInfo?.diagnosis ?? null,
      response_ms: r.responseMs,
      success: r.success,
      error_message: r.errorMessage,
      is_winner: r.model === winner.model,
      consensus_group: consensus?.verdict ?? null,
      consensus_match_level: consensus?.matchLevel ?? null,
    };
  });

  // Don't await — let it complete in the background
  supabaseAdmin
    .from("model_evaluations")
    .insert(evaluationRows)
    .then(({ error: evalError }) => {
      if (evalError) console.error("model_evaluations insert error:", evalError);
    });
}
```

**Extend:** añadir campo `raw_response: null` a cada fila LLM y push de la 4ª fila `plantnet` con `raw_response: plantnetResult.rawResponse`, `is_winner: false`, `consensus_group: null`, `consensus_match_level: null` (D-01 no vota). El código exacto ya está en RESEARCH.md L317-372.

#### G. STEP 6 response — NO exponer plantnet al cliente (líneas 513-524)

```typescript
const modelsSummary = allResults.map((r) => {
  const consensus = r.success ? (consensusGroups.get(r.model) ?? null) : null;
  return {
    model: r.model,
    success: r.success,
    scientific_name: r.scientificName,
    response_ms: r.responseMs,
    is_winner: r.model === winner.model,
    consensus_verdict: consensus?.verdict ?? null,
  };
});
```

**NO modificar.** `allResults` ya es `llmResults` post-split — PlantNet queda fuera del `modelsSummary` que se serializa al cliente (D-02 invisible). Documentar en comentario que la exclusión es intencional.

---

### 2. `supabase/migrations/{ts}_add_plantnet_to_model_evaluations.sql` (CREATE)

**Rol:** DB migration (schema extension)
**Data Flow:** DDL — ALTER TABLE + add column
**Analog:** `supabase/migrations/20260413000000_add_consensus_match_level.sql` (10 líneas, mismo tipo de cambio: add nullable column + index parcial)

**Copy from full analog file:**

```sql
-- Add consensus_match_level to record which tier produced the consensus.
-- Values: 'exact' | 'normalized' | 'genus' | NULL (no consensus or model failed)
alter table model_evaluations
  add column if not exists consensus_match_level text
    check (consensus_match_level in ('exact', 'normalized', 'genus'));

-- Index for analytics queries filtering by match level
create index if not exists model_evaluations_match_level
  on model_evaluations (consensus_match_level)
  where consensus_match_level is not null;
```

**Patrón a copiar:**
1. Comentario `--` explicando qué + por qué (2-3 líneas)
2. `alter table … add column if not exists … text check (…)` (idempotente)
3. `create index if not exists … where …` (índice parcial)
4. NO grants (es ALTER TABLE, no CREATE — ver `supabase/MIGRATION_CONVENTIONS.md` § existing-tables)
5. NO RLS (ya está enabled en la migración original 20260407)

**Additional pattern — widening a CHECK constraint** (no hay analog directo en el repo, pero el pattern estándar Postgres es `DROP CONSTRAINT` + `ADD CONSTRAINT`). El código exacto está en RESEARCH.md L428-433:

```sql
alter table public.model_evaluations
  drop constraint if exists model_evaluations_model_check;

alter table public.model_evaluations
  add constraint model_evaluations_model_check
  check (model in ('claude', 'gemini', 'gpt4o', 'plantnet'));

alter table public.model_evaluations
  add column if not exists raw_response jsonb;
```

**Naming timestamp:** las migraciones existentes usan `YYYYMMDDHHMMSS`. La última es `20260518000000_add_last_watered_at_to_plant_searches.sql`. Nueva migración debe usar timestamp posterior — `20260815000000_add_plantnet_to_model_evaluations.sql` (fecha del deploy, hora 00:00:00) es consistente.

---

### 3. `docs/model-evaluation-queries.sql` (MODIFY)

**Rol:** analytics doc (queries manuales para Supabase SQL Editor)
**Data Flow:** read-only SQL
**Analog:** el propio fichero — el patrón es "sección numerada con encabezado `─`, comentario en español, query copy-pasteable"

**Copy from these sections:**

#### Sección style — Header pattern (líneas 1-4)

```sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- Queries de evaluación de modelos — Supabase SQL Editor
-- Tabla: model_evaluations (3 filas por búsqueda: claude, gemini, gpt4o)
-- ═══════════════════════════════════════════════════════════════════════════════
```

**Update header:** cambiar comentario a "4 filas por búsqueda: claude, gemini, gpt4o, plantnet". El planner NO reescribe el fichero — solo actualiza esta línea + añade la nueva sección al final.

#### Section header pattern (líneas 7-13, 29-32, etc.)

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TASA DE ÉXITO POR MODELO
-- success = true significa que la API respondió Y se parseó el JSON.
-- NOTA: con el código actual, un modelo que devuelve strings fallback
-- ("Planta no identificada") cuenta como éxito. Revisar si hay raw_name
-- = 'Planta no identificada' para detectar falsos positivos.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  model,
  COUNT(*)                                             AS total_llamadas,
  COUNT(*) FILTER (WHERE success = true)               AS exitosas,
  COUNT(*) FILTER (WHERE success = false)              AS fallidas,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE success = true) / COUNT(*),
    1
  )                                                    AS tasa_exito_pct
FROM model_evaluations
GROUP BY model
ORDER BY tasa_exito_pct DESC;
```

**Patrón a copiar** para las 4 nuevas queries (A, B, C, D — ya escritas en RESEARCH.md L582-723):
1. Separador `─` de 77 chars
2. Número + título en mayúsculas
3. Comentario 2-6 líneas en español explicando qué mide + notas de interpretación
4. Separador `─` de cierre
5. Query SQL con alineación de columnas (usar espacios, no tabs — ver `AS total_llamadas` alineado con `AS exitosas`)
6. Comentarios en español dentro de la query con `-- ←` para señalar detalles

#### Aggregate section header (patrón líneas 243-247)

```sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO DE CONSENSO
-- Queries para investigar la tasa de no_consensus y sus causas.
-- Usadas para diseñar el consenso por niveles (exact/normalized/genus).
-- ═══════════════════════════════════════════════════════════════════════════════
```

**Copy for new section (append at EOF):**

```sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 5 — PLANTNET COMO 4º PROVEEDOR (observador silencioso)
-- Queries comparativas. Ejecutar contra datos generados desde 2026-08-15
-- (fecha estimada de deploy — actualizar en el WHERE clause de cada query).
-- ═══════════════════════════════════════════════════════════════════════════════
```

Luego pegar las 4 queries (A, B, C, D + D-BIS) de RESEARCH.md L582-723 verbatim. El planner NO modifica ninguna query 1-12 existente.

---

### 4. `src/integrations/supabase/types.ts` (REGENERATE)

**Rol:** TypeScript types generados por Supabase CLI
**Data Flow:** N/A — output del comando
**Analog:** N/A manual — regeneración automática

**Command** (RESEARCH.md L458-459):

```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > src/integrations/supabase/types.ts
```

**Cuándo:** DESPUÉS de aplicar la migración (STEP N del plan), ANTES de tocar cualquier código que use `Database["public"]["Tables"]["model_evaluations"]`. En este phase el índice `raw_response: Json | null` aparecerá en el output y `model` pasará de union de 3 a union de 4 valores.

**Verificación post-regen:** grep `raw_response` y `plantnet` en el fichero generado. Si no aparecen, la migración no se aplicó a la DB remota (o `--project-id` apunta al proyecto equivocado).

**NO commitear** el archivo si el diff es demasiado ruidoso (Supabase CLI a veces reordena tablas). Aislar el diff a las líneas de `model_evaluations` con `git add -p`.

---

## Shared Patterns

### Environment variable naming
**Source:** `supabase/functions/identify-plant/index.ts` líneas 104, 155, 201
**Apply to:** nueva variable `PLANTNET_API_KEY`

```typescript
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
```

**Convention:** `<PROVIDER>_API_KEY` en UPPER_SNAKE_CASE. Registrar en Supabase Function Secrets, no en `.env`. La CPO debe añadir `PLANTNET_API_KEY` manualmente en Supabase Dashboard ANTES de deploy (blocker).

### Error message taxonomy
**Source:** `supabase/functions/identify-plant/index.ts` líneas 136, 144-146, 235, 242-245
**Apply to:** `callPlantnetTimed`

Formato canónico:
- `TIMEOUT:${model}:${ms}ms` — AbortSignal.timeout expiró
- `RATE_LIMIT:${model}:429` — HTTP 429
- `API_ERROR:${model}:${statusCode}` — cualquier otro non-2xx
- `NO_RESULTS` (nuevo, solo plantnet) — respuesta OK pero `results[]` vacío
- Free-form message del `Error.message` en catch general

Este taxonomía es leída downstream por query 5 (`docs/model-evaluation-queries.sql` líneas 118-128 — desglose de errores por modelo). Mantener el prefijo `MODEL:` para que el `GROUP BY` funcione.

### Console logging
**Source:** `supabase/functions/identify-plant/index.ts` líneas 142, 188, 241, 409
**Apply to:** todos los `console.error` en `callPlantnetTimed` + `console.log` en STEP 1

```typescript
console.error("claude API error:", response.status, t);
console.log(`[identify] STEP 1 done in ${step1Ms}ms — ${perModelSummary}`);
```

**Convention:**
- `console.error(<provider> API error:, status, text)` para non-2xx
- `console.log([identify] STEP X ...)` prefix consistente para grepear logs
- `console.error(<table> insert error:, error)` para DB errors (línea 479, 509)

### Migration idempotency
**Source:** `supabase/migrations/20260413000000_add_consensus_match_level.sql`
**Apply to:** nueva migración

```sql
add column if not exists ...
create index if not exists ...
```

Usar SIEMPRE `if not exists` / `if exists` — hace la migración re-ejecutable sin errores. Coherente con la práctica del repo.

---

## No Analog Found

Ninguno. Los 4 ficheros tienen analog directo. La única "invención" es la función `callPlantnetTimed`, pero su shape (try/catch + timeout + error taxonomy) es idéntico a los 3 callers existentes; solo cambian los detalles del payload (multipart vs JSON) y la extracción de la respuesta (`results[0].species.scientificNameWithoutAuthor` vs texto markdown).

---

## Metadata

**Analog search scope:**
- `supabase/functions/identify-plant/` (fichero por fichero — 2 ficheros)
- `supabase/migrations/` (14 ficheros — analog en `20260413000000_add_consensus_match_level.sql`)
- `docs/` (self-analog en `model-evaluation-queries.sql`)
- `src/integrations/supabase/types.ts` (auto-generated, no manual analog)

**Files scanned:** 4 leídos completos + 14 listados (migraciones)
**Pattern extraction date:** 2026-08-15
**Total tokens ahorrados vs re-lecturas:** ~0 (una sola lectura por fichero)

---

## PATTERN MAPPING COMPLETE

**Phase:** 5 - PlantNet as Fourth Identification Provider
**Files classified:** 4
**Analogs found:** 4 / 4 (100%)

### Coverage
- Files with exact analog: 4 (todos)
- Files with role-match analog: 0
- Files with no analog: 0

### Key Patterns Identified
- Provider fan-out con `Promise.allSettled` — se extiende a 4 promesas, split post-settle en `llmResults` (para consensus) + `plantnetResult` (para persistencia)
- Migration ALTER TABLE + add column siguiendo `if not exists` pattern (no requiere GRANTs por convención existing-tables)
- Analytics via SQL documentado (no CLI scripts) — append 4 queries nuevas al final, sin tocar las 12 existentes
- Types regenerados con `npx supabase gen types` — no editar a mano
- Error taxonomy consistente (`TIMEOUT|RATE_LIMIT|API_ERROR:<model>:<detail>`) para que queries `GROUP BY error_message` sigan funcionando

### File Created
`.planning/phases/05-plantnet-fourth-provider/05-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. El planner tiene: (a) función `callPlantnetTimed` ya escrita en RESEARCH.md L238-308 para copiar verbatim, (b) 4 queries SQL nuevas ya escritas en RESEARCH.md L582-723 para pegar al final del docs, (c) migración SQL completa en RESEARCH.md L423-446, (d) todos los patrones existentes que hay que mantener sin alterar (STEP 6 response, consensus.ts, pickWinner). El planning debería ser mecánico.
