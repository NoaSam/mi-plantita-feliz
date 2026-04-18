import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import LocationConsentModal from "@/components/LocationConsentModal";
import { useGeolocation, isBrowserPermissionGranted, type Coords } from "@/hooks/use-geolocation";
import { shouldAskForLocation, hasAcceptedLocation, recordAccept, recordDecline } from "@/lib/geo-permission";
import { isIOS } from "@/lib/platform";

interface PhotoCaptureProps {
  onCapture: (file: File, coords: Coords | null) => void;
  isLoading: boolean;
}

export default function PhotoCapture({ onCapture, isLoading }: PhotoCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { getLocation, getLocationSilently } = useGeolocation();
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
      <Button
        variant="hero"
        size="xl"
        onClick={handleCameraClick}
        disabled={isLoading}
        style={{ boxShadow: "var(--shadow-press)" }}
      >
        <Camera className="!size-10" />
        Hacer foto ahora
      </Button>
      {!ios && (
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
