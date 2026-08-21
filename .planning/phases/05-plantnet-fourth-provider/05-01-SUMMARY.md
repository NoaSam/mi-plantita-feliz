---
phase: 05-plantnet-fourth-provider
plan: "01"
subsystem: database-schema
tags: [migration, supabase, plantnet, model-evaluations, plant-searches]
dependency_graph:
  requires: []
  provides: [schema-plantnet-columns-file, secret-plantnet-api-key]
  affects: [plan-03-edge-function, plan-04-divergence-queries]
tech_stack:
  added: []
  patterns: [alter-table-idempotent, widen-check-constraint, add-column-if-not-exists]
key_files:
  created:
    - supabase/migrations/20260818000000_extend_model_evaluations_for_plantnet.sql
  modified: []
decisions:
  - "Sin GRANTs en la migración: model_evaluations y plant_searches son tablas existentes protegidas por 'existing tables keep their grants' (MIGRATION_CONVENTIONS.md)"
  - "Migración idempotente: drop constraint if exists + add constraint + add column if not exists — segura de re-ejecutar"
  - "CPO eligió deferir supabase db push (Task 3) durante esta corrida — se aplicará manualmente cuando vuelva al terminal"
metrics:
  duration: "Task 1 completada por agente + Task 2 confirmada por CPO"
  completed_tasks: 2
  total_tasks: 3
  deferred_tasks: 1
  completed_date: "2026-08-21"
---

# Phase 5 Plan 01: Extend Schema for PlantNet + Register API Key

**One-liner:** Migración SQL idempotente creada (schema para PlantNet como 4º proveedor) + PLANTNET_API_KEY registrada por la CPO. El push a producción y regeneración de types se defiere a acción manual de la CPO.

## Task 1 — Crear migración SQL (Completada)

**Commit:** `f47aa5a` — `chore(05-01): add migration to extend model_evaluations for plantnet`

`supabase/migrations/20260818000000_extend_model_evaluations_for_plantnet.sql` (40 líneas):
- **DROP + ADD constraint:** `model_evaluations_model_check` ampliado a 4 valores (`claude`, `gemini`, `gpt4o`, `plantnet`)
- **ADD COLUMN:** `model_evaluations.raw_response jsonb` (nullable, D-03) — JSON completo PlantNet ~2-5KB
- **ADD COLUMN:** `plant_searches.plantnet_diverged boolean not null default false` (D-12)
- Sin GRANTs (tablas existentes, convención correcta)
- Idempotente: `drop constraint if exists`, `add column if not exists`

## Task 2 — CPO registra PLANTNET_API_KEY (Confirmada)

CPO confirmó "Secret generada" — `PLANTNET_API_KEY` está en Supabase Function Secrets.

## Task 3 — supabase db push + gen types (DEFERIDO)

**Status:** deferido por elección explícita de la CPO durante esta corrida.

**Razón:** `SUPABASE_ACCESS_TOKEN` no está en el entorno del agente; la CPO no quiso exportarlo y se apartó del ordenador. Eligió Option 3 (skip migration) para no bloquear la sesión.

**Trabajo pendiente para la CPO:**

```bash
# 1. Link (una vez) — usa el project_id REAL de config.toml
npx supabase link --project-ref sdxfxkqzgnonxfshbjfc

# 2. Push migración
npx supabase db push --linked

# 3. Regenerar types
npx supabase gen types typescript --project-id sdxfxkqzgnonxfshbjfc > src/integrations/supabase/types.ts

# 4. Commit types
git add src/integrations/supabase/types.ts
git commit -m "chore(05-01): regenerate supabase types after db push"

# 5. Verificar build
npm run build
```

## Deviations from Plan

**D-01 (Task 3 deferida):** El plan asumía SUPABASE_ACCESS_TOKEN en el entorno del executor. No lo estaba. La CPO eligió deferir en lugar de exportar el token. La migración vive en `supabase/migrations/` sin aplicar — se aplicará con `supabase db push --linked` cuando la CPO vuelva.

**D-02 (project_id documentado incorrecto):** Los documentos del plan 05 (05-01-PLAN.md, 05-03-PLAN.md, 05-CONTEXT.md) referencian project_id `sdxrgxfmurshrnrnvhda`. El real (per `supabase/config.toml`) es **`sdxfxkqzgnonxfshbjfc`**. Este summary usa el ID correcto. Los planes originales conservan el ID erróneo por historia; conviene corregir en la fase de fixes.

## Self-Check: PARTIAL

- [x] `supabase/migrations/20260818000000_extend_model_evaluations_for_plantnet.sql` existe (`f47aa5a`)
- [x] Migración idempotente + sin GRANTs
- [x] `PLANTNET_API_KEY` registrada por CPO (confirmación verbal)
- [ ] `supabase db push` aplicada — **PENDIENTE (CPO manual)**
- [ ] `src/integrations/supabase/types.ts` regenerado — **PENDIENTE (CPO manual)**
- [ ] `npm run build` post-push — **PENDIENTE**

## Blocks

Wave 2 Plan 03 (edge function extension) compilaría con TypeScript errors sin las columnas nuevas en types.ts. Mitigación durante esta corrida: augmentar types.ts manualmente como bridge (aditivo, no destructivo). Se documenta en 05-03 SUMMARY.
