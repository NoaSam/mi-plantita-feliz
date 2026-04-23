import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import LocationConsentModal from "@/components/LocationConsentModal";
import { useGeolocation, isBrowserPermissionGranted, type Coords } from "@/hooks/use-geolocation";
import { shouldAskForLocation, hasAcceptedLocation, recordAccept, recordDecline } from "@/lib/geo-permission";
import { isIOS, isNative } from "@/lib/platform";

interface PhotoCaptureProps {
  onCapture: (file: File, coords: Coords | null) => void;
  isLoading: boolean;
}

export default function PhotoCapture({ onCapture, isLoading }: PhotoCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const { getLocation, getLocationSilently } = useGeolocation();
  const native = isNative();
  const ios = isIOS();

  const handleCameraClick = () => cameraRef.current?.click();
  const handleGalleryClick = () => galleryRef.current?.click();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (shouldAskForLocation()) {
      pendingFile.current = file;
      setModalOpen(true);
    } else if (hasAcceptedLocation()) {
      // Check if browser still has permission — if lost/revoked, re-ask with our modal
      const granted = await isBrowserPermissionGranted();
      if (granted) {
        const coords = await getLocationSilently();
        onCapture(file, coords);
      } else {
        pendingFile.current = file;
        setModalOpen(true);
      }
    } else {
      onCapture(file, null);
    }
  };

  const handleNativeCapture = async () => {
    try {
      const { Camera: CapCamera, CameraResultType, CameraSource } = await import("@capacitor/camera");

      // Check and request camera permission
      const permStatus = await CapCamera.checkPermissions();
      if (permStatus.camera === "denied") {
        setPermissionDenied(true);
        return;
      }
      if (permStatus.camera !== "granted") {
        const requested = await CapCamera.requestPermissions({ permissions: ["camera"] });
        if (requested.camera !== "granted") {
          return;
        }
      }

      const photo = await CapCamera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        quality: 70,
      });

      if (!photo.dataUrl) return;

      // Convert DataUrl to File to keep the onCapture(File, Coords) contract frozen
      const res = await fetch(photo.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "plant-photo.jpg", { type: "image/jpeg" });

      // Follow the same location consent flow as handleChange
      if (shouldAskForLocation()) {
        pendingFile.current = file;
        setModalOpen(true);
      } else if (hasAcceptedLocation()) {
        const granted = await isBrowserPermissionGranted();
        if (granted) {
          const coords = await getLocationSilently();
          onCapture(file, coords);
        } else {
          pendingFile.current = file;
          setModalOpen(true);
        }
      } else {
        onCapture(file, null);
      }
    } catch {
      // User cancelled or plugin error — swallow silently
    }
  };

  const handleAccept = async () => {
    recordAccept();
    setModalOpen(false);
    const file = pendingFile.current;
    pendingFile.current = null;
    if (!file) return;
    // First time: may trigger native browser prompt (unavoidable)
    const coords = await getLocation();
    onCapture(file, coords);
  };

  const handleDecline = () => {
    recordDecline();
    setModalOpen(false);
    const file = pendingFile.current;
    pendingFile.current = null;
    if (!file) return;
    onCapture(file, null);
  };

  return (
    <>
      {permissionDenied && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Permiso de cámara necesario</p>
          <p className="mt-1">
            Para identificar plantas, necesitamos acceso a tu cámara.
            Ve a Ajustes &gt; Aplicaciones &gt; Mi jardín &gt; Permisos para activarlo.
          </p>
          <button
            type="button"
            onClick={() => setPermissionDenied(false)}
            className="mt-2 text-xs underline"
          >
            Entendido
          </button>
        </div>
      )}
      {!native && (
        <>
          {ios ? (
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleChange}
            />
          ) : (
            <>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleChange}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleChange}
              />
            </>
          )}
        </>
      )}
      <Button
        variant="hero"
        size="xl"
        onClick={native ? handleNativeCapture : handleCameraClick}
        disabled={isLoading}
        style={{ boxShadow: "var(--shadow-press)" }}
      >
        <Camera className="!size-10" />
        Hacer foto ahora
      </Button>
      {!native && !ios && (
        <button
          type="button"
          onClick={handleGalleryClick}
          disabled={isLoading}
          className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          Subir desde galería
        </button>
      )}
      <LocationConsentModal open={modalOpen} onAccept={handleAccept} onDecline={handleDecline} />
    </>
  );
}
