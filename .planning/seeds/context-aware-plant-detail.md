---
title: Detalle de planta consciente del contexto (home vs wild)
trigger_condition: Cuando se vaya a hacer Phase 3 (Calendar v0) o antes si el feedback de usuarios señala que el detalle de un descubrimiento muestra cuidados irrelevantes
planted_date: 2026-05-17
type: ux-gap-seed
related_phase: 02.1 (introdujo la columna `context` pero no la propagó al PlantResultView)
status: decided-2026-05-20
decision: "Hipótesis A → próximo phase (Phase 02.2). Hipótesis B → Phase candidate en roadmap (futuro). Decisión tomada tras revisar mockups vía /mockup."
---

# Detalle de planta consciente del contexto

## El problema

Phase 02.1 introdujo `context = 'home' | 'wild' | 'unclassified'` en `plant_searches` y permitió clasificar plantas en el resultado, en el historial y en la sección "Sin clasificar". Pero el componente compartido `PlantResultView` (que se renderiza en `Index` post-identify, en `History`, en `PlantDetail` y desde el pin del mapa vía sheet → "Ver detalle") **muestra el mismo contenido para los 3 contextos**:

- Acordeón **"Qué es"** (descripción)
- Acordeón **"Cómo cuidarla"** (cuidados — riego, luz, sustrato, abono)
- Acordeón **"Qué le pasa"** (diagnóstico visual de enfermedades)

Para un usuario que pulsa un pin del mapa y entra al detalle, los acordeones de cuidados y diagnóstico **son ruido**: no va a regar ni curar una planta silvestre que vio una vez. El uso del flujo wild es "**quiero saber qué es esto**", no "quiero cuidarla".

## Quién lo siente

- Usuario que abre `/planta/:id` desde un pin del mapa (`wild`) → ve cuidados irrelevantes
- (No aplica a `home`) → ahí los 3 acordeones son útiles
- (No aplica a `unclassified`) → ahí el usuario todavía no decidió, mostrarle los 3 le ayuda a decidir

## Decisión (2026-05-20)

Tras mockup de A vs B vía `/mockup`:
- **Hipótesis A ✅ ELEGIDA** → próxima fase a planificar (Phase 02.2). Cambio mínimo, sin riesgo de regresión, resuelve el ruido inmediato.
- **Hipótesis B 📋 ROADMAP** → movida a Phase candidate (futuro). Interesante pero scope grande y dependiente de Phase 2 (prompt optimization) estabilizado.
- Hipótesis C y D no se evaluaron en esta ronda.

Próximo paso: `/gsd-plan-phase` para crear Phase 02.2.

## Hipótesis de solución (sin lock — pensar mejor)

### Hipótesis A — Ocultar los 2 acordeones irrelevantes para `wild`

Cambio mínimo: en `PlantResultView`, si la planta tiene `context = 'wild'`, no renderizar los acordeones `care` y `diagnosis`. La IA sigue devolviendo esos campos (la data es la misma), solo cambia el render.

**Pro:** trivial, sin tocar la edge function ni el prompt. ~30 LOC.
**Contra:** el `/planta/:id` de un wild queda muy escueto (solo descripción). Quizá demasiado.

### Hipótesis B — Añadir campos wild-relevantes al prompt

Pedirle a la IA campos que sí importan en wild: `family`, `habitat_natural`, `flowering_season`, `is_edible`, `is_toxic`, `is_native_or_invasive` (en España). Renderizar esos en lugar de care/diagnosis cuando `context = 'wild'`.

**Pro:** el detalle wild se siente útil y rico ("descubriste algo y aprendiste sobre ello").
**Contra:** scope mucho mayor — cambia el prompt (riesgo de regresión en home), cambia el schema de DB, cambia consensus.ts, requiere validación nueva.

### Hipótesis C — Ocultar acordeones Y mostrar contexto wild-específico ya disponible

