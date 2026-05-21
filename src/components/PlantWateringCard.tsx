import type { HomePlant } from "@/hooks/use-home-plants";

/**
 * Splittea "Common (Scientific)" en sus dos partes.
 * Patrón copiado verbatim de PlantMapSheet (no importado para evitar
 * coupling cross-feature).
 */
function splitNameField(name: string): {
  commonName: string;
  scientificName: string | null;
} {
  const match = name.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (match) {
    return {
      commonName: match[1].trim(),
      scientificName: match[2].trim(),
    };
  }
  return { commonName: name, scientificName: null };
}

export interface PlantWateringCardProps {
  plant: HomePlant;
  /**
   * Sub-phase 3-02: no-op opcional. Sub-phase 3-03 lo wirea al hook
   * useLogWatering. Si no se pasa, el botón hace console.log informativo.
   */
  onWater?: (plantId: string) => void;
  /**
   * Sub-phase 3-04: tap on frecuencia abrirá un picker bottom-sheet.
   * En 3-02 el botón está pero su onClick es no-op.
   */
  onEditFrequency?: (plantId: string) => void;
}

/**
 * Card del listado /regar — representa una planta casa con su estado de riego.
 *
 * Phase 3 sub-phase 3-02: estructura visual completa, pero TODAS las
 * plantas se renderizan en estado "Pendiente primera vez" porque el
 * dato de último riego no existe todavía en la DB. Sub-phase 3-03 introduce
 * `computeDaysRemaining()` y los 4 estados D-08.
 *
 * Sticker card visual (CLAUDE.md design system):
 * - border-2 border-foreground rounded-2xl bg-card
 * - boxShadow var(--shadow-press)
 * - foto 64×64 rounded-xl border-2
 * - nombre common (font-display semibold)
 * - frecuencia "Cada N días" o "Sin frecuencia" (D-16, sin atribución)
 * - badge "X d" right-aligned (en 3-02: "—" gris)
 * - status text empático (D-15)
 * - botón full-width abajo con copy state-dependent (D-10):
 *   "Regada" si X>0, "Regar" si X<=0 o pending-first
 *
 * D-15 tono suave: amarillo cálido (soft-warn) NO rojo.
 */
export function PlantWateringCard({
  plant,
  onWater,
  onEditFrequency,
}: PlantWateringCardProps) {
  const { commonName } = splitNameField(plant.name);
  const intervalLabel =
    plant.wateringIntervalDays !== null
      ? `Cada ${plant.wateringIntervalDays} días`
      : "Sin frecuencia";

  // Sub-phase 3-02: sin dato de último riego, todas las plantas son pending-first-time.
  // Sub-phase 3-03 reemplaza esta lógica con computeDaysRemaining().
  const status: "normal" | "urgent" | "overdue" | "pending-first" = "pending-first";

  // Per D-15 status copy + D-10 button copy:
  let statusText: string;
  let badgeText: string;
  let badgeIsWarn: boolean;
  let buttonLabel: string;

  switch (status) {
    case "pending-first":
      statusText = "Pendiente primera vez · Toca regar para empezar";
      badgeText = "—";
      badgeIsWarn = false;
      buttonLabel = "Regar";
      break;
    // Sub-phase 3-03 cablea estos otros branches:
    // case "normal": statusText = `Próximo riego en ${X} días`; buttonLabel = "Regada"; ...
    // case "urgent": statusText = "Toca regar hoy"; badgeIsWarn = true; ...
    // case "overdue": statusText = `Lleva ${Math.abs(X)} días esperándote`; badgeIsWarn = true; ...
    default:
      statusText = "";
      badgeText = "—";
      badgeIsWarn = false;
      buttonLabel = "Regar";
  }

  const handleWater = () => {
    if (onWater) {
      onWater(plant.id);
    } else {
      // Sub-phase 3-02: botón estático. Sub-phase 3-03 wirea useLogWatering.
      console.log("[PlantWateringCard] water tap (no-op in 3-02):", plant.id);
    }
  };

  const handleEditFrequency = () => {
    if (onEditFrequency) {
      onEditFrequency(plant.id);
    }
    // Sub-phase 3-04 wirea el picker. En 3-02 el tap no hace nada.
  };

  return (
    <article
      className="flex flex-col gap-3 p-4 bg-card border-2 border-foreground rounded-2xl"
      style={{ boxShadow: "var(--shadow-press)" }}
      aria-label={`Planta: ${commonName}`}
    >
      <div className="flex items-start gap-3">
        <img
          src={plant.imageUrl}
          alt={commonName}
          loading="lazy"
          className="size-16 shrink-0 object-cover rounded-xl border-2 border-foreground"
        />
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h2 className="font-display text-lg font-semibold text-foreground leading-tight">
            {commonName}
          </h2>
          <button
            type="button"
            onClick={handleEditFrequency}
            className="font-body text-sm text-muted-foreground text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            aria-label={`Frecuencia de riego: ${intervalLabel}. Pulsa para editar.`}
          >
            {intervalLabel}
          </button>
          <p className="font-body text-xs text-muted-foreground italic">
            {statusText}
          </p>
        </div>
        <span
          className={
            badgeIsWarn
              ? "shrink-0 px-2 py-1 rounded-lg bg-soft-warn-bg border-2 border-foreground font-display text-sm font-bold text-foreground"
              : "shrink-0 px-2 py-1 rounded-lg bg-muted border-2 border-foreground/30 font-display text-sm font-bold text-muted-foreground"
          }
          aria-label={`Estado: ${badgeText}`}
        >
          {badgeText}
        </span>
      </div>
      <button
        type="button"
        onClick={handleWater}
        className="w-full min-h-11 px-4 py-2.5 bg-primary text-primary-foreground border-2 border-foreground rounded-xl font-display text-base font-bold active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 transition-shadow"
        style={{ boxShadow: "var(--shadow-press)" }}
        aria-label={`${buttonLabel} ${commonName}`}
      >
        {buttonLabel}
      </button>
    </article>
  );
}
