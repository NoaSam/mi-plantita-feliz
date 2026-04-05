import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";

export interface PlantResult {
  id: string;
  name: string;
  description: string;
  care: string;
  diagnosis: string;
  imageUrl: string;
  date: string;
  model?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function compressImage(
  dataUrl: string,
  maxWidth = 400,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, 1);
      const width = Math.round(img.width * ratio);
      const height = Math.round(img.height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo crear el canvas"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = dataUrl;
  });
}

export function usePlantIdentifier() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PlantResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastResultRef = useRef<PlantResult | null>(null);

  const identify = useCallback(async (imageFile: File) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!imageFile.type.startsWith("image/")) {
        throw new Error("El archivo debe ser una imagen");
      }
      if (imageFile.size > MAX_FILE_SIZE) {
        throw new Error("La imagen no puede superar los 10 MB");
      }

      const rawBase64 = await fileToBase64(imageFile);
      const compressed = await compressImage(rawBase64);

      const { data, error: fnError } = await supabase.functions.invoke("identify-plant", {
        body: { image: compressed },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const now = new Date().toISOString();
      const model = data.model || undefined;

      // Track IMMEDIATELY after getting result, before any DB operations
      const { data: { session } } = await supabase.auth.getSession();
      const loggedIn = !!session?.user;
      track("plant_identified", { plant_name: data.name, logged_in: loggedIn, model });

      if (session?.user) {
        const { data: row, error: dbError } = await supabase
          .from("plant_searches")
          .insert({
            user_id: session.user.id,
            name: data.name,
            description: data.description,
            care: data.care,
            diagnosis: data.diagnosis,
            image_url: compressed,
            model: model ?? null,
          })
          .select()
          .single();

        if (dbError) throw new Error(dbError.message);

        const plantResult: PlantResult = {
          id: row.id,
          name: row.name,
          description: row.description,
          care: row.care,
          diagnosis: row.diagnosis,
          imageUrl: row.image_url,
          date: row.created_at,
          model,
        };

        setResult(plantResult);
        lastResultRef.current = plantResult;
      } else {
        const plantResult: PlantResult = {
          id: crypto.randomUUID(),
          name: data.name,
          description: data.description,
          care: data.care,
          diagnosis: data.diagnosis,
          imageUrl: compressed,
          date: now,
          model,
        };

        setResult(plantResult);
        lastResultRef.current = plantResult;

        try {
          const history = JSON.parse(localStorage.getItem("plant-history") || "[]");
          history.unshift(plantResult);
          localStorage.setItem("plant-history", JSON.stringify(history.slice(0, 20)));
        } catch {
          // localStorage full or unavailable — ignore
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(msg);
      track("plant_identification_failed", { error: msg });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitFeedback = useCallback((feedback: "correct" | "incorrect" | "unknown") => {
    const current = lastResultRef.current;
    if (!current) return;
    track("plant_feedback", {
      model: current.model,
      plant_name: current.name,
      feedback_value: feedback,
    });
  }, []);

  return { identify, isLoading, result, error, setResult, submitFeedback };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
