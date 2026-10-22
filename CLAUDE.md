# CLAUDE.md — PlantID App

## Qué es este proyecto
App móvil para identificar plantas a partir de fotos. El usuario sube o toma una foto, la app identifica la planta, muestra cuidados y diagnostica enfermedades. Con login. Datos persistidos en Supabase.

## Stack técnico
- **Frontend:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **AI:** API de Claude (Anthropic) para análisis de imagen de plantas
- **Almacenamiento:** Supabase (auth + base de datos para historial de búsquedas y fotos)
- **Despliegue:** Vercel (mi-plantita-feliz.vercel.app)
- **iOS:** PWA instalable (manifest.json + service worker). Sin store.
- **Android:** App nativa con Capacitor (en beta). AppID: `app.mijardin.plantas` (inmutable — Play Store lo usa como identificador único). Nombre del launcher: "Mi Jardín". Build: `npm run android`.

## Keepalive de Supabase (leer antes de tocar)
Supabase Free pausa el proyecto tras **7 días consecutivos sin actividad** en la DB. Si se pausa, la app deja de cargar datos hasta reanudarla a mano. Para evitarlo hay un ping automático.

- **Automatismo activo:** Vercel Cron → `api/keepalive.ts` (edge function), schedule `0 4 * * *` declarado en el bloque `crons` de `vercel.json`. Vercel no desactiva crons por inactividad del repo. La función devuelve 500 si el ping falla, para que un ping muerto aparezca en los logs de Vercel en vez de pasar en silencio.
- **Fallback manual:** `.github/workflows/supabase-keepalive.yml`, solo `workflow_dispatch` (Actions → Run workflow) para despertar Supabase a mano.
- **No reintroducir `schedule` en el workflow de GitHub.** GitHub desactiva workflows programados en repos públicos tras **60 días sin actividad en el repo** (estado `disabled_inactivity`) — es exactamente lo que pasó el 22 oct 2026. Encadenado con la ventana de Supabase, un parón de ~67 días sin commits deja la app caída sin aviso previo. Sin `schedule`, GitHub no lo puede desactivar.
- `CRON_SECRET` en los env vars de Vercel (producción) es opcional: si está definido, la función exige `Authorization: Bearer $CRON_SECRET`; si no, el endpoint queda abierto. Solo hace una lectura que ya es pública vía RLS, así que el riesgo es ruido de invocaciones, no datos.
- Plan Hobby: máximo 1 ejecución diaria por cron y Vercel la dispara dentro de la hora indicada, no al minuto.
- **Síntoma de que esto ha fallado:** la app no carga datos tras un parón largo → sospechar Supabase pausada → despertar con el workflow manual y revisar el cron en Vercel (Settings → Cron Jobs).

## Origen del código
Código generado inicialmente en Lovable y migrado a este repo vía GitHub. Se está refactorizando para calidad de producción.

## Arquitectura
```
src/
├── components/       # Componentes React (UI)
├── pages/            # Vistas principales (Home, History, PlantDetail)
├── hooks/            # Custom hooks (useCamera, usePlantHistory, usePlantAnalysis)
├── lib/              # Utilidades y helpers
├── services/         # Llamadas a API de Claude para análisis de plantas
└── types/            # TypeScript interfaces
```

## Funcionalidades core
1. **Captura/subida de foto** — cámara nativa o galería
2. **Identificación de planta** — nombre común, nombre científico, familia
3. **Guía de cuidados** — riego, luz, temperatura, sustrato, frecuencia de abono
4. **Diagnóstico de enfermedades** — síntomas detectados, causa probable, tratamiento
5. **Historial** — búsquedas guardadas en Supabase por usuario, con foto, fecha y resultado
6. **Login** — autenticación vía Supabase Auth (email/password, priorizar accesibilidad)

## Reglas de desarrollo
- Mobile-first siempre. Desktop es secundario.
- Login simple: email/password vía Supabase Auth. No OAuth por ahora.
- Cada feature nueva debe funcionar offline-first donde sea posible.
- Componentes pequeños y reutilizables. No componentes monolíticos.
- Nombres de variables, componentes y commits en inglés. Contenido de UI en español.
- Tests para lógica de negocio (hooks y services). No tests de UI por ahora.
- Accesibilidad básica: contraste, labels, navegación por teclado.
- **Migraciones Supabase que crean tablas en `public`** deben incluir `GRANT` explícitos (`authenticated` + `service_role`, opcional `anon`) además del `enable row level security` + políticas. Boilerplate y razón en `supabase/MIGRATION_CONVENTIONS.md` — obligatorio desde el 30 oct 2026 (Supabase deja de auto-grantear). Las tablas existentes (`plant_searches`, `profiles`, `model_evaluations`) están protegidas por la cláusula "existing tables keep their grants" y no necesitan migración.

## Roadmap activo
- [x] Migrar repo desde Lovable a GitHub propio
- [x] Refactorizar estructura de componentes
- [x] Implementar login con Supabase Auth (email/password)
- [x] Migrar historial de localStorage a Supabase
- [x] Añadir manifest.json + PWA (iconos, colores, service worker)
- [x] Integrar PostHog (analítica de producto)
- [ ] Optimizar prompts de análisis de plantas
- [ ] Diseñar onboarding para primer uso
- [x] Testear instalación PWA en Android e iOS
- [ ] Optimizar tiempo de carga de /mis-plantas (history page)

