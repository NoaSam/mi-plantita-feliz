---
sketch: 003
name: reveal-and-history-classification
question: "¿Cómo se entera un usuario existente de las novedades, y cómo clasifica su historial sin sentirse forzado?"
winner: "D"
tags: [phase-02.1, foundations, reveal, history, classification, banner]
---

# Sketch 003 · Reveal + clasificación del historial

## Pregunta de diseño

Tras el release de Phase 02.1, los usuarios existentes abren la app con N identificaciones en historial, todas con `context = 'unclassified'`. Sin un mecanismo de reveal, las features nuevas (calendario, mapa) **no se descubren ni se llenan nunca**.

La pregunta combina dos cosas inseparables:
- **¿Cómo se les comunica que hay algo nuevo?** (reveal)
- **¿Por qué camino clasifican lo que ya tienen?** (history classification)

Cada variante propone una filosofía completa, no solo un componente.

## Cómo verlo

```
open -a Safari .planning/sketches/003-reveal-and-history-classification/index.html
```

Cambia variantes con los botones del toolbar o las teclas **1 / 2 / 3**.
Cada variante muestra **2 pantallas en horizontal** (o apiladas en pantallas estrechas) que cuentan el flujo: estado inicial → estado tras la acción del usuario.

## Variantes

### A · Sección sticky en home
**Filosofía:** zero interrupción, descubrimiento ambiental.

- Sin banner flotante, sin modal.
- La home gana una nueva sección "Sin clasificar (23)" debajo del CTA de cámara: 4 thumbnails + "Ver todas".
- Toca un thumbnail → vas al detalle de esa planta y clasificas con el patrón del sketch 002C (la card morphs).
- La sección **persiste** hasta que el conteo llegue a 0 (o el usuario la oculte desde Settings — opcional para v1+).
- El conteo se actualiza solo conforme va clasificando.

✓ Cero fricción · ✓ Discoverable y persistente · ! Asume que el usuario hace scroll en la home

### B · Banner reveal + bulk flow guiado
**Filosofía:** invitar una vez, ofrecer camino claro.

- Banner cream con sticker shadow aparece al tope de la home en la primera apertura post-update.
- Copy: "Novedad: organiza tus plantas. Tienes 23 sin clasificar." + CTA "Empezar" + "Más tarde" + X para cerrar.
- Tap "Empezar" → flow dedicado fullscreen: progress bar (3 / 23), foto de la planta, nombre, las 2 cards del sketch 001A. "Saltar esta · Hacerlo más tarde" abajo.
- "× cerrar" del flow → vuelves a la home, el banner se queda hasta que cierres con la X superior.
- Una vez cerrado el banner: clasificación lazy desde el detalle (idéntica al sketch 004 pendiente).

✓ Camino guiado · ✓ Una sola vez · ! Más fricción si el usuario solo quería identificar una planta nueva y largarse

### C · Modal único + clasificación lazy
**Filosofía:** explicar una vez, luego invisible.

- Bottom sheet en la primera apertura post-update. Una sola pantalla con 2 pills ilustrativas (🪴 Mi jardín / 📍 Descubrimientos) + título + 2 frases + CTA "Entendido" + nota pequeña "Tienes 23 plantas en tu historial sin clasificar".
- Tras tap "Entendido": la home queda exactamente como siempre. Sin banner, sin sección, sin nudge.
- Para clasificar el historial, el usuario va a "Historial" y abre cada planta una a una desde su detalle (eso es el sketch 004).

✓ Más respetuoso del scroll · ✓ Modal una vez y se acabó · ! Riesgo: usuarios que no exploran su historial nunca descubren calendario ni mapa

## Qué mirar al comparar

1. **¿Cuánto pesa la novedad sobre el "abrir la app rápido y sacar foto"?** A es invisible al primer scroll, B se planta arriba, C bloquea.
2. **¿Qué nivel de discovery garantiza?** C asume que el usuario lee el modal y recuerda. A confía en que volverá a la home y verá la sección. B fuerza una decisión inmediata.
3. **¿Cómo se siente el tono?** ¿Festivo (B), respetuoso (C), o ambiental (A)?
4. **El conteo "23 sin clasificar":** ¿debe ser visible siempre (A), una sola vez (B/C), o no visible nunca explícitamente?
5. **Coherencia con la filosofía C:** "el usuario no tiene que hacer nada". ¿Qué variante respeta más esa libertad?

