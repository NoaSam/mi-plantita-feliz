import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Wild plant with guaranteed non-null lat/lng.
 *
 * `lat` and `lng` are narrowed to `number` (not `number | null`) because
 * the hook's WHERE clause filters them out. The DB schema declares them
 * `number | null` for the wider plant_searches table; the hook gives us
 * a narrower invariant.
 *
 * `name` follows the legacy format `"Common (Scientific)"` per
 * RESEARCH.md A2 — splitting is the consumer's responsibility (Plan 06
 * PlantMapSheet via splitNameField helper with grácil fallback).
 */
export interface WildPlantWithCoords {
  id: string;
  name: string;
  imageUrl: string;
  lat: number;              // narrowed: hook query garantiza no-null
  lng: number;              // narrowed: hook query garantiza no-null
  createdAt: string;        // ISO timestamp string from Supabase
  description: string;
  context: 'wild';
}

export interface UseWildPlantsWithCoordsReturn {
  plants: WildPlantWithCoords[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Returns wild plants (context='wild') of the current user that have
 * non-null lat/lng — used by /mapa (MapPage) to render markers.
 *
 * For anonymous users returns `plants: []` without touching Supabase
 * (per D-07: anon users have no `context` classified).
 *
 * Wild plants without coords are silently excluded per D-11/D-12/D-13:
 * they still appear in /mis-plantas with their ContextChip but not on
 * the map (no actionable retroactive geotag flow exists).
 *
 * NO limit() — full list. Per SPEC.md Constraints: <20 pins typical,
 * up to ~200 heavy users. Direct render without clustering acceptable.
 */
export function useWildPlantsWithCoords(): UseWildPlantsWithCoordsReturn {
  const { user } = useAuth();
  const [plants, setPlants] = useState<WildPlantWithCoords[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // WR-02 fix: mountedRef guard (verbatim pattern from use-unclassified-count.ts).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Sync state reset on user identity change (verbatim from useHomePlants).
  // Without this, on WebKit the gap between authLoading=false and user being
  // set is large enough that MapPage's redirect-on-empty branch fires before
  // the wild-plants query has had a chance to run.
  const [trackedUserId, setTrackedUserId] = useState<string | undefined>(user?.id);
  if (trackedUserId !== user?.id) {
    setTrackedUserId(user?.id);
    setIsLoading(true);
    setPlants([]);
  }

  const load = useCallback(async () => {
    if (!user) {
      if (!mountedRef.current) return;
      setPlants([]);
      setIsLoading(false);
      return;
    }
    // Set loading synchronously when we have a user — avoids a render window
    // where isLoading=false (stale from the no-user gate) + plants=[] would
    // mislead consumers (e.g. MapPage's redirect-on-empty branch).
    setIsLoading(true);
    const { data, error } = await supabase
      .from("plant_searches")
      .select("id, name, image_url, lat, lng, created_at, description")
      .eq("user_id", user.id)
      .eq("context", "wild")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .order("created_at", { ascending: false });

    if (!mountedRef.current) return;
    if (error) {
      console.error("Error fetching wild plants with coords:", error.message);
      setPlants([]);
      setIsLoading(false);
      return;
    }
    setPlants(
      (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        imageUrl: row.image_url,
        // Safe to cast: .not("lat","is",null) and .not("lng","is",null) guarantee non-null.
        lat: row.lat as number,
        lng: row.lng as number,
        createdAt: row.created_at,
        description: row.description ?? "",
        context: 'wild' as const,
      })),
    );
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { plants, isLoading, refetch: load };
}
