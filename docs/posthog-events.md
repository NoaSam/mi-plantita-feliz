# Eventos de PostHog

## Configuración

- **Proyecto:** EU Cloud (`eu.i.posthog.com`)
- **Helper:** `src/lib/track.ts` — wrapper sobre `posthog.capture()`
- **Persistencia:** `localStorage`

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
