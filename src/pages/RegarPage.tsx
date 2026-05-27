import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Leaf } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useHomePlants, type HomePlant } from "@/hooks/use-home-plants";
import { useLogWatering } from "@/hooks/use-log-watering";
import {
  useEditWateringInterval,
  type FrequencyEditSource,
} from "@/hooks/use-edit-watering-interval";
import { PlantWateringCard } from "@/components/PlantWateringCard";
import { WateringFrequencyPicker } from "@/components/WateringFrequencyPicker";
import { computeStatus } from "@/lib/watering-countdown";
import { track } from "@/lib/track";

/**
 * /regar — ¿Toca regar? — Calendario de riego.
 *
 * Sort order (CPO 2026-05-25):
 *   1. overdue (X<0), more negative first
 *   2. sin frecuencia — intervalDays === null (necesitan input del usuario)
 *   3. urgent (X=0)
 *   4. el resto — normal (X>0 ascending) + pending-first con IA al final
 *   Ties: alphabetical by common name.
 */

function splitCommonName(name: string): string {
  const match = name.match(/^(.+?)\s*\(([^)]+)\)$/);
  return match ? match[1].trim() : name;
}

function urgencyKey(plant: HomePlant): [number, number] {
  const { status, daysRemaining } = computeStatus({
    lastWateredAt: plant.lastWateredAt,
    intervalDays: plant.wateringIntervalDays,
  });
  if (status === "overdue") return [0, daysRemaining ?? 0];
  if (plant.wateringIntervalDays === null) return [1, 0];
  if (status === "urgent") return [2, 0];
  // Bucket 3 ("el resto"): normal (X>0) and pending-first-with-IA (no countdown).
  // Pending-first-with-IA goes to the end of the bucket via Infinity.
  return [3, daysRemaining ?? Number.POSITIVE_INFINITY];
}

type PickerState =
  | { plant: HomePlant; mode: "edit" }
  | { plant: HomePlant; mode: "frequency-then-water" }
  | null;

