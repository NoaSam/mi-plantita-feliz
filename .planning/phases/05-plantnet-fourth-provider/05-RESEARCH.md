# Phase 5: PlantNet as Fourth Identification Provider — Research

**Researched:** 2026-08-15
**Domain:** Edge function extension (Deno) + external API integration (PlantNet v2) + Postgres migration + SQL analytics
**Confidence:** HIGH (all critical claims verified against codebase files or official PlantNet source examples)

## Summary

Añadir PlantNet como 4º proveedor es un cambio mecánicamente sencillo pero con **dos gotchas críticos** que este research disecciona:

1. **El golden set actual NO sirve para D-05 (top-1 accuracy vs LLMs) tal cual.** Los 31 items del set fueron bootstrappeados EN 2026-05-17 usando la propia API de PlantNet como oracle (ver `scripts/bootstrap-golden-set.ts` línea 3-13 y el `notes: "Bootstrapped via Pl@ntNet on 2026-05-17"` del archivo). Medir la accuracy de PlantNet contra el ground truth que él mismo generó = 100% garantizado, métrica sin valor. Esto se debe subir a la CPO antes de execute: o (a) se re-etiqueta el set manualmente, (b) se acepta la métrica como "coherencia con su propio criterio" y se agrega spot-check manual de N muestras, o (c) se cambia la métrica a "accuracy PlantNet vs winner-LLM" (más honesto: mide desacuerdo).

2. **Golden set son 100% base64 data URIs (31/31), 0 HTTPS.** Y PlantNet en modo GET solo acepta URLs (verificado en `examples/get/run.R` del repo oficial). Para las 31 fotos del set: el planner debe elegir entre POST multipart con blob (funciona con base64 decodificado; ya lo hace el bootstrap script existente) o backfill previo del set a URLs HTTPS. Para el **runtime en producción**, no hay problema: el edge function ya sube la foto a `plant-images` bucket público antes de invocar PlantNet, o puede pasarle el base64 vía POST multipart.

Aparte de eso, la extensión es limpia: `Promise.allSettled` ya existe → añadir 4ª promesa; `model_evaluations` ya tiene `raw_name` + `scientific_name` reutilizables + un CHECK constraint sobre `model` que hay que ampliar; migración es ALTER TABLE (NO requiere GRANT nuevos por convención `MIGRATION_CONVENTIONS.md`); queries SQL extienden el archivo existente con estilo consistente.

**Primary recommendation:** Confirmar la decisión sobre la contaminación del golden set con la CPO ANTES de planificar el trabajo de queries SQL (Wave "análisis" del plan). El resto del work-breakdown es low-risk y sigue patrones establecidos.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01: Observador silencioso.** PlantNet corre en paralelo con los 3 LLMs actuales pero NO participa en el consenso ni en lo que ve el usuario. Los 3 LLMs siguen decidiendo el `winner` y el output visible es idéntico a hoy.

**D-02: 100% invisible al usuario en el flujo de identificación.** Sin badges, sin señales, sin cambio de UI.

**D-03: Guardar el JSON completo de PlantNet** (no top-1, no top-3 — response entera). Coste ~2-5KB por identificación.

**D-04: Extender `model_evaluations` con `model = 'plantnet'`** como 4º valor posible, reutilizar `raw_name` para el nombre científico top-1, añadir columna nueva `raw_response jsonb` para el JSON completo. Alternativa peor: tabla nueva.

**D-05: Métrica principal = top-1 exact match** del nombre científico devuelto por PlantNet contra el ground truth del golden set.

**D-06: Reutilizar el golden set existente de Phase 2** (~24 fotos etiquetadas — real number verificado: 31 items). No re-etiquetar. Si el planner detecta que la muestra es insuficiente, subir a la CPO.

**D-07: Deliverable = queries SQL documentadas en `docs/model-evaluation-queries.sql`.** Cuatro secciones nuevas: (a) success rate PlantNet vs LLMs, (b) top-1 accuracy PlantNet contra golden set, (c) latencia comparada, (d) casos de divergencia PlantNet vs winner LLM. NO benchmark script propio, NO dashboard.

**D-08: Free tier PlantNet (500 requests/día)** inicialmente. Volumen actual ~15-30 identificaciones/día cabe con margen.

**D-09: PlantNet falla silenciosamente.** Timeout, quota, 4xx/5xx → guarda `null` para esa fila, NO bloquea al usuario, NO cambia el flujo de los 3 LLMs.

### Claude's Discretion

- Timeout de la llamada a PlantNet. Recomendación: similar a LLMs (~5-10s), no debe bloquear el flow.
- Esquema exacto de persistencia (extend `model_evaluations` según D-04, o alternativa).
- Extracción del nombre científico top-1 de la response.
- Variable de entorno (probable convención: `PLANTNET_API_KEY`).
- Retry policy en 429 rate-limit.
- Estructura exacta del payload (URL de imagen vs upload directo del blob).

### Deferred Ideas (OUT OF SCOPE)

- Phase 5.1 candidate — Dar voto real a PlantNet en el consenso. Trigger: >10 puntos de diferencia sostenida.
- Phase 5.2 candidate — Reemplazo de la arquitectura 3-LLM.
- Dashboard visual de PlantNet vs LLMs.
- Ampliar golden set más allá de las 24 fotos originales.
- Traducción del nombre común español desde el JSON de PlantNet (gray area solo si Phase 5.1 gana voto).
</user_constraints>

<phase_requirements>
## Phase Requirements

Aún no formalizados en `REQUIREMENTS.md`. Candidatos del ROADMAP.md § Phase 5 a formalizar en el plan (derivar durante planning):

| ID | Descripción | Research Support |
|----|-------------|------------------|
| PLANT-01 | PlantNet responde en paralelo con los 3 LLMs y su respuesta JSON completa se persiste en `model_evaluations` (o schema equivalente) para ≥95% de identificaciones nuevas | § Standard Stack (fetch/AbortSignal ya en uso) + § Architecture Patterns (Promise.allSettled ya existe) + § Persistence Schema (ALTER TABLE con `raw_response jsonb`) |
| PLANT-02 | `docs/model-evaluation-queries.sql` incluye 4 secciones nuevas (success rate, top-1 accuracy vs golden set, latencia, divergencia) siguiendo el estilo existente (comentarios español, copy-pasteable) | § Code Examples (borradores SQL) + § Common Pitfalls (golden set contaminado con PlantNet self-truth) |
| PLANT-03 | Latencia P95 percibida por el usuario NO empeora vs baseline actual | § Architecture Patterns (Promise.allSettled ya no espera a todos; el response al cliente sale antes que la escritura async a DB; la 4ª promesa no bloquea) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Llamar a PlantNet API con la imagen | Edge Function (Deno) | — | Ya orquesta las 3 llamadas LLM; añadir 4ª es natural. Cliente no debe ver la 4ª API — mantiene la abstracción. |
| Extraer nombre científico top-1 del JSON | Edge Function (Deno) | — | Simetría con `extractScientificName()` de LLMs. Vive en `identify-plant/` (posible helper `extractPlantnetTopName()`). |
| Persistir JSON completo + top-1 | Edge Function (Deno) → Postgres | — | Ya inserta 3 filas en `model_evaluations`; añadir la 4ª. Fire-and-forget existente. |
| Consenso / winner picking | Edge Function (Deno) | — | INTACTO — `consensus.ts` NO se modifica (D-01). |
| Análisis vs LLMs | SQL (Supabase Studio) | — | La CPO corre queries manualmente. NO script CLI, NO dashboard (D-07). |
| Golden set benchmark contra PlantNet | Script Node (opcional) | SQL | El plan puede evitar tocar el script y hacer todo con SQL, o extender `benchmark-prompt.ts` para incluir la 4ª llamada. Decisión abierta — recomendación: NO tocar el script en esta fase (D-07 lo hace innecesario). |

## Standard Stack

### Core (todo ya presente en el proyecto — no hay dependencias nuevas)

