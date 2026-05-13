import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUnclassifiedCount } from "@/hooks/use-unclassified-count";
import { track } from "@/lib/track";

/**
 * Module-level dedupe per D-14 / SPEC-10 AC.
 * Survives React StrictMode double-mount in dev; resets on full page reload (== new session).
 */
let _unclassifiedSectionShownThisSession = false;

interface UnclassifiedSectionProps {
  className?: string;
}

export default function UnclassifiedSection({ className }: UnclassifiedSectionProps) {
  const navigate = useNavigate();
  const { count, recent, isLoading } = useUnclassifiedCount();

  // Fire impression event once per session, only after count is confirmed > 0.
  useEffect(() => {
    if (isLoading) return;
    if (count <= 0) return;
    if (_unclassifiedSectionShownThisSession) return;
    _unclassifiedSectionShownThisSession = true;
    track("unclassified_section_shown", { count });
  }, [count, isLoading]);

  // Per UI-SPEC: section does not render until count confirmed > 0.
  if (isLoading) return null;
  if (count <= 0) return null;

  const handleThumbClick = (id: string, position: number) => {
    track("unclassified_section_clicked", {
      target: 'thumbnail',
      position,
      plant_search_id: id,
    });
    navigate(`/planta/${id}`);
  };

  const handleViewAll = () => {
    track("unclassified_section_clicked", { target: 'view_all' });
    navigate("/historial?context=unclassified");
  };

  return (
    <section
      aria-labelledby="unclassified-heading"
      className={`mt-8 pt-6 border-t-2 border-foreground/15 ${className ?? ''}`}
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2 id="unclassified-heading" className="font-display text-lg font-bold text-foreground">
          Sin clasificar <span className="text-accent font-bold">({count})</span>
        </h2>
        <button
          type="button"
          onClick={handleViewAll}
          aria-label="Ver todas las plantas sin clasificar"
          className="font-body text-sm font-semibold text-primary underline underline-offset-2 px-2 py-1 min-h-9 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring rounded-md"
        >
          Ver todas ›
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        {recent.map((thumb, idx) => (
          <button
            key={thumb.id}
            type="button"
            onClick={() => handleThumbClick(thumb.id, idx + 1)}
            aria-label={`Clasificar ${thumb.name}`}
            className="aspect-square overflow-hidden border-2 border-foreground rounded-xl bg-muted relative hover:scale-[1.02] active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <img
              src={thumb.imageUrl}
              alt={thumb.name}
              className="size-full object-cover"
              loading="lazy"
            />
            <span
              className="absolute top-1 right-1 size-3.5 bg-accent border-[1.5px] border-foreground rounded-full"
              aria-hidden
            />
          </button>
        ))}
      </div>

      <p className="font-body text-xs italic text-muted-foreground text-center">
        Toca una planta para añadirla a tu jardín o guardarla como descubrimiento.
      </p>
    </section>
  );
}
