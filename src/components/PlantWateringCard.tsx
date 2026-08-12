import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import type { HomePlant } from "@/hooks/use-home-plants";
import { computeStatus } from "@/lib/watering-countdown";
import { getThumbnailUrl } from "@/lib/thumbnail-url";

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
  /** Position 0-based en la lista ordenada — propagado al tracking del tap-to-detail. */
  position: number;
  onWater?: (plant: HomePlant) => Promise<{ ok: boolean }>;
  /**
   * Tap on "Cada N días" / "Sin frecuencia" text, or the toast "Modificar
   * frecuencia" action. Caller opens the picker pre-filled with the
   * plant's current intervalDays.
   */
  onEditFrequency?: (plant: HomePlant) => void;
  /**
   * Invoked when the user taps "Regar" on a pending-first plant. Caller
   * opens the picker first (prefilled with the IA recommendation when
   * available); on save, the picker chains logWatering.
   */
  onWaterRequiringFrequency?: (plant: HomePlant) => void;
  onNavigateToDetail?: (plant: HomePlant, position: number) => void;
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
  position,
  onWater,
  onEditFrequency,
  onWaterRequiringFrequency,
  onNavigateToDetail,
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
    // VERIFICATION ajuste #2: prevent double-tap during the 1s flash window.
    if (flashing) return;

    // Pending-first: open the picker (prefilled with IA recommendation if any)
    // so the user can confirm/adjust before the first watering is logged.
    if (status === "pending-first") {
      if (onWaterRequiringFrequency) {
        onWaterRequiringFrequency(plant);
        return;
      }
      console.warn(
        "[PlantWateringCard] pending-first plant with no onWaterRequiringFrequency wired:",
        plant.id,
      );
    }

    if (!onWater) {
      console.log("[PlantWateringCard] water tap (no onWater wired):", plant.id);
      return;
    }

    const newTimestamp = new Date().toISOString();
    setOptimisticLastWatered(newTimestamp);
    setFlashing(true);
    window.setTimeout(() => setFlashing(false), 1000);

    const result = await onWater(plant);

    if (!result.ok) {
      setOptimisticLastWatered(undefined);
      setFlashing(false);
      toast.error("No se pudo guardar el riego. Inténtalo de nuevo.");
      return;
    }

    const newStatus = computeStatus({
      lastWateredAt: newTimestamp,
      intervalDays: plant.wateringIntervalDays,
    });
    const toastMessage =
      newStatus.daysRemaining !== null
        ? `✓ Regada · Siguiente riego en ${newStatus.daysRemaining} días`
        : "✓ Regada · Configura la frecuencia para ver el próximo riego";

    toast(toastMessage, {
      duration: 4000,
      ...(onEditFrequency
        ? {
            action: {
              label: "Modificar frecuencia",
              onClick: () => onEditFrequency(plant),
            },
          }
        : {}),
    });
  };

  const handleEditFrequency = () => {
    if (onEditFrequency) {
      onEditFrequency(plant);
    }
  };

  // D-17 evento 5: tap en el área principal de la card → detalle.
  // Usamos div role="button" para evitar HTML inválido (nested <button>): el
  // botón frecuencia interno necesita su propio click area sin anidamiento.
  const handleCardClick = () => {
    if (onNavigateToDetail) {
      onNavigateToDetail(plant, position);
    }
  };

  return (
    <article
      className={`flex flex-col gap-3 p-4 bg-card border-2 border-foreground rounded-2xl ${flashing ? "animate-flash-success" : ""}`}
      style={{ boxShadow: "var(--shadow-press)" }}
      aria-label={`Planta: ${commonName}`}
      data-watering-status={status}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        className="w-full flex items-start gap-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring rounded-xl"
        aria-label={`Ver detalle de ${commonName}`}
      >
        {/* Photo — 64×64 display (size-16 = 4rem = 64px); 2× for retina */}
        <img
          src={getThumbnailUrl(plant.imageUrl, 128)}
          alt=""
          loading="lazy"
          decoding="async"
          width={64}
          height={64}
          className="size-16 shrink-0 object-cover rounded-xl border-2 border-foreground"
        />
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h2 className="font-display text-lg font-semibold text-foreground leading-tight">
            {commonName}
          </h2>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEditFrequency();
            }}
            className="font-body text-sm text-muted-foreground text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded inline-flex items-center gap-1.5"
            aria-label={`Frecuencia de riego: ${intervalLabel}. Pulsa para editar.`}
          >
            <span>{intervalLabel}</span>
            <Pencil className="size-3 shrink-0" strokeWidth={2} aria-hidden />
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
