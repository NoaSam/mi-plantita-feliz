-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 5: extender schema para PlantNet como 4º proveedor (votante cross-validated).
-- Ver .planning/phases/05-plantnet-fourth-provider/05-CONTEXT.md D-01..D-04, D-12.
--
-- NO GRANTs: model_evaluations y plant_searches son tablas existentes protegidas
-- por la cláusula "existing tables keep their current grants" de Supabase.
-- Ver supabase/MIGRATION_CONVENTIONS.md § "Para migraciones que NO crean tablas".
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── model_evaluations: widen CHECK constraint (3 → 4 valores) ──────────────
-- PlantNet vota activamente vía cross-validation (D-01). Su fila usa model='plantnet'
-- + raw_response JSON completo. is_winner puede ser false (rama D-01 branch 1 o 3
-- donde el LLM alineado gana) o true (nunca — PlantNet nunca aporta el resultado
-- final al cliente; el LLM alineado siempre es el 'is_winner'). consensus_group
-- y consensus_match_level quedan NULL para plantnet (D-01: no participa en el
-- pickWinner/computeConsensus de LLMs).

alter table public.model_evaluations
  drop constraint if exists model_evaluations_model_check;

alter table public.model_evaluations
  add constraint model_evaluations_model_check
  check (model in ('claude', 'gemini', 'gpt4o', 'plantnet'));

-- ─── model_evaluations: raw_response jsonb (D-03) ───────────────────────────
-- Guarda el JSON completo devuelto por PlantNet (~2-5KB con nb-results=5 sin
-- include-related-images). Nullable: filas LLM históricas y nuevas NUNCA lo
-- pueblan; filas plantnet fallidas (D-09) también lo dejan NULL.

alter table public.model_evaluations
  add column if not exists raw_response jsonb;

-- ─── plant_searches: plantnet_diverged bool (D-12) ──────────────────────────
-- Marca las identificaciones donde PlantNet devolvió score ≥ 0.8 pero ningún
-- LLM coincidió con su científico (D-01 branch 2). Consultable vía la query
-- nueva de docs/model-evaluation-queries.sql (Plan 04). NOT NULL DEFAULT false
-- para que las filas existentes queden marcadas como no-divergentes.

alter table public.plant_searches
  add column if not exists plantnet_diverged boolean not null default false;
