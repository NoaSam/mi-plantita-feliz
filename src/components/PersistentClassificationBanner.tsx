import { motion, useReducedMotion } from "framer-motion";
import { track } from "@/lib/track";

export interface PersistentClassificationBannerProps {
  context: 'home' | 'wild';
  plantSearchId: string;
  /** Caller hides banner and re-mounts ClassificationCards. Per D-08, NO database write here. */
  onChange: () => void;
}

const COPY = {
  home: { emoji: '🪴', text: 'Está en tu jardín', ariaLabel: 'Clasificación actual: en tu jardín' },
  wild: { emoji: '📍', text: 'Está en tu mapa', ariaLabel: 'Clasificación actual: en tu mapa' },
} as const;

export default function PersistentClassificationBanner({
  context,
  plantSearchId,
  onChange,
}: PersistentClassificationBannerProps) {
  const reduceMotion = useReducedMotion();
  const copy = COPY[context];

  const handleChange = () => {
    track("classification_change_clicked", {
      current_context: context,
      plant_search_id: plantSearchId,
    });
    onChange();
  };

  return (
    <motion.aside
      role="status"
      aria-label={copy.ariaLabel}
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{ boxShadow: "var(--shadow-press)" }}
      className="w-full flex items-center gap-3 px-4 py-3 bg-secondary text-foreground border-2 border-foreground rounded-2xl"
    >
      <span className="text-xl shrink-0" aria-hidden>{copy.emoji}</span>
      <span className="font-display text-lg font-semibold flex-1 min-w-0">
        {copy.text}
      </span>
      <button
        type="button"
        onClick={handleChange}
        aria-label="Cambiar clasificación"
        className="font-body text-sm font-semibold text-primary underline underline-offset-2 px-3 py-2 min-h-11 active:translate-x-[1px] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring rounded-md"
      >
        Cambiar
      </button>
    </motion.aside>
  );
}
