import { Leaf } from "lucide-react";
import PhotoCapture from "@/components/PhotoCapture";
import LoadingScreen from "@/components/LoadingScreen";
import PlantResultView from "@/components/PlantResultView";
import { usePlantIdentifier } from "@/hooks/use-plant-identifier";

export default function Index() {
  const { identify, isLoading, result, error, setResult, submitFeedback } = usePlantIdentifier();

  const handleReset = () => {
    setResult(null);
  };

  if (isLoading) {
    return (
      <div className="px-6 py-8">
        <LoadingScreen />
      </div>
    );
  }

  if (result) {
    return (
      <div className="px-6 py-8">
        <PlantResultView result={result} onReset={handleReset} onFeedback={submitFeedback} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] px-6 gap-8">
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
  );
}
