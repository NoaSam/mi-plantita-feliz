import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  writePendingClassification,
  clearPendingClassification,
} from "@/lib/pending-classification";
import { track } from "@/lib/track";

export interface AnonClassificationWallProps {
  open: boolean;
  intendedAction: 'home' | 'wild';
  plantSearchId: string;
  anonymousId: string;
  onOpenChange: (open: boolean) => void;
}

export default function AnonClassificationWall({
  open,
  intendedAction,
  plantSearchId,
  anonymousId,
  onOpenChange,
}: AnonClassificationWallProps) {
  const navigate = useNavigate();

  // On open: persist intent to sessionStorage and fire shown event (D-01, D-02, D-14).
  useEffect(() => {
    if (!open) return;
    writePendingClassification({
      plant_search_id: plantSearchId,
      action: intendedAction,
      anonymous_id: anonymousId,
    });
    track("anon_classification_wall_shown", { intended_action: intendedAction });
  }, [open, intendedAction, plantSearchId, anonymousId]);

  const handleSignup = () => {
    track("anon_classification_wall_action", {
      action: 'signup',
      intended_action: intendedAction,
    });
    navigate("/signup");
  };

  const handleLogin = () => {
    track("anon_classification_wall_action", {
      action: 'login',
      intended_action: intendedAction,
    });
    navigate("/login");
  };

  const handleDismiss = () => {
    track("anon_classification_wall_action", {
      action: 'dismiss',
      intended_action: intendedAction,
    });
    clearPendingClassification();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-background border-t-2 border-foreground p-6 rounded-t-2xl"
      >
        <SheetHeader className="items-center gap-2">
          <div
            className="size-14 mx-auto mb-3 rounded-full border-2 border-foreground bg-secondary flex items-center justify-center text-2xl"
            style={{ boxShadow: "var(--shadow-press)" }}
            aria-hidden
          >
            🔒
          </div>
          <SheetTitle className="font-display text-xl font-bold text-center">
            Necesitas una cuenta
          </SheetTitle>
          <SheetDescription className="font-body text-base leading-relaxed text-muted-foreground text-center mb-2">
            Para guardar esta planta en tu jardín o como descubrimiento, crea una cuenta o inicia sesión.{' '}
            <strong className="text-foreground font-semibold">No perderás esta identificación</strong>
            {' '}— al iniciar sesión, la planta aparecerá ya clasificada en tu historial.
          </SheetDescription>
        </SheetHeader>

        <SheetFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            variant="hero"
            size="default"
            onClick={handleSignup}
            className="w-full font-display text-base font-bold"
          >
            Crear cuenta
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={handleLogin}
            className="w-full font-body text-base font-semibold border-2 border-foreground"
          >
            Iniciar sesión
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="w-full font-body text-sm text-muted-foreground underline underline-offset-2"
          >
            Volver sin guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
