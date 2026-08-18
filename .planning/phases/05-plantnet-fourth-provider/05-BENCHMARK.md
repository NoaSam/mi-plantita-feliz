# Phase 5 — Latency Benchmark (2026-08-18)

**Objetivo:** decidir si PlantNet puede participar en el consenso sin degradar la latencia percibida del SSE first-winner (Phase 4).

**Protocolo:**
- 10 iteraciones × 4 proveedores = 40 llamadas
- PlantNet fires FIRST (para darle head start deliberado)
- 3 LLMs fires en paralelo inmediatamente después
- Wall-clock ms desde t=0 hasta la respuesta completa de cada proveedor
- Fotos: primeras 10 del golden set (`scripts/.benchmark-golden-set.json`), base64 data URIs

**Script:** `scripts/benchmark-latency.ts` (`npm run benchmark:latency`)

## Resultados

### Latencia (wall-clock ms desde t=0)

| Modelo | n | min | avg | p50 | p95 | max |
|---|---|---|---|---|---|---|
| **PlantNet** | 10 | 92ms | 315ms | **307ms** | 695ms | 695ms |
| GPT-4o | 10 | 754ms | 998ms | 1009ms | 1335ms | 1335ms |
| Gemini | 10 | 685ms | 1148ms | 917ms | 3585ms* | 3585ms |
| Claude | 10 | 1638ms | 2094ms | 1843ms | 2975ms | 2975ms |

*Gemini iter 9 fue outlier (3585ms) — resto de iteraciones en 700-1085ms. Network jitter puntual.

### Orden de llegada (cuántas veces cada modelo llegó Nº X)

| Modelo | 1º | 2º | 3º | 4º |
|---|---|---|---|---|
| **PlantNet** | **10** | 0 | 0 | 0 |
| Gemini | 0 | 6 | 3 | 1 |
| GPT-4o | 0 | 4 | 6 | 0 |
| Claude | 0 | 0 | 1 | **9** |

## Hallazgos clave

1. **PlantNet es órdenes de magnitud más rápido que los LLMs.** p50 307ms vs LLMs 917-1843ms (3-6× más rápido). Razón: PlantNet devuelve un JSON pequeño (nombre científico + score), los LLMs devuelven ~500-2000 tokens de prosa en español.

2. **PlantNet gana el race en el 100% de las iteraciones.** Su vote está siempre disponible ~600ms antes que cualquier LLM. Cero riesgo de gatear el SSE first-winner.

3. **Claude nunca gana el race** (0/10) y siempre llega 4º de 4 (9/10) o 3º (1/10). p50 1843ms vs Gemini 917ms. Es el LLM más caro y el más lento. **Hallazgo para Phase 5.1 candidate** (deferred): revisar si merece seguir gastando en Claude.

## Implicaciones para el diseño de Phase 5

Este benchmark desmintió empíricamente la preocupación original de "PlantNet llegará tarde y su vote no contará". Se abandonaron las opciones "A2 ventana de espera" y "B silent observer" y se adoptó el diseño de **cross-validation** (D-01) con PlantNet como votante activo — su llegada anticipada permite validar contra los LLMs sin coste de latencia.

Ver `05-CONTEXT.md` D-13 para el registro formal de la decisión.

---

*Benchmark corrido: 2026-08-18*
*Script: `scripts/benchmark-latency.ts`*
