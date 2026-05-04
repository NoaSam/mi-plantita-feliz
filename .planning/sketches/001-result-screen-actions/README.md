---
sketch: 001
name: result-screen-actions
question: "¿Cómo se presentan las 2 acciones de clasificación (Mis plantas / Descubrimiento) en la pantalla de resultado, sobre el design system existente?"
winner: "A"
tags: [phase-02.1, foundations, classification, result-screen]
---

# Sketch 001 · Result screen — acciones de clasificación

## Pregunta de diseño

Tras una identificación exitosa, el usuario decide qué hacer con la planta: añadirla a su jardín de casa o guardarla como descubrimiento exterior. **¿Cómo se presentan estas 2 acciones binarias dentro de la pantalla de resultado?**

Restricciones (no negociables):
- Mobile-first (target ~414px de ancho)
- 2 acciones, no 3 — la tercera "no-acción" es cerrar/navegar fuera (queda como `unclassified`)
- Aplicar el design system existente: Fraunces serif + Outfit sans, paleta cream/oliva/coral, esquinas 1rem, sombra `4px 4px 0px` plana sticker
- Coexisten con el accordion existente de "Qué es / Cómo cuidarla / Qué le pasa"

## Cómo verlo

```
open .planning/sketches/001-result-screen-actions/index.html
```

Cambia entre variantes con los botones del toolbar (sticky arriba) o con las teclas **1/2/3** o **A/B/C**.

## Variantes

- **A: Pedagógica vertical** — 2 cards apiladas full-width con icono + título + descripción + chevron. La descripción comunica la consecuencia ("aparecerá en tu jardín con su frecuencia de riego"). Path of least resistance del shadcn-style. Más vertical scroll, mensaje claro.

- **B: Compactas en horizontal** — 2 botones lado a lado a 50% width, solo icono + título centrados. Sin descripción. Más compacto, menos verbal. Asume que el modelo se entiende sin explicación.

- **C: Contraste por color** — Cards apiladas como en A, pero la primera ("Mis plantas") usa fondo verde primary sólido y la segunda ("Descubrimiento") usa fondo coral accent sólido. Subtitle reducido a 3 palabras. El color hace el trabajo de diferenciar los dos modos.

## Qué mirar al comparar

1. **Claridad para usuarios primerizos:** ¿la variante explica suficientemente la consecuencia de cada acción, o el usuario tiene que adivinar qué pasará?
2. **Peso visual relativo a la accordion:** ¿las acciones se sienten como la decisión principal de la pantalla, o compiten/pierden frente a "Qué es / Cómo cuidarla / Qué le pasa"?
3. **Coherencia con el design system:** ¿se siente parte del lenguaje sticker/neo-brutalist suave existente?
4. **Equidad entre las 2 opciones:** ¿una se siente como "la opción correcta" y la otra como "la alternativa"? ¿O ambas se sienten como decisiones igual de válidas?
5. **Tono:** ¿el copy del eyebrow ("¿Qué hacemos con esta planta?" vs "Guardar como") se siente del producto?

## Variantes que NO incluí (y por qué)

- Modal/bottom sheet flotante: añade fricción y oculta el resultado. Mejor inline.
- Toggle/segmented control: implica que es un setting que persiste; aquí cada planta decide independientemente.
- Botón único "Guardar" + selector después: son 2 pantallas para una decisión que cabe en 1.

## Decisiones que podrían surgir y exceder este sketch

- ¿Cuál es el feedback tras tocar una de las acciones? (toast, transición, navegación a la home)
- ¿Aparece algún cambio visual cuando ya está clasificada? (estado "ya guardada en jardín")
- ¿Cómo se presenta esto cuando el usuario entra al detalle de una planta vieja `unclassified` desde el historial? (eso es **Sketch 003**)
