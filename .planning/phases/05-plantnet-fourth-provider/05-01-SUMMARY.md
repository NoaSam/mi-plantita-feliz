---
phase: 05-plantnet-fourth-provider
plan: "01"
subsystem: database-schema
tags: [migration, supabase, plantnet, model-evaluations, plant-searches]
dependency_graph:
  requires: []
  provides: [schema-plantnet-columns, types-plantnet-columns]
  affects: [plan-03-edge-function, plan-04-divergence-queries]
tech_stack:
  added: []
  patterns: [alter-table-idempotent, widen-check-constraint, add-column-if-not-exists]
key_files:
  created:
    - supabase/migrations/20260818000000_extend_model_evaluations_for_plantnet.sql
  modified: []
decisions:
  - "Sin GRANTs en la migración: model_evaluations y plant_searches son tablas existentes protegidas por la cláusula existing tables keep their grants (MIGRATION_CONVENTIONS.md)"
  - "Migración idempotente: drop constraint if exists + add constraint + add column if not exists — segura de re-ejecutar"
  - "Task 2 (PLANTNET_API_KEY en Supabase Secrets) es un checkpoint human-action: requiere acción manual de la CPO antes de continuar con Task 3"
metrics:
  duration: "~5 min (Task 1 completada)"
  completed_tasks: 1
  total_tasks: 3
  completed_date: "2026-08-21"
---

# Phase 5 Plan 01: Extend Schema for PlantNet + Register API Key

**One-liner:** Migración SQL idempotente que extiende model_evaluations (CHECK constraint 3→4 valores + raw_response jsonb) y plant_searches (plantnet_diverged bool) para habilitar PlantNet como 4o proveedor votante.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Crear migración SQL extend_model_evaluations_for_plantnet | f47aa5a | supabase/migrations/20260818000000_extend_model_evaluations_for_plantnet.sql |

## Checkpoint Reached — Task 2

**Type:** checkpoint:human-action (blocking)
**Status:** Pendiente de acción manual de la CPO.

Task 2 requiere que la CPO registre `PLANTNET_API_KEY` como Supabase Function Secret. Esta acción NO puede ser automatizada.

### Pasos para la CPO

1. Abre https://supabase.com/dashboard/project/sdxrgxfmurshrnrnvhda/functions
2. Ve a **Secrets** (Edge Functions → Secrets o "Manage secrets")
3. Pulsa **New secret**
4. **Name:** `PLANTNET_API_KEY` (en UPPER_SNAKE_CASE exactamente)
5. **Value:** pega la API key generada en https://my.plantnet.org/account/api el 2026-08-18 durante el benchmark
6. Guarda
7. Verifica que aparece en la lista de secrets (Supabase oculta el valor pero muestra el nombre)

**Si la key se ha perdido:** regenerar en https://my.plantnet.org/account/api — revocar la vieja, generar nueva, pegarla en el secret.

**Verificacion:** Ir a https://supabase.com/dashboard/project/sdxrgxfmurshrnrnvhda/functions → Secrets: `PLANTNET_API_KEY` debe aparecer en la lista.

### Senhal de reanudacion

Escribe "listo" o "done" cuando el secret este registrado. Si regeneraste la key, escribe "regenerada".

## Deviations from Plan

None — plan ejecutado exactamente como estaba escrito para Task 1.

## Task 1 — Migración SQL (Completada)

### Contenido creado

`supabase/migrations/20260818000000_extend_model_evaluations_for_plantnet.sql` (40 lineas):

- **DROP + ADD constraint:** `model_evaluations_model_check` ampliado de 3 a 4 valores (`claude`, `gemini`, `gpt4o`, `plantnet`)
- **ADD COLUMN:** `model_evaluations.raw_response jsonb` (nullable, D-03) — guarda JSON completo PlantNet (~2-5KB)
- **ADD COLUMN:** `plant_searches.plantnet_diverged boolean not null default false` (D-12) — marca divergencias PlantNet vs LLMs
- Sin GRANTs (tablas existentes, convención correcta)
- Completamente idempotente (`drop constraint if exists`, `add column if not exists`)

### Verificaciones pasadas

```
SQL structure OK
OK: migración creada con los 3 cambios esperados
OK: no GRANTs presentes
```

## Pending Tasks (post-checkpoint)

| Task | Name | Blocked by |
|------|------|-----------|
| 2 | [BLOCKING] CPO registra PLANTNET_API_KEY como Supabase Function Secret | Accion manual CPO |
| 3 | [BLOCKING] Aplicar migración con supabase db push + regenerar types | Task 2 + SUPABASE_ACCESS_TOKEN en entorno |

## Known Stubs

None — Task 1 no genera stubs. El archivo de migración SQL es contenido final, no placeholder.

## Threat Flags

None — la migración no introduce nueva superficie de ataque. Los riesgos T-05-01-01 a T-05-01-05 del threat model del plan estan mitigados por la construccion idempotente de la migración.

## Self-Check: PARTIAL

- [x] supabase/migrations/20260818000000_extend_model_evaluations_for_plantnet.sql — FOUND (f47aa5a)
- [ ] src/integrations/supabase/types.ts regenerado — PENDIENTE (Task 3 no ejecutada, bloqueada por checkpoint Task 2)
- [ ] supabase db push aplicado — PENDIENTE (Task 3 no ejecutada)
- [x] Commit f47aa5a existe en git log

Plan en estado checkpoint tras Task 1. Tasks 2 y 3 pendientes de reanudacion tras accion manual de la CPO.
