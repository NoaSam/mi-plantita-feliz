import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Leaf } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useHomePlants, type HomePlant } from "@/hooks/use-home-plants";
import { useLogWatering } from "@/hooks/use-log-watering";
import { useEditWateringInterval } from "@/hooks/use-edit-watering-interval";
import { PlantWateringCard } from "@/components/PlantWateringCard";
import { WateringFrequencyPicker } from "@/components/WateringFrequencyPicker";
import { computeStatus } from "@/lib/watering-countdown";

/**
 * /regar — ¿Toca regar? — Calendario de riego.
 *
 * Phase 3 sub-phase 3-03: lista completa con countdown real + botón funcional.
 *
 * D-09 sort order:
 *   1. overdue (X<0), more negative first
 *   2. urgent (X=0)
 *   3. normal (X>0) ascending X
 *   4. pending-first at the end
 *   Ties: alphabetical by common name.
 *
 * D-15 tono suave: header "Tus plantas casa" empático.
 */

function splitCommonName(name: string): string {
  const match = name.match(/^(.+?)\s*\(([^)]+)\)$/);
  return match ? match[1].trim() : name;
}

/**
 * D-09 sort key: lower = renders earlier.
 *   - overdue (X<0): negative integers (more negative = more overdue = renders first)
 *   - urgent (X=0): 0
 *   - normal (X>0): positive integers (smaller X = renders earlier)
 *   - pending-first: Number.POSITIVE_INFINITY (always last)
 * Tie-break by commonName alpha (handled in sort cb).
 */
function urgencyKey(plant: HomePlant): number {
  const { status, daysRemaining } = computeStatus({
    lastWateredAt: plant.lastWateredAt,
    intervalDays: plant.wateringIntervalDays,
  });
  if (status === "pending-first") return Number.POSITIVE_INFINITY;
  // daysRemaining is non-null when status !== 'pending-first'
  return daysRemaining ?? 0;
}

type PickerState =
  | { plant: HomePlant; mode: "edit" }
  | { plant: HomePlant; mode: "frequency-then-water" }
  | null;

export default function RegarPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { plants, isLoading: plantsLoading } = useHomePlants();
  const { logWatering, revertWatering } = useLogWatering();
  const { editInterval } = useEditWateringInterval();

  const [pickerState, setPickerState] = useState<PickerState>(null);

  const isLoading = authLoading || (!!user && plantsLoading);

  useEffect(() => {
    document.title = "¿Toca regar? · Mi Plantita Feliz";
  }, []);

  // D-09 sort por urgencia.
  const sortedPlants = useMemo(() => {
    return [...plants].sort((a, b) => {
      const ka = urgencyKey(a);
      const kb = urgencyKey(b);
      if (ka !== kb) return ka - kb;
      // Tie-break: alphabetical by common name.
      return splitCommonName(a.name).localeCompare(splitCommonName(b.name), "es");
    });
  }, [plants]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-20"
        aria-busy="true"
        aria-label="Cargando tus plantas"
      >
        <Leaf className="size-12 text-primary animate-pulse-slow" strokeWidth={1.2} />
      </div>
    );
  }

  if (plants.length === 0) {
    return <Navigate to="/" replace />;
  }

  const handleWater = async (plant: HomePlant) => {
    return logWatering(plant.id);
  };

  const handleUndo = async (
    plant: HomePlant,
    previousLastWateredAt: string | null,
  ) => {
    return revertWatering(plant.id, previousLastWateredAt);
  };

  // D-13: tap on "Cada N días" / "Sin frecuencia" text.
  const handleEditFrequency = (plant: HomePlant) => {
    setPickerState({ plant, mode: "edit" });
  };

  // D-14 case 2: tap on "Regar" when intervalDays is null.
  const handleWaterRequiringFrequency = (plant: HomePlant) => {
    setPickerState({ plant, mode: "frequency-then-water" });
  };

  const handlePickerSave = async (newDays: number) => {
    if (!pickerState) return;
    const { plant, mode } = pickerState;
    // Close optimistically — toast on outcome.
    setPickerState(null);

    const editResult = await editInterval(plant.id, newDays);
    if (!editResult.ok) {
      toast.error("No se pudo guardar la frecuencia. Inténtalo de nuevo.");
      return;
    }

    toast(`Frecuencia actualizada · Cada ${newDays} días`, { duration: 3000 });

    // D-14 case 2: tras editar, encadenar log de riego.
    if (mode === "frequency-then-water") {
      const logResult = await logWatering(plant.id);
      if (!logResult.ok) {
        toast.error(
          "La frecuencia se guardó, pero no se pudo registrar el riego. Inténtalo de nuevo.",
        );
      } else {
        toast(`✓ Regada · Siguiente riego en ${newDays} días`, {
          duration: 4000,
        });
      }
    }
  };

  const handlePickerCancel = () => {
    setPickerState(null);
  };

  return (
    <div className="px-6 py-8 pb-24">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-foreground">
          ¿Toca regar?
        </h1>
        <p className="font-body text-base text-muted-foreground">
          Tus plantas casa
        </p>
      </header>
      <ul className="flex flex-col gap-3" aria-label="Lista de plantas de casa">
        {sortedPlants.map((plant) => (
          <li key={plant.id}>
            <PlantWateringCard
              plant={plant}
              onWater={handleWater}
              onUndo={handleUndo}
              onEditFrequency={handleEditFrequency}
              onWaterRequiringFrequency={handleWaterRequiringFrequency}
            />
          </li>
        ))}
      </ul>

      {pickerState && (
        <WateringFrequencyPicker
          open={true}
          currentIntervalDays={pickerState.plant.wateringIntervalDays}
          plantName={splitCommonName(pickerState.plant.name)}
          onSave={handlePickerSave}
          onCancel={handlePickerCancel}
        />
      )}
    </div>
  );
}