| Library / API | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| PlantNet API v2 | Endpoint `https://my-api.plantnet.org/v2/identify/{project}` | Especialista externa en identificación botánica (top-1 scientificName + score) | Único proveedor especializado en el mercado de este perfil. Free tier 500/día cubre 30x el volumen actual. `[VERIFIED: docs.plantnet.org + github.com/plantnet/my.plantnet]` |
| Deno `fetch` + `AbortSignal.timeout` | built-in Deno runtime | Llamada HTTP con timeout | Ya en uso en `index.ts` para Claude/Gemini/OpenAI (líneas 109-137, 160-181, 206-233). `[VERIFIED: file inspection]` |
| `@supabase/supabase-js@2` (via esm.sh) | v2 (ya importado) | Cliente DB admin en el edge function | Ya usado en `index.ts` línea 1. `[VERIFIED: file inspection]` |
| Supabase Storage bucket público `plant-images` | ya existe | URL HTTPS pública para pasar a PlantNet (opcional) | Ya migración `20260422000000_create_plant_images_bucket.sql` con `public = true` y policy `SELECT` público. `[VERIFIED: file inspection]` |

### Supporting

| Item | Purpose | When to Use |
|------|---------|-------------|
| Env var `PLANTNET_API_KEY` (nueva) | Autenticación con PlantNet (query string) | Establecer en Supabase Function Secrets antes de deploy. Convención `<PROVIDER>_API_KEY` ya seguida (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`). `[VERIFIED: file inspection]` |
| Deno `FormData` + `Blob` | Multipart POST a PlantNet (alternativa a GET con URL) | Solo si el planner elige POST binario. `[VERIFIED: usado en scripts/bootstrap-golden-set.ts líneas 100-105]` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extender `model_evaluations` (D-04 recommendation) | Nueva tabla `plantnet_evaluations` | Duplica schema, complica queries agregadas (D-07 requiere JOIN cruzado LLMs↔PlantNet). Rechazado en CONTEXT.md D-04. |
| POST multipart con blob | GET con URL de la imagen | Ambos válidos. GET más simple si la foto ya está en storage público (ver Common Pitfalls § "Runtime tiene URL, benchmark tiene base64"). |
| `Promise.race` first-winner con PlantNet incluida | Mantener `Promise.allSettled` (patrón actual) | El edge function ya usa `Promise.allSettled` (línea 392), NO `Promise.race` — la respuesta al cliente no es SSE del primer LLM, sino JSON tras `pickWinner`. Confirmado en `index.ts` líneas 391-416. |

**Installation:** Ninguna. No hay `npm install`.

**Version verification:** No aplica — PlantNet es servicio externo (versión `2025-01-17 (7.3)` reportada en el response body). API key la crea la CPO en https://my.plantnet.org/account/api antes de execute. `[VERIFIED: PlantNet docs + bootstrap script commit history]`

## Architecture Patterns

### System Architecture Diagram

```
User capture (mobile/web)
        │
        ▼
usePlantIdentifier.identify()  ← client hook (mocked fetch en tests)
        │  POST { image (base64), user_id, lat, lng }
        ▼
supabase.functions.invoke("identify-plant")
        │
        ▼
┌─────────────────── edge function identify-plant/index.ts ───────────────────┐
│                                                                              │
│  STEP 1: Promise.allSettled([                                                │
│            callModelTimed("claude",   () => callClaude(base64, mediaType)),  │
│            callModelTimed("gemini",   () => callGemini(base64, mediaType)),  │
│            callModelTimed("gpt4o",    () => callOpenAI(base64, mediaType)), │
│            callModelTimed("plantnet", () => callPlantnet(...))  ← ★ NUEVO   │
│          ])                                                                  │
│                                                                              │
│  STEP 2: pickWinner(llmResults)  ← ★ SIN CAMBIOS (PlantNet excluido)       │
│                                                                              │
│  STEP 3: upload image → plant-images bucket (existing)                       │
│  STEP 4: INSERT plant_searches (existing, winner LLM fields)                 │
│  STEP 5: INSERT 4 rows into model_evaluations (was 3)  ← ★ EXTEND           │
│           - claude, gemini, gpt4o, plantnet                                  │
│           - plantnet row: raw_name from top-1, raw_response = full JSON      │
│           - fire-and-forget (existing pattern, líneas 505-510)               │
│  STEP 6: Response JSON to client — modelsSummary includes plantnet? ← ★     │
│           (decisión de planner: exponer PlantNet en modelsSummary sí/no)    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
        │
        ▼  { name, care, diagnosis, watering_interval_days, models, ... }
Client renders PlantResultView (unchanged)

────────────────────── ANÁLISIS (deferred to CPO manual step) ──────────────────
CPO opens Supabase SQL Editor → docs/model-evaluation-queries.sql
  § A: success rate por modelo (extended: incluye 'plantnet')
  § B: top-1 accuracy PlantNet vs LLMs contra golden set JOIN
  § C: latencia comparada
  § D: casos de divergencia PlantNet vs winner LLM
```

### Recommended Project Structure (no cambia arquitectura)

```
supabase/
├── functions/
│   └── identify-plant/
│       ├── index.ts               # ★ EDIT: añadir callPlantnet(), 4ª promesa, 4ª fila DB
│       └── consensus.ts           # ★ SIN CAMBIOS (D-01)
└── migrations/
    └── 20260815XXXXXX_extend_model_evaluations_for_plantnet.sql  # ★ NUEVA

docs/
└── model-evaluation-queries.sql   # ★ EDIT: 4 secciones nuevas (A/B/C/D de D-07)

src/
└── integrations/supabase/types.ts # ★ REGENERAR tras migración
```

### Pattern 1: Extend `Promise.allSettled` with 4th call (fire-and-forget for analytics-only)

**What:** Añadir una 4ª promesa al `Promise.allSettled` existente. NO afecta a `pickWinner` porque PlantNet queda excluido de la lista pasada a `computeConsensus`.
**When to use:** Aquí exactamente.
**Example:**

```typescript
// Source: adaptado del patrón en supabase/functions/identify-plant/index.ts líneas 391-397

// [VERIFIED: pattern match with existing code]

// Type extension (in consensus.ts NO — ya está locked; hacerlo local a index.ts):
type ExtendedModelName = ModelName | "plantnet";  // ModelName = "claude" | "gemini" | "gpt4o"

const settled = await Promise.allSettled([
  callModelTimed("claude", () => callClaude(base64Data, mediaType)),
  callModelTimed("gemini", () => callGemini(base64Data, mediaType)),
  callModelTimed("gpt4o",  () => callOpenAI(base64Data, mediaType)),
  callPlantnetTimed(base64Data, mediaType),  // ← 4ª promesa, resultado shape diferente
]);

// Split into llmResults (para pickWinner + consenso) y plantnetResult (solo para persistencia)
const llmResults = settled.slice(0, 3)
  .filter((s): s is PromiseFulfilledResult<ModelResult> => s.status === "fulfilled")
  .map((s) => s.value);

const plantnetSettled = settled[3];
const plantnetResult = plantnetSettled.status === "fulfilled"
  ? plantnetSettled.value
  : null;

// pickWinner UNTOUCHED — solo LLMs votan (D-01)
const winner = pickWinner(llmResults);
```

### Pattern 2: PlantNet caller with timeout, silent failure

**What:** Función `callPlantnetTimed` análoga a `callModelTimed` pero con shape de retorno adaptado (no hay `PlantInfo`, no hay `care/diagnosis`, solo `rawName` + `rawResponse`).
**When to use:** Aquí.
**Example:**

```typescript
// Source: pattern derived from callClaude (líneas 103-152) + bootstrap-golden-set.ts (líneas 95-112)
// [VERIFIED: multipart pattern working in bootstrap script since 2026-05-17]

const PLANTNET_TIMEOUT_MS = 10_000;  // recomendación researcher: 10s
                                      // - LLMs usan 15_000 (línea 95)
                                      // - PlantNet es servicio dedicado, típicamente más rápido
                                      // - Debe ser < 15s para no ser el cuello de botella
                                      // - Coherente con failure silencioso (D-09)

interface PlantnetEvaluationResult {
  success: boolean;
  rawName: string | null;         // top-1 scientificNameWithoutAuthor
  scientificName: string | null;  // lowercased para join con extractScientificName output
  rawResponse: unknown | null;    // JSON completo (jsonb)
  responseMs: number;
  errorMessage: string | null;
}

async function callPlantnetTimed(
  base64Data: string,
  mediaType: string,
): Promise<PlantnetEvaluationResult> {
  const start = Date.now();
  const PLANTNET_API_KEY = Deno.env.get("PLANTNET_API_KEY");
  if (!PLANTNET_API_KEY) {
    return {
      success: false, rawName: null, scientificName: null, rawResponse: null,
      responseMs: Date.now() - start,
      errorMessage: "PLANTNET_API_KEY not configured",
    };
  }

  try {
    // Multipart POST — coherente con bootstrap-golden-set.ts, evita depender de
    // que la imagen esté ya en storage público al momento de invocar.
    // Alternativa GET-con-URL requeriría STEP 3 (upload) ANTES de STEP 1,
    // reordenando el flow.
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const form = new FormData();
    form.append("images", new Blob([bytes], { type: mediaType }), "plant.jpg");
    form.append("organs", "auto");

    const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${PLANTNET_API_KEY}&nb-results=5&lang=es`;
    const res = await fetch(url, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(PLANTNET_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("plantnet API error:", res.status, text.substring(0, 200));
      return {
        success: false, rawName: null, scientificName: null, rawResponse: null,
        responseMs: Date.now() - start,
        errorMessage: res.status === 429
          ? "RATE_LIMIT:plantnet:429"
          : `API_ERROR:plantnet:${res.status}`,
      };
    }

    const json = await res.json();
    const top = json?.results?.[0];
    const rawName = top?.species?.scientificNameWithoutAuthor ?? null;
    // scientificName lowercased para consistencia con extractScientificName() de LLMs
    // que hace .toLowerCase() (consensus.ts líneas 45-49)
    const scientificName = typeof rawName === "string" ? rawName.toLowerCase() : null;

    return {
      success: rawName !== null,
      rawName,
      scientificName,
      rawResponse: json,
      responseMs: Date.now() - start,
      errorMessage: rawName === null ? "NO_RESULTS" : null,
    };
  } catch (e) {
    return {
      success: false, rawName: null, scientificName: null, rawResponse: null,
      responseMs: Date.now() - start,
      errorMessage: isAbortError(e)
        ? `TIMEOUT:plantnet:${PLANTNET_TIMEOUT_MS}ms`
        : (e instanceof Error ? e.message : "Unknown error"),
    };
  }
}
```

### Pattern 3: Extend `model_evaluations` insertion with plantnet row

**What:** Añadir una 4ª fila al array `evaluationRows` en STEP 5. Reutiliza la estructura existente + rellena `raw_response` (nuevo).
**When to use:** Aquí.
**Example:**

```typescript
// Source: adaptado del patrón en supabase/functions/identify-plant/index.ts líneas 484-511
// [VERIFIED: pattern match with existing insert]

if (searchRow) {
  const evaluationRows = [
    // 3 filas LLM existentes (sin cambios)
    ...llmResults.map((r) => {
      const consensus = r.success ? (consensusGroups.get(r.model) ?? null) : null;
      return {
        plant_search_id:         searchRow.id,
        model:                   r.model,
        raw_name:                r.rawName,
        scientific_name:         r.scientificName,
        description:             r.plantInfo?.description ?? null,
        care:                    r.plantInfo?.care ?? null,
        diagnosis:               r.plantInfo?.diagnosis ?? null,
        response_ms:             r.responseMs,
        success:                 r.success,
        error_message:           r.errorMessage,
        is_winner:               r.model === winner.model,
        consensus_group:         consensus?.verdict ?? null,
        consensus_match_level:   consensus?.matchLevel ?? null,
        raw_response:            null,  // ← columna nueva, LLMs no la usan
      };
    }),
  ];

  // 4ª fila: plantnet (solo si al menos intentamos llamar — plantnetResult existe)
  if (plantnetResult) {
    evaluationRows.push({
      plant_search_id:         searchRow.id,
      model:                   "plantnet",
      raw_name:                plantnetResult.rawName,
      scientific_name:         plantnetResult.scientificName,
      description:             null,   // PlantNet no devuelve markdown de cuidados
      care:                    null,
      diagnosis:               null,
      response_ms:             plantnetResult.responseMs,
      success:                 plantnetResult.success,
      error_message:           plantnetResult.errorMessage,
      is_winner:               false,  // D-01: PlantNet nunca gana
      consensus_group:         null,   // D-01: NO participa en consenso
      consensus_match_level:   null,
      raw_response:            plantnetResult.rawResponse,  // ← JSON completo, D-03
    });
  }

  // Fire-and-forget (patrón existente líneas 505-510)
  supabaseAdmin
    .from("model_evaluations")
    .insert(evaluationRows)
    .then(({ error }) => {
      if (error) console.error("model_evaluations insert error:", error);
    });
}
```

### Anti-Patterns to Avoid

- **Modificar `consensus.ts` o `pickWinner`:** viola D-01. PlantNet NO vota. `computeConsensus` recibe SOLO llmResults (3 items).
- **Añadir `"plantnet"` al type `ModelName` en `consensus.ts`:** rompería la aserción `ModelName = "claude" | "gemini" | "gpt4o"` que actualmente cubre exhaustivamente. Definir un tipo local `ExtendedModelName` en `index.ts` (o extender la CHECK constraint SQL + widening solo en el path de persistencia).
- **`await` la llamada a PlantNet ANTES de `pickWinner`:** aunque `Promise.allSettled` ya espera a todos, PlantNet no puede añadir latencia percibida — es válido esperar porque el response al cliente ya sale después de allSettled + winner + DB insert. Verificar en el plan que el timeout de PlantNet (10s) < 15s de los LLMs para no ser el cuello de botella.
- **Guardar `raw_response` en LLMs también "para uniformidad":** las 3 filas LLM existentes NUNCA tuvieron raw_response, backfillearlas es fuera de scope. Solo la 4ª fila (plantnet) usa la columna. Documentar en migración.
- **Exponer PlantNet en el JSON response al cliente:** viola D-02. `modelsSummary` sigue siendo 3 items (LLMs). Si se añade, se filtra por `.model !== "plantnet"` explícitamente. Recomendación researcher: NO exponerlo (menos riesgo de que un futuro consumer lo pinte por accidente).

## Persistence Schema

### Estado actual verificado

**File:** `supabase/migrations/20260407000000_create_model_evaluations.sql`

```sql
create table model_evaluations (
  id                uuid        primary key default gen_random_uuid(),
  plant_search_id   uuid        not null references plant_searches(id) on delete cascade,
  model             text        not null check (model in ('claude', 'gemini', 'gpt4o')),  -- ★ CHECK constraint
  raw_name          text,       -- ← reutilizable para top-1 scientific name de PlantNet
  scientific_name   text,       -- ← reutilizable
  description       text,       -- ← NULL para plantnet
  care              text,       -- ← NULL para plantnet
  diagnosis         text,       -- ← NULL para plantnet
  response_ms       integer,
  success           boolean     not null default false,
  error_message     text,
  is_winner         boolean     not null default false,
  consensus_group   text        check (consensus_group in ('correct', 'no_consensus')),  -- ← NULL para plantnet
  created_at        timestamptz not null default now()
);
```

`[VERIFIED: file inspection]`

Y una segunda migración añade:

```sql
-- 20260413000000_add_consensus_match_level.sql
alter table model_evaluations
  add column if not exists consensus_match_level text
    check (consensus_match_level in ('exact', 'normalized', 'genus'));
```

### Cambios requeridos por esta fase

**Nueva migración** (nombre sugerido: `20260815XXXXXX_extend_model_evaluations_for_plantnet.sql`):

```sql
-- Widen the model column CHECK constraint to accept 'plantnet' as a 4th value.
-- PlantNet runs as a silent observer alongside the 3 LLMs (Phase 5 D-01).
-- It does NOT vote in consensus; its rows always have consensus_group = NULL
-- and is_winner = false.
alter table public.model_evaluations
  drop constraint if exists model_evaluations_model_check;

alter table public.model_evaluations
  add constraint model_evaluations_model_check
  check (model in ('claude', 'gemini', 'gpt4o', 'plantnet'));

-- Add raw_response column for PlantNet's full JSON payload (Phase 5 D-03).
-- Nullable because existing rows (claude/gemini/gpt4o) don't populate it,
-- and PlantNet rows have NULL when the API call failed (silent-failure mode, D-09).
alter table public.model_evaluations
  add column if not exists raw_response jsonb;

-- Optional index for future JSON introspection queries (e.g., top-3 accuracy).
-- Skip if analytics queries only ever touch raw_name / scientific_name — that
-- covers 100% of the D-07 queries. Add later if needed.
-- create index if not exists model_evaluations_raw_response_gin
--   on public.model_evaluations using gin (raw_response)
--   where model = 'plantnet';
```

### GRANT explícitos: ¿aplican?

**No.** Convención `supabase/MIGRATION_CONVENTIONS.md` § "Para migraciones que NO crean tablas": *"Sin cambios. El nuevo default solo afecta a `CREATE TABLE`."* Esta migración es ALTER TABLE → no requiere nuevos GRANT. `model_evaluations` ya está en la tabla protegida por "existing tables keep their current grants" (verificado en la tabla de estado actual del doc, línea 81). `[VERIFIED: MIGRATION_CONVENTIONS.md líneas 54-55, 75-83]`

### Regenerar types

Comando exacto (Supabase CLI ya instalado, version 2.67.1 `[VERIFIED: which supabase]`):

```bash
# Después de aplicar la migración (local o remoto):
npx supabase gen types typescript --project-id <PROJECT_ID> > src/integrations/supabase/types.ts

# O si prefiere linked project:
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

Impacto: `Database["public"]["Tables"]["model_evaluations"]["Row"]["raw_response"]` pasa a existir como `Json | null`. Ninguno de los consumers actuales lo usa → no rompe types (`[VERIFIED: grep resultado en types.ts línea 43-97, no menciona raw_response]`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timeout de fetch a PlantNet | Setter manual con `setTimeout` + AbortController manual | `AbortSignal.timeout(PLANTNET_TIMEOUT_MS)` | Ya se usa así en `callClaude/callGemini/callOpenAI` (líneas 111, 164, 208). Menos código, mismo TimeoutError. `[VERIFIED: file inspection]` |
| Rate limit handling | Bucket + backoff exponencial + retry queue | Failure silencioso (D-09) — devolver `null`, la próxima llamada intenta de nuevo | Con free tier 500/día y volumen 15-30/día, quedarse cerca del límite requiere >16x el tráfico actual. Añadir retry complica el código y viola D-09. `[VERIFIED: D-09 CONTEXT.md línea 51]` |
| Extracción del top-1 scientific name | Regex sobre `bestMatch` string | `json.results[0].species.scientificNameWithoutAuthor` | El campo `bestMatch` incluye la autoría (`"Genus species L."`), lo que rompería el match contra los LLMs (que devuelven `"epipremnum aureum"` sin autoría). `[VERIFIED: PlantNet API openapi doc + consensus.ts extractScientificName lowercase logic]` |
| Comparación fuzzy PlantNet ↔ LLMs | Función SQL custom para similar names | Reusar `normalizeScientificName` conceptualmente en SQL con `LOWER(TRIM(...))` en las queries. Para exact match nada más. | D-05 es "top-1 exact match" — no requiere fuzzy. Si en Phase 5.1 (candidate) se levanta, portar la función `normalizeScientificName` a un SQL immutable function. Fuera de scope. |
| Env var loader | wrapper custom `getEnv(k)` con validación | `Deno.env.get("PLANTNET_API_KEY")` + early return con error message | Ya el patrón en `callClaude` línea 104-105. Consistencia gana. `[VERIFIED: file inspection]` |
| Backfill de plantnet en filas históricas | Script que re-llama PlantNet para las 124+ filas viejas de `plant_searches` | NADA. Fuera de scope (D-01 = only forward from deploy). Las filas viejas no tienen fila plantnet en `model_evaluations` y punto. | Query SQL de accuracy va contra el golden set en `scripts/.benchmark-golden-set.json`, NO contra histórico DB. Ver § Common Pitfalls. |

**Key insight:** Este es un cambio 90% pattern-match. El código nuevo no inventa arquitectura — respeta el flujo actual (Promise.allSettled → pickWinner → DB insert async). El único punto donde el planner debe pensar es la forma exacta del retorno de `callPlantnetTimed()` (no encaja en `ModelResult` porque no hay `plantInfo`), y ese es un problema de tipos, no de arquitectura.

## Runtime State Inventory

*Rename/refactor pattern no aplica — Phase 5 es ADD-ONLY (nuevo proveedor, nueva columna, nuevas queries). Ningún string existente cambia. Skip category-by-category checks.*

## Common Pitfalls

### Pitfall 1: El golden set actual fue creado usando PlantNet — mide 100% accuracy trivialmente

**What goes wrong:** D-05 dice "top-1 exact match del nombre científico devuelto por PlantNet contra el ground truth del golden set". Ejecutar esta query hoy = ~100% para PlantNet (el golden set son los propios outputs de PlantNet filtrados por score ≥ 0.5). Métrica sin valor comparativo.

**Why it happens:** El script `scripts/bootstrap-golden-set.ts` (comprometido 2026-05-17) usa PlantNet como oracle para etiquetar automáticamente el ground truth. `[VERIFIED: scripts/bootstrap-golden-set.ts líneas 3-13, 95-112, 156-166; scripts/.benchmark-golden-set.json campo notes: "Bootstrapped via Pl@ntNet on 2026-05-17"; sample de items 01-03 confirmados con `Pl@ntNet score 0.92`]`

**How to avoid:** OPCIONES para la CPO (subir en Wave 0 del plan, ANTES de escribir las queries de accuracy):

1. **Aceptar la métrica como "coherencia con su propio criterio"** + añadir spot-check manual de 5-10 muestras donde CPO valida ground truth con su ojo (~15 min). Documentar en las queries que un ~100% es artefacto de la construcción del set.
2. **Cambiar D-05 a "top-1 accuracy PlantNet vs winner-LLM"** (mide desacuerdo, más honesto — no requiere ground truth externo). El winner-LLM se convierte en el oracle. Downside: si LLMs y PlantNet aciertan-o-fallan juntos, no lo vemos.
3. **Re-etiquetar manualmente el set** (~1-2h de la CPO — trabajo similar al que Phase 2 D-12 le pidió y que optó por skipping vía bootstrap).
4. **Ampliar el set con fotos etiquetadas manualmente** (~2-3h de la CPO — abre discussion sobre tamaño estadístico).

**Warning signs:** Query "top-1 accuracy" para plantnet arroja ~93-100% mientras LLMs ~40-60% → señal de contaminación, no de superioridad real.

**Confidence:** HIGH — comprobado por lectura directa del script bootstrap y muestras del JSON.

### Pitfall 2: Golden set son 100% base64 data URIs, PlantNet GET solo acepta URLs

**What goes wrong:** Si el planner elige "PlantNet vía GET con URL" para el runtime, tiene inconsistencia: en producción funciona (edge function sube al bucket público antes de llamar → tiene URL) pero para el benchmark contra el golden set no hay URLs, solo base64.

**Why it happens:** 31/31 items del golden set son `imageUrl: "data:image/jpeg;base64,..."`. Phase 6 (backfill base64→URL) NO tocó el golden set — solo `plant_searches`. `[VERIFIED: jq count contra scripts/.benchmark-golden-set.json]`

**How to avoid:** Usar POST multipart con blob en `callPlantnetTimed()` (como hace el bootstrap script). Ventajas: (a) funciona idénticamente con base64 y con URL fetched, (b) no depende de que la imagen esté ya subida antes de llamar a PlantNet (mantiene el orden STEP 1 → STEP 3 actual), (c) evita URL encoding gymnastics. Alternativa (GET con URL) requeriría reordenar STEP 3 upload → STEP 1 identify, y no funcionaría para el golden set sin backfill.

**Warning signs:** Plan que hace "GET con URL" y luego una task de "backfill golden set a URLs" — señal de recomendar POST multipart en su lugar.

**Confidence:** HIGH — verificado por conteo directo del JSON.

### Pitfall 3: CHECK constraint viola inserción antes de aplicar migración

**What goes wrong:** Deploy del edge function con `model: 'plantnet'` antes de aplicar la migración → INSERT falla con `new row for relation "model_evaluations" violates check constraint "model_evaluations_model_check"`. Feed the log spam.

**Why it happens:** El check constraint actual es `check (model in ('claude', 'gemini', 'gpt4o'))`. `[VERIFIED: migración 20260407000000 línea 8]`

**How to avoid:** El plan MUST secuenciar como Wave 1 = migración + gen types (blocking), Wave 2 = edge function edit (depends on Wave 1). Deploy order es explícito: `supabase db push` ANTES de `supabase functions deploy identify-plant`.

**Warning signs:** Plan con tareas en el mismo wave "migration + function edit". Debe ser waves separados.

### Pitfall 4: consensus.ts tipos exhaustivos rompen si widening naive

**What goes wrong:** Añadir `"plantnet"` al type `ModelName` en `consensus.ts` fuerza a `computeConsensus`, `pickWinner`, `MATCH_LEVEL_RANK`, etc., a manejar el 4º modelo — pero D-01 dice PlantNet NO vota.

**Why it happens:** `ModelName = "claude" | "gemini" | "gpt4o"` es exhaustivo en `consensus.ts`. El file tiene `export type ModelName`. `[VERIFIED: consensus.ts línea 5]`

**How to avoid:** Definir `type ExtendedModelName = ModelName | "plantnet"` LOCAL a `index.ts`, usarlo solo en `evaluationRows` (path de persistencia). `pickWinner` y `computeConsensus` reciben SOLO llmResults con el `ModelName` estricto. Cero cambios en `consensus.ts`. La CHECK constraint SQL se extiende, pero el tipo TS que llega al `.insert()` es widened solo ahí.

**Warning signs:** Diff que edita `consensus.ts` → violación de D-01.

### Pitfall 5: PlantNet devuelve autoría en scientificName (rompe match)

**What goes wrong:** Si el planner extrae `results[0].species.scientificName` (con autoría, ej. `"Monstera deliciosa Liebm."`), el join con LLM's `scientific_name` (lowercased, sin autor) NUNCA matchea.

**Why it happens:** PlantNet API v2 devuelve tres variantes: `scientificName` (con autor), `scientificNameAuthorship` (solo autor), `scientificNameWithoutAuthor` (sin autor). Los LLMs no devuelven autoría, y `extractScientificName()` en `consensus.ts` no la parsea.

**How to avoid:** Extraer siempre `results[0].species.scientificNameWithoutAuthor`. Guardar en `raw_name` y `scientific_name = .toLowerCase()` para simetría con LLMs (`consensus.ts` línea 45-46: `return seg.toLowerCase();`).

**Warning signs:** Query D-B (accuracy) da 0% match — probablemente autoría contaminando el string.

**Confidence:** HIGH — verificado en PlantNet openapi doc + `scripts/bootstrap-golden-set.ts` línea 160 usa `top.species.scientificNameWithoutAuthor`.

### Pitfall 6: `raw_response jsonb` inflación de storage

**What goes wrong:** JSON completo de PlantNet con `include-related-images=true` puede llegar a 50-100KB por response. D-03 dice "asumible" pero no si accidentalmente incluimos related images.

**Why it happens:** `include-related-images=true` retorna URLs de imágenes similares por especie → 5 species × 5 images = 25 URLs extra. `nb-results=5` default.

**How to avoid:** NO pasar `include-related-images=true`. Con `nb-results=5` sin related-images, response típico ~2-5KB (coherente con D-03 estimate). `[VERIFIED: bootstrap-golden-set.ts línea 105 usa nb-results=3 sin include-related-images]`

**Warning signs:** `SELECT AVG(octet_length(raw_response::text)) FROM model_evaluations WHERE model='plantnet'` > 10_000 después de 20+ llamadas.

### Pitfall 7: Tests unitarios del cliente NO se rompen — no falsa alarma

**Verified negative:** `src/hooks/use-plant-identifier.test.ts` mockea `globalThis.fetch` con un JSON response fijo (líneas 47-50, 156-158). No hace assertions sobre `result.models.length` ni sobre modelos específicos más allá de "claude" en el `MOCK_JSON_RESPONSE`. La adición de PlantNet en el backend no toca el shape del JSON de respuesta al cliente (que sigue siendo `{ name, care, ...watering_interval_days, model, models: [3 llms] }`), por lo que estos tests NO se rompen. `[VERIFIED: test file inspection]`

**No hay tests en `supabase/functions/identify-plant/`** — solo `consensus.ts` tiene tests (`src/test/consensus.test.ts`), y como consensus.ts no se modifica, esos tests no se rompen tampoco. `[VERIFIED: file search]`

**Recommendation:** El plan NO necesita añadir/actualizar tests unitarios. Si el planner quiere testabilidad de `callPlantnetTimed()`, puede extraer la función a un módulo separado con vitest en Node (patrón similar al que hace `benchmark-prompt.ts` importando de `consensus.ts`). Opcional, no bloqueante.

## Code Examples

### SQL query borradores para `docs/model-evaluation-queries.sql`

Sección nueva a AÑADIR al final del archivo, estilo consistente (comentarios en español, encabezados con `─`, copy-pasteable en Supabase SQL Editor).

**IMPORTANTE:** Antes de estas queries, el planner debe leer § Common Pitfalls #1 (contaminación del golden set) — la query B es la que arroja el resultado sospechoso.

```sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 5: PLANTNET COMO 4º PROVEEDOR (observador silencioso)
-- Queries comparativas: PlantNet vs los 3 LLMs.
-- El golden set se lee desde scripts/.benchmark-golden-set.json (fuera de DB) —
-- para queries que lo necesiten, cargarlo temporalmente vía CTE (ver query B).
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- A. TASA DE ÉXITO POR MODELO (4-way, incluye plantnet)
-- Mismo patrón que query 1 pero ahora con el 4º proveedor.
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
WHERE created_at >= '2026-08-15'  -- ← desde deploy de Phase 5 (evitar comparación desigual)
GROUP BY model
ORDER BY model = 'plantnet' DESC, tasa_exito_pct DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- B. TOP-1 ACCURACY: PLANTNET VS LLMS CONTRA EL GOLDEN SET
-- ⚠️  ADVERTENCIA: el golden set actual fue bootstrappeado con PlantNet
-- (scripts/bootstrap-golden-set.ts, 2026-05-17). Esta query mostrará
-- PlantNet ≈100% por construcción. Interpretar el número relativo LLMs
-- vs PlantNet solo como "coherencia PlantNet con su criterio original".
-- Para métrica honesta, ver query D (divergencia PlantNet vs winner-LLM).
--
-- Cómo correrla:
--   1. Ejecutar el edge function con las 31 fotos del golden set (una re-run
--      manual desde CPO en producción, o script ad-hoc leyendo el JSON).
--   2. Cargar el golden set en una tabla temp (o CTE) con plant_search_id ↔ ground_truth.
--   3. JOIN model_evaluations sobre esa temp table.
-- ─────────────────────────────────────────────────────────────────────────────

-- OPCIÓN 1: si hay un mapping plant_search_id → golden_set_id.scientific_name
-- (crear una tabla auxiliar public.golden_set_ground_truth si se decide persistirla)
WITH ground_truth AS (
  SELECT plant_search_id, scientific_name AS truth
  FROM public.golden_set_ground_truth  -- ← TBD: el planner decide si crear esta tabla
)
SELECT
  me.model,
  COUNT(*)                                                             AS evaluaciones,
  COUNT(*) FILTER (WHERE LOWER(TRIM(me.scientific_name)) = LOWER(TRIM(gt.truth)))
                                                                       AS aciertos_exact,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE LOWER(TRIM(me.scientific_name)) = LOWER(TRIM(gt.truth)))
      / NULLIF(COUNT(*), 0),
    1
  )                                                                    AS accuracy_pct
FROM model_evaluations me
JOIN ground_truth gt ON gt.plant_search_id = me.plant_search_id
WHERE me.success = true
GROUP BY me.model
ORDER BY me.model = 'plantnet' DESC, accuracy_pct DESC;

-- OPCIÓN 2: sin tabla auxiliar, comparación ad-hoc con VALUES inline
-- (el planner puede exportar el JSON a un VALUES clause si prefiere no crear tabla)


-- ─────────────────────────────────────────────────────────────────────────────
-- C. LATENCIA COMPARADA — PLANTNET VS LLMS
-- Extiende query 2 (latencia) al 4º modelo. p50 y p90 sobre respuestas exitosas.
-- Objetivo: verificar que PlantNet no es más lento que los LLMs (10s timeout).
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  model,
  COUNT(*)                                                          AS muestras,
  ROUND(AVG(response_ms))                                           AS media_ms,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY response_ms))  AS p50_ms,
  ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY response_ms))  AS p90_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_ms))  AS p95_ms,
  MIN(response_ms)                                                  AS min_ms,
  MAX(response_ms)                                                  AS max_ms