## Consideraciones de producto
- **Público objetivo:** personas no técnicas, jardineros aficionados, gente con plantas en casa
- **Tono de la app:** cercano, claro, sin jerga botánica innecesaria
- **Idioma:** español (expansión a otros idiomas futura)
- **Monetización:** gratuita. Sin ads por ahora. Evaluar freemium más adelante.
- **Privacidad:** datos de usuario en Supabase con RLS. Fotos almacenadas en Supabase Storage. API key de Claude solo en servidor.

## Comandos útiles
```bash
npm install          # Instalar dependencias
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run icons        # Regenerar todos los iconos desde la hoja de trazo
```

## Iconos y nombre de la app
- **Una sola marca.** `scripts/generate-icons.ts` es la única fuente: deriva de la hoja de trazo (el path que ya usaba el icono de Play) el favicon multi-tamaño, los iconos PWA, el `apple-touch-icon`, los assets fuente de `assets/` y, vía `@capacitor/assets`, todas las densidades de Android. **No editar a mano ningún PNG de `public/`, `assets/` ni `android/app/src/main/res/mipmap-*/`** — se sobrescriben. Para cambiar la marca, tocar `LEAF_PATH` o las escalas en ese script y ejecutar `npm run icons`.
- **El inset del adaptive icon.** `@capacitor/assets` reescribe `ic_launcher.xml` en cada ejecución aplicando un `inset` del 16,7 % a las dos capas. En el *foreground* es correcto (es la zona segura de Android); en el *background* es un bug, porque la capa de fondo debe ir a sangre o el launcher deja las esquinas transparentes al recortar la máscara. `patchAdaptiveIcon()` lo corrige después de generar. Si algún día se ejecuta `capacitor-assets` a mano, hay que volver a aplicar el parche.
- **El nombre es "Mi Jardín"**, con tilde y jota mayúscula, en todas las superficies: `strings.xml`, `capacitor.config.ts`, el manifiesto PWA, `index.html` y los textos legales. El `appId` `app.mijardin.plantas` es inmutable y el dominio sigue siendo `mi-plantita-feliz.vercel.app`; esos dos no se tocan.

## Plugins de Claude Code activos (nivel usuario)
- **frontend-design** — Se activa automáticamente en tareas de frontend. Obliga a definir dirección estética antes de generar código. Genera interfaces con identidad visual real (tipografía, animaciones, composición espacial), no el típico aspecto genérico de IA.
- **feature-dev** — Skill que se activa automáticamente cuando se describe una feature a implementar. Sigue un flujo estructurado: análisis → plan → implementación → tests. No es un slash command, se activa por contexto.
- **`/mockup`** — Skill manual para revisión CPO. Tres casos de uso:
  - **Pre-execute (default):** `/mockup` entre `plan-phase` y `execute-phase`. Lee el `PLAN.md` activo y genera mockups HTML estáticos en `/tmp/` con device frames, datos placeholder en español y anotaciones de producto al lado (de dónde llega, a dónde va, qué se guarda en DB, qué eventos PostHog se añaden). Cierra con bloque de decisión: ✅ procedo / ❌ cambios.
  - **Comparativo en discuss-phase:** `/mockup hipótesis A vs B vs C` (descripción libre) cuando hay 2-3 candidatos visuales en tensión y la conversación está atascada. Resuelve el tradeoff visual en 2 minutos. NO usar en discuss-phase si solo hay una idea sobre la mesa (sesgo de anclaje) o si la decisión es backend/datos sin componente visual claro — el flujo correcto es divergir (discuss) → converger (plan) → validar (mockup canónico).
  - **Post-execute QA:** `/mockup --live` arranca `npm run dev` y genera HTML con iframe del dev server + panel CPO con diff vs `main` (DB, edge functions, RLS, PostHog events, deps). Útil antes de mergear. Limitación: rutas con auth-guard (ej. `/mapa`) requieren login previo en una pestaña aparte de `localhost:8080`.
  - Skill global en `~/.claude/skills/mockup/SKILL.md`. NO modifica código, NO commitea, NO mergea — solo lee y genera.

### Workflow con plugins
1. Para cada feature nueva: describir la feature directamente a Claude Code
2. `frontend-design` y `feature-dev` se activan solos cuando Claude detecte trabajo relevante
3. Si se pide diseño de pantalla nueva, definir primero dirección estética (`frontend-design` lo pedirá)
4. Antes de ejecutar un PLAN.md → `/mockup` para validar visual y producto. Antes de mergear a `main` → `/mockup --live` para QA

## Contexto para Claude Code
- La dueña del producto es CPO con 15+ años de experiencia. No escribe código, dirige desarrollo.
- Comunicación directa, sin rodeos. No explicar conceptos básicos de producto.
- Priorizar velocidad de iteración sobre perfección arquitectónica.
- Cuando haya decisiones de producto, presentar opciones con trade-offs claros.
