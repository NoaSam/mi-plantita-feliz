# Verificación Phase 5 — PlantNet as Fourth Voter (Cross-Validated)

**Deploy edge function:** _(fecha del deploy real de Plan 03)_
**Ventana de datos:** mínimo 24h desde el deploy antes de ejecutar el checklist
**Fecha ejecución checklist:** _(rellenar al ejecutar)_
**CPO signoff:** ⏳ pendiente / ✅ aprobado / ❌ bloqueado



## Contexto rápido

Este phase añade PlantNet como 4º proveedor votante con regla de cross-validation. Los 3 LLMs siguen siendo los que aportan care/diagnosis/watering/description; PlantNet solo puede corregir el nombre científico cuando su score ≥ 0.8 Y algún LLM ya estaba alineado con él. UX visible al usuario: cero cambios.

Decisiones cubiertas: D-01 (cross-validation), D-02 (UX invisible), D-03 (raw_response completo), D-04 (schema extendido), D-07 (query SQL de divergencia), D-09 (fallo silencioso), D-10 (threshold 0.8), D-11 (match exact/normalized, NO genus), D-12 (registro dual DB + PostHog), D-13 (latencia validada por benchmark).

Requirements: PLANT-01, PLANT-02, PLANT-03.



## Bloque A — Cobertura de datos (PLANT-01)

### A.1 — ≥95% de identificaciones nuevas tienen 4 filas en model_evaluations

Ejecutar en Supabase SQL Editor:

```sql
WITH ventana AS (
  SELECT id, name, created_at
  FROM plant_searches
  WHERE created_at >= NOW() - INTERVAL '24 hours'
),
conteos AS (
  SELECT
    ps.id,
    COUNT(me.id) FILTER (WHERE me.model IN ('claude','gemini','gpt4o')) AS filas_llm,
    COUNT(me.id) FILTER (WHERE me.model = 'plantnet') AS filas_plantnet
  FROM ventana ps
  LEFT JOIN model_evaluations me ON me.plant_search_id = ps.id
  GROUP BY ps.id
)
SELECT
  COUNT(*)                                                                AS total_busquedas,
  COUNT(*) FILTER (WHERE filas_llm = 3)                                   AS con_3_llms,
  COUNT(*) FILTER (WHERE filas_plantnet = 1)                              AS con_plantnet,
  ROUND(100.0 * COUNT(*) FILTER (WHERE filas_plantnet = 1) / NULLIF(COUNT(*), 0), 1)
                                                                          AS pct_con_plantnet
FROM conteos;
```

**Criterio pasa:** `pct_con_plantnet >= 95` (D-09 permite algún fallo, pero no debería ser >5%).
**Resultado:** _(rellenar)_
**Notas:** _(si <95%, revisar logs edge fn por errores plantnet — ver query A.2)_

### A.2 — Breakdown de errores plantnet (si A.1 sale bajo)

```sql
SELECT
  error_message,
  COUNT(*) AS ocurrencias
FROM model_evaluations
WHERE model = 'plantnet'
  AND success = false
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY error_message
ORDER BY ocurrencias DESC;
```

**Criterio pasa:** Los errores son mayoritariamente `NO_RESULTS` (foto que PlantNet no reconoce — esperado) o esporádicos `TIMEOUT` / `RATE_LIMIT`. Cero `PLANTNET_API_KEY not configured` (indicaría secret faltante).
**Resultado:** _(rellenar)_



## Bloque B — Cross-validation funciona (D-01, D-10, D-11)

### B.1 — Muestreo de overrides aplicados (últimas 24h)

Los overrides no se marcan en DB — son transparentes. Se verifican comparando el `scientific_name` del LLM winner (fila con is_winner=true) contra el `scientific_name` de PlantNet en las mismas búsquedas:

```sql
SELECT
  ps.id,
  ps.name AS nombre_mostrado,
  me_llm.model AS llm_winner_model,
  me_llm.scientific_name AS llm_winner_scientific,
  me_pn.scientific_name AS plantnet_scientific,
  (me_pn.raw_response->'results'->0->>'score')::float AS plantnet_score,
  ps.plantnet_diverged,
  CASE
    WHEN me_pn.scientific_name IS NULL THEN 'plantnet_failed'
    WHEN (me_pn.raw_response->'results'->0->>'score')::float < 0.8 THEN 'plantnet_below_threshold'
    WHEN ps.plantnet_diverged THEN 'diverged_no_llm_matched'
    WHEN LOWER(me_llm.scientific_name) = LOWER(me_pn.scientific_name) THEN 'aligned_exact'
    ELSE 'aligned_normalized_or_other_llm_matched'
  END AS estado
FROM plant_searches ps
LEFT JOIN model_evaluations me_llm ON me_llm.plant_search_id = ps.id AND me_llm.is_winner = true
LEFT JOIN model_evaluations me_pn  ON me_pn.plant_search_id  = ps.id AND me_pn.model = 'plantnet'
WHERE ps.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY ps.created_at DESC
LIMIT 30;
```

