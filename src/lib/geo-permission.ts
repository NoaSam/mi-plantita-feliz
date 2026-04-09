const STORAGE_KEY = "plantita_geo_permission";
const MAX_DECLINES = 3;

type StoredState = {
  status: "accepted" | "dismissed" | "pending";
  declineCount: number;
};

export function getGeoPermission(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function save(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

/** True when we should show the location consent modal. */
export function shouldAskForLocation(): boolean {
  const s = getGeoPermission();
  if (!s) return true; // never asked
  if (s.status === "accepted" || s.status === "dismissed") return false;
  return true;
}

/** True when the user previously accepted — get location silently. */
export function hasAcceptedLocation(): boolean {
  return getGeoPermission()?.status === "accepted";
}

export function recordAccept(): void {
  save({ status: "accepted", declineCount: 0 });
}

export function recordDecline(): void {
  const s = getGeoPermission();
  const count = (s?.declineCount ?? 0) + 1;
  save({
    status: count >= MAX_DECLINES ? "dismissed" : "pending",
    declineCount: count,
  });
}
