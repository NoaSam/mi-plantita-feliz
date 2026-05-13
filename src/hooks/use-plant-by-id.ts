import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlantResult } from "@/hooks/use-plant-identifier";

export interface UsePlantByIdReturn {
  plant: PlantResult | null;
  isLoading: boolean;
  notFound: boolean;
}

/**
 * Fetches a single plant_searches row by id.
 * RLS denies / 0 rows → notFound = true (per D-06).
 * Caller in PlantDetail page surfaces toast + navigate('/').
 */
export function usePlantById(id: string): UsePlantByIdReturn {
  const [plant, setPlant] = useState<PlantResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("plant_searches")
        .select("*")
        .eq("id", id)
        .maybeSingle(); // 0 rows → null, not error

      if (cancelled) return;

      if (error || !data) {
        if (error) console.error("Error fetching plant by id:", error.message);
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setPlant({
        id: data.id,
        name: data.name,
        description: data.description,
        care: data.care,
        diagnosis: data.diagnosis,
        imageUrl: data.image_url,
        date: data.created_at,
        model: data.model ?? undefined,
        context: data.context as 'home' | 'wild' | 'unclassified',
      });
      setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [id]);

  return { plant, isLoading, notFound };
}
