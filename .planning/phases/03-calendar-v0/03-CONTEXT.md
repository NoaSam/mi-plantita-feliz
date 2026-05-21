# Phase 3: Calendar v0 — "¿Toca regar?"

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Calendario de riego como herramienta principal del modo "casa". Añade una nueva tab al menú inferior llamada **"Regar"** (icono 💧), condicional a usuarios logados con ≥1 planta clasificada como `home`. Reorganiza el menú inferior: `/mis-plantas` (history) se mueve a `/ajustes` con filtros casa/wild, dejando hueco para la nueva tab.

La pantalla **"¿Toca regar?"** lista las plantas casa con un contador "X d" (días restantes hasta el próximo riego) y un botón "Regada"/"Regar" en cada card. Al pulsar el botón, el contador se resetea según la frecuencia configurada para esa planta. La frecuencia inicial viene de la IA (`watering_interval_days`) pero el usuario puede editarla en cualquier momento.

**NO entrega** (deferred v1+):
- Recordatorios push
- Apodos para plantas
- Historial de riegos (cuándo regué cada planta en el pasado)
- Sección "Hoy toca regar" como widget agregado en otras pantallas
- Inferencia automática de frecuencia ajustada por uso (learning loop)

</domain>

<requirements>
## Requirements (from ROADMAP)

- **RIEG-01:** El usuario puede añadir una planta identificada a su colección ("Mis Plantas"). → ✅ Cubierto: una planta clasificada como `home` ya está implícitamente "en mi colección casa". Phase 02.1 lo introdujo. Phase 3 solo presenta esa colección en la nueva tab.
- **RIEG-02 (completo, no parcial):** Cada planta tiene frecuencia de riego sugerida por la IA, **editable por el usuario**. → ✅ La frecuencia inicial viene de `watering_interval_days`. El usuario edita la frecuencia desde la card del listado (sin entrar al detalle). Asimetría resuelta: editar siempre, no solo cuando IA da null.

**Promoción de scope vs ROADMAP original:**
ROADMAP decía "RIEG-02 parcial — editable se difiere a v1+" y "v0 sin 'Hoy toca regar', sin Regué hoy". Tras discusión 2026-05-21, la dueña promueve estas piezas a v0 porque sin countdown ni acción "regué" el calendario pierde su razón de ser ("yo misma nunca me acuerdo cuando regué"). Por lo tanto Phase 3 incluye:
- RIEG-03 implícito (countdown indica cuándo toca)
- RIEG-04 (acción "Regada"/"Regar" que resetea el contador)
- RIEG-02 completo (editable)

RIEG-05 (historial de cuándo se regó cada planta) NO entra en v0 — solo guardamos `last_watered_at` (última vez), no el histórico completo.

## Success Criteria

1. La tab **"Regar"** (icono 💧) aparece en el `BottomTabBar` solo cuando el usuario está logado Y tiene ≥1 planta con `context = 'home'`.
2. Tras clasificar una planta como casa por primera vez, la tab aparece **sin requerir refresh** (mismo patrón reactivo que Phase 03.1 — listener `mp:pending-classification-resolved`).
3. La pantalla `/regar` (o slug equivalente, ver D-02 abajo) muestra la lista de plantas `home` ordenadas por urgencia (X menor arriba; las atrasadas primero).
4. Cada card incluye: foto, nombre común, frecuencia configurada (editable), badge "X d" con countdown calculado, botón "Regada"/"Regar" según urgencia, status text empático.
5. Tap en el botón "Regada"/"Regar" → resetea el contador instantáneamente, anima flash verde 1s, muestra toast "✓ Regada · Siguiente riego en N días" con "Deshacer" durante 4s.
6. Tap en la card (fuera del botón) → navega a `/planta/:id` (detalle existente).
7. La frecuencia es editable desde la card sin salir del listado: tap en el texto "Cada N días" abre un picker inline.
8. La pantalla `/mis-plantas` se mueve a `/ajustes/mis-plantas` (o sub-ruta equivalente) con filtros casa/wild. El primer acceso post-deploy muestra un toast "Hemos movido Mis plantas a Ajustes" durante 8s. Mostrar una sola vez por usuario (flag en localStorage).
9. Edge case `watering_interval_days = null`: la planta aparece con "Pendiente primera vez · Toca regar para empezar el contador". Al pulsar el botón, primero abre el picker de frecuencia (input manual obligatorio), después arranca el countdown.
10. Edge case plantas nunca regadas (sin `last_watered_at`): mismo flujo que (9) — "Pendiente primera vez" + primer tap pide frecuencia si IA dio null, o solo confirma con frecuencia IA si está disponible.
11. Tests unitarios para la lógica de countdown (X = (last_watered + interval_days) - now). E2E Playwright para el happy path: clasificar casa → ver tab → tap Regar → contador reset.

