import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { track } from "@/lib/track";

export type ClassifySource = 'result' | 'detail_from_home_section' | 'detail_from_history';

export interface ClassificationCardsProps {
  plantSearchId: string;
  source: ClassifySource;
  /** Caller wires this to use-classify-plant.classify (logged-in) OR to opening AnonClassificationWall (anonymous). */
  onClassify: (action: 'home' | 'wild') => void;
  /** When set, the OTHER card fades to opacity 0.35 and pointer-events:none (sibling-disabled state). Per UI-SPEC § Component 1. */
  pendingAction: 'home' | 'wild' | null;
}

interface CardConfig {
  action: 'home' | 'wild';
  icon: string;
  title: string;
  subtitle: string;
}

const CARDS: CardConfig[] = [
  {
    action: 'home',
    icon: '🪴',
    title: 'Añadir a mis plantas',
    subtitle: 'Aparecerá en tu jardín con su frecuencia de riego.',
  },
  {
    action: 'wild',
    icon: '📍',
    title: 'Guardar descubrimiento',
    subtitle: 'Aparecerá en tu mapa con la ubicación.',
  },
];

export default function ClassificationCards({
  plantSearchId,
  source,
  onClassify,
  pendingAction,
}: ClassificationCardsProps) {
  const reduceMotion = useReducedMotion();

  const handleClick = (action: 'home' | 'wild') => {
    track("classification_action_clicked", {
      action,
      source,
      plant_search_id: plantSearchId,
      was_unclassified: true,
    });
    onClassify(action);
  };

  return (
    <section aria-labelledby="classification-eyebrow" className="flex flex-col gap-3">
      <p
        id="classification-eyebrow"
        className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1"
      >
        ¿Qué hacemos con esta planta?
      </p>
      {CARDS.map((card) => {
        const isDisabled = pendingAction !== null && pendingAction !== card.action;
        return (
          <motion.button
            key={card.action}
            type="button"
            aria-label={`${card.title}. ${card.subtitle}`}
            onClick={() => handleClick(card.action)}
            animate={
              isDisabled
                ? { opacity: 0.35 }
                : { opacity: 1 }
            }
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
            style={{
              boxShadow: "var(--shadow-press)",
              pointerEvents: isDisabled ? 'none' : 'auto',
            }}
            className="w-full flex items-center gap-4 px-5 py-4 bg-card border-2 border-foreground rounded-2xl text-left active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 transition-shadow"
          >
            <span className="text-2xl shrink-0" aria-hidden>{card.icon}</span>
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="font-display text-xl font-semibold leading-tight text-foreground">
                {card.title}
              </span>
              <span className="font-body text-sm text-muted-foreground leading-snug">
                {card.subtitle}
              </span>
            </span>
            <ChevronRight className="size-5 text-muted-foreground shrink-0" strokeWidth={2} aria-hidden />
          </motion.button>
        );
      })}
    </section>
  );
}
