# Roadmap: Mi Plantita Feliz

**Milestone:** Android + Calendario de Riego
**Creado:** 2026-04-22
**Granularidad:** Coarse
**Cobertura:** 18/18 requirements v1 mapeados

---

## Phases

- [ ] **Phase 1: Android Native** — Empaquetar la app con Capacitor y generar APK/AAB listo para Play Store
- [ ] **Phase 2: Prompt Optimization** — Mejorar precisión de IA y devolver watering_interval_days estructurado
- [ ] **Phase 3: Watering Calendar** — Colección de plantas del usuario con lista diaria "Hoy toca regar"
- [ ] **Phase 4: Onboarding** — Guiar nuevos usuarios sin bloquear la cámara

---

## Phase Details

### Phase 1: Android Native
**Goal**: Los usuarios pueden instalar Mi Plantita Feliz desde Google Play y usar la cámara en su Android
**Depends on**: Nada (primera fase)
**Requirements**: ANDR-01, ANDR-02, ANDR-03, ANDR-04, ANDR-05, ANDR-06, ANDR-07, ANDR-08
**Success Criteria**:
  1. El usuario descarga e instala la app desde Google Play en un dispositivo Android
  2. El usuario abre la app, concede permiso de cámara y toma una foto que se identifica correctamente
  3. La app carga sin pantallas en blanco ni errores de assets en el WebView de Android
  4. La app muestra splash screen con branding y status bar estilizado
  5. La denegación de permiso de cámara se maneja con un mensaje explicativo
**Plans**: TBD
**UI hint**: yes

### Phase 2: Prompt Optimization
**Goal**: La identificación por IA devuelve datos estructurados y fiables que el calendario puede consumir
**Depends on**: Phase 1
**Requirements**: PROM-01, PROM-02
**Success Criteria**:
  1. Cada identificación incluye un campo numérico watering_interval_days (no embebido en prosa)
  2. Las identificaciones de plantas comunes del hogar son notablemente más precisas
**Plans**: TBD

### Phase 3: Watering Calendar
**Goal**: Los usuarios pueden construir una colección personal de plantas y saber exactamente cuáles necesitan agua hoy
**Depends on**: Phase 2
**Requirements**: RIEG-01, RIEG-02, RIEG-03, RIEG-04, RIEG-05, RIEG-06
**Success Criteria**:
  1. El usuario puede añadir una planta identificada a "Mis Plantas" desde la pantalla de resultado
  2. El usuario ve una sección "Hoy toca regar" con solo las plantas pendientes hoy
  3. El usuario toca "Regué hoy" y la planta desaparece de la lista, contador se resetea
  4. El usuario puede cambiar la frecuencia de riego sugerida por la IA
  5. El usuario puede dar un apodo personalizado a cada planta de su colección
**Plans**: TBD
**UI hint**: yes

### Phase 4: Onboarding
**Goal**: Los nuevos usuarios entienden el valor de la app inmediatamente y son invitados a usar el calendario
**Depends on**: Phase 3
**Requirements**: ONBR-01, ONBR-02
**Success Criteria**:
  1. En el primer uso, el usuario ve una intro de 3 pantallas que se puede saltar — la cámara queda accesible
  2. Tras una identificación exitosa, aparece un tooltip invitando a añadir la planta al jardín
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Android Native | 0/? | Not started | - |
| 2. Prompt Optimization | 0/? | Not started | - |
| 3. Watering Calendar | 0/? | Not started | - |
| 4. Onboarding | 0/? | Not started | - |

---

*Roadmap creado: 2026-04-22*
