import { useNavigate } from "react-router-dom";
import { BookOpen, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import PhotoCapture from "@/components/PhotoCapture";
import LoadingScreen from "@/components/LoadingScreen";
import PlantResultView from "@/components/PlantResultView";
import { usePlantIdentifier } from "@/hooks/use-plant-identifier";

export default function Index() {
  const navigate = useNavigate();
  const { identify, isLoading, result, error, setResult } = usePlantIdentifier();

  const handleReset = () => {
    setResult(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto px-6 py-8">
          <LoadingScreen />
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto px-6 py-8">
          <PlantResultView result={result} onReset={handleReset} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="max-w-md mx-auto w-full px-6 pt-8 flex justify-end">
        <Button
          variant="back"
          size="default"
          onClick={() => navigate("/mis-plantas")}
        >
          <BookOpen className="size-6" />
          Mis Plantas
        </Button>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-6 gap-8">
        <Leaf className="size-24 text-primary" strokeWidth={1.2} />
        <h1 className="font-display text-3xl font-bold text-foreground text-center leading-tight">
          Hola, ¿qué planta quieres ver hoy?
        </h1>
        <p className="text-lg text-muted-foreground text-center">
          Haz una foto y te diremos qué planta es, cómo cuidarla y si le pasa algo.
        </p>

        {error && (
          <div className="w-full p-4 bg-accent/10 border-2 border-accent rounded-2xl text-accent text-lg text-center">
            {error}
          </div>
        )}

        <div className="w-full">
          <PhotoCapture onCapture={identify} isLoading={isLoading} />
        </div>
      </div>

      <div className="py-8" />
    </div>
  );
}
