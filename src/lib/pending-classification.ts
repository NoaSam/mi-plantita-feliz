import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";

/** sessionStorage key — locked by CONTEXT.md D-02. */
export const PENDING_CLASSIFICATION_KEY = "mp_pending_classification";

/** TTL — locked by CONTEXT.md D-02 (30 minutes). */
export const PENDING_CLASSIFICATION_TTL_MS = 30 * 60 * 1000;

export interface PendingClassification {
  plant_search_id: string;
  action: 'home' | 'wild';
  anonymous_id: string;
  ts: number;
}

export function writePendingClassification(payload: Omit<PendingClassification, 'ts'>): void {
  try {
    const stored: PendingClassification = { ...payload, ts: Date.now() };
    sessionStorage.setItem(PENDING_CLASSIFICATION_KEY, JSON.stringify(stored));
  } catch {
    // sessionStorage unavailable (private mode etc.) — silent.
  }
}

export function readPendingClassification(): PendingClassification | null {
  try {
    const raw = sessionStorage.getItem(PENDING_CLASSIFICATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingClassification;
    if (
      typeof parsed?.plant_search_id !== "string" ||
      (parsed.action !== "home" && parsed.action !== "wild") ||
      typeof parsed.anonymous_id !== "string" ||
      typeof parsed.ts !== "number"
    ) {
      clearPendingClassification();
      return null;
    }
    // TTL check — discard stale intent.
    if (Date.now() - parsed.ts > PENDING_CLASSIFICATION_TTL_MS) {
      clearPendingClassification();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingClassification(): void {
  try {
    sessionStorage.removeItem(PENDING_CLASSIFICATION_KEY);
  } catch {
    // ignore
  }
}

/**
 * Called from AuthContext after `claimAnonymousSearches()` resolves
 * (per D-13). Reads sessionStorage, runs UPDATE on plant_searches.context,
 * fires the `classification_completed` event, and clears the key.
 *
 * Returns the plant_search_id of the classified row (for the caller to
 * navigate to /planta/:id), or null if no pending intent.
 */
export async function processPendingClassification(): Promise<{ plant_search_id: string; action: 'home' | 'wild' } | null> {
  const pending = readPendingClassification();
  if (!pending) return null;

  const { error } = await supabase
    .from("plant_searches")
    .update({ context: pending.action })
    .eq("id", pending.plant_search_id);

  // Always clear the key so we never retry on next navigation.
  clearPendingClassification();

  if (error) {
    console.warn("processPendingClassification UPDATE failed:", error.message);
    return null;
  }

  // Fire classification_completed (the wall-flow equivalent of auto-settle).
  track("classification_completed", {
    action: pending.action,
    source: 'result',
    plant_search_id: pending.plant_search_id,
  });

  return { plant_search_id: pending.plant_search_id, action: pending.action };
}
