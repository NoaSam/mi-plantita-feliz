import { useState, useMemo } from "react";
import type { PlantResult } from "@/hooks/use-plant-identifier";

export function usePlantHistory() {
  const [refreshKey, setRefreshKey] = useState(0);

  const history: PlantResult[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    refreshKey; // trigger re-read
    try {
      return JSON.parse(localStorage.getItem("plant-history") || "[]");
    } catch {
      return [];
    }
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return { history, refresh };
}
