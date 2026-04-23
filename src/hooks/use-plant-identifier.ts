import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";
import { getAnonymousId } from "@/lib/anonymous-id";
import type { Coords } from "@/hooks/use-geolocation";

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

const COMPRESS_TIMEOUT_MS = 10_000;
const INVOKE_TIMEOUT_MS = 60_000;

function compressImage(
  dataUrl: string,
  maxWidth = 400,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout al procesar la imagen. Inténtalo de nuevo."));
    }, COMPRESS_TIMEOUT_MS);

    const img = new Image();
    img.onload = () => {
      clearTimeout(timer);
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
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("No se pudo cargar la imagen"));
    };
    img.src = dataUrl;
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(msg)), ms)
    ),
  ]);
}

export function usePlantIdentifier() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PlantResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const identify = useCallback(async (imageFile: File, coords?: Coords | null) => {
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

      // Resolve identity — edge function handles the DB write
      const { data: { session } } = await supabase.auth.getSession();
      const loggedIn = !!session?.user;

      const requestBody = {
        image: compressed,
        ...(session?.user
          ? { user_id: session.user.id }
          : { anonymous_id: getAnonymousId() }),
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      };

      const { data: rawData, error: fnError } = await withTimeout(
        supabase.functions.invoke("identify-plant", { body: requestBody }),
        INVOKE_TIMEOUT_MS,
        "La identificación está tardando demasiado. Comprueba tu conexión e inténtalo de nuevo."
      );

      // Extract actual error from edge function response body when possible
      if (fnError) {
        const body = typeof rawData === "string" ? (() => { try { return JSON.parse(rawData); } catch { return null; } })() : rawData;
        throw new Error(body?.error || fnError.message);
      }

      const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      if (data?.error) throw new Error(data.error);

      const model = data.model || undefined;

      track("plant_identified", {
        plant_name: data.name,
        logged_in: loggedIn,
        winning_model: model,
        models: data.models ?? [],
        consensus_reached: Array.isArray(data.models) &&
          data.models.some((m: { consensus_group: string }) => m.consensus_group === "correct"),
        has_location: !!coords,
      });

      const plantResult: PlantResult = {
        id: data.plant_search_id,
        name: data.name,
        description: data.description,
        care: data.care,
        diagnosis: data.diagnosis,
        imageUrl: compressed,
        date: data.created_at ?? new Date().toISOString(),
        model,
      };

      setResult(plantResult);

      // Keep localStorage write for anonymous UX (history page reads from here)
      if (!session?.user) {
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
