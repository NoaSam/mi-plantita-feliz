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
-- 3. TASA DE CONSENSO POR MODELO
-- consensus_group = 'correct'     → coincidió con al menos otro modelo
-- consensus_group = 'no_consensus' → respondió pero con nombre diferente
-- consensus_group IS NULL          → el modelo falló (success = false)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  model,
  COUNT(*)                                                          AS total_llamadas,
  COUNT(*) FILTER (WHERE success = true)                            AS respuestas_validas,
  COUNT(*) FILTER (WHERE consensus_group = 'correct')               AS en_consenso,
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
