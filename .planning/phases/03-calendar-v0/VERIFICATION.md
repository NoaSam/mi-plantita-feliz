# Phase 3: Calendar v0 — Plan Verification

**Verified:** 2026-05-21
**Verdict:** PASS_WITH_NOTES

## Decision coverage matrix

| Decision | Sub-phase(s) | Task(s) | Status |
|----------|--------------|---------|--------|
| D-01 BottomTabBar reorg | 3-01 | T1 | ✓ |
| D-02 slug `/regar` | 3-01 | T2 | ✓ |
| D-03 move `/mis-plantas` (Opción A) | 3-01 | T2, T3 | ✓ |
| D-04 toast aviso 8s, flag localStorage | 3-01 | T5 (+ T2 mount) | ✓ |
| D-05 tab reactiva via `useContextCounts` | 3-01 | T1 (heredado) | ✓ |
| D-06 columna `last_watered_at` + RLS | 3-03 | T1 | ✓ |
| D-07 `watering_interval_days` editable (sobrescribe) | 3-04 | T1 | ✓ |
| D-08 fórmula countdown (4 estados) | 3-03 | T2 (pure fn), T6 (wire) | ✓ |
| D-09 orden por urgencia + tiebreak ES | 3-03 | T7 | ✓ |
| D-10 copy botón state-dependent | 3-02 (placeholder), 3-03 T6 | T3, T6 | ✓ |
| D-11 botón ancho completo bottom | 3-02 | T3 | ✓ |
| D-12 flujo Regar (optimistic+flash+toast+undo+rollback) | 3-03 | T5 (keyframe), T6 (wire) | ✓ |
| D-13 picker frecuencia inline | 3-04 | T3, T5 | ✓ |
| D-14 pendiente primera vez (both casos) | 3-02 (visual), 3-04 (flow) | T3, T4, T5 | ✓ |
| D-15 tono suave (soft-warn, copy empático) | 3-02 (token), 3-03 (copy), 3-05 (review) | múltiples | ✓ |
| D-16 frecuencia sin atribución IA/usuario | 3-02, 3-05 | T3, T7 | ✓ |
| D-17 5 eventos PostHog | 3-05 | T1-T4 | ✓ |

**Sin decisiones ignoradas. Sin tasks que ejecuten ideas deferidas (push, apodos, histórico, learning loop, etc.).**

## Sub-phase boundary check

- **3-01**: solo nav restructure + placeholders. NO toca data fetching ni columna nueva ✓.
- **3-02**: hook `useHomePlants` selecciona solo `watering_interval_days` (la columna `last_watered_at` aún no existe en DB — verificado en T1 SELECT). `PlantWateringCard` hardcoded a estado `pending-first` ("Sub-phase 3-02: TODA planta aparece como pending-first"). No hay `track()` calls (verificado: 3-04 → "NO TRACKING todavía" en RegarPage). ✓
- **3-03**: migración + countdown + botón + sort. NO referencia picker de frecuencia (sólo el botón frecuencia es read-only inline, opens picker en 3-04). ✓
- **3-04**: depende explícitamente de 3-03 (migración aplicada, useLogWatering existe). NO toca tracking. ✓
- **3-05**: tracking + tests E2E + docs + microcopy. Cambio de signature `logWatering(plant)` y `editInterval(plantId, newDays, prevDays, source)` documentado.

**Dependencies frontmatter** son consistentes: 3-01 depends_on []; 3-02 [01]; 3-03 [02]; 3-04 [03]; 3-05 [02,03,04]. Wave numbers OK.

## Resolution of planner's open questions (6)

1. **`useLogWatering` signature churn 3-03→3-05 (`plantId` → `HomePlant`)** — ⚠ ACCEPT WITH NOTE. La churn intra-phase es deliberada (3-05 necesita `lastWateredAt` y `wateringIntervalDays` para computar `days_remaining_before` y `was_first_time` sin round-trip). Documentado en 3-05 T2 ("DECISION: Option A"). Test file también se actualiza en la misma task. **Riesgo menor**: cualquier desarrollador que mire 3-03 aislado verá un API que luego cambia en 3-05; mitigado por SUMMARY de 3-05 que lo documenta.

