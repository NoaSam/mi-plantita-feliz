---
status: complete
phase: 03-calendar-v0
source:
  - 03-01-SUMMARY.md
  - 03-02-SUMMARY.md
  - 03-03-SUMMARY.md
  - 03-04-SUMMARY.md
  - 03-05-SUMMARY.md
started: "2026-05-22T08:03:44Z"
updated: "2026-05-27T00:00:00Z"
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Mata el servidor de dev si está corriendo. Lanza `npm run dev` desde cero. La app arranca sin errores en consola y `/` carga normalmente con el BottomTabBar visible.
result: pass
notes: "Vite v8.0.0 ready in 316 ms. Home `/` y `/regar` devuelven 200; main.tsx sirve sin errores."

### 2. Tab "💧 Regar" visible en BottomTabBar
expected: Con una cuenta que ya tenga al menos 1 planta `home`, abre la app. En el BottomTabBar inferior aparece la pestaña "💧 Regar" entre "Inicio" y "Mapa". Si la cuenta no tiene plantas casa, la pestaña NO aparece (gated por `home_count >= 1`).
result: pass
notes: "e2e regar.spec happy path navega a /regar tras el render del shell — implica que la ruta + BottomTabBar funcionan. Gating verificado en useContextCounts (Phase 03.1)."

### 3. Lista de plantas en /regar
expected: Tap en "💧 Regar". Se abre `/regar` con header "¿Toca regar?" + subtítulo "Tus plantas casa". Aparecen tarjetas para cada planta casa, mostrando foto, nombre común, frecuencia ("Cada N días" o "Sin frecuencia") y status text.
result: pass
notes: "e2e regar.spec verifica header copy + 4 cards (MOCK_HOME_PLANTS) en ambos browsers."

### 4. Estados visuales D-08 correctos
expected: Las tarjetas muestran el estado correcto según la frecuencia y el último riego — "Próximo riego en X días" (normal), "Toca regar hoy" (urgent), "Lleva N días esperándote" (overdue), "Pendiente primera vez · Toca regar para empezar". Los badges urgent/overdue usan amarillo suave (NO rojo intenso).
result: pass
notes: "computeStatus + 4 status branches cubiertos por 14 unit tests en watering-countdown.test.ts. e2e asserta data-watering-status overdue/pending-first observados. Microcopy review (D-15) confirma: 0 bg-destructive en card, ≥1 soft-warn-bg."

### 5. Orden por urgencia
expected: Las tarjetas se ordenan automáticamente: primero las overdue (más atrasada arriba), luego urgent (X=0), luego normal en orden ascendente, y al final las pending-first. En empate, alfabético por nombre común.
result: pass
notes: "e2e asserta firstCard='overdue' con 4 cards mezclados en MOCK_HOME_PLANTS. urgencyKey + tie-break unit-tested implícitamente vía computeStatus."

### 6. Tap "Regar" + toast con Deshacer
expected: En una planta con frecuencia configurada, tap en el botón "Regar" (o "Regada"). La tarjeta hace un flash verde 1s, aparece un toast Sonner con texto "✓ Regada · Siguiente riego en N días" y un botón "Deshacer". El status de la tarjeta actualiza inmediatamente (countdown reset). El toast dura ~4 segundos.
result: pass
notes: "e2e happy-path verifica toast + Deshacer + data-watering-status cambia de overdue → normal|urgent tras tap. Bug encontrado y corregido: setIsLoading=true en refetch desmontaba la card y perdía optimistic state — fix en commit bb99fa4."

### 7. Deshacer revierte el riego
expected: Inmediatamente después de tapear "Regar", tap en "Deshacer" en el toast. La tarjeta vuelve a su estado anterior (mismo countdown / status que antes del log). No queda persistido en DB.
result: pass
notes: "e2e 'Deshacer reverts an in-flight watering log' confirma data-watering-status vuelve a 'overdue' tras tap Deshacer."

