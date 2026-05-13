import { useState, useEffect, useCallback } from "react";
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

  // Single source of truth for the row shape — used by both the initial
  // useEffect and the public refetch. When the row mapping changes, only
  // this callback needs updating (D-11).
  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory(readLocalHistory());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("plant_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching history:", error.message);
      setHistory([]);
      setIsLoading(false);
      return;
    }

    setHistory(
      data.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        care: row.care,
        diagnosis: row.diagnosis,
        imageUrl: row.image_url,
        date: row.created_at,
        context: row.context as 'home' | 'wild' | 'unclassified',
      })),
    );
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Public refetch — same callback exposed for parent-driven refresh
  // after classify mutations (D-12: no Supabase realtime; manual refetch).
  const refetch = fetchHistory;

  const deletePlants = useCallback(async (ids: string[]) => {
    if (!user || ids.length === 0) return;

    const { error } = await supabase
      .from("plant_searches")
      .delete()
      .in("id", ids);

    if (error) {
      console.error("Error deleting plants:", error.message);
      return;
    }

    setHistory((prev) => prev.filter((p) => !ids.includes(p.id)));
  }, [user]);

  return { history, isLoading, deletePlants, refetch };
}
