# Phase 5: PlantNet as Fourth Identification Provider - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-15
**Phase:** 5-plantnet-fourth-provider
**Areas discussed:** Phase shape (scope pivot), Pl@ntNet en el consenso, Deliverable de análisis, Tier

---

## Phase shape (scope pivot)

Antes de entrar en gray areas específicas, la CPO redirigió el scope completo de la fase:

> "Quiero integrar Pl@ntNet pero no quiero que sea el único LLM que responda, quiero que corran 4 en paralelo y sacar métricas de cuál es el mejor como hasta ahora con los 3 que tenemos funcionando."

Esto contradice el ROADMAP original ("Pl@ntNet + 1 LLM" como reemplazo total de la arquitectura 3-LLM). Se propusieron 3 caminos:

| Option | Description | Selected |
|--------|-------------|----------|
| Reshape en sitio | Reescribo Phase 5 = añadir PlantNet como 4º proveedor + benchmark. La versión "reemplazo total" queda como candidate futuro. | ✓ |
| Nueva phase separada | Dejar Phase 5 original y crear una fase adicional para "añadir PlantNet al benchmark". | |
| Solo scout / spike | Ni fase ni discussion. Spike rápido de prueba. | |

**User's choice:** Reshape en sitio
**Notes:** La CPO prefiere validar con datos ANTES de comprometerse a cambios grandes de arquitectura. Coherente con su modo de trabajo (medir antes de decidir).

---

## Pl@ntNet en el consenso

### Sub-decisión 1 — Rol de PlantNet

| Option | Description | Selected |
|--------|-------------|----------|
| Observador silencioso | PlantNet corre en paralelo, se guarda su respuesta, aparece en el benchmark, pero NO cambia lo que ve el usuario. | ✓ |
| Voto igual que los LLMs | PlantNet vota 1/4 en el consenso, como uno más. Cambia lo que ve el usuario desde día 1. | |
| Voto de especialista | PlantNet manda si score > threshold. Impacto grande sin datos previos que lo respalden. | |

**User's choice:** Observador silencioso
**Notes:** Cero riesgo de regresión. Cuando haya datos se decide en Phase 5.1.

### Sub-decisión 2 — Payload persistido

| Option | Description | Selected |
|--------|-------------|----------|
| Top-3 candidatos + scores | Balance entre detalle y peso. ~200 bytes/identificación. | |
| Solo top-1 + score | Más ligero pero pierde info del cono de incertidumbre. | |
| Response completa (JSON crudo) | Máximo detalle. ~2-5KB/identificación. | ✓ |

**User's choice:** Response completa (JSON crudo)
**Notes:** No sabemos hoy qué campos serán útiles mañana. Guardar ancho es barato ahora.

### Sub-decisión 3 — Métrica de acierto en benchmark

| Option | Description | Selected |
|--------|-------------|----------|
| Top-1 match exacto | Estricto y comparable directo con los LLMs. | ✓ |
| Top-3 match | Más permisivo con PlantNet, no comparable 1-a-1 con LLMs. | |
| Top-1 con umbral de confianza | Filtra respuestas débiles, mete parámetro extra que tunear. | |

**User's choice:** Top-1 match exacto
**Notes:** Comparación limpia sin parámetros ocultos.

### Sub-decisión 4 — UI visibility

| Option | Description | Selected |
|--------|-------------|----------|
| 100% invisible | El usuario no ve nada distinto. Coherente con observador silencioso. | ✓ |
| Badge sutil en el resultado | "Identificado con IA + PlantNet" abajo del nombre. | |
| Solo en panel de debug (dev) | Prod invisible, dev muestra comparación. | |

**User's choice:** 100% invisible
**Notes:** No confundir al usuario con proveedor cuya influencia aún está por decidir.

---

## Deliverable de análisis

| Option | Description | Selected |
|--------|-------------|----------|
| Report comparativo + recomendación | Benchmark script produce tabla + breakdown + recomendación escrita de si merece Phase 5.1. | |
| Solo datos crudos | Tabla de números, CPO interpreta. | |
| Datos crudos + dashboard visual | Números + página interna `/dev/plantnet-report` bloqueada por env var. | |
| **Otras: Queries SQL documentadas** | Extender `docs/model-evaluation-queries.sql` con secciones nuevas para PlantNet siguiendo el patrón existente. Sin script CLI, sin dashboard. CPO corre queries en Supabase SQL Editor cuando quiere insights. | ✓ |

**User's choice:** "Lo haremos como hasta ahora con las queries en SQL documentadas"
**Notes:** Coherente con el patrón ya establecido para los 3 LLMs (`docs/model-evaluation-queries.sql` existe desde antes). Más ligero, más flexible, no acopla a un formato de report específico.

---

## Tier de PlantNet

**Asked but not answered directly** — la CPO redirigió la conversación pidiendo incluir análisis en el scope antes de resolver tier.

**Resolved as Claude's discretion:** Default = free tier (500/día) — cabe con margen amplio para el volumen actual (~15-30 identificaciones/día). Planner puede ajustar si detecta riesgo.

---

## Claude's Discretion

- Timeout de la llamada a PlantNet (recomendación: 5-10s, coherente con LLMs actuales)
- Esquema exacto de persistencia (recomendación en D-04: extender `model_evaluations` con `model='plantnet'` + columna `raw_response jsonb`)
- Extracción del nombre científico top-1 del JSON para columna `raw_name`
- Nombre de env var (`PLANTNET_API_KEY` en Supabase Function Secrets, mismo patrón que las otras)
- Retry policy en 429 rate-limit (recomendación: aceptar fallo silencioso, coherente con D-09)
- Payload a PlantNet: URL vs upload directo del blob (depende del schema de la API)
- Tier free vs paid (default free per volumen actual)

## Deferred Ideas

- **Phase 5.1 candidate:** dar voto real a PlantNet en el consenso si los datos lo respaldan (>10 puntos de diferencia sostenida en top-1 accuracy)
- **Phase 5.2 candidate:** reemplazo total de la arquitectura 3-LLM (visión original de Phase 5). Solo con datos que respalden que PlantNet es especialista superior Y consensus no aporta valor.
- **Dashboard visual PlantNet vs LLMs.** Descartado en discuss-phase. Reactivar si compartir hallazgos con terceros lo pide.
- **Ampliar golden set más allá de 24 fotos.** Planner puede proponerlo si detecta necesidad estadística.
- **Traducción de nombres comunes desde el JSON de PlantNet.** No aplica hoy (observador silencioso); gray area si Phase 5.1 le da voto.