export default function RegarPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { plants, isLoading: plantsLoading } = useHomePlants();
  const { logWatering } = useLogWatering();
  const { editInterval } = useEditWateringInterval();
  const navigate = useNavigate();

  const [pickerState, setPickerState] = useState<PickerState>(null);
  const [trackedOpen, setTrackedOpen] = useState(false);

  const isLoading = authLoading || (!!user && plantsLoading);

  useEffect(() => {
    document.title = "¿Toca regar? · Mi Plantita Feliz";
  }, []);

  // D-17 evento 1: calendar_opened. Dispara una sola vez por montaje tras
  // resolverse isLoading (patrón verbatim MapPage:51-55).
  useEffect(() => {
    if (isLoading || trackedOpen) return;
    let overdueCount = 0;
    let pendingFirstTimeCount = 0;
    for (const p of plants) {
      const { status } = computeStatus({
        lastWateredAt: p.lastWateredAt,
        intervalDays: p.wateringIntervalDays,
      });
      if (status === "overdue") overdueCount += 1;
      if (status === "pending-first") pendingFirstTimeCount += 1;
    }
    track("calendar_opened", {
      home_count: plants.length,
      overdue_count: overdueCount,
      pending_first_time_count: pendingFirstTimeCount,
    });
    setTrackedOpen(true);
  }, [isLoading, trackedOpen, plants]);

  const sortedPlants = useMemo(() => {
    return [...plants].sort((a, b) => {
      const [ba, sa] = urgencyKey(a);
      const [bb, sb] = urgencyKey(b);
      if (ba !== bb) return ba - bb;
      if (sa !== sb) return sa - sb;
      return splitCommonName(a.name).localeCompare(splitCommonName(b.name), "es");
    });
  }, [plants]);

  const dueCount = useMemo(() => {
    return plants.reduce((count, p) => {
      const { status } = computeStatus({
        lastWateredAt: p.lastWateredAt,
        intervalDays: p.wateringIntervalDays,
      });
      return status === "urgent" ||
        status === "overdue" ||
        status === "pending-first"
        ? count + 1
        : count;
    }, 0);
  }, [plants]);

  const focusLine =
    dueCount === 0
      ? "Todo al día ✨"
      : dueCount === 1
        ? "Hoy toca regar 1 planta 💧"
        : `Hoy toca regar ${dueCount} plantas 💧`;

  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 py-20"
        aria-busy="true"
        aria-label="Cargando tus plantas"
      >
        <Leaf className="size-12 text-primary animate-pulse-slow" strokeWidth={1.2} />
        <p className="font-body text-sm text-muted-foreground">
          Cargando tus plantas…
        </p>
      </div>
    );
  }

  if (plants.length === 0) {
    return <Navigate to="/" replace />;
  }

  const handleWater = async (plant: HomePlant) => {
    return logWatering(plant);
  };

  const handleEditFrequency = (plant: HomePlant) => {
    setPickerState({ plant, mode: "edit" });
  };

  const handleWaterRequiringFrequency = (plant: HomePlant) => {
    setPickerState({ plant, mode: "frequency-then-water" });
  };

  const showWateredToast = (plant: HomePlant, intervalDays: number) => {
    toast(`✓ Regada · Siguiente riego en ${intervalDays} días`, {
      duration: 4000,
      action: {
        label: "Modificar frecuencia",
        onClick: () =>
          setPickerState({
            plant: { ...plant, wateringIntervalDays: intervalDays },
            mode: "edit",
          }),
      },
    });
  };

  const handlePickerSave = async (newDays: number) => {
    if (!pickerState) return;
    const { plant, mode } = pickerState;
    setPickerState(null);

    const prevDays = plant.wateringIntervalDays;
    const intervalChanged = prevDays !== newDays;

    if (intervalChanged) {
      const source: FrequencyEditSource =
        prevDays === null ? "null_filled_in_by_user" : "user_override";
      const editResult = await editInterval(plant.id, newDays, prevDays, source);
      if (!editResult.ok) {
        toast.error("No se pudo guardar la frecuencia. Inténtalo de nuevo.");
        return;
      }
      if (mode === "edit") {
        toast(`Frecuencia actualizada · Cada ${newDays} días`, { duration: 3000 });
      }
    }

    if (mode === "frequency-then-water") {
      const logResult = await logWatering({
        ...plant,
        wateringIntervalDays: newDays,
      });
      if (!logResult.ok) {
        toast.error(
          intervalChanged
            ? "La frecuencia se guardó, pero no se pudo registrar el riego. Inténtalo de nuevo."
            : "No se pudo registrar el riego. Inténtalo de nuevo.",
        );
        return;
      }
      showWateredToast(plant, newDays);
    }
  };

  const handlePickerCancel = () => {
    setPickerState(null);
  };

  // D-17 evento 5: track + navigate al detalle.
  const handleNavigateToDetail = (plant: HomePlant, position: number) => {
    track("calendar_card_navigated_to_detail", {
      plant_search_id: plant.id,
      position,
    });
    navigate(`/planta/${plant.id}`);
  };

  return (
    <div className="px-6 py-8 pb-24">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-foreground">
          ¿Toca regar?
        </h1>
        <p
          className="font-body text-base text-foreground"
          aria-live="polite"
          data-watering-focus
        >
          {focusLine}
        </p>
      </header>
      <ul className="flex flex-col gap-3" aria-label="Lista de plantas de casa">
        {sortedPlants.map((plant, index) => (
          <li key={plant.id}>
            <PlantWateringCard
              plant={plant}
              position={index}
              onWater={handleWater}
              onEditFrequency={handleEditFrequency}
              onWaterRequiringFrequency={handleWaterRequiringFrequency}
              onNavigateToDetail={handleNavigateToDetail}
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