FROM model_evaluations
WHERE success = true
  AND response_ms IS NOT NULL
  AND created_at >= '2026-08-15'
GROUP BY model
ORDER BY p50_ms ASC;


-- ─────────────────────────────────────────────────────────────────────────────
-- D. CASOS DE DIVERGENCIA — PLANTNET VS WINNER-LLM
-- Métrica más honesta que B (no depende del golden set contaminado).
-- Muestra las búsquedas donde PlantNet dio un nombre distinto al del ganador
-- LLM en la misma foto. Estos casos son candidatos a revisión manual — el
-- disagreement es dato bruto para decidir Phase 5.1.
-- ─────────────────────────────────────────────────────────────────────────────

WITH winners AS (
  SELECT plant_search_id, scientific_name AS winner_name
  FROM model_evaluations
  WHERE is_winner = true AND success = true
),
plantnet AS (
  SELECT plant_search_id, scientific_name AS plantnet_name, raw_name AS plantnet_raw
  FROM model_evaluations
  WHERE model = 'plantnet' AND success = true
)
SELECT
  w.plant_search_id,
  ps.image_url,
  w.winner_name                                          AS winner_llm_name,
  p.plantnet_name                                        AS plantnet_top1,
  p.plantnet_raw                                         AS plantnet_top1_raw,
  ps.created_at
