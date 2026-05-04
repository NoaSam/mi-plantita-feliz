---
sketch: 002
name: post-classification-states
question: "¿Cómo se ve el feedback inmediato + el estado persistente tras tocar una de las 2 acciones de clasificación?"
winner: "C"
tags: [phase-02.1, foundations, classification, post-tap, toast, banner]
---

# Sketch 002 · Result screen — estados post-clasificación

## Pregunta de diseño

El sketch 001 ya tiene ganador (cards apiladas pedagógicas). Ahora la pregunta es **qué pasa después de tocar uno de los 2 botones**.

Decisión de comportamiento (cerrada en conversación previa):
- El usuario **se queda en la pantalla del resultado** (no navega).
- Hay **feedback inmediato + posibilidad de deshacer**.
- Hay **estado persistente** que comunica "ya clasificada" cuando el usuario vuelve a esta pantalla más tarde.

Lo que sigue abierto: **¿cómo se materializan visualmente** el feedback inmediato (toast / inline morph) y el estado persistente (banner ancho / chip pill).

## Cómo verlo

```
open -a Safari .planning/sketches/002-post-classification-states/index.html
```

Cambia entre variantes con los botones del toolbar o las teclas **1 / 2 / 3**.

Cada variante muestra **3 mini-pantallas en horizontal** (en pantallas anchas) o apiladas (en pantallas estrechas), una por estado:

1. **Sin clasificar** — el punto de partida con los 2 botones (igual que sketch 001).
2. **Recién clasificada** — el momento justo después de tocar "Añadir a mis plantas". Toast visible + estado persistente ya pintado.
3. **Ya clasificada** — el usuario vuelve a esta pantalla más tarde (desde el historial). Solo queda el estado persistente.

## Variantes

- **A: Toast oscuro arriba + banner cream**
  Toast slide-down con fondo verde foreground profundo, ✓ en círculo coral, "Deshacer" en coral subrayado. Donde estaban los 2 botones, queda un banner full-width cream con "🪴 Está en tu jardín · Cambiar" — borde y sombra sticker. Patrón estándar tipo Gmail/Things.

- **B: Toast coral abajo + chip arriba**
  Toast slide-up con fondo accent coral, copy más festivo ("¡Añadida a tu jardín!"). El estado persistente es un **chip-pill** pequeño "🪴 En tu jardín · Cambiar" — ocupa menos espacio vertical, más sutil. Aprovecha el coral del system para el momento de éxito.

- **C: Inline morph, sin toast**
  No hay toast flotante. La card pulsada se **transforma en sitio** en una card primary green con ✓ + "Añadida a tu jardín" + "Deshacer" inline. La otra card se atenúa. Tras 5 segundos sin deshacer, las 2 cards colapsan a un banner pequeño "Está en tu jardín · Cambiar". Sin overlay sobre el contenido.

## Qué mirar al comparar

1. **El momento de la clasificación se siente celebratorio o transaccional?** A es transaccional (Gmail-like), B es celebratorio (coral), C es físico (la card que tocaste se transforma).
2. **El estado persistente comunica claramente** "esto está en tu jardín" sin ocupar demasiado espacio?
3. **¿"Deshacer" se entiende a primera vista?** Más visible en A y B (en el toast), más implícito en C.
4. **Coherencia con el lenguaje sticker/neo-brutalist** del sistema.
5. **El "Cambiar" del banner** se siente como un affordance claro, no escondido.

## "No hacer nada" es un camino válido

La clasificación es una **invitación opcional**, no un paso obligatorio del flujo. El usuario puede:

- Hacer scroll y leer "Qué es / Cómo cuidarla / Qué le pasa" sin tocar las 2 cards → la planta queda `unclassified`.
- Tocar el botón de back → igual, queda `unclassified`.
- Volver a la pantalla más tarde desde el historial y clasificar entonces (esto será **Sketch 004**).

Esto encaja con la filosofía C ("la acción crea el modo"): la inacción simplemente no crea modo, y eso es válido. **No hay gate, no hay modal bloqueante, no hay nudge insistente** dentro del result screen. El único nudge para usuarios existentes con muchas plantas sin clasificar vive en otro sitio (el reveal banner — Sketch 003).

## Detalles de comportamiento (compartidos por todas las variantes)

- **Duración del toast (A y B):** 5–7 segundos. Después se desvanece. El banner inferior queda permanente.
- **"Deshacer":** revierte la clasificación. La planta vuelve a `unclassified`. Los 2 botones aparecen de nuevo.
- **"Cambiar":** abre las 2 opciones de nuevo (probablemente como un selector simple o el modo de los 2 botones de vuelta).
- **Comportamiento simétrico:** este sketch muestra la ruta "Añadir a mis plantas". La ruta "Guardar descubrimiento" es **simétrica** — mismo patrón, mismo timing, distinto icono (📍) y copy ("Guardada como descubrimiento" / "En tu mapa").

## Variantes que NO incluí

- **Modal de confirmación:** descartado en la conversación previa (fricción innecesaria).
- **Navegación inmediata a la home:** descartado (saca al usuario del flujo de leer info de la planta).
- **Sin ningún feedback:** descartado (el usuario no sabe si funcionó).

## Decisiones que excederían este sketch

- **Animaciones reales** (slide-down/up, morph): aquí solo CSS estático con un keyframe entry. La animación final usa Framer Motion en el código real (ya está en el proyecto).
- **Comportamiento offline:** ¿qué pasa si la clasificación falla por red? No se aborda aquí.
- **Re-clasificación desde detalle del historial:** el "Estado 3" lo insinúa, pero el flujo completo de "abro mi historial y clasifico una planta vieja" es **Sketch 003**.
