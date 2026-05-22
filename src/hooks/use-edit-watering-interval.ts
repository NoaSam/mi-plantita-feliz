import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";

/**
 * Hook that updates `watering_interval_days` on a plant_searches row.
 *
 * Phase 3 sub-phase 3-05: tracking de PostHog cableado. Track fires AFTER the
 * UPDATE is confirmed ok=true and BEFORE the CustomEvent dispatch.
 *
 * D-07: the value overwrites the AI initial — no separate column for the
 * "AI original". Trade-off accepted per CONTEXT.md.
 *
 * D-13: the client input clamps to [1, 60]; this hook does NOT re-validate
 * because the CHECK constraint on the DB rejects out-of-range values.
 *
 * The caller (RegarPage) provides `prevDays` and `source` because the hook
 * does not have access to the plant's current state without an extra
 * round-trip — keeping the hook a thin DB+tracking primitive.
 */
export type FrequencyEditSource =
  | "ia_initial"
  | "user_override"
  | "null_filled_in_by_user";

export interface UseEditWateringIntervalReturn {
  editInterval: (
    plantId: string,
    newDays: number,
    prevDays: number | null,
    source: FrequencyEditSource,
  ) => Promise<{ ok: boolean }>;
}

export function useEditWateringInterval(): UseEditWateringIntervalReturn {
  const editInterval = useCallback(
    async (
      plantId: string,
      newDays: number,
      prevDays: number | null,
      source: FrequencyEditSource,
    ) => {
      const { error } = await supabase
        .from("plant_searches")
        .update({ watering_interval_days: newDays })
        .eq("id", plantId);

      if (error) {
        console.error("[useEditWateringInterval] update failed:", error.message);
        return { ok: false as const };
      }

      // D-17 evento `watering_frequency_edited`: track BEFORE dispatch.
      track("watering_frequency_edited", {
        plant_search_id: plantId,
        prev_interval: prevDays,
        new_interval: newDays,
        source,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("mp:plant-frequency-updated", {
            detail: { plant_search_id: plantId, new_interval_days: newDays },
          }),
        );
      }
      return { ok: true as const };
    },
    [],
  );

  return { editInterval };
}
