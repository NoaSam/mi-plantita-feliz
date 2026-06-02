import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";
import { computeDaysRemaining } from "@/lib/watering-countdown";
import type { HomePlant } from "@/hooks/use-home-plants";

export interface UseLogWateringReturn {
  logWatering: (plant: HomePlant) => Promise<{ ok: boolean }>;
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

  return { logWatering };
}