FROM winners w
JOIN plantnet p ON p.plant_search_id = w.plant_search_id
JOIN plant_searches ps ON ps.id = w.plant_search_id
WHERE LOWER(TRIM(w.winner_name)) <> LOWER(TRIM(p.plantnet_name))
ORDER BY ps.created_at DESC
LIMIT 50;


-- ─────────────────────────────────────────────────────────────────────────────
-- D-BIS. RESUMEN DE DIVERGENCIA (agregado)
-- % de búsquedas donde PlantNet y winner-LLM discrepan (ambos exitosos).
-- El % es la señal directa que dispararía la evaluación de Phase 5.1 candidate.
-- ─────────────────────────────────────────────────────────────────────────────

WITH pairs AS (
  SELECT
    w.plant_search_id,
    LOWER(TRIM(w.scientific_name))  AS winner_name,
    LOWER(TRIM(p.scientific_name))  AS plantnet_name
  FROM model_evaluations w
  JOIN model_evaluations p ON p.plant_search_id = w.plant_search_id
  WHERE w.is_winner = true AND w.success = true
    AND p.model = 'plantnet' AND p.success = true
)
SELECT
  COUNT(*)                                                       AS busquedas_comparables,
  COUNT(*) FILTER (WHERE winner_name = plantnet_name)            AS coinciden,
  COUNT(*) FILTER (WHERE winner_name <> plantnet_name)           AS divergen,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE winner_name <> plantnet_name) / NULLIF(COUNT(*), 0),
    1
  )                                                              AS divergen_pct
