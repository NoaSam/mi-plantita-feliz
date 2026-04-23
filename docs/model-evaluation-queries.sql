-- ═══════════════════════════════════════════════════════════════════════════════
-- Queries de evaluación de modelos — Supabase SQL Editor
-- Tabla: model_evaluations (3 filas por búsqueda: claude, gemini, gpt4o)
-- ═══════════════════════════════════════════════════════════════════════════════


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


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. LATENCIA POR MODELO (solo respuestas exitosas)
-- Media, mediana (p50), p90 y rango. Excluye fallos para no contaminar.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  model,
  COUNT(*)                                                      AS muestras,
  ROUND(AVG(response_ms))                                       AS media_ms,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY response_ms)) AS p50_ms,
  ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY response_ms)) AS p90_ms,
  MIN(response_ms)                                              AS min_ms,
  MAX(response_ms)                                              AS max_ms
FROM model_evaluations
WHERE success = true
  AND response_ms IS NOT NULL
GROUP BY model
ORDER BY p50_ms ASC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TASA DE CONSENSO POR MODELO (con niveles de match)
-- consensus_group = 'correct'      → coincidió con al menos otro modelo
-- consensus_group = 'no_consensus' → respondió pero con nombre diferente
-- consensus_group IS NULL          → el modelo falló (success = false)
-- consensus_match_level = 'exact'      → nombre científico idéntico
-- consensus_match_level = 'normalized' → idéntico tras quitar cultivar/var./híbrido
-- consensus_match_level = 'genus'      → mismo género, distinta especie
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  model,
  COUNT(*)                                                          AS total_llamadas,
  COUNT(*) FILTER (WHERE success = true)                            AS respuestas_validas,
  COUNT(*) FILTER (WHERE consensus_group = 'correct')               AS en_consenso,
  COUNT(*) FILTER (WHERE consensus_match_level = 'exact')           AS consenso_exacto,
  COUNT(*) FILTER (WHERE consensus_match_level = 'normalized')      AS consenso_normalizado,
  COUNT(*) FILTER (WHERE consensus_match_level = 'genus')           AS consenso_genero,
  COUNT(*) FILTER (WHERE consensus_group = 'no_consensus')          AS discrepante,
  COUNT(*) FILTER (WHERE success = false)                           AS fallo_total,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE consensus_group = 'correct') / COUNT(*),
    1
  )                                                                 AS tasa_consenso_pct,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE consensus_group = 'correct')
      / NULLIF(COUNT(*) FILTER (WHERE success = true), 0),
    1
  )                                                                 AS consenso_sobre_exitos_pct
FROM model_evaluations
GROUP BY model
ORDER BY tasa_consenso_pct DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. WIN RATE POR MODELO
-- is_winner = true → el resultado de este modelo se mostró al usuario.
-- Lógica de selección: consenso primero, desempate por velocidad.
-- ─────────────────────────────────────────────────────────────────────────────

WITH totals AS (
  SELECT COUNT(DISTINCT plant_search_id) AS total_busquedas
  FROM model_evaluations
  WHERE is_winner = true
)
SELECT
  me.model,
  COUNT(*) FILTER (WHERE me.is_winner = true)               AS veces_ganador,
  t.total_busquedas,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE me.is_winner = true) / t.total_busquedas,
    1
  )                                                         AS win_rate_pct,
  COUNT(*) FILTER (WHERE me.is_winner = true AND me.consensus_group = 'correct')      AS victorias_consenso,
  COUNT(*) FILTER (WHERE me.is_winner = true AND me.consensus_match_level = 'exact')  AS victorias_exacto,
  COUNT(*) FILTER (WHERE me.is_winner = true AND me.consensus_match_level = 'normalized') AS victorias_normalizado,
  COUNT(*) FILTER (WHERE me.is_winner = true AND me.consensus_match_level = 'genus')  AS victorias_genero,
  COUNT(*) FILTER (WHERE me.is_winner = true AND me.consensus_group = 'no_consensus') AS victorias_fallback
FROM model_evaluations me
CROSS JOIN totals t
GROUP BY me.model, t.total_busquedas
ORDER BY win_rate_pct DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. DESGLOSE DE ERRORES POR MODELO
-- error_message es texto libre: "RATE_LIMIT", "API_ERROR", o null si ok.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  model,
  COALESCE(error_message, 'sin_error')     AS tipo_error,
  COUNT(*)                                 AS ocurrencias,
  ROUND(
    100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY model),
    1
  )                                        AS pct_sobre_modelo
FROM model_evaluations
GROUP BY model, COALESCE(error_message, 'sin_error')
ORDER BY model, ocurrencias DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. EVOLUCIÓN TEMPORAL POR SEMANA
-- Con <50 búsquedas usar semana. Cambiar 'week' → 'day' con más datos.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  DATE_TRUNC('week', me.created_at)::date                    AS semana,
  me.model,
  COUNT(*)                                                   AS llamadas,
  COUNT(*) FILTER (WHERE me.success = true)                  AS exitosas,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE me.success = true) / COUNT(*),
    1
  )                                                          AS tasa_exito_pct,
  ROUND(
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY me.response_ms)
    FILTER (WHERE me.success = true AND me.response_ms IS NOT NULL)
  )                                                          AS latencia_p50_ms,
  COUNT(*) FILTER (WHERE me.is_winner = true)                AS victorias
FROM model_evaluations me
GROUP BY DATE_TRUNC('week', me.created_at), me.model
ORDER BY semana DESC, me.model;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SCORECARD COMBINADO — RANKING FINAL
-- Pesos: éxito 30%, consenso 35%, win rate 25%, velocidad 10%
-- Usa consenso amplio (incluye exact + normalized + genus).
-- Ajustar los pesos en el CTE "scored" según prioridades.
-- ─────────────────────────────────────────────────────────────────────────────

