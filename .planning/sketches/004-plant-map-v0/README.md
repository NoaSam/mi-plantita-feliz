---
sketch: 004
name: plant-map-v0
question: "¿Cómo se ve /mapa de extremo a extremo (tab bar + tiles + pins + sheet) cross-platform Android+iOS PWA?"
winner: "A"
tags: [phase-03.1, map, leaflet, pin, bottom-sheet, tab-bar]
---

# Sketch 004 · Plant Map v0 — vista holística

## Pregunta de diseño

Phase 03.1 introduce **4 superficies visuales nuevas** que dependen entre sí: una tab condicional, una página con tiles OSM, pins sticker custom y un bottom sheet de preview. El UI-SPEC.md ya tiene decisiones lockeadas para cada una; este sketch las pone todas juntas en pantalla para validar **coherencia visual entre superficies** antes de planificar.

**No hay empty state.** Locked en CONTEXT.md (D-04, D-07, D-13): si `wild_with_coords_count == 0`, la tab "Mapa" simplemente no aparece y la ruta es inalcanzable. Si por bug el usuario navega directo a `/mapa` sin pins, redirige a `/`. No se diseña pantalla "vacío inviting".

La pregunta combina:
- **¿El pin sticker funciona sobre las tiles?** (legibilidad, tamaño, contraste)
- **¿El sheet preserva el sentido del lugar?** (no tapa el mapa entero)
- **¿La tab "Mapa" pesa bien en BottomTabBar con 4 tabs?** (vs. 3 tabs actuales)

Cada variante propone una **combinación coherente** de decisiones.

## Cómo verlo

```
open .planning/sketches/004-plant-map-v0/index.html
```

Cambia variantes con los botones del toolbar o las teclas **1 / 2 / 3**. Tap un pin del mapa para abrir el sheet manualmente (en la pantalla 3 está pre-abierto).

Cada variante muestra **3 pantallas en horizontal**:
1. **Home** con BottomTabBar (4 tabs, "Mapa" visible) — confirma que la nueva tab cabe
2. **/mapa con pins** — composición principal (tiles fake + 3 pins + atribución OSM)
3. **/mapa con sheet abierto** — preview de planta al tapear un pin

**Iconos del tab bar:** idénticos al código real de `src/components/BottomTabBar.tsx` (`Leaf` para Inicio, `MapPin` para Mapa, `BookOpen` para Mis plantas, `Settings` para Ajustes — todos de lucide-react).

## Variantes

### ★ A · Emoji 🌿 + foto 4:3 stacked — WINNER
**Filosofía:** UI-SPEC tal como está lockeado. La opción "safe".

- **Pin:** emoji 🌿 sobre cream + olive border + shadow press (`4px 4px 0`)
- **Sheet:** foto `aspect-[4/3]`, sin eyebrow chip, CTAs apilados verticalmente full-width (Ver detalle hero arriba, Cerrar outline abajo)
- **Sin animación de entrada** (pins aparecen estáticos)

✓ Implementación trivial · ✓ Cero riesgo cross-platform · ✓ Tap targets generosos · ! Emoji 🌿 renderiza distinto en Android Noto vs iOS Apple Color (ambos legibles)

### B · SVG Leaf + foto cuadrada + eyebrow
**Filosofía:** consistencia con el sistema de iconos (lucide-react en todos lados).

- **Pin:** `Leaf` SVG de lucide-react inline (color olive primary)
- **Sheet:** eyebrow chip "Descubrimiento" con acento coral, foto `aspect-square` (IG-style), CTAs **lado-a-lado** (Cerrar outline izquierda + Ver detalle hero derecha)

✓ Pixel-perfect cross-platform · ✓ Consistente con resto de iconos · ! Foto square recorta más en plantas portrait · ! CTAs lado-a-lado en pantallas estrechas son tap targets más pequeños

### C · Híbrido pulido (drop-in)
**Filosofía:** cherry-pick + un detalle "delight".

- **Pin:** SVG Leaf (de B)
- **Sheet:** foto `aspect-[4/3]` (de A), sin eyebrow, CTAs stacked vertical (de A)
- **Drop-in animation** de pins al cargar (50ms stagger, translateY + fade-in)

✓ Lo mejor de ambos · ✓ Micro-detail "vivo" · ! Una decisión más a justificar

## Por qué gana A

1. **Cumple UI-SPEC sin desviaciones** — el contrato ya fue verificado por gsd-ui-checker en las 6 dimensiones. Cambiar a SVG Leaf o eyebrow chip abre la puerta a re-verificar.
2. **Tono cálido del emoji 🌿** coherente con la voz de la app ("cercana, clara, sin jerga botánica"). El SVG se siente más "app empresarial".
3. **CTAs stacked = mejor UX táctil mobile** — botones full-width son más fáciles de tappear que botones de ~140px lado-a-lado.
4. **Foto 4:3** respeta fotos portrait típicas de móvil sin crops dramáticos.
5. **Sin eyebrow chip** — ya estás en una pantalla titulada "Mapa", chip "Descubrimiento" es redundante visual.
6. **Animación drop-in (variante C) diferida** — se puede añadir post-launch sin tocar el plan; no es bloqueante.

## Decisiones que excederían este sketch

- **Loading skeleton** mientras las tiles cargan — trivial CSS, locked en UI-SPEC §6
- **Animación de apertura del Sheet** — Radix Dialog la trae built-in
- **Offline behavior** — fondo gris de Leaflet, locked en SPEC §Constraints
- **Pinch-to-zoom** del mapa — comportamiento nativo de Leaflet
- **Tab "Mi jardín"** (Phase 3) — fuera de scope, pero el sketch confirma que con 4 tabs cabe sin apretarse. Con 5 (Phase 3 añadirá la quinta) habrá que revalidar.
