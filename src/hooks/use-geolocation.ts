import { useCallback } from "react";

export type Coords = { lat: number; lng: number };

async function isBrowserPermissionGranted(): Promise<boolean> {
  if (!navigator.permissions) return false;
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state === "granted";
  } catch {
    return false;
  }
}

function readPosition(): Promise<Coords | null> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60_000 },
    );
  });
}

export function useGeolocation() {
  /** Requests location — may trigger the native browser prompt. */
  const getLocation = useCallback((): Promise<Coords | null> => {
    if (!navigator.geolocation) return Promise.resolve(null);
    return readPosition();
  }, []);

  /** Gets location ONLY if the browser already granted permission. Never shows a prompt. */
  const getLocationSilently = useCallback(async (): Promise<Coords | null> => {
    if (!navigator.geolocation) return null;
    const granted = await isBrowserPermissionGranted();
    if (!granted) return null;
    return readPosition();
  }, []);

  return { getLocation, getLocationSilently };
}
