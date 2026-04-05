import { useRef } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoCaptureProps {
  onCapture: (file: File) => void;
  isLoading: boolean;
}

export default function PhotoCapture({ onCapture, isLoading }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
      e.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        variant="hero"
        size="xl"
        onClick={handleClick}
        disabled={isLoading}
        style={{ boxShadow: "var(--shadow-press)" }}
      >
        <Camera className="!size-10" />
        Hacer foto ahora
      </Button>
    </>
  );
}