</requirements>

<decisions>
## Implementation Decisions

### Navegación e información architecture

- **D-01:** **Reorganización del `BottomTabBar`.** Configuración final:
  - 🏠 Home (`/`)
  - 💧 Regar (`/regar`) — **NUEVA**, condicional a `loggedIn && home_count >= 1`
  - 🗺️ Mapa (`/mapa`) — sin cambios, condicional existente (`wild_with_coords_count >= 1`)
  - ⚙️ Ajustes (`/ajustes`)

  `/mis-plantas` deja de ser una tab del menú principal. Se mueve a una sub-ruta dentro de Ajustes (ver D-03).

- **D-02:** **Slug de la ruta nueva: `/regar`.** Es corto, identificable, y refleja el verbo principal. Alternativas descartadas: `/calendario` (engañoso — no es vista calendario), `/mi-jardin` (semánticamente apropiado pero más largo), `/toca-regar` (con tilde y signos crea problemas de URL). El título visible en la pantalla es **"¿Toca regar?"** independiente del slug.

- **D-03:** **Migración de `/mis-plantas`.** Tres opciones para el destino final:
  - Opción A (preferida): nueva ruta `/ajustes/mis-plantas` accesible desde un item en la pantalla `/ajustes` con label "Mis plantas (casa + descubrimientos)". Mantiene el componente `History.tsx` actual con filtros `casa | wild | todas`.
  - Opción B: la pantalla `/ajustes` integra los filtros y la lista directamente (sin sub-ruta).
  - Opción C: dejar `/mis-plantas` como ruta de primer nivel pero sin tab en el menú; accesible solo desde Ajustes.
  
  **Default: Opción A.** Researcher / planner pueden confirmar si Opción C es más simple técnicamente (cero código de routing nuevo). Mantener filtros existentes — Phase 02.1 ya añadió chips de contexto en `History.tsx`.

- **D-04:** **Aviso de migración: tooltip/toast una vez.** Cuando el usuario abre la app post-deploy de Phase 3 y antes pulsa donde estaba "Mis plantas" o la abre desde cualquier punto, mostrar toast de 8s: "📍 Hemos movido Mis plantas a Ajustes". Flag en localStorage (`mp_seen_history_relocation_notice`) para mostrar una sola vez por dispositivo. No bloquea ni interrumpe.

- **D-05:** **Visibilidad de la tab Regar (reactividad).** Mismo patrón que Phase 03.1 para Mapa: hook `useContextCounts` (ya existe) cuenta `home_count`. La tab se muestra/oculta vía `useMemo` en `BottomTabBar`. Dispatch de `mp:pending-classification-resolved` (ya existe) hace que el counter re-fetch tras un classify. Cero refactor del patrón existente.

### Modelo de datos y lógica de countdown

- **D-06:** **Nueva columna `last_watered_at`** en `plant_searches`:
  ```sql
  alter table plant_searches
    add column last_watered_at timestamptz null;
  ```
  Nullable porque las plantas existentes y las recién creadas no tienen último riego registrado. La política RLS UPDATE existente (de Phase 02.1) ya cubre esta escritura — un usuario solo puede actualizar sus propias filas.

- **D-07:** **`watering_interval_days` se promueve a editable por el usuario.** No se añade una columna nueva — se sobrescribe directamente el valor que devolvió la IA. **Tradeoff aceptado:** se pierde el "valor original IA" si el usuario edita. Si en v1+ queremos comparar IA vs user (para el learning loop deferido), añadir una columna `watering_interval_days_ai_initial timestamptz` entonces. Para v0 no merece la pena.