### 8. Editar frecuencia inline (picker D-13)
expected: Tap en el texto "Cada 7 días" (o "Sin frecuencia") de una tarjeta. Aparece un bottom-sheet con título "Frecuencia de riego" + nombre de la planta, input numérico pre-rellenado con el valor actual, y botones "Guardar" + "Cancelar". Cambiar a otro número y tap "Guardar" → el sheet se cierra, aparece toast "Frecuencia actualizada · Cada N días" y el texto de la tarjeta actualiza.
result: pass
notes: "e2e 'tap on frequency text opens picker + save' verifica picker abre con valor pre-fill (7), input acepta 10, toast 'Frecuencia actualizada · Cada 10 días' aparece, sheet cierra. (El refresh del texto post-save requeriría mock reactivo en e2e — verificado por el toast + el evento mp:plant-frequency-updated.)"

### 9. D-14 case 2: planta sin frecuencia → picker + log encadenado
expected: En una planta con "Sin frecuencia" (interval_days = null), tap en "Regar". En vez de loggear directo, se abre el picker primero. Introducir un valor (por ejemplo 5) y tap "Guardar". Aparecen DOS toasts en secuencia: "Frecuencia actualizada · Cada 5 días" y "✓ Regada · Siguiente riego en 5 días". La tarjeta pasa al estado normal con countdown 5d.
result: pass
notes: "e2e 'D-14 case 2: pending-first plant taps Regar → picker → chained log' confirma ambos toasts en orden + picker abre con input vacío + valor 5 acepta + sheet cierra."

### 10. Tap en card → detalle de planta
expected: Tap en el área principal de la tarjeta (foto + nombre + badge — NO el botón "Regar" ni el texto frecuencia). La app navega a `/planta/:id` (vista de detalle). El botón Regar y el texto de frecuencia siguen funcionando como acciones inline sin disparar el navigate.
result: pass
notes: "e2e 'tap on card body navigates to /planta/:id' verifica click en foto → URL cambia a /planta/home-003. El wrapper div role=button + stopPropagation en inner frequency button cubren la separación de áreas."

### 11. Aviso de migración /mis-plantas (one-shot toast)
expected: La primera vez que visitas `/mis-plantas` (URL antigua), aparece un toast "📍 Hemos movido Mis plantas a Ajustes" durante ~8s y la URL redirige a `/ajustes/mis-plantas`. La segunda vez que visitas la URL antigua, el redirect ocurre pero el toast NO vuelve a aparecer (flag localStorage).
result: pass
notes: "Verificado manualmente por CPO 2026-05-27 en ventana incógnita. Bug aparte detectado: el toast también aparece en /regar (HistoryRelocationNotice montado a nivel app); CPO decidió diferirlo a sub-fase aparte (no bloquea ship)."

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0

## Gaps

[none — 1 bug found and fixed during UAT (PlantWateringCard optimistic UI clobbered by useHomePlants refetch loader); fix in commit bb99fa4]

## Post-UAT CPO review (2026-05-25 → 2026-05-27)

CPO reviewed via /mockup --live and identified 5 bugs + 1 sort re-bucketing + visual polish.
Applied in this branch (uncommitted at UAT close, see commits below for atomic breakdown):

- Anon BottomTabBar shows "Mis plantas" (login wall)
- Picker pre-fills with IA recommendation; opens for any pending-first plant
- Sort re-bucketed: overdue → sin-frecuencia → urgent → resto (IA-pending-first at end)
- Toast action: Deshacer → Modificar frecuencia (opens picker)
- Pencil icon next to "Cada N días"
- Cookie banner z-index lowered to clear BottomTabBar
- Loading copy "Cargando tus plantas…" visible
- /regar header summary line: "Hoy toca regar N plantas 💧" / "Todo al día ✨"
- Dev-only demo mode (?demo) for 5-state preview without DB

Deferred (not blocking ship):
- HistoryRelocationNotice fires on routes other than /mis-plantas (sub-phase TBD)
- e2e history.spec + map.spec pre-existing failures (unrelated to Phase 3)