**Criterio pasa:** Se ven las 5 categorías esperadas distribuidas de forma coherente. En particular:
- `plantnet_failed` <5% (D-09 no debería ser habitual)
- `plantnet_below_threshold` es normal (fotos ambiguas) — sin límite
- `diverged_no_llm_matched` marca correctamente `plantnet_diverged=true`
- `aligned_*` son la mayoría (ecosistemas típicos de plantas de casa)

**Resultado:** _(rellenar con la distribución observada)_

### B.2 — Genus-only matches NO se cuentan como override (D-11)

Buscar casos con mismo género pero especies distintas en los últimos 30 días:

```sql
SELECT
  ps.id,
  ps.plantnet_diverged,
  me_llm.scientific_name AS llm,
  me_pn.scientific_name  AS plantnet,
  LOWER(SPLIT_PART(TRIM(me_llm.scientific_name), ' ', 1)) AS genero_llm,
  LOWER(SPLIT_PART(TRIM(me_pn.scientific_name), ' ', 1))  AS genero_pn
FROM plant_searches ps
JOIN model_evaluations me_llm ON me_llm.plant_search_id = ps.id AND me_llm.is_winner = true
JOIN model_evaluations me_pn  ON me_pn.plant_search_id  = ps.id AND me_pn.model = 'plantnet' AND me_pn.success = true
WHERE ps.created_at >= NOW() - INTERVAL '30 days'
  AND LOWER(SPLIT_PART(TRIM(me_llm.scientific_name), ' ', 1)) = LOWER(SPLIT_PART(TRIM(me_pn.scientific_name), ' ', 1))
  AND LOWER(me_llm.scientific_name) != LOWER(me_pn.scientific_name)
  AND (me_pn.raw_response->'results'->0->>'score')::float >= 0.8
LIMIT 20;
```

**Criterio pasa:** Cada fila devuelta debe tener `plantnet_diverged = true` (D-11: mismo género con especies distintas = divergencia, no override). Si aparece alguna con `plantnet_diverged = false`, hay un bug en applyPlantnetOverride.
**Resultado:** _(rellenar)_



## Bloque C — Divergencia registrada (D-12)

### C.1 — Query 13 de model-evaluation-queries.sql devuelve resultados coherentes

Copiar y ejecutar la query 13 completa de `docs/model-evaluation-queries.sql`.

**Criterio pasa:**
- La query ejecuta sin errores
- Las filas devueltas tienen todos los campos poblados (excepto `plantnet_top3_snippet` que puede ser `[]` si el JSON está mal formado)
- Los tipos de divergencia (`mismo género, especies distintas` vs `géneros distintos`) tienen sentido intuitivo

**Resultado:** _(pegar screenshot o output de las 5-10 primeras filas)_

### C.2 — Evento PostHog `plantnet_divergence` visible en dashboard

Ir a https://eu.posthog.com/events → filtrar `event = 'plantnet_divergence'` en las últimas 24h.

**Criterio pasa:**
- El número de eventos coincide (±10%) con el número de filas devueltas por la query C.1 en la misma ventana
- Cada evento tiene las 5 propiedades documentadas en `docs/posthog-events.md` (plantnet_scientific, plantnet_score, llm_winner_scientific, llm_winner_model, plant_search_id)

**Resultado:** _(rellenar)_
**Nota:** Si POSTHOG_PROJECT_API_KEY no se registró (Plan 03 Task 3 opcional), C.2 es N/A — verificar en Supabase Functions logs que aparece `POSTHOG_PROJECT_API_KEY not set — divergence event skipped` en las divergencias.



## Bloque D — UX invisible al usuario (D-02)

### D.1 — Response JSON al cliente NO expone plantnet

1. Abre https://mi-plantita-feliz.vercel.app (o la app Android)
2. Hazte una identificación con cualquier planta
3. DevTools → Network → localiza la request a `identify-plant`
4. Response tab → JSON

**Criterio pasa:**
- El JSON tiene: `name`, `description`, `care`, `diagnosis`, `watering_interval_days`, `model`, `plant_search_id`, `created_at`, `models`, `consensus_reached`
- `models` es un array de **exactamente 3 items** (claude, gemini, gpt4o)
- **NO** aparece ningún campo `plantnet_*` en top-level ni dentro de `models`
- El campo `model` (winner) es uno de `claude` / `gemini` / `gpt4o` (nunca `plantnet`)

**Resultado:** _(pegar el JSON o screenshot)_

### D.2 — UX visual sin cambios

Hazte 3 identificaciones en la app (potus, monstera, planta rara). Compara con recuerdos de pre-Phase-5:
- Sin badges nuevos
- Sin loading states nuevos
- Nombre común aparece como antes ("Potus (Epipremnum aureum)")
- Cuidados, diagnóstico, riego se ven idénticos

**Criterio pasa:** ninguna diferencia visual perceptible.
**Resultado:** _(rellenar)_



## Bloque E — Latencia (PLANT-03)

