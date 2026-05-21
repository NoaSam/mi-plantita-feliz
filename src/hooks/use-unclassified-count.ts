import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface UnclassifiedThumb {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: string;
}

export interface UseUnclassifiedCountReturn {
  count: number;
  recent: UnclassifiedThumb[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useUnclassifiedCount(): UseUnclassifiedCountReturn {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [recent, setRecent] = useState<UnclassifiedThumb[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // WR-02 fix: ref-tracked mounted boolean so the async load() can guard every
  // setState against an unmounted component without smuggling the flag through
  // every helper.
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
      setCount(0);
      setRecent([]);
      setIsLoading(false);
      return;
    }
    // Single round-trip: rows + exact count via PostgREST count parameter.
    const { data, error, count: exactCount } = await supabase
      .from("plant_searches")
      .select("id, name, image_url, created_at", { count: "exact" })
      .eq("user_id", user.id)
      .eq("context", "unclassified")
      .order("created_at", { ascending: false })
      .limit(4);

    if (!mountedRef.current) return;

    if (error) {
      console.error("Error fetching unclassified count:", error.message);
      setCount(0);
      setRecent([]);
      setIsLoading(false);
      return;
    }

    setCount(exactCount ?? 0);
    setRecent(
      (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        imageUrl: row.image_url,
        createdAt: row.created_at,
      })),
    );
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { count, recent, isLoading, refetch: load };
}
