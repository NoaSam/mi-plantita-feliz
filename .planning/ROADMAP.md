# Roadmap: Mi Plantita Feliz

**Milestone:** Android + Calendario de Riego
**Creado:** 2026-04-22
**Granularidad:** Coarse
**Cobertura:** 18/18 requirements v1 mapeados

---

## Phases

- [x] **Phase 1: Android Native** — Empaquetar la app con Capacitor y generar APK funcional para Android
- [ ] **Phase 2: Prompt Optimization** — Mejorar precision de IA y devolver watering_interval_days estructurado
- [ ] **Phase 3: Watering Calendar** — Coleccion de plantas del usuario con lista diaria "Hoy toca regar"
- [ ] **Phase 4: Onboarding** — Guiar nuevos usuarios sin bloquear la camara

---

## Phase Details

### Phase 1: Android Native
**Goal**: Los usuarios pueden instalar Mi Plantita Feliz como APK en su Android y usar la camara nativa
**Depends on**: Nada (primera fase)
**Requirements**: ANDR-01, ANDR-02, ANDR-03, ANDR-04, ANDR-05, ANDR-06, ANDR-07, ANDR-08
**Success Criteria**:
  1. El usuario instala la app via APK en un dispositivo Android (Play Store fuera del alcance de esta fase)
  2. El usuario abre la app, concede permiso de camara y toma una foto que se identifica correctamente
  3. La app carga sin pantallas en blanco ni errores de assets en el WebView de Android
  4. La app muestra splash screen con branding y status bar estilizado
  5. La denegacion de permiso de camara se maneja con un mensaje explicativo
**Plans:** 5 plans
Plans:
- [x] 01-01-PLAN.md — Capacitor foundation: install packages, config, platform detection, SW guard, Vite base path
- [x] 01-02-PLAN.md — Native plugins: Camera with permissions, Geolocation, Preferences auth adapter
- [x] 01-03-PLAN.md — Image Storage migration: Supabase bucket + edge function upload
- [x] 01-04-PLAN.md — Android assets: icon and splash screen source images + generation
- [x] 01-05-PLAN.md — Android build: generate project, build APK, end-to-end verification
**UI hint**: yes

### Phase 2: Prompt Optimization
**Goal**: La identificacion por IA devuelve datos estructurados y fiables que el calendario puede consumir
**Depends on**: Phase 1
**Requirements**: PROM-01, PROM-02
**Success Criteria**:
  1. Cada identificacion incluye un campo numerico watering_interval_days (no embebido en prosa)
  2. Las identificaciones de plantas comunes del hogar son notablemente mas precisas
**Plans**: TBD

### Phase 3: Watering Calendar
**Goal**: Los usuarios pueden construir una coleccion personal de plantas y saber exactamente cuales necesitan agua hoy
**Depends on**: Phase 2
**Requirements**: RIEG-01, RIEG-02, RIEG-03, RIEG-04, RIEG-05, RIEG-06
**Success Criteria**:
  1. El usuario puede anadir una planta identificada a "Mis Plantas" desde la pantalla de resultado
  2. El usuario ve una seccion "Hoy toca regar" con solo las plantas pendientes hoy
  3. El usuario toca "Regue hoy" y la planta desaparece de la lista, contador se resetea
  4. El usuario puede cambiar la frecuencia de riego sugerida por la IA
  5. El usuario puede dar un apodo personalizado a cada planta de su coleccion
**Plans**: TBD
**UI hint**: yes

### Phase 4: Onboarding
**Goal**: Los nuevos usuarios entienden el valor de la app inmediatamente y son invitados a usar el calendario
**Depends on**: Phase 3
**Requirements**: ONBR-01, ONBR-02
**Success Criteria**:
  1. En el primer uso, el usuario ve una intro de 3 pantallas que se puede saltar — la camara queda accesible
  2. Tras una identificacion exitosa, aparece un tooltip invitando a anadir la planta al jardin
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Android Native | 5/5 | Complete | - |
| 2. Prompt Optimization | 0/? | Not started | - |
| 3. Watering Calendar | 0/? | Not started | - |
| 4. Onboarding | 0/? | Not started | - |

---

*Roadmap creado: 2026-04-22*
