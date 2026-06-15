# Eventos de PostHog

## Configuración

- **Proyecto:** EU Cloud (`eu.i.posthog.com`)
- **Helper:** `src/lib/track.ts` — wrapper sobre `posthog.capture()`
- **Persistencia:** `localStorage`
- **Dev hygiene:** PostHog NO se inicializa en `localhost`/`127.0.0.1` (no-Capacitor). `npm run dev` no contamina la analítica de producción.

## Super-properties automáticas

Estas propiedades se añaden a **todos los eventos** vía `posthog.register()` en `initPostHog()`:

| Propiedad | Valor | Para qué |
|---|---|---|
| `app_version` | `1.2.0` (lee `package.json` via `__APP_VERSION__` define) | Filtrar por versión del frontend. iOS PWA / web se actualizan al instante; Android va en lotes (versionName del APK). |
| `app_platform` | `"android"` (Capacitor) o `"web"` (PWA/desktop) | Distinguir el shell sin tener que parsear `$current_url`. |

## Eventos automáticos

| Evento | Descripción |
|---|---|
| `$pageview` | Cada cambio de página (activado con `capture_pageview: true`) |
| `$pageleave` | Cuando el usuario abandona la página (activado con `capture_pageleave: true`) |

## Eventos custom

| Evento | Propiedades | Archivo | Cuándo se dispara |
|---|---|---|---|
| `user_signed_in` | `user_id` | `src/services/auth.service.ts` | Login exitoso con email/password |
| `user_signed_up` | — | `src/services/auth.service.ts` | Registro de nuevo usuario completado |
| `password_recovery_requested` | `email_domain` | `src/services/auth.service.ts` | Usuario solicitó el enlace de recuperación. Solo guardamos el dominio para evitar PII en analítica. |
| `password_recovery_completed` | — | `src/pages/auth/ResetPasswordPage.tsx` | Usuario guardó la nueva contraseña tras seguir el enlace del email. |
| `password_changed` | `source` | `src/components/auth/ChangePasswordSheet.tsx` | Usuario cambió la contraseña desde Ajustes con la actual verificada. `source: 'settings'`. |
| `plant_identified` | `plant_name`, `logged_in`, `winning_model`, `models`, `consensus_reached`, `has_location` | `src/hooks/use-plant-identifier.ts` | Planta identificada con éxito |
| `plant_identification_failed` | `error` | `src/hooks/use-plant-identifier.ts` | Error al identificar planta |
| `result_section_click` | `section`, `section_label`, `plant_name` | `src/components/PlantResultView.tsx` | Usuario abre una sección del acordeón de resultados |
| `location_consent_shown` | — | `src/components/LocationConsentModal.tsx` | Se muestra la modal de consentimiento de ubicación |
| `location_consent_accepted` | — | `src/components/LocationConsentModal.tsx` | Usuario acepta guardar ubicación |
| `location_consent_declined` | — | `src/components/LocationConsentModal.tsx` | Usuario rechaza guardar ubicación |

### Detalle de propiedades

**`plant_identified`**
- `plant_name`: nombre devuelto por la IA
- `logged_in`: `true` si el usuario tiene sesión activa
- `winning_model`: modelo de IA que generó el resultado (`claude`, `gemini`, `gpt4o`)
- `models`: array con info de todos los modelos consultados
- `consensus_reached`: `true` si hubo consenso entre modelos
- `has_location`: `true` si la búsqueda incluye coordenadas de ubicación

**`result_section_click`**
- `section`: identificador técnico (`description`, `care`, `diagnosis`)
- `section_label`: nombre visible en la UI (`Qué es`, `Cómo cuidarla`, `Qué le pasa`)
- `plant_name`: nombre de la planta identificada

**`location_consent_*`**
- La modal se muestra la primera vez que el usuario hace una foto
- Si acepta, no se vuelve a mostrar nunca
- Si rechaza, se reintenta hasta 3 veces. Después se deja de pedir
- Estado persistido en `localStorage` (`plantita_geo_permission`)

## Acciones de identidad

| Acción | Datos | Archivo | Cuándo se dispara |
|---|---|---|---|
| `posthog.identify()` | `user.id`, `{ email }` | `src/services/auth.service.ts` | Login exitoso |
| `posthog.reset()` | — | `src/contexts/AuthContext.tsx` | Logout |

