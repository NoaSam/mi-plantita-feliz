---
phase: 3
slug: calendar-v0
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-22
---

# Phase 3 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Threat register consolidated from sub-phase PLAN.md `<threat_model>` blocks (03-01 → 03-05). All 27 entries verified against the implemented code on branch `feat/phase-3-calendar-v0`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client → Supabase REST (SELECT) | `useHomePlants` filters `plant_searches` by `user_id` + `context = 'home'`. RLS SELECT policy `auth.uid() = user_id` from Phase 02.1 gates. | plant rows (id, name, image_url, watering_interval_days, last_watered_at) — owner-only |
| client → Supabase REST (UPDATE) | `useLogWatering` writes `last_watered_at`; `useEditWateringInterval` writes `watering_interval_days`. RLS UPDATE policy `auth.uid() = user_id` from `20260515000000_add_plant_searches_update_policy.sql` gates. | timestamp + int, owner-only |
| client → DB CHECK constraint | `watering_interval_days` must be null OR in [1, 60]. Belt-and-suspenders to client input clamp. | numeric range |
| client → React Router | `<Navigate to="/ajustes/mis-plantas">` redirect chain; `useNavigate("/planta/:id")` from card. Paths hardcoded or derived from RLS-filtered data. | URL path only — no untrusted input |
| client → localStorage | Flag `mp_seen_history_relocation_notice` (one-shot toast dedupe). Same-origin. | boolean flag, non-secret |
| client → PostHog | `track()` via `posthog-js`, gated by analytics consent in `src/lib/track.ts`. | UUIDs, counts, derived enums (`source`) — no PII |
| client-internal | `CustomEvent` channels `mp:plant-watered`, `mp:plant-frequency-updated` (same-origin). | event payload (`plant_search_id`, action) |
| test → mock server | Playwright `page.route` mocks isolate e2e from real Supabase. | mock fixtures only |
| migration → DB | `ALTER TABLE plant_searches ADD COLUMN IF NOT EXISTS last_watered_at` — idempotent, nullable. | schema change, no data |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-03-01 | Tampering | localStorage flag `mp_seen_history_relocation_notice` | accept | UX dedupe only, not a security control. Borrar el flag solo causa que vuelva a aparecer el toast. | closed |
| T-03-02 | Open redirect | `<Navigate to="/ajustes/mis-plantas">` from `/mis-plantas` | mitigate | Verified `src/App.tsx:59` — hardcoded literal path, never derived from query string. | closed |
| T-03-03 | DoS | Toast en cada mount si localStorage está bloqueado (iOS Safari modo privado) | accept | `try/catch` evita crash; UX molestia menor sin vector de ataque. | closed |
| T-03-04 | Information disclosure | `HistoryRelocationNotice` lee localStorage | accept | Same-origin read; flag key es genérica, no contiene UUIDs ni emails. | closed |
| T-03-05 | XSS | Toast string in `HistoryRelocationNotice` | mitigate | Verified `src/components/HistoryRelocationNotice.tsx:28` — `toast("📍 Hemos movido...")` literal, sin interpolación. Sonner escapa. | closed |
| T-03-06 | Information disclosure | `useHomePlants` SELECT — rogue user intenta ver plantas de otro user | mitigate | Verified `src/hooks/use-home-plants.ts:92` — `.eq("user_id", user.id)` + RLS SELECT policy belt-and-suspenders. | closed |
| T-03-07 | XSS | `PlantWateringCard` renderiza `plant.name` (data del usuario) | mitigate | Verified 0 usos de `dangerouslySetInnerHTML` en `PlantWateringCard.tsx`. React JSX escapa por defecto. | closed |
| T-03-08 | DoS | Lista renderizada sin limit ni virtualización | accept | Plantas casa por user: <20 típico, <50 caso heavy. Sin issues de perf. Virtualización deferida a v1+. | closed |
| T-03-09 | Tampering | `--soft-warn` token podría ser sobrescrito por CSS injection rogue | accept | Same-origin scripts ya tienen acceso DOM arbitrario. Riesgo no incremental. | closed |
| T-03-10 | Tampering | Rogue user intenta UPDATE de `last_watered_at` de otro user | mitigate | RLS UPDATE policy `20260515000000_add_plant_searches_update_policy.sql` gate-a por `auth.uid() = user_id`. Cliente además filtra `.eq("id", plant.id)` sobre row del propio user. | closed |
| T-03-11 | Information disclosure | `last_watered_at` añade timestamp del user | accept | Timestamp propio del user, no PII sensible. RLS SELECT cubre exposure. | closed |
| T-03-12 | DoS | Spam de Regar/Deshacer (4s undo + 1s flash) | accept | Cada tap = 1 UPDATE Supabase cheap. Sin razón para rate-limit. Debounce diferible. | closed |
| T-03-13 | Integrity | UPDATE de log falla pero optimistic update queda visible | mitigate | Verified `src/components/PlantWateringCard.tsx:176-177` — `setOptimisticLastWatered(undefined)` + `toast.error` en error path. | closed |
| T-03-14 | Integrity | UPDATE de revert falla pero state quedó optimistic-revertido | accept | Edge case raro. Toast indica "Refresca para sincronizar". Trade-off aceptado vs reintentos automáticos. | closed |
| T-03-15 | Tampering | Migration corre 2x | mitigate | Verified `supabase/migrations/20260518000000_add_last_watered_at_to_plant_searches.sql:8-9` — `add column if not exists` idempotente. | closed |
| T-03-16 | XSS | Toast copy interpola `${daysRemaining}` | mitigate | `daysRemaining` es number primitive devuelto por `computeStatus`. Sonner escapa text. Sin riesgo. | closed |
| T-03-17 | Tampering | Rogue user intenta UPDATE `watering_interval_days` de otro user | mitigate | Misma RLS UPDATE policy que T-03-10. Cliente `.eq("id", plantId)` con plant del propio user. | closed |
| T-03-18 | Input validation | User tipea 0/-1/100/"abc" en picker | mitigate | Verified `src/components/WateringFrequencyPicker.tsx:23-24,72-73` — `MIN_DAYS=1`, `MAX_DAYS=60`, `parseInt` + range guard antes de onSave. DB CHECK constraint `1-60` en `20260517000000_add_watering_interval_days_to_plant_searches.sql:8`. | closed |
| T-03-19 | XSS | `plantName` en `SheetTitle` del picker | mitigate | Verified 0 usos de `dangerouslySetInnerHTML`. React escapa por defecto. | closed |
| T-03-20 | Race condition | Doble-tap rápido durante flash de 1s | mitigate | `PlantWateringCard.handleWater` guarda `if (flashing) return;` (VERIFICATION ajuste #2). | closed |
| T-03-21 | Race condition | Picker abierto + dispatch externo cambia `wateringIntervalDays` | accept | Picker tiene state local; comportamiento last-writer-wins esperado. | closed |
| T-03-22 | Information disclosure | Picker muestra plant name en title | accept | Plant name es del propio user (filtrado por RLS). | closed |
| T-03-23 | Information disclosure | Track events incluyen `plant_search_id` (UUID) | accept | UUIDs no son PII. Consent gating via `src/lib/track.ts`. Mismo patrón que Phase 02.1 y 03.1. | closed |
| T-03-24 | Information disclosure | `position` revela orden de la lista | accept | Información agregada de urgencia; no expone datos sensibles. | closed |
| T-03-25 | Open redirect | `navigate(/planta/${plant.id})` | mitigate | Verified `src/pages/RegarPage.tsx:197` — `plant` viene de `useHomePlants` (línea 59) que filtra por `user_id`. Sin user input externo. | closed |
| T-03-26 | DoS via tracking | Spam dispara track 100×  | accept | Coste trivial. Consent gating limita blast radius. | closed |
| T-03-27 | Test data leak | `MOCK_HOME_PLANTS` incluye `user_id: MOCK_USER.id` | accept | Solo en `e2e/`, no shipping al cliente. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-01, T-03-03, T-03-04 | Mecanismo de dedupe UX local — borrar/bloquear localStorage solo afecta UX. Sin vector de ataque. | CPO | 2026-05-22 |
| AR-03-02 | T-03-08 | Lista de plantas casa render directo sin virtualización. <50 plantas típico. Virtualización (`react-window`) diferida a v1+ si emerge necesidad. | CPO | 2026-05-22 |
| AR-03-03 | T-03-09 | Tokens CSS overridables solo por same-origin scripts que ya tienen acceso DOM arbitrario. Riesgo no incremental. | CPO | 2026-05-22 |
| AR-03-04 | T-03-11, T-03-22 | `last_watered_at` y `plant.name` son datos del propio usuario, filtrados por RLS SELECT. No constituyen PII sensible. | CPO | 2026-05-22 |
| AR-03-05 | T-03-12, T-03-26 | Spam de Regar/Deshacer y track calls: coste Supabase trivial; sin rate-limit. Si emerge en prod, evaluar debounce. | CPO | 2026-05-22 |
| AR-03-06 | T-03-14 | Si UPDATE de revert falla, el toast indica "Refresca para sincronizar". Trade-off aceptado vs reintentos automáticos complejos. | CPO | 2026-05-22 |
| AR-03-07 | T-03-21 | Picker abierto durante dispatch externo: last-writer-wins esperado, picker tiene state local. | CPO | 2026-05-22 |
| AR-03-08 | T-03-23, T-03-24 | UUIDs y `position` en PostHog: no son PII. Consent gating via `track.ts` aplica. | CPO | 2026-05-22 |
| AR-03-09 | T-03-27 | `MOCK_HOME_PLANTS` solo vive en `e2e/`, no se incluye en el bundle de producción. | CPO | 2026-05-22 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-22 | 27 | 27 | 0 | claude-code (sonnet) — orchestrator-verified via grep against `src/` + `supabase/migrations/` |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter
