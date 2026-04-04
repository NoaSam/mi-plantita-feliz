import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { PlantResult } from "@/hooks/use-plant-identifier";

function readLocalHistory(): PlantResult[] {
  try {
    return JSON.parse(localStorage.getItem("plant-history") || "[]");
  } catch {
    return [];
  }
}

export function usePlantHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<PlantResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHistory(readLocalHistory());
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchHistory() {
      const { data, error } = await supabase
        .from("plant_searches")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Error fetching history:", error.message);
        setHistory([]);
      } else {
        setHistory(
          data.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            care: row.care,
            diagnosis: row.diagnosis,
            imageUrl: row.image_url,
            date: row.created_at,
          })),
        );
      }

      setIsLoading(false);
    }

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { history, isLoading };
}
