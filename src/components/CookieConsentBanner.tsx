import { useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useConsent, type ConsentPreferences } from "@/hooks/use-consent";
import { initPostHog } from "@/lib/track";

export default function CookieConsentBanner() {
  const { hasConsented, acceptAll, rejectAll, updatePreferences } = useConsent();
  const [showConfig, setShowConfig] = useState(false);
  const [draftPrefs, setDraftPrefs] = useState<ConsentPreferences>({
    analytics: false,
    sessionRecording: false,
  });

  // Don't render if user has already made a choice
  if (hasConsented) return null;

  const handleAcceptAll = () => {
    acceptAll();
    // Initialize PostHog now that consent is granted
    initPostHog();
  };

  const handleRejectAll = () => {
    rejectAll();
  };

  const handleSaveConfig = () => {
    updatePreferences(draftPrefs);
    if (draftPrefs.analytics) {
      initPostHog();
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Configuración de cookies"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe"
    >
      <div className="max-w-md mx-auto bg-background border-2 border-foreground rounded-2xl p-5 shadow-lg">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex items-center justify-center size-10 rounded-full bg-primary/10 shrink-0">
            <Cookie className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Cookies y privacidad
            </h2>
            <p className="text-base text-muted-foreground mt-1">
              Usamos cookies para mejorar tu experiencia y analizar el uso de la
              app.{" "}
              <Link
                to="/cookies"
                className="underline underline-offset-2 text-primary hover:text-primary/80"
              >
                Política de cookies
              </Link>
            </p>
          </div>
        </div>

        {/* Configuration toggles */}
        {showConfig && (
          <div className="flex flex-col gap-4 mb-4 p-4 bg-secondary/50 rounded-xl">
            {/* Strictly necessary — always on */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-base font-semibold">
                  Esenciales
                </Label>
                <p className="text-sm text-muted-foreground">
                  Necesarias para que la app funcione (inicio de sesión, preferencias).
                </p>
              </div>
              <Switch checked disabled aria-label="Cookies esenciales (siempre activas)" />
            </div>

            {/* Analytics */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="consent-analytics" className="text-base font-semibold">
                  Analíticas
                </Label>
                <p className="text-sm text-muted-foreground">
                  Nos ayudan a entender cómo se usa la app para mejorarla.
                </p>
              </div>
              <Switch
                id="consent-analytics"
                checked={draftPrefs.analytics}
                onCheckedChange={(checked) =>
                  setDraftPrefs((prev) => ({ ...prev, analytics: checked }))
                }
              />
            </div>

            {/* Session recording */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="consent-recording" className="text-base font-semibold">
                  Grabación de sesión
                </Label>
                <p className="text-sm text-muted-foreground">
                  Graba de forma anónima la interacción para detectar errores.
                </p>
              </div>
              <Switch
                id="consent-recording"
                checked={draftPrefs.sessionRecording}
                onCheckedChange={(checked) =>
                  setDraftPrefs((prev) => ({ ...prev, sessionRecording: checked }))
                }
              />
            </div>

            <Button
              variant="default"
              size="lg"
              onClick={handleSaveConfig}
              className="w-full"
            >
              Guardar preferencias
            </Button>
          </div>
        )}

        {/* Action buttons — equal prominence for accept and reject (no dark patterns) */}
        {!showConfig && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <Button
                variant="default"
                onClick={handleAcceptAll}
                className="flex-1 min-w-0"
              >
                Aceptar todo
              </Button>
              <Button
                variant="outline"
                onClick={handleRejectAll}
                className="flex-1 min-w-0"
              >
                Rechazar todo
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowConfig(true)}
              className="w-full text-muted-foreground"
            >
              Configurar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
