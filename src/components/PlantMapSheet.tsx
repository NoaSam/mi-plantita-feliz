import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale/es";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/track";
import type { WildPlantWithCoords } from "@/hooks/use-wild-plants-with-coords";

export interface PlantMapSheetProps {
  plant: WildPlantWithCoords | null;
  onClose: () => void;
}

/**
 * Split a `name` field that follows the legacy "Common (Scientific)" format
 * into its two parts. Fallback per RESEARCH.md A2:
 *   - If the regex matches → both names returned
 *   - If not → raw string treated as common, scientific is null
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

/**
 * Bottom sheet shown when a pin is tapped on the map.
 *
 * Visual lock per sketch 004 winner (Variant A) + UI-SPEC §2:
 * - Drag handle decorative bar
 * - Photo aspect-[4/3] (NOT square)
 * - Common name (Fraunces, semibold)
 * - Scientific name (italic, muted)
 * - Date "Identificada el {d} de {MMMM} de {yyyy}" via date-fns locale es
 * - 2 CTAs stacked vertical full-width (NOT side-by-side)
 *   Primary "Ver detalle" → navigate(`/planta/${plant.id}`)
 *   Secondary "Cerrar"  → onClose()
 * - NO eyebrow chip "Descubrimiento" (redundant on /mapa surface)
 *
 * Sheet behavior:
 * - Drag-to-close NOT supported (shadcn Sheet limitation, D-08 trade-off).
 *   Close via "Cerrar", tap-on-overlay, or Esc.
 * - max-h-[75dvh] preserves spatial context.
 * - pb-[max(1.5rem,env(safe-area-inset-bottom))] for iOS home indicator.
 *
 * Tracking: Plan 07 will add track("map_navigated_to_detail", ...) before navigate.
 */
export function PlantMapSheet({ plant, onClose }: PlantMapSheetProps) {
  const navigate = useNavigate();
  const open = plant !== null;

  const handleViewDetail = () => {
    if (!plant) return;
    track("map_navigated_to_detail", {
      plant_search_id: plant.id,
      from: "pin_sheet",
    });
    navigate(`/planta/${plant.id}`);
  };

  if (!plant) return null;

  const { commonName, scientificName } = splitNameField(plant.name);
  const dateLabel = `Identificada el ${format(new Date(plant.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })}`;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        className="bg-background border-t-2 border-foreground rounded-t-2xl p-6 max-h-[75dvh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-md sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
      >
        <div
          className="w-9 h-1 bg-foreground/25 rounded-full mx-auto mb-5"
          aria-hidden
        />

        <img
          src={plant.imageUrl}
          alt={commonName}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover rounded-xl border-2 border-foreground mb-4"
        />

        <SheetHeader className="items-start text-left gap-1 p-0">
          <SheetTitle className="font-display text-xl font-semibold leading-tight text-foreground">
            {commonName}
          </SheetTitle>
          {scientificName && (
            <p className="font-body text-sm italic text-muted-foreground leading-snug">
              {scientificName}
            </p>
          )}
        </SheetHeader>

        <SheetDescription className="font-body text-sm text-muted-foreground mt-3 mb-6">
          {dateLabel}
        </SheetDescription>

        <SheetFooter className="flex flex-col gap-2 sm:flex-col p-0">
          <Button
            variant="hero"
            size="default"
            onClick={handleViewDetail}
            className="w-full font-display text-base font-bold"
          >
            Ver detalle
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={onClose}
            className="w-full font-body text-base font-semibold border-2 border-foreground"
          >
            Cerrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
