import { useCallback, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { UNDO_WINDOW_MS } from "@/hooks/use-classify-plant";
import { track } from "@/lib/track";
import type { ClassifySource } from "@/components/ClassificationCards";

export interface ClassificationMorphProps {
  action: 'home' | 'wild';
  plantSearchId: string;
  source: ClassifySource;
  /** Called when user taps Deshacer. Caller reverts via use-classify-plant.revert and re-mounts cards. */
  onUndo: () => void;
  /** Called after UNDO_WINDOW_MS expires. Caller transitions to PersistentClassificationBanner. */
  onCommit: () => void;
}

const COPY = {
  home: {
    title: 'Añadida a tu jardín',
    subtitle: 'Aparecerá con su frecuencia de riego.',
  },
  wild: {
    title: 'Guardada como descubrimiento',
    subtitle: 'Aparecerá en tu mapa.',
  },
} as const;

export default function ClassificationMorph({
  action,
  plantSearchId,
  source,
  onUndo,
  onCommit,
}: ClassificationMorphProps) {
  const reduceMotion = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const remainingRef = useRef<number>(UNDO_WINDOW_MS);
  const settledRef = useRef<boolean>(false);

  const fireSettle = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    track("classification_completed", {
      action,
      source,
      plant_search_id: plantSearchId,
    });
    onCommit();
  }, [action, source, plantSearchId, onCommit]);

  const arm = useCallback((ms: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(fireSettle, ms);
  }, [fireSettle]);

  const pause = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    const elapsed = Date.now() - startedAtRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
  }, []);

  const resume = useCallback(() => {
    if (timerRef.current) return; // already armed
    if (remainingRef.current <= 0) {
      fireSettle();
      return;
    }
    arm(remainingRef.current);
  }, [arm, fireSettle]);

  // Mount: arm timer. Unmount: clear (D-10).
  useEffect(() => {
    arm(UNDO_WINDOW_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [arm]);

  const handleUndo = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    track("classification_undo_clicked", { action, plant_search_id: plantSearchId });
    onUndo();
  };

  const copy = COPY[action];

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label={`${copy.title}. ${copy.subtitle} Deshacer disponible.`}
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.25, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      style={{ boxShadow: "var(--shadow-press)" }}
      className="w-full flex items-center gap-4 px-5 py-4 bg-primary text-primary-foreground border-2 border-foreground rounded-2xl"
    >
      <Check className="size-6 shrink-0" strokeWidth={3} aria-hidden />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="font-display text-xl font-semibold leading-tight">
          {copy.title}
        </span>
        <span className="font-body text-sm leading-snug opacity-85">
          {copy.subtitle}
        </span>
      </div>
      <button
        type="button"
        onClick={handleUndo}
        className="font-body text-sm font-semibold underline underline-offset-2 px-3 py-2 min-h-11 text-primary-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-foreground/40 rounded-md"
      >
        Deshacer
      </button>
    </motion.div>
  );
}
