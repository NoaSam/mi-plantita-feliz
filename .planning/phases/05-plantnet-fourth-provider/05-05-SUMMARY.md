---
phase: 05-plantnet-fourth-provider
plan: "05"
subsystem: phase-verification
tags: [verification, checklist, cpo-signoff]
dependency_graph:
  requires: [05-01-partial, 05-02, 05-03-code, 05-04]
  provides: [verification-checklist]
  affects: [phase-closure]
tech_stack:
  added: []
  patterns: [phase-verification-checklist, 6-bloque-signoff-format]
key_files:
  created:
    - .planning/phases/05-plantnet-fourth-provider/VERIFICATION.md
  modified: []
decisions:
  - "VERIFICATION.md creado con 6 bloques + sign-off, listo para ejecutar tras deploy"
  - "ROADMAP.md y REQUIREMENTS.md NO se marcan completos aún — pending CPO sign-off"
  - "Añadido anexo con precondiciones pendientes (db push, deploy) para que la CPO no las olvide"
metrics:
  duration: "~2 min"
  completed_tasks: 1
  total_tasks: 2
  deferred_tasks: 1
  completed_date: "2026-08-21"
---

# Phase 5 Plan 05: Verification Checklist + Phase Closure

**One-liner:** VERIFICATION.md creado con 6 bloques (A cobertura datos, B cross-validation, C divergencia, D UX invisible, E latencia, F regresión) + sign-off + rollback plan. Task 2 (ejecución del checklist por la CPO) queda pendiente porque requiere deploy previo.

## Task 1 — VERIFICATION.md creado

`.planning/phases/05-plantnet-fourth-provider/VERIFICATION.md` — 292 líneas.

Cobertura:
- **Bloque A (PLANT-01):** query de cobertura ≥95% con 4 filas por búsqueda + breakdown de errores plantnet
- **Bloque B (D-01, D-10, D-11):** muestreo de overrides en 5 categorías + verificación de que genus-only NO cuenta como override
- **Bloque C (D-12, PLANT-02):** referencia a query 13 de model-evaluation-queries.sql + verificación de eventos PostHog `plantnet_divergence`
- **Bloque D (D-02):** DevTools Network response JSON con SOLO 3 items en `models` + UX visual sin cambios
- **Bloque E (PLANT-03):** latencia p50/p95 PlantNet <2000ms + comparativa pre/post-deploy del winner LLM
- **Bloque F:** `npm run test -- --run` verde (baseline 195 tests) + `npm run build` verde + smoke Android
- **Sign-off:** 6 checkboxes + decisión CPO (approved / bloqueado / partial)
- **Rollback plan** en anexo
- **Precondiciones pendientes** documentadas explícitamente (db push, deploy)

## Task 2 — Sign-off CPO (DEFERIDO)

Requiere ≥24h de tráfico real post-deploy. Precondiciones (documentadas en VERIFICATION.md anexo):

1. `supabase db push --linked` (Plan 01 Task 3)
2. `supabase gen types typescript ...` — verificar diff vacío contra el bridge manual
3. Deploy edge function (Plan 03 Task 4)
4. Esperar tráfico + ejecutar checklist

## Deviations

**ROADMAP + REQUIREMENTS NO actualizados como completos.** Los must_haves del plan pedían:
- `ROADMAP.md marca Phase 5 como completed` — bloqueado hasta sign-off
- `REQUIREMENTS.md marca PLANT-01/02/03 como completos` — bloqueado hasta sign-off

Ambos se actualizarán cuando la CPO firme approved en VERIFICATION.md.

## Self-Check: PASSED (checklist creado); PARTIAL (fase — sign-off pending)

- [x] VERIFICATION.md creado con los 6 bloques
- [x] Todas las decisiones no-removed cubiertas (D-01..D-13)
- [x] Los 3 requirements (PLANT-01/02/03) referenciados
- [x] Anexo rollback + precondiciones incluidos
- [ ] Sign-off CPO — pending
- [ ] ROADMAP marcado complete — pending sign-off
- [ ] REQUIREMENTS marcado complete — pending sign-off
