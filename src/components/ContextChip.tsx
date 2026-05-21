import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Non-interactive status pill. Variant `wild` uses `font-bold` per UI-SPEC FLAG #1
 * (raise contrast on coral background). Other variants stay `font-semibold`.
 */
export const contextChipVariants = cva(
  "inline-flex items-center gap-1 px-2 py-1 rounded-full font-body text-xs border-[1.5px] border-foreground shrink-0",
  {
    variants: {
      context: {
        unclassified: "bg-accent/15 text-foreground font-semibold",
        home: "bg-primary text-primary-foreground font-semibold",
        wild: "bg-accent text-accent-foreground font-bold",
      },
    },
    defaultVariants: { context: "unclassified" },
  },
);

export interface ContextChipProps extends VariantProps<typeof contextChipVariants> {
  context: 'home' | 'wild' | 'unclassified';
  className?: string;
}

const A11Y_LABEL = {
  unclassified: "Estado: Sin clasificar",
  home: "Estado: En tu jardín",
  wild: "Estado: Descubrimiento",
} as const;

export default function ContextChip({ context, className }: ContextChipProps) {
  return (
    <span
      role="status"
      aria-label={A11Y_LABEL[context]}
      className={cn(contextChipVariants({ context }), className)}
    >
      {context === 'unclassified' && (
        <span className="text-accent text-base leading-none" aria-hidden>•</span>
      )}
      {context === 'unclassified' && <span>Sin clasificar</span>}
      {context === 'home' && <span>🪴 Jardín</span>}
      {context === 'wild' && <span>📍 Descubrimiento</span>}
    </span>
  );
}
