const STORAGE_KEY = "plantita_anon_id";

let cached: string | null = null;

export function hasAnonymousId(): boolean {
  if (cached) return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function getAnonymousId(): string {
  if (cached) return cached;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      cached = stored;
      return cached;
    }
  } catch { /* localStorage unavailable */ }
  cached = crypto.randomUUID();
  try { localStorage.setItem(STORAGE_KEY, cached); } catch { /* ignore */ }
  return cached;
}

export function clearAnonymousId(): void {
  cached = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
