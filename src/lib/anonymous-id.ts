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
  cached = globalThis.crypto?.randomUUID?.()
    ?? Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b, i) => ([4,6,8,10].includes(i) ? "-" : "") + b.toString(16).padStart(2, "0"))
        .join("");
  try { localStorage.setItem(STORAGE_KEY, cached); } catch { /* ignore */ }
  return cached;
}

export function clearAnonymousId(): void {
  cached = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
