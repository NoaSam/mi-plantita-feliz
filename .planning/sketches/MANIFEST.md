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

## Pending

- **002 · reveal-banner** — ¿Cómo entra el aviso a usuarios existentes en primera apertura post-update sin ser intrusivo?
- **003 · reclassify-from-detail** — ¿Cómo reaparecen las acciones cuando entras al detalle de una planta vieja con `context = 'unclassified'`?
