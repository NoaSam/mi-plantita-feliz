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
