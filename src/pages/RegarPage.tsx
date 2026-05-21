import { useEffect } from "react";

/**
 * /regar — ¿Toca regar? — Calendario de riego.
 *
 * Phase 3 sub-phase 3-01: placeholder shell. Solo renderiza el header.
 * Sub-phase 3-02 añade: useHomePlants + PlantWateringCard list +
 * redirect-on-empty + sort by urgency.
 * Sub-phase 3-03 añade: countdown real + botón Regar/Regada.
 * Sub-phase 3-04 añade: frequency picker + pendiente primera vez.
 * Sub-phase 3-05 añade: PostHog tracking + tests + E2E.
 *
 * Tono suave (D-15): header empático "Tus plantas casa" (no "Lista de tareas").
 * El título visible "¿Toca regar?" se locked-in en D-02 — el header de la pantalla
 * debe transmitir cuidado, no obligación.
 */
export default function RegarPage() {
  useEffect(() => {
    document.title = "¿Toca regar? · Mi Plantita Feliz";
  }, []);

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
      {/* Sub-phase 3-02 reemplaza este placeholder con la lista de plantas. */}
    </div>
  );
}
