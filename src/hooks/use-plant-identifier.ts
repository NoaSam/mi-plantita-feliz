import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlantResult {
  id: string;
  name: string;
  description: string;
  care: string;
  diagnosis: string;
  imageUrl: string;
  date: string;
}

export function usePlantIdentifier() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PlantResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const identify = useCallback(async (imageFile: File) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Convert image to base64
      const base64 = await fileToBase64(imageFile);

      const { data, error: fnError } = await supabase.functions.invoke("identify-plant", {
        body: { image: base64 },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const plantResult: PlantResult = {
        id: crypto.randomUUID(),
        name: data.name,
        description: data.description,
        care: data.care,
        diagnosis: data.diagnosis,
        imageUrl: base64,
        date: new Date().toISOString(),
      };

      setResult(plantResult);

      // Save to localStorage history
      const history = JSON.parse(localStorage.getItem("plant-history") || "[]");
      history.unshift(plantResult);
      localStorage.setItem("plant-history", JSON.stringify(history));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { identify, isLoading, result, error, setResult };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
