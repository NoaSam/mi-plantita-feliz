import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Leaf } from "lucide-react";
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
      <PlantResultView plant={plant} />
    </div>
  );
}
