import { useEffect } from "react";
import { toast } from "sonner";

/**
 * D-04 (Phase 3 / Calendar v0): aviso one-shot de la migración de la
 * sección "Mis plantas" a Ajustes.
 *
 * Comportamiento:
 * - En el primer mount post-deploy, dispara `toast("📍 Hemos movido Mis
 *   plantas a Ajustes", { duration: 8000 })`.
 * - Persiste flag en localStorage para no repetirse en futuros mounts.
 * - No bloquea la app — el toast vive en el `<Toaster />` global de App.tsx.
 * - No tiene UI propia (return null).
 *
 * Key del flag: `mp_seen_history_relocation_notice` (lockeado por D-04).
 * Cuando el flag esté presente, el componente es no-op.
 *
 * SSR-safe: gated por `typeof window !== "undefined"` (paranoid pero
 * consistente con el resto del código que toca window/localStorage).
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
      // localStorage puede fallar en modo incógnito (iOS Safari) o si la
      // cuota está llena. No bloquea — simplemente se reintentará en el
      // siguiente mount (acepta repetir el toast en ese edge case).
    }
  }, []);
  return null;
}