WITH base AS (
  SELECT
    model,
    COUNT(*)                                                              AS total_llamadas,
    ROUND(100.0 * COUNT(*) FILTER (WHERE success = true) / COUNT(*), 1)  AS tasa_exito_pct,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE consensus_group = 'correct') / COUNT(*),
      1
    )                                                                     AS tasa_consenso_pct,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE is_winner = true)
        / NULLIF((SELECT COUNT(DISTINCT plant_search_id)
                  FROM model_evaluations
                  WHERE is_winner = true), 0),
      1
    )                                                                     AS win_rate_pct,
    ROUND(
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY response_ms)
      FILTER (WHERE success = true AND response_ms IS NOT NULL)
    )                                                                     AS latencia_p50_ms
  FROM model_evaluations
  GROUP BY model
),
latency_range AS (
  SELECT
    MIN(latencia_p50_ms) AS lat_min,
    MAX(latencia_p50_ms) AS lat_max
  FROM base
),
scored AS (
  SELECT
    b.*,
    CASE
      WHEN lr.lat_max = lr.lat_min THEN 100.0
      ELSE ROUND(
        100.0 * (lr.lat_max - b.latencia_p50_ms) / (lr.lat_max - lr.lat_min),
        1
      )
    END                                           AS velocidad_score,
    ROUND(
      (b.tasa_exito_pct    * 0.30) +
      (b.tasa_consenso_pct * 0.35) +
      (b.win_rate_pct      * 0.25) +
      (CASE
        WHEN lr.lat_max = lr.lat_min THEN 100.0
        ELSE 100.0 * (lr.lat_max - b.latencia_p50_ms) / (lr.lat_max - lr.lat_min)
       END * 0.10),
      1
    )                                             AS puntuacion_final
  FROM base b
  CROSS JOIN latency_range lr
)
SELECT
  RANK() OVER (ORDER BY puntuacion_final DESC)  AS ranking,
  model,
  total_llamadas,
  tasa_exito_pct        AS exito_pct,
  tasa_consenso_pct     AS consenso_pct,
  win_rate_pct          AS win_pct,
  latencia_p50_ms,
  velocidad_score,
  puntuacion_final
FROM scored
ORDER BY ranking;


-- ─────────────────────────────────────────────────────────────────────────────
-- BONUS: Detectar falsos positivos (success=true pero respuesta fallback)
-- Ejecutar ANTES de arreglar el código para cuantificar el problema.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  model,
  COUNT(*) AS falsos_positivos
FROM model_evaluations
WHERE success = true
  AND raw_name = 'Planta no identificada'
GROUP BY model
ORDER BY falsos_positivos DESC;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO DE CONSENSO
-- Queries para investigar la tasa de no_consensus y sus causas.
-- Usadas para diseñar el consenso por niveles (exact/normalized/genus).
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. TASA GENERAL DE CONSENSO vs NO_CONSENSUS
-- Vista rápida del % de evaluaciones exitosas en cada grupo.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  consensus_group,
  COUNT(*) AS total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) AS pct
FROM model_evaluations
WHERE success = true
GROUP BY consensus_group
ORDER BY total DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. BÚSQUEDAS DONDE LOS 3 MODELOS RESPONDIERON OK PERO NINGUNO LLEGÓ A CONSENSO
-- Los casos más interesantes para diagnosticar: todos respondieron pero discrepan.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  ps.id,
  ps.name AS winner_name,
  me.model,
  me.scientific_name,
  me.consensus_group
FROM plant_searches ps
JOIN model_evaluations me ON me.plant_search_id = ps.id
WHERE ps.id IN (
  SELECT plant_search_id
  FROM model_evaluations
  WHERE success = true
  GROUP BY plant_search_id
  HAVING COUNT(*) = 3
    AND COUNT(*) FILTER (WHERE consensus_group = 'correct') = 0
)
ORDER BY ps.id DESC, me.model;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. NOMBRES CIENTÍFICOS QUE CASI COINCIDEN
-- Muestra los nombres que cada modelo devolvió para buscar patrones de
-- desacuerdo por variación nomenclatural (cultivar, especie, género).
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  ps.id,
  array_agg(me.model || ': ' || COALESCE(me.scientific_name, 'NULL') ORDER BY me.model) AS names
FROM plant_searches ps
JOIN model_evaluations me ON me.plant_search_id = ps.id
WHERE me.success = true
GROUP BY ps.id
HAVING COUNT(DISTINCT me.scientific_name) > 1
ORDER BY ps.id DESC
LIMIT 20;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. QUÉ MODELO DISIENTE MÁS
-- Ranking de modelos por tasa de discrepancia (no_consensus sobre éxitos).
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  model,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE consensus_group = 'correct') AS en_consenso,
  COUNT(*) FILTER (WHERE consensus_group = 'no_consensus') AS disidente,
  ROUND(100.0 * COUNT(*) FILTER (WHERE consensus_group = 'no_consensus') / COUNT(*), 1) AS pct_disidente
FROM model_evaluations
WHERE success = true
GROUP BY model
ORDER BY pct_disidente DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. DESGLOSE POR NIVEL DE MATCH (post-implementación del consenso por niveles)
-- Solo tendrá datos después de desplegar el consenso por niveles.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  consensus_match_level,
  COUNT(*) AS total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) AS pct
FROM model_evaluations
WHERE consensus_group = 'correct'
  AND consensus_match_level IS NOT NULL
GROUP BY consensus_match_level
ORDER BY total DESC;
