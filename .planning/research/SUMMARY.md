# Resumen de Investigación

**Proyecto:** Mi Plantita Feliz — Android nativo + Calendario de riego
**Fecha:** 2026-04-22

## Hallazgos Clave

### Stack
- **Capacitor** es la opción correcta: reutiliza 100% del código React, sin reescritura
- Paquetes mínimos: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/splash-screen`, `@capacitor/status-bar`
- NO se necesitan librerías nuevas para el calendario — `date-fns`, `react-day-picker` y Supabase ya están instalados
- Dos targets de build: PWA (con service worker) y Android (sin service worker)

### Features — Lo Imprescindible
- **Colección "Mis Plantas"** — entidad separada del historial de búsquedas
- **CTA "Añadir a mi jardín"** — en la pantalla de resultado de identificación
- **Frecuencia de riego** — auto-poblada desde la IA, editable por el usuario
- **Lista diaria "Hoy toca regar"** — plantas pendientes hoy, ordenadas por atraso
- **"Regué hoy"** — un toque para confirmar y resetear contador
- **Onboarding** — 3 pantallas opcionales + tooltip contextual post-identificación

### Diferenciador Principal
La IA ya extrae frecuencia de riego — auto-poblarla no requiere llamada extra. Todos los competidores obligan al usuario a introducirla manualmente.

### Arquitectura
- Nueva tabla `user_plants` separada de `plant_searches` (historial es solo lectura)
- Capacitor es solo infraestructura — no cambia código React excepto `vite.config.ts`
- Calendario es full-stack: migración → hook → páginas → componentes
- Onboarding es solo frontend, independiente

### Riesgos Principales
1. **Base64 en WebView** → crash OOM. Migrar a Supabase Storage ANTES de Capacitor
2. **Service worker bloquea plugins nativos** → desactivar en build Android
3. **Schema en `plant_searches`** → usar `user_plants` desde el primer día
4. **Intervalo IA impredecible** → añadir campo estructurado `watering_interval_days` al prompt
5. **Onboarding que bloquea cámara** → cámara primero, signup después

## Orden de Construcción Sugerido

1. **Optimización de prompts** — añadir `watering_interval_days` al schema JSON (prerrequisito del calendario)
2. **Calendario de riego** — tabla `user_plants`, colección, lista diaria, "regué hoy"
3. **Capacitor Android** — wrapping, build pipeline, permisos, Play Store
4. **Onboarding** — 3 pantallas opcionales, tooltips contextuales

---
*Resumen: 2026-04-22*
