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
| `plant_identified` | `plant_name`, `logged_in`, `model` | `src/hooks/use-plant-identifier.ts` | Planta identificada con éxito |
| `plant_identification_failed` | `error` | `src/hooks/use-plant-identifier.ts` | Error al identificar planta |
| `result_section_click` | `section`, `section_label`, `plant_name` | `src/components/PlantResultView.tsx` | Usuario abre una sección del acordeón de resultados |

### Detalle de propiedades

**`result_section_click`**
- `section`: identificador técnico (`description`, `care`, `diagnosis`)
- `section_label`: nombre visible en la UI (`Qué es`, `Cómo cuidarla`, `Qué le pasa`)
- `plant_name`: nombre de la planta identificada

**`plant_identified`**
- `plant_name`: nombre devuelto por la IA
- `logged_in`: `true` si el usuario tiene sesión activa
- `model`: modelo de IA que generó el resultado (`claude`, `gemini`, `gpt4o`)

## Acciones de identidad

| Acción | Datos | Archivo | Cuándo se dispara |
|---|---|---|---|
| `posthog.identify()` | `user.id`, `{ email }` | `src/services/auth.service.ts` | Login exitoso |
| `posthog.reset()` | — | `src/contexts/AuthContext.tsx` | Logout |

## Session recording

- Activado con enmascaramiento de inputs (`maskAllInputs: true`)
- Selector adicional de enmascaramiento: `[data-ph-mask]`
