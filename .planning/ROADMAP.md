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
- [x] **Phase 3: Calendar v0** — Lista minima de "Mis plantas" con frecuencia de riego sugerida, condicional al modo casa (completed 2026-05-28, Android v1.1.0 / versionCode 4 publicada en internal testing)
- [x] **Phase 03.1: Plant Map v0** — Mapa con pins de descubrimientos geolocalizados, condicional al modo explorador (completed 2026-05-17)
- [x] **Phase 4: Response Time Optimization** — Reducir latencia percibida del analisis de plantas
- [x] **Phase 04.1: Mobile Load Time Optimization** — Acelerar el tiempo de carga de las 3 pantallas de listado: `/mis-plantas`, `/regar`, `/mapa` (completed 2026-08-12)
- [ ] **Phase 5: PlantNet as Fourth Voter (Cross-Validated)** — Añadir PlantNet como 4º proveedor votante activo con regla de cross-validation (D-01): cuando su score ≥ 0.8 y algún LLM coincide con su científico, PlantNet manda el nombre científico y el LLM alineado aporta cuidados. Cuando ningún LLM coincide, se registra divergencia (DB flag + PostHog event). UX visible al usuario: cero cambios (D-02). Reshape 2026-08-18 tras benchmark que desmintió preocupación de latencia (PlantNet p50=307ms, gana race 10/10).
- [ ] **Phase 5.1: Identification Engine v2 — Pl@ntNet gana voto (o reemplaza LLMs)** *(candidate)* — Basándose en datos de Phase 5, decidir si (a) dar voto real a PlantNet en el consenso con threshold de score, (b) reducir a Pl@ntNet + 1 LLM (visión original), o (c) descartar. Trigger: >10 puntos de diferencia sostenida en top-1 accuracy vs LLMs.
- [x] **Phase 6: Backfill imágenes históricas base64 → Storage** — **Folded into Phase 04.1** (backfill executed 2026-08-12 via `npm run backfill:images`; ~98 rows migrated). Kept as historical reference; the goal was fulfilled by Plan 04.1-01.

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
**Plans:** 1/5 plans executed

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

### Phase 04.1: Mobile Load Time Optimization (INSERTED)
**Goal**: Las 3 pantallas de listado (`/mis-plantas`, `/regar`, `/mapa`) cargan visiblemente más rápido en mobile — métrica concreta (p50/p90 antes/después) a definir en discuss-phase.
**Depends on**: Phase 02.1 (`/mis-plantas` con context chips), Phase 3 (`/regar`), Phase 03.1 (`/mapa`), Phase 4 (patrones de perf ya validados en la edge function)
**Reported by CPO 2026-08-12**: "tarda mucho en cargar" en las 3 pantallas. Alcance ampliado desde el scope original que era solo `/mis-plantas`. Es feedback subjetivo — la primera tarea de discuss-phase será medir para tener números reales.
**Requirements**: TBD (a derivar durante discuss-phase). Hipótesis iniciales:
  - `/mis-plantas`: imágenes pesadas sin lazy/thumbnails (probable causa dominante — muchas filas legacy son base64 de ~1.5MB), query sin paginación, no hay skeleton
  - `/regar`: mismo problema de imágenes casa; sort + status compute en cliente sobre lista completa; sin virtualization
  - `/mapa`: leaflet + tile fetch bloqueante; pins renderizan solo tras query completa; sin skeleton mientras cargan tiles
  - Denominador común: fotos legacy en base64 inline (Phase 6 backfill mitigaría raíz)
**Success Criteria**: TBD (mínimo por pantalla: time-to-first-content < 1.5s en 4G mobile; scroll suave a 60fps con 50+ items en `/mis-plantas` y `/regar`; `/mapa` render de pins < 2s)
**Plans:** 4/4 plans executed