2. **`editInterval` recibe `prevDays`/`source` del caller (no self-compute)** — ✓ ACCEPT. La separación es correcta: el hook no tiene acceso al `prev` sin un SELECT extra, y el caller (`RegarPage.handlePickerSave`) ya tiene `pickerState.plant.wateringIntervalDays`. Documentado en 3-05 T3 como "Opción B" elegida explícitamente.

3. **Fallback toast copy "Configura la frecuencia..." en 3-03** — ✓ ACCEPT. La copy se necesita porque sub-phases mergean a develop independientemente; 3-03 puede estar en develop sin 3-04. La copy fallback no es "código muerto" — cubre la ventana entre merges. Sub-phase 3-04 cierra el flujo (picker abre primero), pero el fallback persiste como guard defensivo, lo que es correcto.

4. **Mock data uses `isoDaysAgo(Date.now())` — midnight flakiness** — ⚠ WARNING (no blocker). E2E `MOCK_HOME_PLANTS` calcula `last_watered_at` con `Date.now()`. Si los tests corren a las 23:59:59, el estado puede cambiar entre setup y assertion. **Recomendación**: usar `vi.useFakeTimers({ now: '2026-05-17T12:00:00Z' })` en los unit tests + Playwright `await page.clock.install({ time: ... })` para E2E. Plan no lo hace explícito en T6. Sub-phase 3-05 puede mergearse con el riesgo aceptado (CI generalmente no corre exactamente a medianoche), pero documentarlo.

5. **Card wrapper `<div role="button" tabIndex={0}>`** — ✓ ACCEPT. WCAG-compliant: `onKeyDown` wirea Enter/Space → `handleCardClick` (3-05 T4 lo incluye explícitamente). Evita HTML inválido de nested buttons. El botón frecuencia interno hace `e.stopPropagation()` correctamente. ✓

6. **`e2e/regar.spec.ts` wall-clock `isoDaysAgo`** — ⚠ WARNING. Mismo riesgo que Q4. Recomendación: Playwright `await page.clock.install({ time: '2026-05-17T12:00:00Z' })` antes de `page.goto`. No es blocker porque el toast assertion usa regex `/✓ Regada · Siguiente riego en/` (no exact number), pero el `data-watering-status` change assertion ("overdue" → "normal|urgent") podría flakear en bordes de día.

## Gaps surfaced

- **Migration rollback no documentado** (⚠ WARNING). 3-03 T1 confía en `supabase db push`. Si falla a mitad, `types.ts` queda desincronizado. **Recomendación**: el plan debería incluir un "rollback step" — `alter table plant_searches drop column if exists last_watered_at;`. No es blocker porque `add column if not exists` es idempotente y la rollback es trivial manualmente.
- **Concurrent multi-tap on "Regar"** (⚠ WARNING). `PlantWateringCard.handleWater` no guarda re-entrancy: si el usuario hace doble-tap rápido durante el flash de 1s, dispara 2 UPDATE + 2 track + 2 toast. Disposition del threat model es "accept" pero el plan no agrega un `isLogging` guard. **Recomendación menor**: añadir `if (flashing) return;` al principio de `handleWater`.
- **Empty state "todas pending-first"** (info). No es un gap real — la lista se renderiza con todas las cards en estado pending-first (orden alfabético por tie-break). UX acceptable: el usuario ve que tiene plantas, todas necesitan primer riego. Confirmado por D-09 sort + D-14 copy.
- **`mp:plant-watered` no triggers BottomTabBar refetch** (info, correcto). Confirmado: `useContextCounts` no escucha `mp:plant-watered`, lo cual es correcto — logear un riego no cambia `home_count`.
- **Test granularity de `watering_frequency_edited`** (info). El test de 3-04 T1 no usa `vi.mock("@/lib/track")` — solo verifica el `CustomEvent` dispatch como proxy. Plan documenta la decisión explícitamente; aceptable para v0.
- **3-05 T7 microcopy `verify` usa bash regex con `$` shell-escapes** (⚠ WARNING). El verify command es frágil shell-quote-wise (`\\\"$term\\\"`); puede fallar en algunos shells. Funcionalmente correcto pero podría sustituirse por un script JS standalone igual que los otros verifies. No blocker.

