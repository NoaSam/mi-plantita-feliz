# PlantID — Mi Plantita Feliz

## What This Is

App móvil para identificar plantas a partir de fotos. El usuario sube o toma una foto, la app identifica la planta usando consenso multi-modelo (Claude, Gemini, GPT-4o), muestra cuidados y diagnostica enfermedades. Historial persistido en Supabase. Actualmente es una PWA instalable con React + Vite.

## Core Value

Cualquier persona puede sacar una foto a una planta y saber al instante qué es, cómo cuidarla y si tiene algún problema — sin saber nada de botánica.

## Requirements

### Validated

- ✓ Captura/subida de foto desde cámara nativa o galería — existing
- ✓ Identificación de planta con nombre común, científico y familia — existing
- ✓ Guía de cuidados: riego, luz, temperatura, sustrato, frecuencia de abono — existing
- ✓ Diagnóstico de enfermedades: síntomas, causa probable, tratamiento — existing
- ✓ Historial de búsquedas guardado en Supabase por usuario — existing
- ✓ Login con email/password vía Supabase Auth — existing
- ✓ PWA instalable con manifest.json y service worker — existing
- ✓ Analítica con PostHog y consentimiento de cookies — existing
- ✓ Búsquedas anónimas que se migran al crear cuenta — existing
- ✓ Consenso multi-modelo (Claude + Gemini + GPT-4o) para identificación — existing
- ✓ Captura platform-aware: cámara directa en Android, picker nativo en iOS — existing

### Active

- [ ] App nativa Android vía Capacitor para publicar en Google Play
- [ ] Calendario de riego: sección "Hoy toca regar" con plantas del día
- [ ] Frecuencia de riego automática desde identificación + ajuste manual del usuario
- [ ] Optimizar prompts de análisis de plantas para mayor precisión
- [ ] Onboarding para primer uso de la app

### Out of Scope

- OAuth (Google, Apple) — email/password suficiente para v1
- iOS nativa — foco en Android primero, PWA sigue funcionando en iOS
- Notificaciones push de riego — empezar con lista diaria en la app
- Monetización/ads — gratuita por ahora
- Multi-idioma — solo español

## Context

- **Origen:** Código generado inicialmente en Lovable, migrado a GitHub y refactorizado
- **Stack:** React 18 + Vite 8 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (auth, DB, storage, edge functions)
- **AI:** Edge function `identify-plant` con consenso multi-modelo
- **Deploy:** Vercel (PWA actual)
- **Público:** Personas no técnicas, jardineros aficionados, gente con plantas en casa
- **Tono:** Cercano, claro, sin jerga botánica innecesaria
- **Idioma UI:** Español
- **Idioma código:** Inglés (variables, componentes, commits)

## Constraints

- **Mobile-first**: Toda la UI se diseña primero para móvil, desktop secundario
- **Offline-first**: Features deben funcionar offline donde sea posible
- **Stack**: React + Vite + Supabase — no cambiar stack core
- **API keys**: Solo en servidor (edge functions), nunca en cliente
- **Accesibilidad**: Contraste, labels, navegación por teclado como mínimo

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Capacitor/TWA para Android | Reutiliza 100% del código React existente, más rápido que reescribir en React Native | — Pending |
| Lista diaria de riego (no push) | Más simple de implementar, no requiere infraestructura de notificaciones | — Pending |
| Frecuencia auto + ajuste manual | Claude ya devuelve info de riego; el usuario debe poder personalizar | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-22 after initialization*
