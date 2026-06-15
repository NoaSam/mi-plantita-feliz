import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Route handler for the legacy `/mis-plantas` URL. Fires the one-shot
 * relocation toast on the user's first transit and immediately redirects
 * to `/ajustes/mis-plantas`. Previously this lived at App level which
 * meant the toast fired on first mount regardless of route — the bug CPO
 * caught in the live mockup screenshot on 2026-05-22.
 */
const STORAGE_KEY = "mp_seen_history_relocation_notice";

export default function HistoryRelocationNotice() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
      toast("📍 Hemos movido Mis plantas a Ajustes", { duration: 8000 });
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage may throw in iOS Safari private mode or when the
      // quota is exceeded. The toast simply repeats on next mount in
      // that edge case — acceptable.
    }
  }, []);
  return <Navigate to="/ajustes/mis-plantas" replace />;
}
