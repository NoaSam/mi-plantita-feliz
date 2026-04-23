import { useState, useCallback, useEffect, useRef } from "react";
import imageCompression from "browser-image-compression";
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

const INVOKE_TIMEOUT_MS = 30_000;
const SAFETY_TIMEOUT_MS = 45_000;

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/identify-plant`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function usePlantIdentifier() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PlantResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout>>();

  // Safety net: if isLoading stays true for too long, force-reset.
  // This catches ANY hang — even ones the Promise timeouts miss.
  useEffect(() => {
    if (isLoading) {
      safetyTimer.current = setTimeout(() => {
        console.error("[identify] SAFETY TIMEOUT — forcing isLoading=false after", SAFETY_TIMEOUT_MS, "ms");
        setError("La identificación tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.");
        setIsLoading(false);
      }, SAFETY_TIMEOUT_MS);
    } else {
      clearTimeout(safetyTimer.current);
    }
    return () => clearTimeout(safetyTimer.current);
  }, [isLoading]);

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

      console.log("[identify] step 2: compress image (Web Worker)");
      const compressedBlob = await imageCompression(imageFile, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: "image/jpeg",
      });
      const compressed = await fileToBase64(compressedBlob);

      console.log("[identify] step 3: getSession");
      const { data: { session } } = await supabase.auth.getSession();
      const loggedIn = !!session?.user;

      const requestBody = {
        image: compressed,
        ...(session?.user
          ? { user_id: session.user.id }
          : { anonymous_id: getAnonymousId() }),
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      };

      console.log("[identify] step 4: fetch edge function (SSE)");
      const response = await fetch(EDGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${session?.access_token ?? ANON_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(INVOKE_TIMEOUT_MS),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let plantSearchId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const events = sseBuffer.split("\n\n");
        sseBuffer = events.pop() ?? "";

        for (const raw of events) {
          const eventName = raw.match(/^event: (.+)$/m)?.[1];
          const dataLine = raw.match(/^data: (.+)$/m)?.[1];
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine);

          if (eventName === "result") {
            const plantResult: PlantResult = {
              id: "",  // will be updated when "done" event arrives
              name: payload.name,
              description: payload.description,
              care: payload.care,
              diagnosis: payload.diagnosis,
              imageUrl: compressed,
              date: new Date().toISOString(),
              model: payload.model,
            };
            console.log("[identify] step 5: setResult (from SSE result event)");
            setResult(plantResult);

            track("plant_identified", {
              plant_name: payload.name,
              logged_in: loggedIn,
              winning_model: payload.model,
              has_location: !!coords,
            });
          }

          if (eventName === "error") {
            throw new Error(payload.error);
          }

          if (eventName === "done") {
            plantSearchId = payload.plant_search_id;
            // Update result with DB id and created_at
            setResult((prev) => prev ? {
              ...prev,
              id: payload.plant_search_id ?? prev.id,
              date: payload.created_at ?? prev.date,
            } : prev);
          }
        }
      }

      // localStorage for anonymous history (after done event provides the id)
      if (!session?.user && plantSearchId) {
        try {
          setResult((prev) => {
            if (prev) {
              const history = JSON.parse(localStorage.getItem("plant-history") || "[]");
              history.unshift({ ...prev, id: plantSearchId });
              localStorage.setItem("plant-history", JSON.stringify(history.slice(0, 20)));
            }
            return prev;
          });
        } catch {
          // localStorage full or unavailable
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      console.error("[identify] ERROR:", msg);
      setError(msg);
      track("plant_identification_failed", { error: msg });
    } finally {
      console.log("[identify] finally: setIsLoading(false)");
      setIsLoading(false);
    }
  }, []);

  return { identify, isLoading, result, error, setResult };
}

function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