Plans:
- [x] 04.1-01-PLAN.md — Backfill legacy base64 images to Supabase Storage (CPO manual execution per D-05, BLOCKING wave 1)
- [x] 04.1-02-PLAN.md — Thumbnail URL helper + `<img>` lazy/decoding/width/height + preconnect hints (wave 2)
- [x] 04.1-03-PLAN.md — `perf_screen_loaded` PostHog event + `usePerfScreenLoaded` hook wired into 3 pages (wave 3)
- [x] 04.1-04-PLAN.md — VERIFICATION.md checklist + ROADMAP updates + CPO manual go/no-go checkpoint (wave 4)

**Consideraciones de orden**:
- Puede tener sentido hacer Phase 6 (backfill base64) ANTES si la mayor parte del peso viene de esas fotos legacy — se convertiría en el primer plan de esta phase.
- Alternativa: dividir en 3 phases (04.1a, 04.1b, 04.1c) si en discuss-phase se ve que las causas divergen mucho.

### Phase 5: PlantNet as Fourth Identification Provider

**Status:** Context gathered 2026-08-15 — ready for planning.
**Directory:** `.planning/phases/05-plantnet-fourth-provider/`
**Context:** [05-CONTEXT.md](phases/05-plantnet-fourth-provider/05-CONTEXT.md)

**Goal:** Añadir PlantNet como 4º proveedor en paralelo con los 3 LLMs actuales (Claude Sonnet 4, Gemini 2.5 Flash Lite, GPT-4o) en `supabase/functions/identify-plant/`. PlantNet corre como **observador silencioso**: se guarda su JSON completo, se extiende `docs/model-evaluation-queries.sql` para comparar accuracy top-1 vs LLMs sobre el golden set de Phase 2, pero NO influye en el consenso ni en lo que ve el usuario.

**Depends on:** Nada bloqueante. Phase 2 ya entregó el golden set + benchmark infra que se reutilizan.

**Requirements:** Derivar durante planning. Candidatos:
- Nueva PLANT-01: PlantNet responde en paralelo con los 3 LLMs y su respuesta JSON completa se persiste en `model_evaluations`
- Nueva PLANT-02: `docs/model-evaluation-queries.sql` tiene sección nueva de queries comparativas PlantNet vs LLMs
- Nueva PLANT-03: la latencia P95 percibida por el usuario NO empeora (Promise.race first-winner sigue devolviendo el primer LLM ganador; PlantNet completa en paralelo sin bloquear)

**Success Criteria:**
  1. PlantNet responde y su JSON completo se guarda en `model_evaluations` (o schema equivalente) para ≥95% de identificaciones nuevas
  2. `docs/model-evaluation-queries.sql` incluye queries nuevas para: success rate PlantNet vs LLMs, top-1 accuracy PlantNet contra golden set, latencia comparada, casos de divergencia PlantNet vs winner LLM
  3. El flujo visible al usuario es idéntico a antes de la fase (cero cambios de UX, cero regresiones en tests existentes)
  4. La latencia P95 no empeora vs baseline actual
  5. Existe la primera pasada de análisis: la CPO corre las queries SQL contra datos reales/golden set y anota conclusiones preliminares sobre si Phase 5.1 tiene sentido

**Plans:** 5 plans (planned 2026-08-18 post-reshape)

Plans:

**Wave 1 — Schema foundation**
- [ ] 05-01-PLAN.md — [BLOCKING] Migración `20260818000000_extend_model_evaluations_for_plantnet.sql` (widen CHECK model 3→4 + add raw_response jsonb + add plant_searches.plantnet_diverged bool) + `supabase db push` + regenerate types + CPO registra PLANTNET_API_KEY secret

**Wave 1 (paralelo con 05-01) — Cross-validation logic**
- [ ] 05-02-PLAN.md — Extraer `matchScientific` como función pública en `consensus.ts` + añadir `applyPlantnetOverride(llmWinner, llmResults, plantnetResult)` implementando D-01/D-10/D-11 + tests unitarios exhaustivos (4 branches, threshold 0.8, rechazo de genus). `pickWinner` INTACTO.