## Variante D — Síntesis ganadora (refined A)

**Filosofía:** A enriquecida con visibilidad condicional, multi-entrada y tratamiento explícito del usuario anónimo.

### Reglas de visibilidad

| Caso | Sección home | Historial | Cards en ficha | Tap en cards |
|---|---|---|---|---|
| Logged-in, count > 0 | ✅ visible con count | ✅ con chips por estado | ✅ visibles si `unclassified` | Clasifica directo |
| Logged-in, count = 0 | ❌ oculta (no empty state) | ✅ todo con chip | N/A o banner persistente "Está en tu jardín · Cambiar" | Cambiar contexto |
| Anónimo | ❌ oculta siempre | ❌ no existe | ✅ solo en resultado de identificación recién hecha | Wall login/registro |

### Refinamientos clave sobre la A original

1. **La sección "Sin clasificar" solo aparece cuando hay elementos.** Si el usuario clasifica todo, la sección desaparece sin dejar empty state. Si abre cuenta nueva, no aparece nunca hasta que tenga ≥1 identificación sin clasificar.
2. **La ficha de planta conserva la información original.** Las 2 cards se añaden ARRIBA del accordion existente (Qué es / Cómo cuidarla / Qué le pasa). El usuario no pierde acceso a la información que ya tenía cuando vaya a clasificar. (En el futuro podríamos hacer un A/B test moviendo las cards más abajo si la prominencia se siente excesiva — fuera de alcance de v0.)
3. **Multi-entrada para clasificar:** desde la sección de home, desde el resultado de una identificación nueva, o desde el detalle accedido vía historial.
4. **Anónimos NO ven sección ni historial.** Su único punto de contacto con la clasificación es el resultado de su propia identificación recién hecha. Al tocar una card → bottom sheet con login/registro. Tras alta, `claim_anonymous_searches` RPC transfiere la fila al usuario nuevo (preservando lat/lng) y la deja ya clasificada con el `context` que el usuario eligió.

### Componentes nuevos requeridos (Phase 02.1)

Todos en línea con el design system existente — no se inventa nada:

- **`UnclassifiedSection`** (home, condicional) — header con count + "Ver todas" + grid 4 thumbnails con badge sticker
- **`HistorySummary`** (cabecera de historial) — fila con desglose "X jardín · Y descubrimientos · Z sin clasificar"
- **`ContextChip`** (3 variantes: `unclassified` / `home` / `wild`) — pill con borde sticker, colores del system
- **`ClassificationCards`** (las 2 cards) — patrón ya validado en sketch 001 winner A
- **`PersistentClassificationBanner`** (post-clasificación) — patrón ya validado en sketch 002 winner C
- **`AnonClassificationWall`** (bottom sheet) — variante del modal-sheet existente

### Decisiones que excedieron este sketch

- **Sketch 004 (re-classify from detail)** ya está implícitamente cubierto por la pantalla 3. Es probable que sea opcional como sketch separado.
- **Empty states de calendario y mapa** los tratan sus propias fases (3 y 03.1).
- **Settings opcional para "ocultar sección sin clasificar"** se difiere a v1+.

## "No hacer nada" sigue siendo válido en cualquier variante

- En A: ignoras la sección. La sección queda ahí, pero no te obliga.
- En B: tap "Más tarde" o cierras con la X. El banner desaparece, no vuelve.
- En C: tap "Entendido". Listo, nunca más.

En las 3 variantes, no clasificar el historial **no rompe nada**. Calendario y mapa quedan vacíos hasta que el usuario decida poblarlos. La app sigue funcionando para "solo identificar plantas".

## Decisiones que excederían este sketch

- **Cuántas veces vuelve a aparecer el reveal** si el usuario no entra durante semanas (probablemente nunca — una sola vez tras update).
- **Edge case:** usuarios sin historial (cuenta nueva). Probablemente la variante elegida se omite por completo (no hay nada que revelar).
- **Animaciones reales** (slide-up del modal, transición home→bulk flow): son CSS estático aquí.
- **Settings opcional** para volver a mostrar la sección/banner si el usuario lo cerró por error.
- **Detalle del bulk flow** (variante B): foto + las 2 cards es la base. ¿Hay vista previa de Qué es / Cómo cuidarla aquí, o es 100% binario? En el sketch lo simplifico al mínimo.
