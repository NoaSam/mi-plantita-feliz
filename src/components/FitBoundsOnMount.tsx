import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export interface FitBoundsOnMountProps {
  pins: Array<{ lat: number; lng: number }>;
}

/**
 * Imperative bridge: adjusts the map viewport when pins change.
 *
 * react-leaflet@4's MapContainer center/zoom props are immutable after
 * mount — the canonical way to update the viewport reactively is a child
 * component that calls useMap() and dispatches imperative methods.
 *
 * Decisions:
 * - D-14: pins.length > 1 → map.fitBounds with [40, 40] padding
 * - D-15: pins.length === 1 → map.setView at zoom 14 (city-level)
 * - pins.length === 0 → no-op (MapPage will not render the map in this
 *   branch; it redirects per sketch winner)
 *
 * Respects prefers-reduced-motion via animate option (UI-SPEC line 873).
 * Must be a CHILD of <MapContainer> — useMap() reads from context.
 */
export function FitBoundsOnMount({ pins }: FitBoundsOnMountProps) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 14, {
        animate: !reduceMotion,
      });
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, {
      padding: [40, 40],
      animate: !reduceMotion,
    });
  }, [map, pins]);
  return null;
}