### E.1 — Latencia p50/p95 pre vs post-deploy

```sql
SELECT
  DATE_TRUNC('day', created_at) AS dia,
  COUNT(*) AS busquedas,
  PERCENTILE_DISC(0.5)  WITHIN GROUP (ORDER BY response_ms) AS p50_ms,
  PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY response_ms) AS p95_ms
FROM model_evaluations
WHERE model = 'plantnet'
  AND success = true
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY dia
ORDER BY dia DESC;
```

**Criterio pasa:** p95 PlantNet < 2000ms (el benchmark del 2026-08-18 midió p95=695ms). Cualquier valor >5000ms indica cambio de comportamiento de la API.

**Complementaria — latencia percibida al usuario (end-to-end):**

La latencia percibida sigue midiéndose vía `winning_model.responseMs` (ya trackeado en `plant_identified` event). Comparar el p95 de `response_ms` de LLM winners antes/después del deploy:

```sql
SELECT
  CASE WHEN created_at < '_(fecha deploy Plan 03)_' THEN 'pre_phase_5' ELSE 'post_phase_5' END AS periodo,
  PERCENTILE_DISC(0.5)  WITHIN GROUP (ORDER BY response_ms) AS p50_ms,
  PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY response_ms) AS p95_ms,
  COUNT(*) AS n
FROM model_evaluations
WHERE is_winner = true
  AND success = true
  AND created_at >= NOW() - INTERVAL '14 days'
GROUP BY periodo;
```

**Criterio pasa:** p95 post_phase_5 no supera p95 pre_phase_5 en más de 200ms (margen para ruido — PlantNet no debería afectar el path del winner LLM).

**Resultado:** _(rellenar)_



## Bloque F — Regresión (tests + smoke funcional)

### F.1 — Suite de tests verde

```bash
npm run test -- --run
```

**Criterio pasa:** Test Files X passed, Tests Y passed. Cero fallos.
**Resultado:** _(rellenar con el resumen)_
**Baseline pre-deploy (2026-08-21):** 17 test files, 195 tests, todos verdes.

### F.2 — Build verde

```bash
npm run build
```

**Criterio pasa:** ✓ built in Nms sin errores TypeScript.
**Resultado:** _(rellenar)_

### F.3 — Smoke Android (si hay Android disponible)

Instalar el APK de dev o la última versión de Play Store → hacer una identificación completa. Verificar que el resultado se muestra correctamente y aparece en el historial.

**Criterio pasa:** identificación funcional, historial correcto, sin crash.
**Resultado:** _(rellenar o N/A si no se testa)_



## Sign-off

Marcar aquí cuando todos los bloques anteriores estén en verde:

- [ ] Bloque A pasa (PLANT-01)
- [ ] Bloque B pasa (D-01, D-10, D-11)
- [ ] Bloque C pasa (D-12, PLANT-02)
- [ ] Bloque D pasa (D-02)
- [ ] Bloque E pasa (PLANT-03)
- [ ] Bloque F pasa (regresión)

**Decisión CPO:** ⏳ pendiente / ✅ **APROBADO — Phase 5 puede cerrarse** / ❌ **BLOQUEADO — describir aquí qué falla y siguiente acción:**

_(espacio para notas de la CPO)_



## Anexo: Rollback plan

Si algo va mal después del deploy:

1. **Revertir edge function:** `git revert <commit-plan-03>` + `npx supabase functions deploy identify-plant` — vuelve al comportamiento 3-LLM
2. **Migración NO se revierte** — las columnas nuevas (`raw_response`, `plantnet_diverged`) quedan pero no molestan (nullable / default false). Si insister, `ALTER TABLE ... DROP COLUMN ...` como migración manual.
3. **Function Secret PLANTNET_API_KEY:** puede quedarse o eliminarse (si no se usa, no cuesta nada).

Impacto de rollback en usuarios: **cero** — la UX ya era invisible respecto a PlantNet (D-02).



## Anexo: Precondiciones pendientes al 2026-08-21

Al momento de commitear este VERIFICATION.md, la CPO deferió el deploy durante la sesión `/gsd-execute-phase 5 --auto`. Antes de ejecutar este checklist:

1. `npx supabase link --project-ref sdxfxkqzgnonxfshbjfc`
2. `npx supabase db push --linked` (aplica migración de Plan 01)
3. `npx supabase gen types typescript --project-id sdxfxkqzgnonxfshbjfc > src/integrations/supabase/types.ts` — verificar diff vacío contra el bridge manual (commit `6a382e3`)
4. `git commit -m "chore(05-01): regenerate supabase types after db push"` (si hay diff)
5. Verificar `POSTHOG_PROJECT_API_KEY` en Function Secrets (opcional — Plan 03 Task 3)
6. `npx supabase functions deploy identify-plant --project-ref sdxfxkqzgnonxfshbjfc`
7. Esperar ≥24h de tráfico real (o forzar 10+ identificaciones manuales cubriendo variedad de plantas)
8. Ejecutar este checklist
