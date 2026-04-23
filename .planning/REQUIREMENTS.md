# Requirements: Mi Plantita Feliz

**Definido:** 2026-04-22
**Core Value:** Cualquier persona puede sacar una foto a una planta y saber al instante qué es y cómo cuidarla

## v1 Requirements

### Android Nativo

- [x] **ANDR-01**: La app se empaqueta con Capacitor y genera un APK/AAB funcional
- [x] **ANDR-02**: La cámara funciona en el WebView de Android vía @capacitor/camera
- [x] **ANDR-03**: El service worker se desactiva en el build de Android para no interferir con plugins nativos
- [x] **ANDR-04**: Las imágenes base64 se migran a Supabase Storage para evitar OOM en WebView
- [x] **ANDR-05**: El build de Android usa paths relativos (base: './') para que los assets carguen correctamente
- [x] **ANDR-06**: Los permisos de cámara incluyen rationale string y manejo de denegación
- [x] **ANDR-07**: El APK/AAB cumple requisitos de Play Store (targetSdk, permisos, iconos)
- [x] **ANDR-08**: Splash screen y status bar configurados con branding de la app

### Calendario de Riego

- [ ] **RIEG-01**: El usuario puede añadir una planta identificada a su colección ("Mis Plantas")
- [ ] **RIEG-02**: Cada planta tiene frecuencia de riego sugerida por la IA, editable por el usuario
- [ ] **RIEG-03**: Sección "Hoy toca regar" muestra plantas pendientes del día
- [ ] **RIEG-04**: El usuario puede marcar "Regué hoy" con un toque para resetear el contador
- [ ] **RIEG-05**: El usuario puede ver cuándo regó por última vez cada planta
- [ ] **RIEG-06**: El usuario puede poner apodo a cada planta de su colección

### Prompts

- [ ] **PROM-01**: El prompt de identificación devuelve watering_interval_days como campo numérico estructurado
- [ ] **PROM-02**: Los prompts se optimizan para mayor precisión en identificación y cuidados

### Onboarding

- [ ] **ONBR-01**: Intro de 3 pantallas swipeable y skip-able en primer uso (sin bloquear cámara)
- [ ] **ONBR-02**: Tooltip contextual post-identificación invitando a añadir planta al jardín

### Performance

- [ ] **PERF-01**: La edge function usa Promise.race para devolver el primer modelo valido via SSE en lugar de esperar a los tres
- [ ] **PERF-02**: El cliente consume la respuesta como stream SSE via raw fetch() en lugar de supabase.functions.invoke() buffered
- [ ] **PERF-03**: La compresion de imagen usa browser-image-compression con Web Worker (no bloquea main thread) a 800px max

## v2 Requirements

- **RIEG-07**: Historial de riegos por planta (últimos 5 eventos)
- **RIEG-08**: Ajuste estacional de riego ("En verano riégala más")
- **RIEG-09**: Calendario offline (marcar riego sin conexión, sincronizar después)
- **NOTF-01**: Notificaciones push de riego vía @capacitor/local-notifications
- **IOS-01**: Build nativo para iOS vía Capacitor

## Out of Scope

| Feature | Razón |
|---------|-------|
| Push notifications | Primero validar lista diaria antes de invertir en FCM |
| iOS nativo | Foco en Android primero, PWA sigue funcionando en iOS |
| Social / compartir | Duplica scope, requiere moderación |
| Gamificación | Validar hábito de riego antes de invertir en streaks |
| Integración clima | Coste de API + permisos de ubicación innecesarios |
| OAuth | Email/password suficiente |

## Traceability

| Requirement | Fase | Estado |
|-------------|------|--------|
| ANDR-01 | Fase 1 | Completo |
| ANDR-02 | Fase 1 | Completo |
| ANDR-03 | Fase 1 | Completo |
| ANDR-04 | Fase 1 | Completo |
| ANDR-05 | Fase 1 | Completo |
| ANDR-06 | Fase 1 | Completo |
| ANDR-07 | Fase 1 | Completo |
| ANDR-08 | Fase 1 | Completo |
| PROM-01 | Fase 2 | Pendiente |
| PROM-02 | Fase 2 | Pendiente |
| RIEG-01 | Fase 3 | Pendiente |
| RIEG-02 | Fase 3 | Pendiente |
| RIEG-03 | Fase 3 | Pendiente |
| RIEG-04 | Fase 3 | Pendiente |
| RIEG-05 | Fase 3 | Pendiente |
| RIEG-06 | Fase 3 | Pendiente |
| ONBR-01 | Fase 4 | Pendiente |
| ONBR-02 | Fase 4 | Pendiente |
| PERF-01 | Fase 5 | Pendiente |
| PERF-02 | Fase 5 | Pendiente |
| PERF-03 | Fase 5 | Pendiente |

**Cobertura:**
- v1 requirements: 21 total
- Mapeados a fases: 21
- Sin mapear: 0

---
*Requirements definidos: 2026-04-22*
