import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook that updates `watering_interval_days` on a plant_searches row.
 *
 * Pattern verbatim from `useLogWatering`: synchronous Supabase UPDATE that
 * returns `{ ok }`. Dispatches CustomEvent `mp:plant-frequency-updated` so
 * `useHomePlants` refetches and the card recomputes the countdown.
 *
 * D-07: the value overwrites the AI initial — no separate column for the
 * "AI original". Trade-off accepted per CONTEXT.md.
 *
 * D-13: the client input clamps to [1, 60]; this hook does NOT re-validate
 * because the CHECK constraint on the DB rejects out-of-range values. If
 * the caller sends an invalid value, Supabase returns an error and this
 * hook returns `{ ok: false }` — the caller toasts the failure.
 */
export interface UseEditWateringIntervalReturn {
  editInterval: (plantId: string, newDays: number) => Promise<{ ok: boolean }>;
}

export function useEditWateringInterval(): UseEditWateringIntervalReturn {
  const editInterval = useCallback(async (plantId: string, newDays: number) => {
    const { error } = await supabase
      .from("plant_searches")
      .update({ watering_interval_days: newDays })
      .eq("id", plantId);

    if (error) {
      console.error("[useEditWateringInterval] update failed:", error.message);
      return { ok: false as const };
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mp:plant-frequency-updated", {
          detail: { plant_search_id: plantId, new_interval_days: newDays },
        }),
      );
    }
    return { ok: true as const };
  }, []);

  return { editInterval };
}
