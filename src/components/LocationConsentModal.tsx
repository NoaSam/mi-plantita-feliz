import { useEffect } from "react";
import { MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/track";

interface LocationConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function LocationConsentModal({ open, onAccept, onDecline }: LocationConsentModalProps) {
  useEffect(() => {
    if (open) track("location_consent_shown");
  }, [open]);

  const handleAccept = () => {
    track("location_consent_accepted");
    onAccept();
  };

  const handleDecline = () => {
    track("location_consent_declined");
    onDecline();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="rounded-2xl max-w-[calc(100vw-3rem)]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="items-center gap-2">
          <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
            <MapPin className="size-6 text-primary" />
          </div>
          <DialogTitle className="font-display text-xl text-center">
            ¿Guardamos dónde hiciste la foto?
          </DialogTitle>
          <DialogDescription className="text-base text-center">
            Así podrás ver en un mapa todos los sitios donde encontraste tus plantas.
            Solo usamos la ubicación para eso, nada más.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-3 pt-2">
          <Button variant="default" size="lg" onClick={handleAccept} className="w-full">
            Sí, guardar ubicación
          </Button>
          <Button variant="ghost" size="lg" onClick={handleDecline} className="w-full text-muted-foreground">
            Ahora no
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