- **D-08:** **Fórmula del countdown:**
  ```
  X = (last_watered_at + watering_interval_days días) - now()
  ```
  - Si `last_watered_at IS NULL` → estado "Pendiente primera vez", no se calcula X.
  - Si `watering_interval_days IS NULL` → mismo estado ("Pendiente primera vez · pide frecuencia").
  - X > 0 → estado normal: "Próximo riego en X días", botón "Regada".
  - X = 0 → estado urgente: "Toca regar hoy", botón "Regar", badge amarillo cálido.
  - X < 0 (negativo) → estado atrasado: "Lleva X días esperándote" (positivo en copy), botón "Regar", badge amarillo cálido (mismo color que urgente).
  
  Cálculo en cliente (la query devuelve `last_watered_at` y `watering_interval_days`; el hook computa X en JS para que el countdown sea reactivo sin trip a server).

- **D-09:** **Ordenación del listado.** Por urgencia ascendente: las atrasadas (X<0) primero, después las "hoy toca" (X=0), después por X ascendente (0+, 1, 2, ...), y al final las "Pendiente primera vez" (sin contador). Empate por X → orden alfabético por nombre común.

### Interacción "Regada"/"Regar"

- **D-10:** **Copy del botón es state-dependent:**
  - X > 0 (normal) → **"Regada"** (participio, confirma estado al día)
  - X = 0 o X < 0 → **"Regar"** (infinitivo, llamada a acción)
  
  Diseño elegido tras mockup `/mockup ¿toca regar?` el 2026-05-21. Refuerza el tono suave: la app pasa de "confirmador" a "recordatorio" según el contexto, sin tonos alarmistas.

- **D-11:** **UI del botón: Opción B del mockup.** Botón de ancho completo en la parte inferior de cada card (no inline, no FAB). Razones: target táctil grande (~48px), hero visual claro, sin competir con otros elementos. Trade-off asumido: cards más altas → ~3-4 visibles sin scroll en pantalla típica.

- **D-12:** **Flujo al pulsar Regada/Regar:**
  1. Tap inmediato → setea optimistamente `last_watered_at = now()` en el hook y actualiza X.
  2. La card hace flash verde suave 1s (`animate-pulse` o equivalente Tailwind).
  3. Toast en `<Toaster />` existente: "✓ Regada · Siguiente riego en N días" durante 4s, con botón "Deshacer" en el toast.
  4. Tap "Deshacer" en los 4s → rollback `last_watered_at` al valor anterior + cancelar la persistencia si aún no se hizo.
  5. UPDATE a la DB sucede tras los 4s (o inmediatamente si el toast no tiene undo configurado — researcher decide). Si la DB falla, mostrar toast de error y rollback.

- **D-13:** **Edición de frecuencia inline.** Tap sobre el texto "Cada N días" en la card → abre un picker (modal o bottom sheet) con un input numérico clamped a `[1, 60]` (mismo rango que la IA, ver CHECK en `plant_searches`). Botón "Guardar" hace UPDATE de `watering_interval_days`. La X se recalcula instantáneo tras el save (mismo `last_watered_at`, nuevo interval).

- **D-14:** **Estado "Pendiente primera vez":**
  - Card muestra: foto, nombre, "Frecuencia: cada N días" (o "Sin frecuencia" si IA=null), badge gris "—" o "?", status text "Pendiente primera vez · Toca regar para empezar".
  - Botón: "Regar".
  - Si IA dio frecuencia, tap en "Regar" → setea `last_watered_at = now()` + flash verde + toast. La planta pasa a estado normal.
  - Si IA dio null, tap en "Regar" → primero abre el picker de frecuencia (igual que D-13), guarda `watering_interval_days`, después setea `last_watered_at = now()`. Single flow con UX en dos pasos.

### Tono y copy

- **D-15:** **Tono suave (no alarmista).** Decidido tras crítica de "app que regaña":
  - Color de urgencia: amarillo cálido (HSL ~38, 80%, 60%) — no rojo intenso.
  - Copy atrasada en positivo: "Lleva 2 días esperándote" (no "ATRASADA 2 DÍAS").
  - Copy urgente: "Toca regar hoy" (no "URGENTE!").
  - Microcopy del listado en cabecera: empático ("Tus plantas casa") — no "Lista de tareas".

