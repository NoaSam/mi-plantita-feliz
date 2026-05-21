# Roadmap: Mi Plantita Feliz

**Milestone:** Android + Calendario de Riego
**Creado:** 2026-04-22
**Granularidad:** Coarse
**Cobertura:** 21/21 requirements v1 mapeados

---

## Phases

- [x] **Phase 1: Android Native** — Empaquetar la app con Capacitor y generar APK funcional para Android
- [ ] **Phase 2: Prompt Optimization** — Mejorar precision de IA y devolver watering_interval_days estructurado
- [x] **Phase 02.1: Foundations: Classification + Result Actions + Reveal** — 3 acciones en result screen, columna context en DB, banner para usuarios existentes (completed 2026-05-14)
- [ ] **Phase 3: Calendar v0** — Lista minima de "Mis plantas" con frecuencia de riego sugerida, condicional al modo casa
- [x] **Phase 03.1: Plant Map v0** — Mapa con pins de descubrimientos geolocalizados, condicional al modo explorador (completed 2026-05-17)
- [x] **Phase 4: Response Time Optimization** — Reducir latencia percibida del analisis de plantas
- [ ] **Phase 04.1: My Plants Load Time Optimization** — Acelerar la pantalla `/mis-plantas` (history)
- [ ] **Phase 5: Identification Engine v2 — Pl@ntNet + 1 LLM** *(candidate)* — Separar identificación (Pl@ntNet, especializado) de generación de cuidados/diagnóstico (1 LLM en vez de 3)
- [ ] **Phase 6: Backfill imágenes históricas base64 → Storage** *(candidate)* — Migrar las ~124 filas legacy de `plant_searches.image_url` (data:image/jpeg;base64,...) a URLs HTTPS en Supabase Storage; reducir tamaño DB y eliminar riesgo OOM en Capacitor

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
**Plans:** 7/7 plans complete

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
- [x] 02.1-07: `PlantDetail` page + modify `PlantResultView`/`Index`/`History`/`App` + register `/planta/:id` route + window listener for `mp:pending-classification-resolved` + verify all 10 PostHog events

### Phase 3: Calendar v0
**Goal**: Los usuarios ven una lista simple de "Mis plantas" con la frecuencia de riego sugerida por la IA, condicional a haber clasificado al menos una planta como casa
**Depends on**: Phase 02.1 (clasificación + context column), Phase 2 (campo `watering_interval_days` estructurado que la lista consume)
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

**Goal:** Los usuarios con ≥1 planta clasificada como `wild` que tenga `lat/lng` no nulos pueden ver esas plantas como pins en un mapa accesible desde una pestaña condicional en `BottomTabBar`, y tocar un pin abre un preview con CTA al detalle completo de la planta.
**Requirements**: SPEC-R1..SPEC-R8 + SPEC-AC1..SPEC-AC12 (locked en `phases/03.1-plant-map-v0/03.1-SPEC.md`); contrato adicional UI-SPEC.md + 17 decisiones D-01..D-17 en CONTEXT.md
**Depends on:** Phase 02.1 (clasificación + columna `context` + filtro `wild`). NOTA: el ROADMAP original declaraba "Depends on Phase 3" como ordering preference, pero técnicamente esta phase solo necesita Phase 02.1; shipeada a producción 2026-05-21 antes de Phase 3 sin issues (la tab del mapa es condicional en `BottomTabBar`, la ruta redirige a `/` sin plantas wild → no hay regresión visible).
**Plans:** 8/8 plans complete

Plans:

**Wave 1 — Foundations (parallel)**
- [x] 03.1-01-PLAN.md — Install leaflet + react-leaflet + @types/leaflet; import CSS in main.tsx; add .plant-map-pin + .leaflet-control-* overrides in index.css (SPEC-R3, R4)
- [x] 03.1-02-PLAN.md — Hook `useContextCounts` (4 buckets) + test unit + listener `mp:pending-classification-resolved` (SPEC-R1, AC1, AC2, AC3)
- [x] 03.1-03-PLAN.md — Hook `useWildPlantsWithCoords` (filtro WHERE context=wild + lat/lng NOT NULL) + test unit (SPEC-R3, R8, AC5, AC10)

