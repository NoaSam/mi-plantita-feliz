import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { useAuth } from "@/hooks/use-auth";
import {
  useWildPlantsWithCoords,
  type WildPlantWithCoords,
} from "@/hooks/use-wild-plants-with-coords";
import { FitBoundsOnMount } from "@/components/FitBoundsOnMount";
import { PlantMapSheet } from "@/components/PlantMapSheet";
import { buildPlantPinIcon } from "@/lib/build-plant-pin-icon";
import { track } from "@/lib/track";

/**
 * /mapa — Plant discovery map.
 *
 * Layout: full-bleed within AppLayout (mounted with `fullBleed=true`
 * in App.tsx). Map fills `100dvh - 4rem (BottomTabBar) - safe-areas`.
 * `100dvh` NOT `100vh` per UI-SPEC line 78 — iOS Safari address-bar
 * collapse cropping (landmine #9).
 *
 * No empty state per sketch 004 winner: if the user lands here without
 * any wild-with-coords pins (deep link), redirect silently to `/`.
 * The conditional tab in BottomTabBar (Plan 04) prevents normal users
 * from ever reaching this branch.
 *
 * Pin tap sets `selectedPin` state — Plan 06 will mount PlantMapSheet
 * keyed off this state, and Plan 07 will add the map_pin_tapped track
 * call inside the click handler.
 *
 * react-leaflet@4 caveat (landmine #5): MapContainer center/zoom are
 * immutable after mount. We pass placeholder values and let
 * <FitBoundsOnMount /> set the true viewport via useMap().
 */
export default function MapPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { plants, isLoading: plantsLoading } = useWildPlantsWithCoords();
  // Wait until: (a) auth has resolved, (b) we have a user, and (c) the
  // wild-plants query for that user has run at least once. Without (c) there is
  // a brief render-window after user changes from null → loaded where
  // plantsLoading=false (stale from the no-user gate) and plants=[] (also stale)
  // which would otherwise trigger a premature redirect to "/".
  const isLoading = authLoading || (!!user && plantsLoading);
  const [selectedPin, setSelectedPin] = useState<WildPlantWithCoords | null>(null);
  const [trackedOpen, setTrackedOpen] = useState(false);

  useEffect(() => {
    document.title = "Mapa de descubrimientos · Mi Plantita Feliz";
  }, []);

  useEffect(() => {
    if (isLoading || trackedOpen) return;
    track("map_opened", { pin_count: plants.length });
    setTrackedOpen(true);
  }, [isLoading, trackedOpen, plants.length]);

  if (isLoading) {
    return (
      <div
        className="relative w-full bg-secondary/30"
        style={{
          height:
            "calc(100dvh - 4rem - env(safe-area-inset-bottom) - env(safe-area-inset-top))",
        }}
        aria-busy="true"
        aria-label="Cargando mapa de descubrimientos"
      />
    );
  }

  if (plants.length === 0) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      className="relative w-full"
      style={{
        height:
          "calc(100dvh - 4rem - env(safe-area-inset-bottom) - env(safe-area-inset-top))",
      }}
      role="application"
      aria-label="Mapa de descubrimientos de plantas"
    >
      <MapContainer
        center={[plants[0].lat, plants[0].lng]}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
        />
        {plants.map((plant, index) => (
          <Marker
            key={plant.id}
            position={[plant.lat, plant.lng]}
            icon={buildPlantPinIcon()}
            title={plant.name}
            eventHandlers={{
              click: () => {
                track("map_pin_tapped", {
                  plant_search_id: plant.id,
                  pin_index_among_total: index,
                  total_pins: plants.length,
                });
                setSelectedPin(plant);
              },
            }}
          />
        ))}
        <FitBoundsOnMount pins={plants.map((p) => ({ lat: p.lat, lng: p.lng }))} />
      </MapContainer>
      <PlantMapSheet plant={selectedPin} onClose={() => setSelectedPin(null)} />
    </div>
  );
}