Sin pedirle nada nuevo a la IA: si es wild, mostrar foto grande + nombre + descripción + un bloque "**Descubierto el [fecha] en [ubicación si lat/lng]**" + (si lat/lng) un **mini-mapa** con el pin (~120px de alto). Como un "registro de campo" tipo cuaderno de naturalista.

**Pro:** scope medio. Reutiliza Leaflet ya instalado (Phase 03.1). Vibe "descubrimiento" coherente con el sticker pin del mapa.
**Contra:** requiere mini-mapa nuevo + algún componente "field journal" + lógica condicional en PlantResultView.

### Hipótesis D — Ofrecer "convertir a Mi jardín"

CTA "Tengo esta planta en casa, añádela a mi jardín". Es re-classify a `home` (ya existe vía `useClassifyPlant.classify`). Cambia el contexto y, automáticamente, los acordeones de cuidados aparecen.

**Pro:** los acordeones se "desbloquean" por una acción del usuario consciente. Sin lógica de hide/show condicional — la regla es simple ("home = los 3 acordeones, wild = sin los 2").
**Contra:** solo resuelve un sub-caso ("el descubrimiento se transformó en planta de casa"). El caso "descubrí una planta y solo quiero saber su nombre" sigue viendo cuidados irrelevantes.

## Preguntas abiertas antes de comprometer phase

1. ¿Qué porcentaje de los detalles vistos vienen de un pin del mapa vs desde el historial? Si <10%, prioridad baja; si >40%, prioridad alta. Métrica disponible via PostHog (`map_navigated_to_detail` count vs total `pageview` de `/planta/:id`).
2. ¿La IA puede dar realmente buena info sobre toxicidad / hábitat / floración? Algunas especies son raras y la respuesta sería "no sé". Hay que evaluar antes de prometer.
3. ¿Una persona descubre una planta y MÁS TARDE la encuentra en su casa? (caso poco común pero real para hierbas medicinales, suculentas que se pueden reproducir). La hipótesis D lo cubriría.
4. ¿Esto debe estar en Phase 3 (Calendar v0) o en una phase propia tipo `02.2: Context-aware PlantDetail`?
5. ¿Hay tensión con Phase 2 (Prompt Optimization)? Si Phase 2 va a tocar el prompt para `watering_interval_days`, podría aprovecharse para añadir `is_edible/is_toxic` etc. Pero entonces el scope de Phase 2 crece.

## Cuándo retomarlo

Reactivar este seed cuando se cumpla una de estas:
1. **Antes de empezar Phase 3 (Calendar v0)** — porque Phase 3 va a tocar PlantResultView/PlantDetail para introducir lo de "Mi jardín" y la frecuencia de riego, momento natural para refactor contextual.
2. **Antes que Phase 3** si llega feedback explícito de usuarios diciendo "vi un descubrimiento y la app me decía cómo regarlo, qué raro".
3. **Inmediatamente** si Phase 2 (Prompt Optimization) decide ampliar el prompt — coordinar para añadir los campos wild-relevantes en el mismo sprint del prompt, no en dos iteraciones.

## Forma posible cuando llegue el momento

Probable estructura:
- 1 plan para hide-conditional de acordeones (hipótesis A — base mínima)
- 1 plan opcional para añadir el mini-mapa de descubrimiento (hipótesis C)
- 1 plan opcional para el CTA "convertir a Mi jardín" (hipótesis D — pequeño, ya existe `useClassifyPlant`)
- Decisión sobre hipótesis B (campos nuevos al prompt) depende de si Phase 2 lo absorbe

No comprometerse a hipótesis B hasta que Phase 2 esté ejecutándose o terminada.

## Referencias

- `src/components/PlantResultView.tsx` — componente afectado
- `src/pages/PlantDetail.tsx` — usa PlantResultView
- `src/pages/MapPage.tsx` + `src/components/PlantMapSheet.tsx` — Phase 03.1, abren PlantDetail desde el mapa
- `.planning/phases/02.1-foundations-classification-result-actions-reveal/02.1-CONTEXT.md` — origen del concepto `context`
- `.planning/notes/re-encuadre-dual-mode-decision.md` — racional del dual-mode home/wild