**Wave 2 — Integration (depends on Wave 1)**
- [x] 03.1-04-PLAN.md — Refactor `BottomTabBar` tabs computadas (useMemo + useContextCounts); dispatch `mp:pending-classification-resolved` en `useClassifyPlant` (SPEC-R1, AC1, AC2, AC3)
- [x] 03.1-05-PLAN.md — Factory `buildPlantPinIcon` + `FitBoundsOnMount` + `MapPage` shell + AppLayout `fullBleed` prop + route `/mapa` (SPEC-R2, R4, R5, AC4, AC5, AC6, AC11, AC12)

**Wave 3 — Sheet interaction (depends on Wave 2)**
- [x] 03.1-06-PLAN.md — `PlantMapSheet` (bottom sheet preview) + mount en MapPage (SPEC-R6, R7, AC7, AC8)

**Wave 4 — Tracking sweep (depends on Wave 3)**
- [x] 03.1-07-PLAN.md — Tracking PostHog completo: `map_pin_tapped` en MapPage + `map_navigated_to_detail` en sheet + `docs/posthog-events.md` § Phase 03.1

**Wave 5 — E2E gate (depends on Waves 2 + 3 + 4)**
- [x] 03.1-08-PLAN.md — E2E Playwright `e2e/map.spec.ts` (NOT tests/e2e/) happy path AC9 + AC1 tab visibility + AC12 tile failure (SPEC-AC1, AC4, AC5, AC7, AC8, AC9, AC11, AC12)

### Phase 4: Response Time Optimization
**Goal**: El usuario percibe el resultado de identificacion en ~3-5 segundos en lugar de ~14-25 segundos, gracias a streaming SSE y seleccion first-winner del modelo de IA
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

### Phase 04.1: My Plants Load Time Optimization (INSERTED)
**Goal**: La pantalla `/mis-plantas` (history) carga visiblemente más rápido en mobile — métrica concreta (p50/p90 antes/después) a definir en discuss-phase
**Depends on**: Phase 02.1 (la pantalla ya existe con context chips), Phase 4 (patrones de perf ya validados en la app)
**Requirements**: TBD (a derivar durante discuss-phase — hipótesis: imágenes pesadas sin lazy/thumbnails, query sin paginación, falta de skeleton, queries N+1)
**Success Criteria**: TBD (mínimo: time-to-first-content < 1.5s en 4G mobile, scroll suave a 60fps con 50+ items)
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 04.1 to break down)

### Phase 5: Identification Engine v2 — Pl@ntNet + 1 LLM (CANDIDATE)

**Status:** Candidate — NOT scheduled; pending Phase 3 + Phase 4 outcomes and benchmark data from Phase 2.

**Goal:** Separar las 2 tareas que hoy hacen los 3 LLMs a la vez. Usar Pl@ntNet (API especializada en identificación, state-of-the-art libre, free tier 500 req/día) para resolver "qué planta es", y un único LLM generalista para resolver "cómo se cuida + diagnóstico visual + watering_interval_days". Reducir de 3 llamadas LLM por identificación a 1 Pl@ntNet + 1 LLM.

**Depends on:** Phase 2 (benchmark con golden set debe estar corrido — necesitamos saber la línea base de accuracy del prompt-only 3-LLM antes de comparar)

**Requirements:** TBD — candidatos: nueva acc-01 (accuracy de identificación), nueva cost-01 (reducción de coste por identificación), reuso de PROM-01 (watering_interval_days sigue siendo número estructurado)

**Success Criteria** *(borrador, sujeto a discuss-phase):*
  1. La accuracy de identificación (PRIMARY metric del benchmark Phase 2) sube ≥10 puntos vs el baseline 3-LLM
  2. El coste medio por identificación baja ≥40% (1 Pl@ntNet + 1 LLM vs 3 LLMs)
  3. La latencia P95 percibida no empeora (Pl@ntNet ~1-2s + LLM ~2-3s en secuencia vs 3 LLMs ~3-5s en paralelo)
  4. El campo `watering_interval_days` sigue saliendo como `number | null` sin cambios de contrato hacia el cliente
  5. El diagnóstico de salud ("hojas amarillas...") sigue funcionando — el LLM sigue viendo la foto
  6. Hay un kill-switch (env var o config) para volver a 3-LLM si Pl@ntNet falla

