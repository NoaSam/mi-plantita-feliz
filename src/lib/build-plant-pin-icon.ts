import L from "leaflet";

/**
 * Build a custom Leaflet divIcon for plant discovery pins.
 *
 * Sticker style (CONTEXT.md D-09 + UI-SPEC §5):
 * - 36×36px square
 * - cream fill (`hsl(var(--card))`)
 * - 2px solid foreground border
 * - 1rem border-radius
 * - 4×4px hard shadow with foreground color
 * - leaf emoji 🌿 centered
 *
 * Active feedback (D-10): `scale(1.1)` on `:active`/`:focus-within`
 * is provided by the `.plant-map-pin` rule in src/index.css (Plan 01).
 *
 * Glyph decision lock: emoji 🌿 per sketch 004 winner. Slight cross-platform
 * variance (Android Noto vs Apple Color) is acceptable; both clearly read
 * as a leaf.
 *
 * iconAnchor [18, 36]: bottom-center, so the lat/lng coordinate maps to
 * the bottom of the sticker (standard convention).
 *
 * className "plant-map-pin": hooks into index.css overrides that remove
 * Leaflet's default white background + grey border (RESEARCH.md Pitfall 3).
 */
export function buildPlantPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "plant-map-pin",
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: hsl(var(--card));
        border: 2px solid hsl(var(--foreground));
        border-radius: 1rem;
        box-shadow: 4px 4px 0 0 hsl(var(--foreground));
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        line-height: 1;
        transition: transform 100ms ease;
      ">🌿</div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}
