---
phase: 05-plantnet-fourth-provider
plan: "04"
subsystem: analytics-docs
tags: [docs, sql, posthog, plantnet, divergence]
dependency_graph:
  requires: [05-01-schema-migration-file]
  provides: [divergence-sql-query, plantnet-divergence-event-doc]
  affects: [cpo-analytics-workflow]
tech_stack:
  added: []
  patterns: [supabase-sql-editor-queries, posthog-event-docs]
key_files:
  created: []
  modified:
    - docs/model-evaluation-queries.sql
    - docs/posthog-events.md
decisions:
  - "Se mantuvieron las queries 13 (detalle) y 13-BIS (agregado) juntas — inseparables en la práctica para uso CPO"
  - "El evento plantnet_divergence se documentó con 5 propiedades (sin PII: solo IDs internos + strings botánicos)"
metrics:
  duration: "~4 min ejecución"
  completed_tasks: 2
  total_tasks: 2
  completed_date: "2026-08-21"
---

# Phase 5 Plan 04: Analytics Docs (SQL Divergence Query + PostHog Event)

**One-liner:** Documenta las 2 herramientas de análisis que produce Phase 5 — la query SQL de divergencias PlantNet vs LLM (copy-pasteable en Supabase SQL Editor) + el evento server-side `plantnet_divergence` (dispatched desde el edge function).

## Task 1 — `docs/model-evaluation-queries.sql`

- Header actualizado línea 3: "3 filas por búsqueda" → "4 filas por búsqueda desde Phase 5 deploy"
- Sección nueva al final: **PHASE 5 — PLANTNET COMO 4º VOTANTE**
- Query 13: detalle de divergencias últimos 30 días con JOIN sobre `plant_searches.plantnet_diverged = true`, extrae `plantnet_score` del `raw_response`, clasifica en "mismo género, especies distintas" vs "géneros distintos"
- Query 13-BIS: snapshot agregado mensual — total búsquedas, PlantNet exitoso/fallido, % divergencias sobre exitosos
- Estilo consistente con las 12 queries pre-existentes (separadores `─` de 77 chars, comentarios en español, CTEs con `WITH ... AS`)
- `git diff` confirma: header modificado + append al final, sin tocar queries 1-12

## Task 2 — `docs/posthog-events.md`

- Sección nueva al final: **Phase 5 — PlantNet cross-validation (server-side event)**
- Tabla con evento `plantnet_divergence`, 5 propiedades del payload documentadas
- Nota sobre `distinct_id` (user_id > anonymous_id > `"edge-fn-anon"`)
- Referencia cruzada a queries 13/13-BIS de `model-evaluation-queries.sql`
- Requisito de `POSTHOG_PROJECT_API_KEY` como Function Secret (fail-open: skipea evento con `console.warn` si falta)
- `git diff` confirma: append al final, sin tocar secciones anteriores

## Deviations

Ninguna — plan ejecutado tal cual estaba escrito. La nota del plan sobre "13-BIS opcional" se mantuvo (útil para chequeo mensual sin editar la 13).

## Self-Check: PASSED

- [x] Header actualizado a "4 filas por búsqueda desde Phase 5 deploy"
- [x] Query 13 presente con JOIN sobre `plantnet_diverged = true`
- [x] Query 13-BIS presente con agregados
- [x] `## Phase 5` presente en posthog-events.md
- [x] Las 5 propiedades del payload documentadas
- [x] Ninguna sección/query existente tocada