**Plans:** TBD

**Key tradeoffs documentados** *(de la discusión 2026-05-17 con la dueña):*
- **Pro:** Pl@ntNet es especialista — entrenado con millones de fotos verificadas por expertos botánicos; supera a LLMs generalistas en accuracy de identificación de plantas, especialmente común-de-hogar.
- **Pro:** Coste — free tier 500 req/día cubre el inicio; paid es ~$30/mes por 5K req/día (muy por debajo del coste de 3 LLMs por identificación).
- **Pro:** El consensus actual deja de ser necesario (Pl@ntNet es de facto el experto), simplifica `consensus.ts` o lo retira del path de identificación.
- **Contra:** +1 proveedor externo (Pl@ntNet) → +1 API key, +1 billing, +1 SLA del cual depender.
- **Contra:** Cultivares ornamentales raros / plantas no-cultivadas pueden quedar peor cubiertos que con LLMs generalistas → mitigación: fallback a 1 LLM cuando Pl@ntNet `score < threshold`.
- **Contra:** Invalida el benchmark de Phase 2 (mide la arquitectura 3-LLM); habrá que re-benchmarkearlo o rediseñarlo para esta phase.
- **Contra:** Pl@ntNet no devuelve diagnóstico de salud ni nombre común en español → el LLM sigue siendo necesario para esas 2 piezas (de ahí "Pl@ntNet + 1 LLM", no "Pl@ntNet solo").

**Nota:** La idea surgió mientras la dueña preguntaba si Pl@ntNet podía usarse como ground-truth para el benchmark de Phase 2 (sí — y se usó para eso). El uso como ground-truth no implica el uso en producción; esta phase es la decisión separada de meter Pl@ntNet al runtime.

### Phase 6: Backfill imágenes históricas base64 → Storage (CANDIDATE)

**Status:** Candidate — NOT scheduled. Independiente de Phase 5; las dos pueden hacerse en cualquier orden.

**Goal:** Migrar las filas legacy de `plant_searches.image_url` que están como base64 data URIs a URLs HTTPS de Supabase Storage. Dejar 0 filas con `image_url LIKE 'data:%'` y todas con `image_url LIKE 'https://%supabase.co/storage/%'`.

**Depends on:** Nada urgente (Phase 1 Plan 01-03 ya migró el path de upload nuevo). Esta phase solo backfilléa el histórico.

**Requirements:** TBD — candidato: nueva `STOR-01` (backfill completo + ALTER pendiente).

**Success Criteria** *(borrador, sujeto a discuss-phase):*
  1. `SELECT COUNT(*) FROM plant_searches WHERE image_url LIKE 'data:%'` devuelve 0 al final del proceso.
  2. Las filas migradas mantienen la misma imagen perceptualmente (verificable con hash o por muestra visual de 10-15 filas).
  3. La columna `image_url` puede llevar un CHECK constraint `image_url IS NULL OR image_url LIKE 'https://%'` post-backfill para prevenir regresiones (defensa-en-profundidad — el edge function ya solo escribe URLs).
  4. Tamaño total de la columna `image_url` en `plant_searches` baja al menos 90% (verificable con `pg_total_relation_size` antes/después).
  5. El historial de la app (página de detalle, lista de plantas) sigue mostrando todas las fotos correctamente, sin URLs rotas.

**Plans:** TBD

**Hallazgo que motiva esta phase** *(detectado 2026-05-17 durante el bootstrap del golden set del Phase 2):*
- Al intentar samplear fotos de `model_evaluations + plant_searches` para alimentar el benchmark, la query `image_url LIKE 'https://%'` devolvió **0 filas**. Diagnóstico: las 124 filas existentes en producción tienen `image_url` como `data:image/jpeg;base64,...` inline.
- Phase 1 Plan 01-03 cambió el edge function para que **nuevas** identificaciones suban la imagen al bucket `plant-images` y guarden la URL HTTPS — pero **no backfilleó las filas existentes**, por diseño (riesgo en migración + estaban dentro de scope de "Capacitor blocker" no de "DB cleanup").
- Sin el backfill, conviven los 2 formatos indefinidamente; cualquier query/script/feature futuro tiene que manejar ambos.

