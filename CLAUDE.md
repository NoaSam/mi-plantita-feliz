# CLAUDE.md — PlantID App

## Qué es este proyecto
App móvil para identificar plantas a partir de fotos. El usuario sube o toma una foto, la app identifica la planta, muestra cuidados y diagnostica enfermedades. Con login. Datos persistidos en Supabase.

## Stack técnico
- **Frontend:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **AI:** API de Claude (Anthropic) para análisis de imagen de plantas
- **Almacenamiento:** Supabase (auth + base de datos para historial de búsquedas y fotos)
- **Despliegue:** Vercel (mi-plantita-feliz.vercel.app)
- **iOS:** PWA instalable (manifest.json + service worker). Sin store.
- **Android:** App nativa con Capacitor (en beta). AppID: `com.miplantitafeliz.app`. Build: `npm run android`.

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
```

## Plugins de Claude Code activos (nivel usuario)
- **frontend-design** — Se activa automáticamente en tareas de frontend. Obliga a definir dirección estética antes de generar código. Genera interfaces con identidad visual real (tipografía, animaciones, composición espacial), no el típico aspecto genérico de IA.
- **feature-dev** — Skill que se activa automáticamente cuando se describe una feature a implementar. Sigue un flujo estructurado: análisis → plan → implementación → tests. No es un slash command, se activa por contexto.

### Workflow con plugins
1. Para cada feature nueva: describir la feature directamente a Claude Code
2. Ambos plugins se activan solos cuando Claude detecte trabajo relevante
3. Si se pide diseño de pantalla nueva, definir primero dirección estética (frontend-design lo pedirá)

## Contexto para Claude Code
- La dueña del producto es CPO con 15+ años de experiencia. No escribe código, dirige desarrollo.
- Comunicación directa, sin rodeos. No explicar conceptos básicos de producto.
- Priorizar velocidad de iteración sobre perfección arquitectónica.
- Cuando haya decisiones de producto, presentar opciones con trade-offs claros.