## Session recording

- Activado con enmascaramiento de inputs (`maskAllInputs: true`)
- Selector adicional de enmascaramiento: `[data-ph-mask]`

---

## Phase 02.1 — Foundations (Classification + Reveal)

**Status:** Pendiente de implementación. Documentado durante el sketch phase para preparar la planificación. Los archivos `*.tsx` se concretan al ejecutar Phase 02.1.

### Eventos de clasificación (resultado de identificación, ficha y reveal)

| Evento | Propiedades | Archivo (TBD) | Cuándo se dispara |
|---|---|---|---|
| `classification_action_clicked` | `action`, `source`, `plant_search_id`, `was_unclassified` | `src/components/ClassificationCards.tsx` | Usuario toca una de las 2 cards (Mis plantas / Descubrimiento) |
| `classification_undo_clicked` | `action`, `plant_search_id` | `src/components/ClassificationMorph.tsx` | Usuario toca "Deshacer" durante la ventana post-tap |
| `classification_completed` | `action`, `source`, `plant_search_id` | `src/components/ClassificationMorph.tsx` | La clasificación se persiste (ventana de undo expirada, ~5s) |
| `classification_change_clicked` | `current_context`, `plant_search_id` | `src/components/PersistentClassificationBanner.tsx` | Usuario toca "Cambiar" en el banner post-clasificación |

### Eventos de reveal y descubrimiento

| Evento | Propiedades | Archivo (TBD) | Cuándo se dispara |
|---|---|---|---|
| `unclassified_section_shown` | `count` | `src/components/UnclassifiedSection.tsx` | Home renderiza la sección "Sin clasificar" (impression — una vez por sesión) |
| `unclassified_section_clicked` | `target`, `position`, `plant_search_id` | `src/components/UnclassifiedSection.tsx` | Usuario toca un thumbnail o "Ver todas" |
| `history_item_clicked` | `context`, `position` | `src/pages/History.tsx` | Usuario abre una entrada del historial (con info del estado de clasificación) |

### Eventos del wall de anónimos

| Evento | Propiedades | Archivo (TBD) | Cuándo se dispara |
|---|---|---|---|
| `anon_classification_wall_shown` | `intended_action` | `src/components/AnonClassificationWall.tsx` | Anónimo toca una card y se abre el bottom sheet de login |
| `anon_classification_wall_action` | `action`, `intended_action` | `src/components/AnonClassificationWall.tsx` | Usuario elige una opción del wall |
| `anon_searches_claimed` | `count` | `src/services/auth.service.ts` | Tras login/signup, `claim_anonymous_searches` RPC retorna OK con N filas migradas |

### Detalle de propiedades

**`classification_action_clicked` / `classification_completed`**
- `action`: `'home'` (Mis plantas) | `'wild'` (Descubrimiento)
- `source`: `'result'` (recién identificada) | `'detail_from_home_section'` | `'detail_from_history'`
- `plant_search_id`: UUID de la fila en `plant_searches`
- `was_unclassified`: `true` si la planta estaba en `context = 'unclassified'` antes del tap (sirve para distinguir primera clasificación vs cambio)

**`classification_change_clicked`**
- `current_context`: `'home'` | `'wild'` — qué tenía antes de tocar Cambiar
- `plant_search_id`: UUID de la fila

**`unclassified_section_shown`**
- `count`: número de plantas sin clasificar en el momento de la impresión
- Disparar **una sola vez por sesión** (usar flag en memoria) para evitar inflar métricas con re-renders

**`unclassified_section_clicked`**
- `target`: `'thumbnail'` | `'view_all'`
- `position`: posición del thumbnail (1-4) si `target === 'thumbnail'`, omitir si `'view_all'`
- `plant_search_id`: UUID si `target === 'thumbnail'`

**`history_item_clicked`**
- `context`: `'home'` | `'wild'` | `'unclassified'`
- `position`: índice 0-based de la planta en la lista visible

**`anon_classification_wall_shown` / `anon_classification_wall_action`**
- `intended_action`: `'home'` | `'wild'` — qué iba a hacer el anónimo cuando se le bloqueó
- `action` (solo en `_wall_action`): `'signup'` | `'login'` | `'dismiss'`