**Tradeoffs y consideraciones:**
- **Riesgo OOM en Capacitor (Android):** abrir la página de detalle de una planta vieja carga ~1.5MB de base64 en memoria React + DOM. Multiplicado por scroll de historial, puede tirar la app en dispositivos modestos.
- **Coste de almacenamiento:** ~1.5MB por foto en base64 vs ~100 bytes de URL en Postgres. 124 filas ≈ 180MB de datos legacy en `plant_searches`. Supabase Free tier es 500MB DB / 1GB Storage; mover de DB a Storage es ~1500x más barato por byte.
- **Coste de export/backup:** los dumps SQL incluyen el base64; mueven gigas. Storage es metadata + blobs separados.
- **Costo de migración:** script Node que (1) selecciona filas con `data:`, (2) decodifica base64 a Buffer, (3) sube al bucket vía `supabase.storage.from('plant-images').upload(...)`, (4) actualiza `image_url` con la URL pública nueva. ~1-2h de implementación; ~10-30s de runtime real (124 uploads secuenciales).
- **Reversibilidad:** un backup completo de la tabla `plant_searches` antes del migrate, por si algún upload falla y queda inconsistente. El script debe ser idempotente (skip rows que ya son HTTPS).

**Por qué NO es urgente:**
- Solo hay 124 filas. La app funciona con ambos formatos hoy.
- Si Phase 3 (Calendar) o Phase 5 (Identification v2) llegan antes y exponen el problema (e.g., crash en Android al cargar historial), se promueve a "urgent".

**Por qué SÍ vale la pena hacerlo eventualmente:**
- Cada día que pasa, el ratio data:/https: empeora a favor de HTTPS porque las nuevas uploads van bien — pero las 124 viejas se quedan ahí. Es deuda técnica acotada que se cierra de una vez con un script ad-hoc.

**Nota:** Detectado mientras se construía el bootstrap del benchmark de Phase 2. El bootstrap se adaptó para soportar ambos formatos como workaround inmediato (commit `153e0a6`). Esta phase elimina la causa raíz.

### Phase candidate: Wild Field Journal (Hipótesis B del seed `context-aware-plant-detail`)
**Goal**: Para plantas clasificadas como silvestres (`context = 'wild'`), reemplazar los acordeones de cuidados/diagnóstico por una **ficha de descubrimiento** con campos botánicos útiles: familia, hábitat natural, época de floración, origen (nativa/exótica/invasora en España), comestible, tóxica. Estilo "cuaderno de naturalista".
**Depends on**: Phase 02.2 (Hipótesis A — pre-requisito mínimo), Phase 2 estabilizada (toca prompt + DB schema)
**Trigger condition**: Reactivar cuando Phase 02.2 esté en producción y haya feedback de usuarios pidiendo más info sobre descubrimientos. Coordinar con Phase 2 si se va a tocar el prompt (eficiencia de un solo sprint).
**Riesgos a evaluar**: la IA puede inventar datos críticos como toxicidad — requiere validación humana de un sample antes de mostrar a usuarios.
**Origen**: mockup de A vs B vía `/mockup` el 2026-05-20. Hipótesis A elegida como Phase 02.2 inmediata; B se difiere a este candidate.

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Android Native | 5/5 | Complete | - |
| 2. Prompt Optimization | 0/? | Not started | - |
| 02.1. Foundations | 7/7 | Complete    | 2026-05-15 |
| 3. Calendar v0 | 0/? | Not started | - |
| 03.1. Plant Map v0 | 8/8 | Complete    | 2026-05-17 |
| 4. Response Time Optimization | 2/2 | Complete | 2026-04-28 |
| 04.1. My Plants Load Time Optimization | 0/? | Not started | - |
| 5. Identification Engine v2 (Pl@ntNet + 1 LLM) | 0/? | Candidate | - |
| 6. Backfill base64 → Storage | 0/? | Candidate | - |

---

*Roadmap creado: 2026-04-22*