## CLAUDE.md compliance

- ✓ Mobile-first: `px-6 py-8 pb-24`, `min-h-11`, `pb-[max(1.5rem,env(safe-area-inset-bottom))]`, BottomTabBar `pb-safe`.
- ✓ No UI component tests: solo hooks (`use-home-plants.test.ts`, `use-log-watering.test.ts`, `use-edit-watering-interval.test.ts`) + pura (`watering-countdown.test.ts`). Cero tests de UI.
- ✓ Spanish UI: "¿Toca regar?", "Regada"/"Regar", "Toca regar hoy", "Lleva N días esperándote", "Pendiente primera vez", "Cada N días", "Sin frecuencia", "Tus plantas casa", "Días entre riegos", "Frecuencia actualizada", "Mis plantas (casa + descubrimientos)", "📍 Hemos movido Mis plantas a Ajustes".
- ✓ English code/commits: `useHomePlants`, `PlantWateringCard`, `computeDaysRemaining`, `useLogWatering`, `useEditWateringInterval`, `WateringFrequencyPicker`, `urgencyKey`, `mp:plant-watered`, etc.
- ✓ Design tokens: `--soft-warn`, `--soft-warn-bg`, `--shadow-press`, `bg-primary`, `border-foreground`. Cero HSL hardcoded en componentes (la keyframe `flash-success` usa `hsl(var(--primary) / 0.2)` — correcto vía token).
- ✓ Migración Supabase (D-06): ALTER en tabla existente, sin GRANT explícito (cubierto por "existing tables keep their grants" en MIGRATION_CONVENTIONS.md — correctamente referenciado en 3-03 T1).
- ✓ Componentes pequeños y reutilizables: `PlantWateringCard` (~150 LOC), hooks aislados, pure function separada.
- ✓ Tests para lógica de negocio: `watering-countdown` (4 status + edge cases), `useLogWatering` (5 tests), `useEditWateringInterval` (3 tests), `useHomePlants` (5 tests).

## Recommendation

**READY TO EXECUTE** con 3 notas accionables (no bloqueantes):

1. **Antes de ejecutar 3-05 T6**: cambiar `isoDaysAgo(Date.now())` en `MOCK_HOME_PLANTS` por timestamps fijos (e.g., `"2026-05-17T..."`) y añadir `await page.clock.install({ time: '2026-05-17T12:00:00Z' })` al `e2e/regar.spec.ts` para eliminar el riesgo de midnight flakiness. Mismo ajuste en `watering-countdown.test.ts` para los tests que llaman a `computeDaysRemaining` sin pasar `now` explícito (Test 8 "defaults `now`" — usar `vi.useFakeTimers`).
2. **Antes de ejecutar 3-03 T6**: añadir un guard `if (flashing) return;` al inicio de `handleWater` en `PlantWateringCard.tsx` para prevenir doble-tap accidental. Cambio de 1 línea.
3. **Documentar rollback de la migración** en el SUMMARY de 3-03: una línea `-- ROLLBACK: alter table plant_searches drop column if exists last_watered_at;` como comentario al final del archivo SQL, o en el SUMMARY. Cero código adicional ejecutable.

Las 5 plans son self-consistent, las dependencias secuenciales son sanas, y la cobertura de las 17 decisiones es completa. Las áreas de "Claude's Discretion" del researcher (token color, animation impl, event names) fueron resueltas razonablemente y documentadas en cada plan.