- **D-16:** **Plantas con `watering_interval_days` editado por usuario.** La copy en la frecuencia debe reflejar quién la decidió:
  - Inicial (IA): "Cada 7 días" (sin atribución).
  - Editado: "Cada 5 días" (también sin atribución — la UX no debe culpabilizar la edición).
  - **NO** mostrar "(según IA)" o "(tú decidiste)" — añade ruido innecesario. El usuario lo recuerda si quiere.

### Tracking PostHog

- **D-17:** **Eventos nuevos del calendario:**
  - `calendar_opened` — dispara una vez por montaje de la pantalla `/regar` (mismo patrón que `map_opened` de Phase 03.1, gated con flag local para evitar inflar métrica). Props: `home_count` (cuántas plantas casa tiene), `overdue_count` (cuántas X≤0), `pending_first_time_count`.
  - `watering_logged` — al pulsar Regada/Regar y confirmar (no en el optimistic update). Props: `plant_search_id`, `days_remaining_before` (signed integer; negativo si atrasada, 0 si hoy, positivo si anticipada), `interval_days` (frecuencia configurada al momento del log), `was_first_time` (boolean: true si era estado "Pendiente primera vez").
  - `watering_undone` — al pulsar "Deshacer" en el toast. Props: `plant_search_id`. Permite calcular tasa de mistaps.
  - `watering_frequency_edited` — al guardar nueva frecuencia desde el picker inline. Props: `plant_search_id`, `prev_interval`, `new_interval`, `source` ('ia_initial' | 'user_override' | 'null_filled_in_by_user').
  - `calendar_card_navigated_to_detail` — tap en la card (fuera del botón) que lleva a `/planta/:id`. Props: `plant_search_id`, `position` (índice en la lista).

  Documentar en `docs/posthog-events.md` § Phase 3 — Calendar v0, siguiendo el patrón de Phase 02.1 y 03.1.

</decisions>

<sub_phases>
## Sub-phases breakdown (entrega coordinada)

5 sub-phases. Todas se mergean a `develop` conforme se completan. Se sube todo junto a `main` cuando las 5 estén listas (un único PR release o equivalente).

| ID | Scope | Tamaño | Depende de |
|---|---|---|---|
| **3-01** | Nav restructure: tab Regar condicional + move `/mis-plantas` → `/ajustes/mis-plantas` (D-03 opción A por defecto) + toast aviso una vez (D-04) | S | Nada |
| **3-02** | Pantalla `/regar` + lista de plantas casa + cards con badge "X d" estático (sin lógica reset todavía — `watering_interval_days` directo de la IA) + estados visuales (normal / urgente / atrasada / pendiente primera vez) + tono suave (D-15) | M | 3-01 |
| **3-03** | Migración SQL `last_watered_at` (D-06) + lógica de countdown D-08 + botón Regada/Regar con copy state-dependent D-10 + flujo D-12 (flash + toast + undo) + UPDATE optimistic | M | 3-02 |
| **3-04** | Edición frecuencia inline D-13 + estado "Pendiente primera vez" D-14 (incluido el flujo de pedir frecuencia cuando IA=null) | M | 3-03 |
| **3-05** | Tracking PostHog D-17 (5 eventos) + actualizar `docs/posthog-events.md` § Phase 3 + microcopy final D-15/D-16 + tests unitarios + Playwright happy path | S | 3-02, 3-03, 3-04 (depende de los tres para tener qué medir) |

**Dependencias entre sub-phases** son secuenciales en este caso porque cada una construye sobre la anterior. **Wave 1** (3-01) sola; **Wave 2** (3-02) después; **Wave 3** (3-03); **Wave 4** (3-04); **Wave 5** (3-05).

Estimación total: ~1-1.5 semanas en serie, ~3-4 días en paralelo agresivo (poco realista — sub-phases dependientes).

</sub_phases>

<out_of_scope>
## Out of scope (NO en Phase 3)

Lo que explícitamente NO se construye en v0, para evitar scope creep:

- **Recordatorios push** (notificaciones nativas Android/iOS PWA). Probablemente Phase 3.1 o v1+.
- **Apodos para plantas** ("Mi Monstera del salón"). v1+.
- **Historial de riegos** (cuándo regué esta planta en el pasado). Solo guardamos `last_watered_at` (última vez), no histórico completo. RIEG-05 deferido.
- **Sección "Hoy toca regar" en home** como widget agregado. La info está en la tab Regar — no se duplica en home.
- **Inferencia automática / learning loop**. La frecuencia es 100% manual editable. Sin "detectamos que riegas antes de lo sugerido". v1+ tras feedback real.
- **Compartir / exportar**. v1+.
- **Edición de la foto de la planta**. v1+.
- **Reordenar manualmente la lista**. v0 usa el orden por urgencia D-09; sin drag&drop ni alphabetical override.