**`anon_searches_claimed`**
- `count`: número de filas que el RPC `claim_anonymous_searches` migró al usuario recién logueado/registrado
- Disparar tras la respuesta exitosa de la RPC, no antes

### Funnel previsto (para análisis posterior)

Funnel principal de adopción de clasificación (logged-in):
```
plant_identified
  → classification_action_clicked     [conversión clave]
  → classification_completed           [no hay undo]
  → (si vuelve a la planta) classification_change_clicked
```

Funnel de reveal:
```
unclassified_section_shown
  → unclassified_section_clicked
  → classification_action_clicked      [completa el ciclo de reveal]
```

Funnel de monetización vía wall (anónimo):
```
plant_identified (logged_in: false)
  → anon_classification_wall_shown
  → anon_classification_wall_action (action: 'signup' | 'login')
  → user_signed_up | user_signed_in
  → anon_searches_claimed
  → classification_completed
```

---

## Phase 03.1 — Plant Map v0

**Status:** Implementado en Phase 03.1. Los archivos `.tsx` son `src/pages/MapPage.tsx` y `src/components/PlantMapSheet.tsx`.

### Eventos del mapa de descubrimientos

| Evento | Propiedades | Archivo | Cuándo se dispara |
|---|---|---|---|
| `map_opened` | `pin_count` | `src/pages/MapPage.tsx` | Usuario navega a `/mapa` y el hook `useWildPlantsWithCoords` resuelve (disparar **una vez por montaje**, gated con flag local `trackedOpen` para evitar inflar la métrica con re-renders) |
| `map_pin_tapped` | `plant_search_id`, `pin_index_among_total`, `total_pins` | `src/pages/MapPage.tsx` | Usuario toca un pin del mapa. Disparar **antes** de `setSelectedPin` |
| `map_navigated_to_detail` | `plant_search_id`, `from` | `src/components/PlantMapSheet.tsx` | Usuario toca "Ver detalle" en el bottom sheet del pin. Disparar **antes** del `navigate(\`/planta/${id}\`)` |

### Detalle de propiedades

**`map_opened`**
- `pin_count`: número de pins visibles en el mapa (= `wild_with_coords_count` del usuario)
- Disparar **una sola vez por montaje** de `MapPage` (flag in-component `trackedOpen`) para evitar inflar la métrica con re-renders por state changes (selectedPin, etc.)

**`map_pin_tapped`**
- `plant_search_id`: UUID de la fila en `plant_searches` correspondiente al pin tocado
- `pin_index_among_total`: índice **0-based** del pin entre los `plants.length` totales. El hook ordena por `created_at desc`, por lo que `index === 0` siempre es el descubrimiento más reciente. Permite analizar si los usuarios prefieren los pins recientes (índice bajo) o los antiguos.
- `total_pins`: cardinalidad total de pins en el mapa cuando se hizo el tap. Permite normalizar `pin_index_among_total` y separar comportamiento de usuarios con pocos vs muchos descubrimientos.

**`map_navigated_to_detail`**
- `plant_search_id`: UUID de la fila
- `from`: literal `'pin_sheet'` en v0. Campo reservado por si en v1+ se añade otro punto de entrada al detalle desde el mapa (ej. swipe-to-detail, long-press, mini-card en el header).

### Funnel previsto (para análisis posterior)

Funnel de descubrimiento → exploración:
```
plant_identified (con has_location: true)
  → classification_action_clicked (action: 'wild')
  → classification_completed
  → (visita futura) map_opened
  → map_pin_tapped
  → map_navigated_to_detail        [conversión clave: el mapa lleva al detalle]
```

Funnel cross-fase (Phase 02.1 + 03.1):
```
plant_identified
  → classification_action_clicked (action: 'wild')
  → classification_completed
  → (tab "Mapa" aparece reactivamente — sin event explícito, pero útil para diagnostico)
  → map_opened (con pin_count >= 1)
  → map_pin_tapped (con pin_index_among_total: 0 — el descubrimiento que acaban de hacer)
  → map_navigated_to_detail (from: 'pin_sheet')
```

---

## Phase 3 — Calendar v0

**Status:** Implementado en Phase 3. Los archivos `.tsx` / `.ts` son `src/pages/RegarPage.tsx`, `src/components/PlantWateringCard.tsx`, `src/hooks/use-log-watering.ts` y `src/hooks/use-edit-watering-interval.ts`.

