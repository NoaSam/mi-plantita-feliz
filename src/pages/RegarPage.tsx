import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useHomePlants } from "@/hooks/use-home-plants";
import { PlantWateringCard } from "@/components/PlantWateringCard";

/**
 * /regar — ¿Toca regar? — Calendario de riego.
 *
 * Phase 3 sub-phase 3-02: lista estática de plantas casa. Todas las
 * plantas aparecen en estado "Pendiente primera vez" porque la columna
 * `last_watered_at` no existe todavía. Sub-phase 3-03 añade la columna,
 * la lógica de countdown, y el botón Regar/Regada funcional.
 * Sub-phase 3-04 añade el frequency picker.
 * Sub-phase 3-05 añade PostHog tracking + tests + E2E.
 *
 * D-15 tono suave: header empático "Tus plantas casa" (no "Lista de tareas").
 *
 * Redirect-on-empty defensivo: la tab Regar solo aparece con home_count>=1
 * (sub-phase 3-01), pero un deep-link directo a /regar sin plantas debe
 * redirigir silenciosamente a `/` — mismo patrón que MapPage.
 */
export default function RegarPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { plants, isLoading: plantsLoading } = useHomePlants();
  // Wait for: (a) auth resolved, (b) user known, (c) home-plants query run at
  // least once. Sin (c) hay un render-window post-mount donde plantsLoading=false
  // (stale del no-user gate) y plants=[] (stale) que triggerearía un redirect
  // prematuro. Patrón verbatim de MapPage.tsx:36-43.
  const isLoading = authLoading || (!!user && plantsLoading);

  useEffect(() => {
    document.title = "¿Toca regar? · Mi Plantita Feliz";
  }, []);

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

  // Defensive: tab solo aparece con home_count>=1 (sub-phase 3-01), pero
  // un deep-link directo o un usuario que perdió todas sus plantas debería
  // redirigir silenciosamente a home. NO mostrar empty state copy en /regar
  // (la tab no debería estar visible si esto pasa).
  if (plants.length === 0) {
    return <Navigate to="/" replace />;
  }

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
        {plants.map((plant) => (
          <li key={plant.id}>
            <PlantWateringCard plant={plant} />
          </li>
        ))}
      </ul>
    </div>
  );
}
