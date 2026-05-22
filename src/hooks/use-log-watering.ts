import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook that writes `last_watered_at` on a plant_searches row.
 *
 * Pattern verbatim from `useClassifyPlant`: synchronous UPDATE, returns
 * `{ ok }` so the caller can toast/revert. Dispatches CustomEvent
 * `mp:plant-watered` so `useHomePlants` (and future listeners) refetch.
 *
 * D-12 flow:
 *   1. Caller sets optimistic state locally.
 *   2. Caller calls logWatering(plantId) — but BEFORE invoking, the caller
 *      MUST capture the previous `lastWateredAt` from its local state for the
 *      undo target (the UPDATE overwrites the value in DB).
 *   3. If ok=true → toast with action Deshacer (4s); tap Deshacer calls
 *      revertWatering(plantId, previousLastWateredAt).
 *   4. If ok=false → caller rollback + toast.error.
 *
 * Sub-phase 3-04 will add `useEditWateringInterval` similar for D-13.
 */
export interface UseLogWateringReturn {
  logWatering: (plantId: string) => Promise<{ ok: boolean }>;
  revertWatering: (
    plantId: string,
    previousLastWateredAt: string | null,
  ) => Promise<{ ok: boolean }>;
}

export function useLogWatering(): UseLogWateringReturn {
  const logWatering = useCallback(async (plantId: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("plant_searches")
      .update({ last_watered_at: now })
      .eq("id", plantId);

    if (error) {
      console.error("[useLogWatering] update failed:", error.message);
      return { ok: false as const };
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mp:plant-watered", {
          detail: { plant_search_id: plantId, action: "log" },
        }),
      );
    }
    return { ok: true as const };
  }, []);

  const revertWatering = useCallback(
    async (plantId: string, previousLastWateredAt: string | null) => {
      const { error } = await supabase
        .from("plant_searches")
        .update({ last_watered_at: previousLastWateredAt })
        .eq("id", plantId);

      if (error) {
        console.error("[useLogWatering] revert failed:", error.message);
        return { ok: false as const };
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("mp:plant-watered", {
            detail: { plant_search_id: plantId, action: "revert" },
          }),
        );
      }
      return { ok: true as const };
    },
    [],
  );

  return { logWatering, revertWatering };
}
