import { useState } from "react";
import { toast } from "sonner";
import type { HomePlant } from "@/hooks/use-home-plants";
import { computeStatus } from "@/lib/watering-countdown";

/**
 * Splittea "Common (Scientific)" en sus dos partes.
 * Patrón copiado verbatim de PlantMapSheet (no importado para evitar coupling).
 */
function splitNameField(name: string): {
  commonName: string;
  scientificName: string | null;
} {
  const match = name.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (match) {
    return { commonName: match[1].trim(), scientificName: match[2].trim() };
  }
  return { commonName: name, scientificName: null };
}

export interface PlantWateringCardProps {
  plant: HomePlant;
  /**
   * Caller (RegarPage) wires this to `useLogWatering.logWatering`.
   * Optional to allow storybook/preview without DB.
   */
  onWater?: (plant: HomePlant) => Promise<{ ok: boolean }>;
  /**
   * Caller (RegarPage) wires this to `useLogWatering.revertWatering`.
   * If absent, the toast does not show a Deshacer action.
   */
  onUndo?: (
    plant: HomePlant,
    previousLastWateredAt: string | null,
  ) => Promise<{ ok: boolean }>;
  /**
   * Sub-phase 3-04: tap on "Cada N días" will open a picker.
   * In 3-03 it is not interactive yet.
   */
  onEditFrequency?: (plantId: string) => void;
}

/**
 * Card del listado /regar — representa una planta casa con su estado de riego.
 *
 * Phase 3 sub-phase 3-03: countdown real vía computeStatus(); botón wired
 * a onWater (optimistic UPDATE + Sonner toast con Deshacer); flash green
 * animation 1s tras log.
 *
 * Estados D-08:
 * - normal (X>0):    botón "Regada", badge gris, status "Próximo riego en X días"
 * - urgent (X=0):    botón "Regar", badge soft-warn, status "Toca regar hoy"
 * - overdue (X<0):   botón "Regar", badge soft-warn, status "Lleva N días esperándote"
 * - pending-first:   botón "Regar", badge "—", status "Pendiente primera vez · Toca regar para empezar"
 *
 * Sub-phase 3-04 cableará el flujo "pending-first sin intervalo" (D-14):
 * primer tap → picker frecuencia → setea intervalo → log.
 */
export function PlantWateringCard({
  plant,
  onWater,
  onUndo,
  onEditFrequency,
}: PlantWateringCardProps) {
  const { commonName } = splitNameField(plant.name);
  const [optimisticLastWatered, setOptimisticLastWatered] = useState<
    string | null | undefined
  >(undefined);
  const [flashing, setFlashing] = useState(false);

  // If there's an optimistic update, use that value; otherwise the DB value.
  const effectiveLastWateredAt =
    optimisticLastWatered === undefined ? plant.lastWateredAt : optimisticLastWatered;

  const { status, daysRemaining } = computeStatus({
    lastWateredAt: effectiveLastWateredAt,
    intervalDays: plant.wateringIntervalDays,
  });

  const intervalLabel =
    plant.wateringIntervalDays !== null
      ? `Cada ${plant.wateringIntervalDays} días`
      : "Sin frecuencia";

  // D-15 status copy + D-10 button label + badge styling per status.
  let statusText: string;
  let badgeText: string;
  let badgeIsWarn: boolean;
  let buttonLabel: string;

  switch (status) {
    case "normal":
      statusText = `Próximo riego en ${daysRemaining} días`;
      badgeText = `${daysRemaining} d`;
      badgeIsWarn = false;
      buttonLabel = "Regada";
      break;
    case "urgent":
      statusText = "Toca regar hoy";
      badgeText = "0 d";
      badgeIsWarn = true;
      buttonLabel = "Regar";
      break;
    case "overdue":
      statusText = `Lleva ${Math.abs(daysRemaining ?? 0)} días esperándote`;
      badgeText = `${daysRemaining} d`;
      badgeIsWarn = true;
      buttonLabel = "Regar";
      break;
    case "pending-first":
    default:
      statusText = "Pendiente primera vez · Toca regar para empezar";
      badgeText = "—";
      badgeIsWarn = false;
      buttonLabel = "Regar";
      break;
  }

  const handleWater = async () => {
    if (!onWater) {
      console.log("[PlantWateringCard] water tap (no onWater wired):", plant.id);
      return;
    }

    // VERIFICATION ajuste #2: prevent double-tap during the 1s flash window.
    // Without this guard, a quick second tap fires 2 UPDATE + 2 track + 2 toast.
    if (flashing) return;

    // Capture previous BEFORE optimistic mutation (for undo target).
    const previousLastWateredAt = plant.lastWateredAt;

    // 1. Optimistic update visible
    const newTimestamp = new Date().toISOString();
    setOptimisticLastWatered(newTimestamp);
    // 2. Flash animation 1s
    setFlashing(true);
    window.setTimeout(() => setFlashing(false), 1000);

    // 3. Persist immediately
    const result = await onWater(plant);

    if (!result.ok) {
      // Rollback optimistic + toast error
      setOptimisticLastWatered(undefined);
      setFlashing(false);
      toast.error("No se pudo guardar el riego. Inténtalo de nuevo.");
      return;
    }

    // 4. Build the toast copy. If the plant has no intervalDays yet,
    // the correct flow lives in sub-phase 3-04 — here we show a fallback.
    const newStatus = computeStatus({
      lastWateredAt: newTimestamp,
      intervalDays: plant.wateringIntervalDays,
    });
    const toastMessage =
      newStatus.daysRemaining !== null
        ? `✓ Regada · Siguiente riego en ${newStatus.daysRemaining} días`
        : "✓ Regada · Configura la frecuencia para ver el próximo riego";

    // 5. Sonner toast with Deshacer action (when onUndo wired).
    toast(toastMessage, {
      duration: 4000,
      ...(onUndo
        ? {
            action: {
              label: "Deshacer",
              onClick: async () => {
                setOptimisticLastWatered(previousLastWateredAt);
                setFlashing(false);
                const undoResult = await onUndo(plant, previousLastWateredAt);
                if (!undoResult.ok) {
                  toast.error(
                    "No se pudo deshacer el riego. Refresca para sincronizar.",
                  );
                } else {
                  setOptimisticLastWatered(undefined);
                }
              },
            },
          }
        : {}),
    });
  };

  const handleEditFrequency = () => {
    if (onEditFrequency) {
      onEditFrequency(plant.id);
    }
    // Sub-phase 3-04 wires this. In 3-03 without a handler it's a no-op.
  };

  return (
    <article
      className={`flex flex-col gap-3 p-4 bg-card border-2 border-foreground rounded-2xl ${flashing ? "animate-flash-success" : ""}`}
      style={{ boxShadow: "var(--shadow-press)" }}
      aria-label={`Planta: ${commonName}`}
      data-watering-status={status}
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
