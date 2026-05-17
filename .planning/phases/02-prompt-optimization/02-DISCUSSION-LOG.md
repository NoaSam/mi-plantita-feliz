# Phase 2: Prompt Optimization — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 02-prompt-optimization
**Areas discussed:** Alcance del JSON estructurado, Estrategia para 'más precisión', Medición del 'más preciso'
**Area not discussed (Claude's discretion):** Persistencia + backfill

---

## Initial gray-area selection

| Area | Selected |
|------|----------|
| Alcance del JSON estructurado | ✓ |
| Persistencia + backfill | |
| Estrategia para 'más precisión' | ✓ (añadida después) |
| Medición del 'más preciso' | ✓ (añadida después) |

---

## Alcance del JSON estructurado

### Q1: ¿Qué campos añadimos al JSON estructurado?

| Option | Description | Selected |
|--------|-------------|----------|
| Solo watering_interval_days (Recomendado) | Mínimo viable: cumple PROM-01 y desbloquea Calendar v0. Resto del care sigue markdown. | ✓ |
| watering_interval_days + 2-3 más estratégicos | light_level (enum), temperature_range_c, fertilizer_frequency_days. Más cambios, riesgo de campos sin consumer claro. | |
| Estructurar todo el care | Reemplazar markdown care por objeto. Rompe contrato actual, probable scope creep. | |

**Notes:** decisión por mínimo viable; futuras fases pueden añadir estructura cuando haya consumer claro.

### Q2: Si el modelo no puede determinar la frecuencia de riego, ¿qué devuelve?

| Option | Description | Selected |
|--------|-------------|----------|
| null + Calendar usa default (Recomendado) | JSON devuelve null; Calendar v0 muestra default genérico editable. La IA admite no saber. | ✓ |
| Default heurístico de la IA | Modelo siempre devuelve número usando default razonable. Oculta incertidumbre. | |
| Invalidar resultado completo | Si no hay frecuencia, falla toda la identificación. Estricto pero pierde info válida. | |

### Q3: Cuando los 3 modelos dan números distintos de watering_interval_days, ¿qué valor llega al cliente?

| Option | Description | Selected |
|--------|-------------|----------|
| El del winner del consenso de nombre (Recomendado) | Consistente con cómo se elige `care`, `description`, `diagnosis` hoy. Cero lógica nueva. | ✓ |
| Mediana de los 3 valores | Suaviza outliers. Lógica nueva en consensus.ts. | |
| Mínimo conservador | Tomar el más bajo (más seguro). Puede contradecir el care markdown. | |

### Q4: ¿Qué semántica capturamos en watering_interval_days?

| Option | Description | Selected |
|--------|-------------|----------|
| Frecuencia 'promedio anual' (Recomendado) | Un número para indoor típico (20-22°C, luz indirecta). Usuario ajustará en v1+. | ✓ |
| Frecuencia 'verano' (peor caso) | El más frecuente del rango. Pesimista; el usuario riega de más en invierno. | |
| Frecuencia 'condiciones del usuario' | IA infiere entorno desde foto. Más preciso en teoría, más volátil en práctica. | |

**Notes:** simple, claro, Calendar v0 puede consumirlo directo.

### Check-in: ¿más preguntas o seguimos?
**User's choice:** Discutir también otra área → Estrategia para 'más precisión'.

---

## Estrategia para 'más precisión'

### Q1: ¿Dónde concentramos el esfuerzo principalmente?

| Option | Description | Selected |
|--------|-------------|----------|
| Solo iterar el system prompt (Recomendado) | Reescribir SYSTEM_PROMPT: incertidumbre explícita, taxonomía estricta, few-shot, formato JSON. Cero cambio de stack. | ✓ |
| Prompt + cambiar modelo(s) | Evaluar Claude Sonnet 4 → Opus 4.6, Gemini Flash Lite → Pro. Coste y latencia mayores. | |
| Prompt + paso de validación cruzada | Re-prompt o cuarto modelo validator para casos ambiguos. Doble coste/latencia. | |

### Q2: ¿Prompt único compartido o especializado por modelo?

| Option | Description | Selected |
|--------|-------------|----------|
| Prompt único compartido (Recomendado) | Patrón actual. Más simple, evita drift, sin deuda extra. | ✓ |
| Prompt base + ajustes por modelo | XML tags para Claude, JSON schema para OpenAI, etc. Más preciso pero más deuda. | |

### Q3: ¿Añadimos few-shot examples en el prompt?

| Option | Description | Selected |
|--------|-------------|----------|
| Sí, 5-10 examples cortos (Recomendado) | Plantas comunes con nombre canónico + científico + watering_interval_days esperado. Coste ~200-300 tokens. | |
| No, solo instrucciones declarativas | Más corto, más fácil iterar. Riesgo: modelo varía nomenclatura entre llamadas. | |
| Sí, pero solo de nombres | Solo nomenclatura canónica (común ↔ científico). Más ligero. Riego queda a juicio del modelo. | ✓ |

**Notes:** evita sesgar al modelo en valores de riego; ataca el problema concreto del consensus (drift de nomenclatura).

### Q4: ¿Qué comportamiento exigimos al modelo ante incertidumbre de identificación?

| Option | Description | Selected |
|--------|-------------|----------|
| Mejor guess + admitir incertidumbre en description (Recomendado) | Devuelve planta más probable + nota explícita de confianza baja en description. Usuario decide. | ✓ |
| Fallback explícito 'Planta no identificada' | Confianza < umbral → fallback. Honesto pero pierde info útil. | |
| Pedir mejor foto en `diagnosis` | Sugerir qué ángulo ayudaría. Mezcla diagnóstico de planta con diagnóstico de foto. | |

### Check-in: ¿más preguntas o seguimos?
**User's choice:** Discutir Medición del 'más preciso'.

---

## Medición del 'más preciso'

### Q1: ¿Cómo definimos y medimos el success criteria?

| Option | Description | Selected |
|--------|-------------|----------|
| Golden set + comparación antes/después (Recomendado) | 15-25 fotos con ground truth; baseline vs nuevo prompt. Reproducible, defendible. | ✓ |
| Analytics post-deploy con model_evaluations | Sin set sintético. Real pero lento y con variables mezcladas. | |
| Validación cualitativa manual | ~10 fotos a mano. Rápido pero sesgo de confirmación. | |

### Q2: ¿Cómo construimos el golden set?

| Option | Description | Selected |
|--------|-------------|----------|
| Curado manualmente desde tus plantas + plantas conocidas (Recomendado) | Tú eliges 15-25 fotos representativas + etiquetas. Control total. ~1-2h. | |
| Muestra aleatoria de model_evaluations existing | 20 filas históricas reales + etiquetado manual con verdad de terreno. Datos reales pero requiere triaging. | ✓ |
| Set público (PlantNet, iNaturalist, etc.) | 20-30 fotos etiquetadas. Pueden no ser 'plantas de hogar'; calidad/encuadre puede diferir. | |

**Notes:** decisión por usar datos reales de la app.

### Q3: ¿Quién y cómo etiqueta?

| Option | Description | Selected |
|--------|-------------|----------|
| Tú etiquetas manualmente con tu conocimiento | 20-25 filas + image_url, etiquetado manual. ~1-2h, mejor calidad. | |
| Claude propone etiquetas + tú apruebas (Recomendado) | Script consulta fuente externa (PlantNet API o búsqueda); te presenta para aprobar. ~30min de revisión. | |
| Solo etiquetar nombre, no riego | Ground truth solo de identificación. Para riego se mide coherencia entre los 3 modelos. Reduce trabajo a la mitad. | ✓ |

**Notes:** elimina la complejidad de inventar "el riego correcto" para cada planta; usa stddev del consensus como proxy de coherencia.

### Q4: ¿One-off o herramienta recurrente?

| Option | Description | Selected |
|--------|-------------|----------|
| Herramienta recurrente en el repo (Recomendado) | Script en scripts/ + golden set JSON committeado. Reusable en futuras iteraciones de prompt. | ✓ |
| One-off solo para validar esta fase | Ad-hoc, MD del phase folder. Menos overhead pero repetir setup si vuelves a optimizar. | |

### Check-in: ¿Persistencia+backfill o CONTEXT?
**User's choice:** Listo para CONTEXT → Persistencia queda como Claude's Discretion en CONTEXT.md.

---

## Claude's Discretion

- **Persistencia DB de `watering_interval_days` + backfill de filas históricas** — el planner decide en `/gsd-plan-phase 2`. Recomendación heurística: columna nullable nueva, NULL para históricas, backfill diferido a v1+.
- **Versión exacta de modelos** — el planner evalúa si Claude Sonnet 4 (`claude-sonnet-4-20250514`) sigue siendo la opción correcta o conviene actualizar a una versión más reciente del mismo tier mientras se toca el archivo.
- **Formato exacto de los few-shot examples en el prompt** y selección concreta de las 5-10 plantas — el executor elige siguiendo best practices del modelo.

## Deferred Ideas

Ver `<deferred>` en `02-CONTEXT.md` para la lista completa con razones. Resumen:

- Estructurar más campos del care (light_level, etc.) — sin consumer claro v0.
- Cambiar modelos — coste/latencia.
- Validación cruzada / re-prompt — coste/latencia.
- Prompts especializados por modelo — deuda de mantenimiento.
- Eventos PostHog de telemetría del prompt — discreción del planner.
- Backfill de `model_evaluations` con `watering_interval_days` — discreción del planner.
- Editar `watering_interval_days` manualmente desde el cliente — v1+ (RIEG-02).