### Eventos del calendario de riego

| Evento | Propiedades | Archivo | Cuándo se dispara |
|---|---|---|---|
| `calendar_opened` | `home_count`, `overdue_count`, `pending_first_time_count` | `src/pages/RegarPage.tsx` | Usuario navega a `/regar` y el hook `useHomePlants` resuelve (disparar **una vez por montaje**, gated con flag local `trackedOpen` para evitar inflar la métrica) |
| `watering_logged` | `plant_search_id`, `days_remaining_before`, `interval_days`, `was_first_time` | `src/hooks/use-log-watering.ts` | Tras el UPDATE exitoso de `last_watered_at`, **antes** del dispatch de `mp:plant-watered`. NO se dispara en el optimistic update — solo cuando la DB confirma |
| `watering_frequency_edited` | `plant_search_id`, `prev_interval`, `new_interval`, `source` | `src/hooks/use-edit-watering-interval.ts` | Tras el UPDATE exitoso de `watering_interval_days`, **antes** del dispatch de `mp:plant-frequency-updated` |
| `calendar_card_navigated_to_detail` | `plant_search_id`, `position` | `src/components/PlantWateringCard.tsx` (handler en `src/pages/RegarPage.tsx`) | Usuario toca el área principal de la card (foto + nombre, NO el botón Regar). Disparar **antes** del `navigate(`/planta/${id}`)` |

### Detalle de propiedades

**`calendar_opened`**
- `home_count`: número total de plantas casa del usuario (= `plants.length` del hook `useHomePlants`).
- `overdue_count`: cuántas plantas tienen `daysRemaining < 0` (atrasadas) en el momento del open.
- `pending_first_time_count`: cuántas plantas tienen `status === 'pending-first'` (sin `last_watered_at` o sin `watering_interval_days`).
- Disparar **una sola vez por montaje** de `RegarPage` (flag in-component `trackedOpen`).

**`watering_logged`**
- `plant_search_id`: UUID de la fila.
- `days_remaining_before`: signed integer; negativo si atrasada al momento del log, 0 si era "Toca regar hoy", positivo si el usuario regó anticipadamente, **null** si era pending-first (no había countdown).
- `interval_days`: frecuencia configurada al momento del log (puede ser null si la planta era pending-first sin intervalo IA).
- `was_first_time`: boolean. True si la planta no tenía `last_watered_at` antes del log (i.e. era pending-first por only-null lastWatered).

**`watering_frequency_edited`**
- `plant_search_id`: UUID.
- `prev_interval`: valor previo (null si IA no dio frecuencia).
- `new_interval`: nuevo valor [1, 60].
- `source`: enum derivado por el caller (RegarPage):
  - `'null_filled_in_by_user'`: `prev_interval === null` (IA no dio frecuencia, usuario rellenó por primera vez).
  - `'user_override'`: `prev_interval !== null AND new_interval !== prev_interval`. Usuario sobreescribió la frecuencia IA o la propia.
  - Cuando `new_interval === prev_interval` el hook **no se llama** — la edición es un no-op y se salta el UPDATE.

**`calendar_card_navigated_to_detail`**
- `plant_search_id`: UUID.
- `position`: índice **0-based** en la lista ordenada (por urgencia, ver D-09). Permite analizar si los usuarios prefieren explorar las plantas urgentes (índice bajo) o navegan a cualquiera.

### Funnel previsto (para análisis posterior)

Funnel principal — riego completado:
```
calendar_opened (con home_count >= 1)
  → watering_logged (con was_first_time = false)        [riego habitual]
```

Funnel onboarding del calendario — primera planta regada:
```
plant_identified → classification_action_clicked (action: 'home') → classification_completed
  → calendar_opened (con pending_first_time_count >= 1)
  → watering_frequency_edited (con source: 'null_filled_in_by_user' o 'user_override')
                                                                    [solo si el usuario cambió la sugerencia IA]
  → watering_logged (con was_first_time: true)
```

Funnel de exploración:
```
calendar_opened
  → calendar_card_navigated_to_detail (con position bajo → planta urgente)
  → result_section_click (en /planta/:id)
```

Funnel de ajuste post-riego (señal de frecuencia mal calibrada por IA):
```
watering_logged
  → watering_frequency_edited (en los 4s siguientes via toast "Modificar frecuencia")
```
