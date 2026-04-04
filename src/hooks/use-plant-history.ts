import { useState } from "react";
import type { PlantResult } from "@/hooks/use-plant-identifier";

function readHistory(): PlantResult[] {
  try {
    return JSON.parse(localStorage.getItem("plant-history") || "[]");
  } catch {
    return [];
  }
}

export function usePlantHistory() {
  const [history] = useState<PlantResult[]>(readHistory);

  return { history };
}
