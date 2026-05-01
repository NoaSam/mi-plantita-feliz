---
title: Estrategia de release vertical slice para foundations + calendar v0 + map v0
date: 2026-05-01
context: Cómo evitar "dead UI" cuando la clasificación necesita destino y el destino necesita datos clasificados
type: decision-note
---

# Vertical slice release strategy

## El problema chicken-and-egg

La opción C ("la acción crea el modo") introduce 3 acciones en la pantalla de resultado: *Añadir a mis plantas* / *Guardar descubrimiento* / *Solo identificar*. Pero:

- Las acciones **necesitan destino** (calendario, mapa) para tener sentido. Sin destino, el usuario clasifica sin saber para qué.
- El destino (calendario, mapa) **necesita datos clasificados** para llenarse. Sin clasificación, las pantallas están vacías para siempre.

## Opciones evaluadas

- **Faseado secuencial** — descartada. Cada fase se publica como release independiente. Entre el release de la clasificación y el release del primer destino (calendario o mapa), el usuario vive en un estado intermedio raro: "clasifico esta planta… ¿y? No pasa nada." Riesgo: los primeros usuarios clasifican mal o no clasifican porque no entienden la consecuencia.
- **Big bang completo** — descartada. Construir las versiones ricas de calendario y mapa antes de publicar nada alarga el release sin validación. Mucha inversión sin feedback real.
- **Vertical slice MVP** — **ELEGIDA**. Se construyen las 3 piezas en fases separadas de planificación, pero se publican **todas juntas en un único release**. Cada destino sale en su versión más mínima (v0) para que el bundle no tarde meses.

## Diferencia clave: planificación vs release

- En `ROADMAP.md` siguen siendo fases distintas (planificación, dependencias, entregables medibles).
- En el móvil del usuario, las 3 piezas aterrizan en la misma versión.
- Esto significa **no publicar a producción hasta que las 3 estén listas**, aunque internamente vayan completándose en orden.

## Qué entra en cada v0

**Foundations v0 (Phase A)**
- 3 acciones en result screen (Mi jardín / Descubrimiento / Solo identificar)
- Columna `context` en la tabla de identificaciones (casa / silvestre / null)
- Banner de novedad para usuarios existentes en primera apertura post-update
- Acceso a clasificación retroactiva desde el detalle de cada planta del historial

**Calendar v0 (Phase B)**
- Lista simple de "Mis plantas" con foto, nombre y frecuencia de riego sugerida
- **Sin** "Hoy toca regar" sofisticado (ese ya es v1+)
- **Sin** notificaciones / recordatorios
- Empty state cuando no hay plantas clasificadas como casa

**Map v0 (Phase C)**
- Mapa con pins de descubrimientos
- Tap en pin → foto + nombre de la planta + fecha
- **Sin** clustering, **sin** filtros, **sin** búsqueda
- Empty state cuando no hay descubrimientos

## Qué se difiere a v1+

Una vez publicado el vertical slice y con feedback real:

- Calendario: lógica de "Hoy toca regar", recordatorios push, edición manual de frecuencia, apodos
- Mapa: clustering, filtros por especie/fecha, vista de detalle rica
- Clasificación: inferencia inteligente (ver seed `smart-classification-inference`)
- Reveal: clasificación batch retroactiva si el banner pasivo no convierte suficiente

## Riesgo conocido y mitigación

**Riesgo:** un release más grande implica más superficie para bugs y mayor coste de QA.

**Mitigación:**
- Cada fase A/B/C tiene su propio plan, ejecución, verificación y code-review (flujo GSD estándar).
- Las 3 se integran en una rama de release antes de publicar.
- E2E tests cubren el flujo completo: identificar → clasificar → ver en calendario / mapa.