**Wave 2 — Integration + docs (paralelo, blocked on Wave 1)**
- [ ] 05-03-PLAN.md — Extender `identify-plant/index.ts` con `callPlantnetTimed` + 4ª promesa `Promise.allSettled` + split llmResults/plantnetResult + integración `applyPlantnetOverride` + 4ª fila insert con raw_response + flag `plant_searches.plantnet_diverged` en divergencia + dispatch server-side evento PostHog `plantnet_divergence` + deploy + smoke test manual (D-01/D-02/D-09/D-10/D-11/D-12/D-13, PLANT-01, PLANT-03)
- [ ] 05-04-PLAN.md — Extender `docs/model-evaluation-queries.sql` con sección PHASE 5 (1 query de divergencia + 1 snapshot agregado) + documentar evento `plantnet_divergence` en `docs/posthog-events.md` (PLANT-02)

**Wave 3 — Verification + CPO sign-off**
- [ ] 05-05-PLAN.md — VERIFICATION.md checklist (6 bloques: A cobertura datos, B cross-validation funciona, C divergencia registrada, D UX invisible, E latencia, F regresión) + CPO manual sign-off + actualizar ROADMAP/REQUIREMENTS/STATE


**Key tradeoffs (post-reshape 2026-08-15):**
- **Pro:** Cero riesgo de regresión — misma arquitectura, un proveedor más. Los 3 LLMs siguen decidiendo el output.
- **Pro:** Coste marginal bajo — free tier PlantNet (500/día) cubre el volumen actual (~15-30 identificaciones/día).
- **Pro:** Reutiliza patrón existente de `model_evaluations` + `docs/model-evaluation-queries.sql`.
- **Pro:** Genera datos reales para decidir Phase 5.1 (dar voto real a PlantNet) o Phase 5.2 (reemplazo total) con evidencia.
- **Contra:** +1 proveedor externo → +1 API key, +1 SLA a monitorizar (mitigado por failure silencioso: PlantNet cae → guarda null y sigue el flujo).
- **Contra:** No reduce coste ni simplifica arquitectura (esos objetivos se posponen a Phase 5.1/5.2 con datos).

**Reshape note (2026-08-15):** El scope original de Phase 5 era reemplazar 3 LLMs por Pl@ntNet + 1 LLM. La CPO decidió en discuss-phase priorizar **medir antes de reemplazar**: primero añadir PlantNet como observador silencioso y recopilar datos comparativos vía SQL queries documentadas. La visión original queda como Phase 5.1 candidate (voto real) o Phase 5.2 candidate (reemplazo total), decidida en función de los datos.

### Phase 6: Backfill imágenes históricas base64 → Storage (CANDIDATE)

**Status:** **FOLDED INTO Phase 04.1** (executed 2026-08-12 via `npm run backfill:images`, plan 04.1-01; ~98 rows migrated, 0 failed). This section is preserved as historical context (rationale, tradeoffs, findings) that motivated the work — the actual execution and success criteria were absorbed into Phase 04.1's plan 01.

**Absorbed by:** [.planning/phases/04.1-mobile-load-time-optimization/04.1-01-PLAN.md](phases/04.1-mobile-load-time-optimization/04.1-01-PLAN.md)


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
| 3. Calendar v0 | 5/5 | Complete    | 2026-05-28 |
| 03.1. Plant Map v0 | 8/8 | Complete    | 2026-05-17 |
| 4. Response Time Optimization | 2/2 | Complete | 2026-04-28 |
| 04.1. My Plants Load Time Optimization | 4/4 | Complete | 2026-08-12 |
| 5. PlantNet as Fourth Voter (Cross-Validated) | 0/5 | Ready to execute | - |
| 5.1. Identification Engine v2 — voto real / reemplazo | 0/? | Candidate (post-Phase 5 data) | - |
| 6. Backfill base64 → Storage | — | Folded into 04.1 | 2026-08-12 |

---

*Roadmap creado: 2026-04-22*