FROM pairs;
```

### Nueva sección propuesta en `docs/model-evaluation-queries.sql`

El planner añade el bloque anterior AL FINAL del archivo (después de query 12). Encabezado sugerido siguiendo el estilo:

```sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 5 — PLANTNET COMO 4º PROVEEDOR (observador silencioso)
-- Queries comparativas. Ejecutar contra datos generados desde 2026-08-15
-- (fecha estimada de deploy — actualizar en el WHERE clause de cada query).
-- ═══════════════════════════════════════════════════════════════════════════════
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pl@ntNet solo como oracle offline (`scripts/bootstrap-golden-set.ts`) | Pl@ntNet como 4º proveedor en runtime, silencioso | Phase 5 (esta) | Cero UX, permite comparación continua data-driven |
| `model_evaluations.model` CHECK acepta 3 valores | Acepta 4 (`+ plantnet`) | Phase 5 migration | ALTER TABLE, sin dataloss |
| Persistencia solo de campos extraídos (raw_name, scientific_name, care...) | Añade `raw_response jsonb` para JSON completo | Phase 5 migration | Storage overhead ~2-5KB por identificación, D-03 |

**Deprecated/outdated:** Nada. La fase es aditiva pura.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | El volumen actual sigue siendo ~15-30 identificaciones/día (estimación STATE.md, no verificada con query DB en esta sesión) | Standard Stack (free tier 500/día) | Si volumen ha crecido >100/día, planner considera acercarse a límite — sigue con margen pero conviene alerting. |
| A2 | La CPO tiene cuenta PlantNet lista y API key generada ANTES de execute | Environment Availability | Bloquea deploy (edge function no puede llamar sin key). Blocker manual mencionado en CONTEXT.md canonical_refs línea 92. |
| A3 | El proyecto usa `all` como PlantNet project (más amplio, no restringido a Europa) | Pattern 2 code example | Si CPO quiere reducir a `weurope` (menor cobertura tropical), simplemente cambia el path parameter. Low risk. |
| A4 | `lang=es` en el request devuelve nombres comunes en español (no bloqueante — no los usamos en D-01) | Pattern 2 code example | Nulo — no consumimos commonNames en esta fase. |
| A5 | La migración se aplica en producción vía `supabase db push` (workflow existente en el proyecto) | Pitfall 3 | Si el workflow es distinto (e.g., aplicación manual desde Studio), el planner ajusta la task de deploy. |
| A6 | `raw_response jsonb` sin GIN index rinde adecuado para las queries D-07 | Persistence Schema | Todas las queries D-07 tocan columnas indexables (model, success, plant_search_id), no hacen JSONB introspection → el índice GIN es prematuro. Verificable si latencia de query C > 1s. |

