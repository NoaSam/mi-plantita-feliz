import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";
import { computeDaysRemaining } from "@/lib/watering-countdown";
import type { HomePlant } from "@/hooks/use-home-plants";

/**
 * Hook that writes `last_watered_at` on a plant_searches row.
 *
 * Phase 3 sub-phase 3-05: tracking de PostHog cableado. Track fires AFTER the
 * UPDATE is confirmed ok=true and BEFORE the CustomEvent dispatch (so the
 * downstream refetch never beats the analytics event conceptually).
 *
 * D-12 flow:
 *   1. Caller sets optimistic state locally.
 *   2. Caller calls logWatering(plant) — but BEFORE invoking, the caller
 *      MUST capture the previous `lastWateredAt` from its local state for the
 *      undo target (the UPDATE overwrites the value in DB).
 *   3. If ok=true → toast with action Deshacer (4s); tap Deshacer calls
 *      revertWatering(plant, previousLastWateredAt).
 *   4. If ok=false → caller rollback + toast.error.
 */
export interface UseLogWateringReturn {
  logWatering: (plant: HomePlant) => Promise<{ ok: boolean }>;
  revertWatering: (
    plant: HomePlant,
    previousLastWateredAt: string | null,
  ) => Promise<{ ok: boolean }>;
}

export function useLogWatering(): UseLogWateringReturn {
  const logWatering = useCallback(async (plant: HomePlant) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("plant_searches")
      .update({ last_watered_at: now })
      .eq("id", plant.id);

    if (error) {
      console.error("[useLogWatering] update failed:", error.message);
      return { ok: false as const };
    }

    // D-17 evento `watering_logged`: track BEFORE dispatch.
    // days_remaining_before uses the PRE-LOG state (lastWateredAt before
    // this UPDATE, intervalDays unchanged).
    const daysRemainingBefore = computeDaysRemaining(
      plant.lastWateredAt,
      plant.wateringIntervalDays,
    );
    const wasFirstTime = plant.lastWateredAt === null;

    track("watering_logged", {
      plant_search_id: plant.id,
      days_remaining_before: daysRemainingBefore,
      interval_days: plant.wateringIntervalDays,
      was_first_time: wasFirstTime,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mp:plant-watered", {
          detail: { plant_search_id: plant.id, action: "log" },
        }),
      );
    }
    return { ok: true as const };
  }, []);

  const revertWatering = useCallback(
    async (plant: HomePlant, previousLastWateredAt: string | null) => {
      const { error } = await supabase
        .from("plant_searches")
        .update({ last_watered_at: previousLastWateredAt })
        .eq("id", plant.id);

      if (error) {
        console.error("[useLogWatering] revert failed:", error.message);
        return { ok: false as const };
      }

      // D-17 evento `watering_undone`: track BEFORE dispatch.
      track("watering_undone", { plant_search_id: plant.id });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("mp:plant-watered", {
            detail: { plant_search_id: plant.id, action: "revert" },
          }),
        );
      }
      return { ok: true as const };
    },
    [],
  );

  return { logWatering, revertWatering };
}
