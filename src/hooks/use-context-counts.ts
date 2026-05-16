import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface ContextCounts {
  home: number;
  wild_with_coords: number;
  wild_without_coords: number;
  unclassified: number;
}

export interface UseContextCountsReturn extends ContextCounts {
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const ZERO: ContextCounts = {
  home: 0,
  wild_with_coords: 0,
  wild_without_coords: 0,
  unclassified: 0,
};

/**
 * Hook agregador de los 4 buckets de plant_searches del usuario actual.
 *
 * Para anónimos (user === null) devuelve siempre ZERO sin tocar Supabase
 * (per D-07: tabs nuevas nunca aparecen para anonymous; sus searches no
 * tienen `context` clasificado).
 *
 * Usa 4 queries paralelas con `count: "exact", head: true` (sin transfer
 * de filas; solo el header `Content-Range`) — más eficiente que select
 * completo + agregación en cliente.
 *
 * Refetch automático cuando se dispara `mp:pending-classification-resolved`
 * (Pattern S4 de PATTERNS.md) — cubre SPEC-AC2: la tab "Mapa" aparece
 * reactivamente al clasificar la primera wild con coords. (El dispatch del
 * evento se añade en Plan 04 a useClassifyPlant.ts.)
 */
export function useContextCounts(): UseContextCountsReturn {
  const { user } = useAuth();
  const [counts, setCounts] = useState<ContextCounts>(ZERO);
  const [isLoading, setIsLoading] = useState(true);
  // WR-02 fix: ref-tracked mounted boolean — patrón verbatim de
  // use-unclassified-count.ts líneas 24-33.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!user) {
      if (!mountedRef.current) return;
      setCounts(ZERO);
      setIsLoading(false);
      return;
    }

    // 4 head-only count queries en paralelo (no transfer de rows).
    const [home, wildWith, wildWithout, unclassified] = await Promise.all([
      supabase
        .from("plant_searches")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("context", "home"),
      supabase
        .from("plant_searches")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("context", "wild")
        .not("lat", "is", null)
        .not("lng", "is", null),
      supabase
        .from("plant_searches")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("context", "wild")
        .or("lat.is.null,lng.is.null"),
      supabase
        .from("plant_searches")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("context", "unclassified"),
    ]);

    if (!mountedRef.current) return;

    const anyError = home.error || wildWith.error || wildWithout.error || unclassified.error;
    if (anyError) {
      console.error("Error fetching context counts:", anyError.message);
      setCounts(ZERO);
      setIsLoading(false);
      return;
    }

    setCounts({
      home: home.count ?? 0,
      wild_with_coords: wildWith.count ?? 0,
      wild_without_coords: wildWithout.count ?? 0,
      unclassified: unclassified.count ?? 0,
    });
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Pattern S4: cross-component invalidation via CustomEvent (PATTERNS.md S4).
  // Cubre SPEC-AC2: tras clasificar una wild con coords, la tab Mapa
  // aparece sin reload del browser.
  //
  // Listens to TWO events:
  // - `mp:pending-classification-resolved`: fired by AuthContext after anon→auth
  //   claim flow processes a queued classification.
  // - `mp:plant-context-updated`: fired by useClassifyPlant after a UI-driven
  //   classify/revert. Separate event from the auth-claim one to avoid
  //   triggering the navigate-to-detail listener in App.tsx.
  useEffect(() => {
    const handler = () => {
      load();
    };
    window.addEventListener("mp:pending-classification-resolved", handler);
    window.addEventListener("mp:plant-context-updated", handler);
    return () => {
      window.removeEventListener("mp:pending-classification-resolved", handler);
      window.removeEventListener("mp:plant-context-updated", handler);
    };
  }, [load]);

  return {
    ...counts,
    isLoading,
    refetch: load,
  };
}
