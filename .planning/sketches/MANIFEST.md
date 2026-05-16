# Sketch Manifest — Mi Plantita Feliz

## Design Direction

App de identificación de plantas con personalidad: cálida, orgánica, cercana. **Estilo sticker / neo-brutalist suave** — bordes definidos, esquinas muy redondeadas (1rem), sombra dura plana (`4px 4px 0px` en verde oliva oscuro). Tipografía expresiva: Fraunces serif (display) + Outfit sans (body). Paleta cream cálido + verde oliva profundo + coral. NO sombras difusas, NO el típico aspecto "AI generic" de neutros grises.

El design system está implementado en `tailwind.config.ts` + `src/index.css`, y el componente `PlantResultView.tsx` es la referencia canónica. Los sketches **deben aplicar este sistema**, no inventar dirección estética.

## Reference Points

- **Design system propio del proyecto** — `src/index.css` define los tokens; el resto deriva.
- **Apps con vibe parecido (no copiar, solo notar):** Notion (densidad cálida), Things (rigor orgánico), Stripe Press (tipografía con personalidad).

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | result-screen-actions | ¿Cómo se presentan las 2 acciones de clasificación (Mis plantas / Descubrimiento) en la pantalla de resultado? | **A · Pedagógica vertical** — cards apiladas con icono + título + descripción que comunica la consecuencia | phase-02.1, foundations, classification, result-screen |
| 002 | post-classification-states | ¿Cómo se ve el feedback inmediato + el estado persistente tras tocar una de las 2 acciones? | **C · Inline morph** — la card pulsada se transforma en sitio en una card primary verde con ✓ + Deshacer; sin overlay flotante. Tras 5s colapsa al banner pequeño "Está en tu jardín · Cambiar". | phase-02.1, foundations, classification, post-tap, no-toast, inline-morph |
| 003 | reveal-and-history-classification | ¿Cómo se entera un usuario existente de las novedades, y cómo clasifica su historial sin sentirse forzado? | **D · Síntesis** — sección home condicional (count > 0, logged-in only) + ficha conserva info original + chips en historial + wall login para anónimos solo desde resultado de identificación | phase-02.1, foundations, reveal, history, classification, anon-wall |
| 004 | plant-map-v0 | ¿Cómo se ve /mapa de extremo a extremo (tab bar + tiles + pins + sheet) cross-platform Android+iOS PWA? | **A · Emoji 🌿 + foto 4:3 stacked** — UI-SPEC tal como lockeado: pin emoji sticker, sheet con foto 4:3 + CTAs apilados full-width, sin eyebrow chip. Sin empty state (si no hay descubrimientos no hay tab). | phase-03.1, map, leaflet, pin, bottom-sheet, tab-bar |

## Pending

- **005 · reclassify-from-detail** *(antes 004 — renombrado)* — *probablemente innecesario*: la pantalla 3 de la variante D del sketch 003 ya cubre el patrón de re-clasificación desde detalle. Reevaluar al planificar Phase 02.1.