## Open Questions

1. **¿Cómo modelamos el ground truth del golden set en la DB para la query B?**
   - What we know: el golden set vive en `scripts/.benchmark-golden-set.json` (31 items con `id`, `imageUrl`, `groundTruth.scientificName`). Los items NO tienen `plant_search_id` — no fueron creados vía flow real, son fotos aisladas.
   - What's unclear: para la query B necesitamos mapear cada item a un `plant_search_id` real, lo que solo ocurre si se re-corre el flow con cada foto del set y se guarda el ID resultante. Opciones: (a) tabla auxiliar `public.golden_set_evaluations(id, image_url, ground_truth, evaluated_at)` creada específicamente para esta fase, (b) VALUES clause inline por query (feo, no escala), (c) script ad-hoc que corre el edge function con las 31 fotos y anota `plant_search_id`s en un JSON local, (d) column `is_golden_set_run` en `plant_searches` como flag.
   - Recommendation: subir a la CPO junto con Pitfall #1. Si acepta contaminación del set + spot-check, la tabla auxiliar (a) es minimal y honesta. Si re-etiqueta manualmente, esa tabla se llena con truth updated.

2. **¿Exponemos PlantNet en el JSON response al cliente (`modelsSummary`)?**
   - What we know: D-02 dice "100% invisible al usuario en el flujo de identificación". El objeto `models` en el response ya se usa por `useplantIdentifier` y llega a analítica (`plant_identified` event property `models` — ver `docs/posthog-events.md`).
   - What's unclear: si añadir plantnet a `models` cuenta como "visible" (llega a PostHog, no al UI). Si sí, viola D-02. Si no, es data útil para debugging.
   - Recommendation: NO exponerlo al cliente. Filter en `modelsSummary` con `.filter((r) => r.model !== "plantnet")` explícito. Menos riesgo de accidentales renders futuros. La visibilidad es solo en DB.

