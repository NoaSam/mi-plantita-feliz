# Roadmap: Mi Plantita Feliz

**Milestone:** Android + Calendario de Riego
**Creado:** 2004-04-22
**Granularidad:** Coarse
**Cobertura:** 21/21 requirements v1 mapeados

---

## Phases

- [x] **Phase 1: Android Native** — Empaquetar la app con Capacitor y generar APK funcional para Android
- [ ] **Phase 2: Prompt Optimization** — Mejorar precision de IA y devolver watering_interval_days estructurado
- [ ] **Phase 02.1: Foundations: Classification + Result Actions + Reveal** — 3 acciones en result screen, columna context en DB, banner para usuarios existentes
- [ ] **Phase 3: Calendar v0** — Lista minima de "Mis plantas" con frecuencia de riego sugerida, condicional al modo casa
- [ ] **Phase 03.1: Plant Map v0** — Mapa con pins de descubrimientos geolocalizados, condicional al modo explorador
- [x] **Phase 4: Response Time Optimization** — Reducir latencia percibida del analisis de plantas

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

### Phase 02.1: Foundations: Classification + Result Actions + Reveal (INSERTED)

**Goal:** Las identificaciones de plantas se pueden etiquetar como `home` (calendar v0) o `wild` (map v0) desde el resultado, el detalle accedido vía historial y desde la sección "Sin clasificar" en home; los usuarios anónimos ven la opción pero la acción está protegida por un wall de login que preserva su intención y la ejecuta automáticamente tras el alta.
**Requirements**: SPEC-1..SPEC-10 (locked en `phases/02.1-foundations-classification-result-actions-reveal/02.1-SPEC.md`)
**Depends on:** Phase 2
**Plans:** 6/7 plans executed

Plans:

**Wave 1 — Data foundation**
- [x] 02.1-01: Migración SQL `add context to plant_searches` + supabase db push [BLOCKING] + regenerate types + extend `usePlantHistory` + mount Sonner `<Toaster />`

**Wave 2 — UI primitives + hooks + auth chain** *(blocked on Wave 1)*
- [x] 02.1-02: Hooks `useClassifyPlant` + `useUnclassifiedCount` + `usePlantById` + `src/lib/pending-classification.ts` (sessionStorage helper)
- [x] 02.1-03: Auth chain — `claimAnonymousSearches` count + `anon_searches_claimed` event + `AuthContext.onAuthStateChange` chains `processPendingClassification` + dispatch `mp:pending-classification-resolved`
- [x] 02.1-04: `ClassificationCards` + `ClassificationMorph` + `PersistentClassificationBanner`
- [x] 02.1-05: `UnclassifiedSection` + `HistorySummary` + `ContextChip`
- [x] 02.1-06: `AnonClassificationWall` (bottom sheet)

**Wave 3 — Integration + tracking sweep** *(blocked on Wave 2 completion)*
- [ ] 02.1-07: `PlantDetail` page + modify `PlantResultView`/`Index`/`History`/`App` + register `/planta/:id` route + window listener for `mp:pending-classification-resolved` + verify all 10 PostHog events

### Phase 3: Calendar v0
**Goal**: Los usuarios ven una lista simple de "Mis plantas" con la frecuencia de riego sugerida por la IA, condicional a haber clasificado al menos una planta como casa
**Depends on**: Phase 02.1
**Requirements**: RIEG-01, RIEG-02 (parcial — editable se difiere a v1+)
**Success Criteria**:
  1. La seccion "Mis plantas" aparece en home solo cuando hay >=1 planta clasificada como casa
  2. Cada planta de la lista muestra foto, nombre comun y frecuencia de riego sugerida en dias
  3. Si no hay plantas clasificadas como casa, la seccion no aparece en home
  4. Tap en una planta de la lista abre la pantalla de detalle existente
**Plans**: TBD
**UI hint**: yes
**Note v0**: Lista minima sin "Hoy toca regar", recordatorios push, edicion manual de frecuencia, apodos, ni historial — diferidos a v1+ tras feedback real.

### Phase 03.1: Plant Map v0 (INSERTED)

**Goal:** [Urgent work - to be planned]
**Requirements**: TBD
**Depends on:** Phase 3
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 03.1 to break down)

### Phase 4: Response Time Optimization
**Goal**: El usuario percibe el resultado de identificacion en ~3-5 segundos en lugar de ~04-25 segundos, gracias a streaming SSE y seleccion first-winner del modelo de IA
**Depends on**: Phase 1
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria**:
  1. La edge function devuelve el primer resultado valido de IA via SSE sin esperar a los otros dos modelos
  2. El cliente renderiza el resultado al recibir el evento SSE "result", antes de que terminen storage y DB
  3. La compresion de imagen usa Web Worker (no bloquea el hilo principal)
  4. Las 3 filas de model_evaluations siguen insertandose (analytics no se rompe)
  5. Tests del hook de identificacion pasan con el nuevo flujo SSE
**Plans:** 2 plans
Plans:
- [x] 04-01-PLAN.md — Edge function: Promise.race first-winner + SSE streaming response
- [x] 04-02-PLAN.md — Client hook: SSE reader + browser-image-compression + test update

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Android Native | 5/5 | Complete | - |
| 2. Prompt Optimization | 0/? | Not started | - |
| 02.1. Foundations | 6/7 | In Progress|  |
| 3. Calendar v0 | 0/? | Not started | - |
| 03.1. Plant Map v0 | 0/? | Not started | - |
| 4. Response Time Optimization | 2/2 | Complete | 2004-04-28 |

---

*Roadmap creado: 2004-04-22*
