import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Leaf } from "lucide-react";
import { toast } from "sonner";
import PlantResultView from "@/components/PlantResultView";
import { usePlantById } from "@/hooks/use-plant-by-id";

export default function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { plant, isLoading, notFound } = usePlantById(id);

  useEffect(() => {
    if (notFound) {
      toast.error("Esta planta no existe o ya no está disponible");
      navigate("/", { replace: true });
    }
  }, [notFound, navigate]);

  const handleBack = () => {
    // In iOS PWA standalone there is no browser back button, so the page
    // must provide its own. Falls back to home if there's no history entry
    // (e.g. user opened a deep link directly).
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  };

  if (isLoading) {
    return (
      <div className="px-6 py-8 flex justify-center">
        <Leaf className="size-10 text-primary animate-pulse-slow" strokeWidth={1.2} />
      </div>
    );
  }

  if (!plant) return null;

  return (
    <div className="px-6 py-8">
      <button
        type="button"
        onClick={handleBack}
        aria-label="Volver"
        className="inline-flex items-center gap-1.5 mb-4 -ml-1 py-2 pr-3 pl-1 rounded-lg text-foreground hover:bg-foreground/5 active:bg-foreground/10 transition-colors"
      >
        <ArrowLeft className="size-5" strokeWidth={2} />
        <span className="font-body text-sm font-medium">Atrás</span>
      </button>
      <PlantResultView plant={plant} />
    </div>
  );
}