3. **¿PostHog event nuevo `plantnet_disagreed` u otros?**
   - What we know: CONTEXT.md § canonical_refs línea 95 dice "esta fase NO añade eventos PostHog nuevos por defecto. Si el planner detecta valor, confirmarlo con la CPO."
   - What's unclear: la query D-BIS (divergencia %) es probablemente el número que la CPO más quiere ver por semana. Un event de PostHog automatizaría eso vs correr SQL manual.
   - Recommendation: NO añadir por defecto (respeta CONTEXT.md). Nota en el plan: "Si tras 1 semana de datos la CPO quiere trend de divergencia, evaluar añadir event." Fuera de scope de esta fase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Migration + gen types | ✓ | 2.67.1 | — |
| PlantNet API key | Runtime en edge function | ✗ | — | Blocker manual — CPO genera en https://my.plantnet.org/account/api (5 min) ANTES de execute. Sin key el edge function retorna `null` para plantnet row (D-09) pero es waste — mejor no deployar hasta tener key. |
| Deno runtime (edge function) | Runtime | ✓ | Managed by Supabase | — |
| `jq` (dev tooling para inspeccionar golden set) | Research/planner debugging | ✓ | (verificado en esta sesión) | — |

**Missing dependencies with no fallback:**
- `PLANTNET_API_KEY` en Supabase Function Secrets — blocker de deploy real. La migración y el edge function edit sí se pueden mergear sin él (comportamiento: cada llamada plantnet fallará silencio → NULL row, coherente con D-09).

**Missing dependencies with fallback:**
- Ninguna.

## Validation Architecture