</out_of_scope>

<deferred_ideas>
## Deferred ideas (futuros candidates para roadmap)

Recogidos durante discuss-phase 2026-05-21:

1. **Phase 3.1: Push reminders + microcopy by season.** Notificaciones push "Tu Monstera toca regar". Adjustment estacional ("en invierno X ajusta a X+2 días" propuesto suavemente). Solo después de medir engagement de Phase 3 con PostHog (¿abren la app cuando toca regar sin recordatorio?).

2. **Phase 3.2: Learning loop.** Si el usuario log "Regada" consistentemente 2-3 días antes de la frecuencia configurada (≥3 veces consecutivas), mostrar one-time prompt "He notado que riegas antes. ¿Ajustamos a N-2 días?". No automático — solo sugerido.

3. **Phase 3.3: Histórico de riegos.** Tabla `watering_logs` separada con un log por riego. Permite estadísticas ("regaste 14 veces este mes"), gráficos de consistencia, y el learning loop tiene datos más ricos.

4. **Phase 3.4: Apodos.** Permite renombrar plantas ("Mi Monstera del salón" vs "Mi Monstera de la cocina") sin perder el nombre científico.

</deferred_ideas>

<dependencies>
## Dependencies that downstream agents must know

**Database state (ya en producción tras merge de 2026-05-21):**
- Columna `plant_searches.context` (`'home' | 'wild' | 'unclassified' | null`) — Phase 02.1
- Columna `plant_searches.watering_interval_days` (`int|null`, CHECK 1-60) — Phase 2
- Columna `plant_searches.latitude` / `longitude` (`numeric|null`) — pre-existing
- Política RLS UPDATE en `plant_searches` (Phase 02.1) — ya cubre la escritura de `last_watered_at` por parte del usuario.

**Hooks y componentes existentes que esta phase reutiliza:**
- `useContextCounts` (Phase 03.1) — añadir/usar `home_count` para condicionar visibilidad de tab.
- `BottomTabBar` (Phase 03.1) — extender el `useMemo` de tabs computadas para incluir Regar.
- Listener `mp:pending-classification-resolved` (Phase 02.1 + 03.1) — reactivo a cambios de clasificación, ya en uso.
- `<Toaster />` montado en Phase 02.1 — ya existe a nivel root, reutilizar para el toast de undo.
- `PlantResultView` y `/planta/:id` (Phase 02.1) — destino del tap en card (ya funciona).
- `useClassifyPlant` (Phase 02.1) — patrón de optimistic UPDATE + revert para clasificación; usar como referencia para `useLogWatering` (nuevo) y `useEditWateringInterval` (nuevo).
- `track()` from `@/lib/track` — wrapper PostHog ya en uso.

**Design system:**
- Tailwind config con tokens `--primary`, `--accent`, `--secondary`, `--muted`, `--soft-warn`, `--shadow-press`, etc. — usar tokens, no colores hardcoded.
- Fonts: Fraunces (display) + Outfit (body) ya cargadas globalmente.
- Componentes shadcn ya disponibles en `src/components/ui/`: Button, Card, Dialog, Sheet, Toast, Toaster.

**Constraints técnicos:**
- Mobile-first siempre. Desktop secundario (CLAUDE.md).
- Tests para lógica de negocio (countdown calculation, edge cases X=0, X<0, null handling). No tests de UI por convención del proyecto.
- E2E Playwright para happy path de la nueva tab.
- Migraciones Supabase deben incluir GRANT explícitos si crean tablas nuevas — no aplica aquí (solo ALTER TABLE para añadir `last_watered_at`).
- `npm run dev` corre en puerto 8080 (no 5173).

</dependencies>

---

*Próximo paso: `/gsd-plan-phase 3` para generar PLAN.md por cada sub-phase (5 PLAN.md files en total, uno por wave). El planner DEBE leer este CONTEXT.md íntegro antes de planificar.*
