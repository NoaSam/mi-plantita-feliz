import { useCallback } from "react";

export type Coords = { lat: number; lng: number };

export function useGeolocation() {
  const getLocation = useCallback((): Promise<Coords | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000, maximumAge: 60_000 },
      );
    });
  }, []);

  return { getLocation };
}