*El proyecto NO tiene `workflow.nyquist_validation` en `.planning/config.json` (no existe ese config). Aplicando defaults del research (absent = enabled).*

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test` (single unit file: `npx vitest run <path>`) |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLANT-01 | PlantNet responde en paralelo y se persiste JSON completo | integration (edge function) | manual — no hay test infra para edge functions Deno en el proyecto (ver TESTING.md línea 41-56, solo consensus.ts está testeado en `src/test/`) | ❌ N/A (no test infra) |
| PLANT-01 | `raw_response` se guarda como jsonb válido | manual SQL post-deploy: `SELECT COUNT(*) FROM model_evaluations WHERE model='plantnet' AND raw_response IS NOT NULL` | — | manual |
| PLANT-02 | Queries de `docs/model-evaluation-queries.sql` corren sin error sintáctico | manual: paste en Supabase SQL Editor con ≥1 identificación post-deploy | — | manual |
| PLANT-03 | Latencia P95 no empeora | manual SQL: query C (§ Code Examples), comparar plantnet p95 vs claude/gemini/gpt4o | — | manual |
| — (regresión) | Tests existentes NO se rompen tras el cambio | unit | `npm run test` | ✓ (existe: `consensus.test.ts`, `use-plant-identifier.test.ts`) |

### Sampling Rate
- **Per task commit:** `npm run test` (verificar que consensus + hooks siguen pasando)
- **Per wave merge:** `npm run test` + smoke SQL `SELECT COUNT(*), model FROM model_evaluations GROUP BY model` post-deploy
- **Phase gate:** ≥5 identificaciones nuevas post-deploy con 4 filas cada una en `model_evaluations`; queries A/B/C/D del `.sql` documentadas corren sin error.

### Wave 0 Gaps

- Nada. NO se debe añadir test infra para edge functions Deno en esta fase (fuera de scope; el proyecto no ha adoptado ese pattern). Los tests existentes siguen cubriendo lo que necesitan (regresión en consensus + hook cliente).
- CPO NO necesita instalar dependencias — todo el tooling ya está.

*(Sin nuevos test files. La validación real es manual + SQL post-deploy — coherente con el patrón que ya usa el proyecto para model_evaluations.)*

## Security Domain

*Verificado que `.planning/config.json` no existe → `security_enforcement` es implícito (default enabled). Applicable ASVS categories para este cambio:*

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | La API key vive SOLO en Function Secrets (server-side), nunca en client bundle. Patrón ya usado con Anthropic/Google/OpenAI keys. |
| V3 Session Management | no | Sin cambios de sesión. |
| V4 Access Control | no | `model_evaluations` sigue RLS-blocked al público (solo service role escribe/lee). Sin cambios de policy. |
| V5 Input Validation | mínimo | La respuesta JSON de PlantNet se guarda tal cual en `raw_response jsonb`. jsonb en Postgres valida sintaxis JSON automáticamente. No hay input del usuario que llegue a PlantNet más allá de la imagen (mismo camino que los LLMs). |
| V6 Cryptography | no | Fetch a HTTPS `my-api.plantnet.org` — TLS por defecto. |

### Known Threat Patterns for edge functions + external APIs

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key filtrada en logs | Information Disclosure | NO loggear la URL completa. Solo `console.error("plantnet API error:", res.status, text.substring(0, 200))` — evita `console.log(url)`. Coherente con patrón actual líneas 141-142, 187-188, 240-241. |
| Response de PlantNet con payloads maliciosos (SSRF vía commonNames? URLs de related-images?) | Server-Side Request Forgery | No usar `include-related-images=true` (Pitfall #6). El JSON se guarda pero NO se hace fetch a URLs contenidas. |
| Foto del usuario compartida con 3rd party | Information Disclosure (privacidad) | Contexto: la CPO ya asumió esta consecuencia al aprobar la fase (D-01 explícito). Docs de privacidad (`src/pages/legal/`) pueden requerir actualización — fuera de scope técnico, subir a CPO como pending item si no lo consideró. `[VERIFIED: no se menciona en CONTEXT.md — flagged aquí por precaución]` |
| DoS por rate limit exhausted → LLM también fallan si comparten quota | Denial of Service | PlantNet quota es propia (no comparte con Anthropic/OpenAI/Google). Failure silencioso (D-09) → una identificación con plantnet fallado sigue devolviendo resultado LLM al usuario. Coverage exclusiva. |
| Timeout mal configurado bloquea el edge function | Denial of Service | `AbortSignal.timeout(10_000)` fuerza abort antes que el timeout del edge function (60s Supabase default). Coherente con patrón LLM. |

**Nota de privacidad para la CPO (subir en el plan):** compartir fotos con PlantNet técnicamente convierte a PlantNet en processor de datos personales EU (GDPR). Verificar si la política de privacidad de la app menciona esto o si necesita update. Los LLMs actuales ya lo hacen (Anthropic/OpenAI/Google), así que probablemente ya está cubierto — pero worth checking. Fuera de scope técnico de esta fase.

## Project Constraints (from CLAUDE.md)

Directivas de CLAUDE.md que afectan a esta fase (planner MUST verificar):

1. **Migraciones Supabase en `public` obligan GRANT explícitos + RLS + policies (post 30-oct-2026).** → No aplica aquí: es ALTER TABLE sobre tabla existente (`model_evaluations` ya cubierta por "existing tables keep their grants"). `[VERIFIED: MIGRATION_CONVENTIONS.md líneas 75-83]`
2. **Nombres de variables, componentes y commits en inglés. Contenido de UI en español.** → Toda la lógica nueva en inglés (`callPlantnetTimed`, `PlantnetEvaluationResult`, columna `raw_response`). Docs SQL en español (queries D-07 comentadas en español, coherente con archivo actual). Commit messages en inglés.
3. **Tests para lógica de negocio (hooks y services). No tests de UI por ahora.** → Ver § Validation Architecture. No hay tests de edge function Deno en el proyecto; esta fase NO establece ese pattern (fuera de scope).
4. **Mobile-first siempre.** → No aplica (backend-only change).
5. **API key de Claude solo en servidor.** → Extensible a PlantNet: `PLANTNET_API_KEY` SOLO en Supabase Function Secrets. NUNCA en bundle cliente ni committed al repo (mismo tratamiento que las otras 3 keys). `[VERIFIED: patrón en callClaude línea 104-105]`
6. **Priorizar velocidad de iteración sobre perfección arquitectónica.** → El plan debe evitar sobre-ingeniería. Ejemplos: NO añadir retry policy (D-09 acepta failure), NO tocar tests que no se rompen, NO backfill de filas históricas.

## Sources

### Primary (HIGH confidence)

- **File inspection (verificado en esta sesión):**
  - `/Users/noemisantos/mi-plantita-feliz/supabase/functions/identify-plant/index.ts` — Promise.allSettled pattern, LLM_TIMEOUT_MS, callModelTimed structure, model_evaluations insert.
  - `/Users/noemisantos/mi-plantita-feliz/supabase/functions/identify-plant/consensus.ts` — ModelName type exhaustive, extractScientificName lowercase pattern.
  - `/Users/noemisantos/mi-plantita-feliz/supabase/migrations/20260407000000_create_model_evaluations.sql` — CHECK constraint verified.
  - `/Users/noemisantos/mi-plantita-feliz/supabase/migrations/20260422000000_create_plant_images_bucket.sql` — bucket es público.
  - `/Users/noemisantos/mi-plantita-feliz/scripts/bootstrap-golden-set.ts` — golden set proviene de PlantNet (crítico para Pitfall #1).
  - `/Users/noemisantos/mi-plantita-feliz/scripts/.benchmark-golden-set.json` — 31 items, 100% base64, todos con notes de PlantNet.
  - `/Users/noemisantos/mi-plantita-feliz/scripts/benchmark-prompt.ts` — patrón multipart FormData ya usado.
  - `/Users/noemisantos/mi-plantita-feliz/supabase/MIGRATION_CONVENTIONS.md` — ALTER TABLE no requiere nuevos GRANT.
  - `/Users/noemisantos/mi-plantita-feliz/docs/model-evaluation-queries.sql` — estilo SQL existente.
  - `/Users/noemisantos/mi-plantita-feliz/src/hooks/use-plant-identifier.test.ts` — tests no se rompen.
  - `/Users/noemisantos/mi-plantita-feliz/docs/posthog-events.md` — inventario de eventos.
  - `/Users/noemisantos/mi-plantita-feliz/src/integrations/supabase/types.ts` — schema types.
  - `/Users/noemisantos/mi-plantita-feliz/CLAUDE.md` — project constraints.

### Secondary (MEDIUM-HIGH confidence)

- **PlantNet API v2 openapi spec (via `my.plantnet.org/doc/api/identify`):** endpoint URL, multipart fields, organs values (leaf/flower/fruit/bark/auto), response schema (`results[0].species.scientificNameWithoutAuthor` + `score` + `commonNames` + `gbif`), HTTP codes 400/401/404/413/429, API version `2025-01-17 (7.3)`.
- **PlantNet R example (github.com/plantnet/my.plantnet/blob/master/examples/get/run.R):** GET request URL syntax con múltiples `images=` y `organs=` repetidos.
- **PlantNet PHP example (github.com/plantnet/my.plantnet/blob/master/examples/web/index.php):** POST multipart syntax (multipart array + fopen stream, análogo a nuestro Blob).
- **PlantNet pricing page (my.plantnet.org/pricing):** free tier 500/día, pro €1000/año + volume pricing.

### Tertiary (LOW — no aplica; ninguna claim crítica depende solo de WebSearch sin cross-verify)

- N/A. Todos los claims WebSearch fueron cross-verificados con las páginas oficiales de PlantNet o con inspección directa de código.

## Metadata

**Confidence breakdown:**
- Standard stack (fetch, AbortSignal, FormData): HIGH — usado en producción hoy.
- Persistence schema (ALTER TABLE, GRANT no requerido): HIGH — MIGRATION_CONVENTIONS.md explícito.
- PlantNet API contract (endpoint, response shape, `scientificNameWithoutAuthor`): HIGH — verificado en docs oficiales + código del bootstrap script.
- Golden set contamination (Pitfall #1): HIGH — comprobado por inspección directa del script bootstrap + samples del JSON.
- Tests no se rompen (Pitfall #7): HIGH — file inspection.
- Comportamiento del `Promise.allSettled` cuando la 4ª promesa devuelve shape distinta: HIGH — TypeScript maneja `PromiseSettledResult<T | U>` correctamente con narrowing.
- Recomendación de POST multipart sobre GET-with-URL: HIGH — verificado que POST evita reordenar STEP 3→STEP 1.

**Research date:** 2026-08-15
**Valid until:** 2026-09-15 (30 días — PlantNet API es estable, no hay changelog reciente reportado)

---

## RESEARCH COMPLETE

**Phase:** 05 - plantnet-fourth-provider
**Confidence:** HIGH

### Key Findings

1. **CRÍTICO — Golden set está contaminado con PlantNet self-truth.** Los 31 items del set (`scripts/.benchmark-golden-set.json`) fueron bootstrappeados usando PlantNet API como oracle el 2026-05-17 (`scripts/bootstrap-golden-set.ts`). Ejecutar la query de accuracy top-1 de D-05 arrojará ~100% para PlantNet por construcción. Esto debe subirse a la CPO antes de implementar la query B — 4 opciones documentadas en Pitfall #1.
2. **Migración es ALTER TABLE — NO requiere GRANT explícitos.** `supabase/MIGRATION_CONVENTIONS.md` es explícito: la nueva convención solo aplica a `CREATE TABLE`. La migración añade `raw_response jsonb` + widen del CHECK constraint sobre `model` (de 3 a 4 valores).
3. **Recomendación: POST multipart con blob (no GET con URL).** El edge function actual reordenaría STEP 3 upload → STEP 1 identify si usara GET-con-URL. El bootstrap script ya usa POST multipart exitosamente desde 2026-05-17 — mismo patrón.
4. **Tests existentes NO se rompen.** Los tests cliente mockean el fetch response completo; no hacen assertions sobre número de modelos. No hay tests de edge function Deno en el proyecto.
5. **`consensus.ts` NO se modifica.** Definir `type ExtendedModelName = ModelName | "plantnet"` local a `index.ts`. PlantNet excluido del array pasado a `pickWinner`/`computeConsensus`. D-01 preservado.

### File Created

`/Users/noemisantos/mi-plantita-feliz/.planning/phases/05-plantnet-fourth-provider/05-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Todas las libs ya en uso en producción |
| Architecture (Promise.allSettled + fire-and-forget insert) | HIGH | Patrón exacto verificado en `index.ts` líneas 391-511 |
| Persistence Schema (ALTER TABLE) | HIGH | MIGRATION_CONVENTIONS.md explícito + `raw_response jsonb` no rompe types |
| PlantNet API contract | HIGH | Cross-verificado docs + código bootstrap real |
| Pitfalls (7 items) | HIGH | 5/7 verificados por file inspection directa; 2/7 (SSRF via related-images, quota) son razonamiento sobre docs oficiales |
| Queries SQL borradores | MEDIUM-HIGH | Sintaxis Postgres válida; query B depende de decisión pendiente de la CPO sobre golden set (ver Open Question #1) |

### Open Questions

1. Cómo modelar ground truth del golden set en DB para query B (tabla auxiliar vs VALUES vs otro) — depende de la resolución de Pitfall #1.
2. Exponer PlantNet en `modelsSummary` response (recomendación researcher: NO, viola D-02 en sentido estricto).
3. PostHog event `plantnet_disagreed` (recomendación researcher: NO ahora, evaluar tras 1 semana de datos).

### Ready for Planning

Research completa. El planner puede empezar a trabajar en el PLAN.md, teniendo en cuenta que la resolución de Pitfall #1 (contaminación del golden set) DEBE subirse a la CPO en Wave 0 del plan antes de comprometer las queries SQL de accuracy.
