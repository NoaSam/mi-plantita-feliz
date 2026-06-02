import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getDemoHomePlants } from "@/lib/demo-home-plants";

function isDemoMode(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("demo")
  );
}

/**
 * Home plant: a `plant_searches` row with `context = 'home'`.
 *
 * Phase 3 sub-phase 3-02: includes `wateringIntervalDays` (Phase 2 already
 * added the column). Does NOT yet include `lastWateredAt` — the column does
 * not exist in the schema; sub-phase 3-03 adds it via migration and this
 * hook will be extended then.
 *
 * `name` keeps the legacy "Common (Scientific)" format — consumers split
 * it locally via the `splitNameField` helper (see PlantWateringCard +
 * PlantMapSheet).
 */
export interface HomePlant {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: string;
  wateringIntervalDays: number | null;
  lastWateredAt: string | null;
}

export interface UseHomePlantsReturn {
  plants: HomePlant[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Returns home plants (context='home') of the current user.
 *
 * For anonymous users returns `plants: []` without touching Supabase
 * (per D-07 / RLS: anon users have no `context` classified anyway).
 *
 * Reactivity (D-05): listens to `mp:plant-context-updated` (dispatched
 * by useClassifyPlant after classify/revert) AND
 * `mp:pending-classification-resolved` (dispatched by AuthContext during
 * the anon→auth claim flow) — pattern verbatim from useContextCounts
 * lines 122-132. Sub-phase 3-03 will add an additional `mp:plant-watered`
 * event for refetch after a watering log.
 *
 * Ordering: defaults to `created_at desc` (most recent first). Sub-phase
 * 3-03 will introduce a client-side secondary sort by urgency that
 * requires `lastWateredAt` (not yet available).
 */
export function useHomePlants(): UseHomePlantsReturn {
  const { user } = useAuth();
  const [plants, setPlants] = useState<HomePlant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // WR-02 fix: mountedRef guard (verbatim pattern from use-wild-plants-with-coords.ts).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // React "derive state from props" pattern: when the user identity changes,
  // reset isLoading=true SYNCHRONOUSLY during render so RegarPage sees the
  // loading state in the same render where user becomes set — avoiding a
  // race where the redirect-on-empty branch fires before the effect that
  // kicks off the fetch (#2 — WebKit auth bootstrap is slow enough to expose
  // this without a sync reset).
  const [trackedUserId, setTrackedUserId] = useState<string | undefined>(user?.id);
  if (trackedUserId !== user?.id) {
    setTrackedUserId(user?.id);
    setIsLoading(true);
    setPlants([]);
  }

  // `showLoading`: toggle `isLoading` so RegarPage's spinner gates renders.
  // Initial mount + user changes pass `true`. Event-driven refetches
  // (`mp:plant-watered`, etc.) pass `false` so the list stays mounted and
  // consumer-side optimistic state (PlantWateringCard.optimisticLastWatered)
  // is not clobbered by a spinner remount.
  const fetchPlants = useCallback(
    async (showLoading: boolean) => {
      if (isDemoMode()) {
        if (!mountedRef.current) return;
        setPlants(getDemoHomePlants());
        setIsLoading(false);
        return;
      }
      if (!user) {
        if (!mountedRef.current) return;
        setPlants([]);
        setIsLoading(false);
        return;
      }
      if (showLoading) setIsLoading(true);
      const { data, error } = await supabase
        .from("plant_searches")
        .select("id, name, image_url, watering_interval_days, last_watered_at, created_at")
        .eq("user_id", user.id)
        .eq("context", "home")
        .order("created_at", { ascending: false });

      if (!mountedRef.current) return;
      if (error) {
        console.error("Error fetching home plants:", error.message);
        setPlants([]);
        if (showLoading) setIsLoading(false);
        return;
      }
      setPlants(
        (data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          imageUrl: row.image_url,
          createdAt: row.created_at,
          wateringIntervalDays: row.watering_interval_days,
          lastWateredAt: row.last_watered_at,
        })),
      );
      if (showLoading) setIsLoading(false);
    },
    [user],
  );

  // Initial load + reloads on user identity change show the spinner.
  useEffect(() => {
    fetchPlants(true);
  }, [fetchPlants]);

  // D-05 reactivity: refetch on classify/revert (Phase 02.1 + 03.1
  // patterns) OR after anon→auth claim (AuthContext existing pattern).
  useEffect(() => {
    const handler = () => {
      fetchPlants(false);
    };
    window.addEventListener("mp:plant-context-updated", handler);
    window.addEventListener("mp:pending-classification-resolved", handler);
    // Phase 3 sub-phase 3-03: dispatched by useLogWatering after log/revert.
    window.addEventListener("mp:plant-watered", handler);
    // Phase 3 sub-phase 3-04: dispatched by useEditWateringInterval after edit.
    window.addEventListener("mp:plant-frequency-updated", handler);
    return () => {
      window.removeEventListener("mp:plant-context-updated", handler);
      window.removeEventListener("mp:pending-classification-resolved", handler);
      window.removeEventListener("mp:plant-watered", handler);
      window.removeEventListener("mp:plant-frequency-updated", handler);
    };
  }, [fetchPlants]);

  const refetch = useCallback(() => fetchPlants(true), [fetchPlants]);
  return { plants, isLoading, refetch };
}
