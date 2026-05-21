import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ClassifyAction = 'home' | 'wild';

export interface UseClassifyPlantReturn {
  /** SYNCHRONOUS UPDATE per D-08. { ok: false } on error — caller toasts. */
  classify: (plantSearchId: string, action: ClassifyAction) => Promise<{ ok: boolean }>;
  /** Revert to 'unclassified'. Used by ClassificationMorph "Deshacer". */
  revert: (plantSearchId: string) => Promise<{ ok: boolean }>;
}

/** Locked per CONTEXT.md D-08. UI-SPEC flag 2 references this constant. */
export const UNDO_WINDOW_MS = 5000;

export function useClassifyPlant(): UseClassifyPlantReturn {
  const classify = useCallback(async (plantSearchId: string, action: ClassifyAction) => {
    const { error } = await supabase
      .from("plant_searches")
      .update({ context: action })
      .eq("id", plantSearchId);

    if (error) {
      console.error("[classify] update failed:", error.message);
      return { ok: false as const };
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mp:plant-context-updated", {
          detail: { plant_search_id: plantSearchId, action },
        }),
      );
    }
    return { ok: true as const };
  }, []);

  const revert = useCallback(async (plantSearchId: string) => {
    const { error } = await supabase
      .from("plant_searches")
      .update({ context: 'unclassified' })
      .eq("id", plantSearchId);

    if (error) {
      console.error("[classify] revert failed:", error.message);
      return { ok: false as const };
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mp:plant-context-updated", {
          detail: { plant_search_id: plantSearchId, action: 'unclassified' },
        }),
      );
    }
    return { ok: true as const };
  }, []);

  return { classify, revert };
}
