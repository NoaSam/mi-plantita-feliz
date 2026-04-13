import { useCallback, useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConsentPreferences {
  analytics: boolean;
  sessionRecording: boolean;
}

interface ConsentState {
  /** null = user hasn't made any choice yet */
  preferences: ConsentPreferences | null;
}

// ---------------------------------------------------------------------------
// Storage key & helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "plantita_consent";

function readFromStorage(): ConsentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { preferences: null };
    return { preferences: JSON.parse(raw) as ConsentPreferences };
  } catch {
    return { preferences: null };
  }
}

function writeToStorage(prefs: ConsentPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  // Notify all subscribers (triggers useSyncExternalStore re-render)
  listeners.forEach((l) => l());
}

// ---------------------------------------------------------------------------
// External store (singleton shared across all hook instances)
// ---------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ConsentPreferences | null {
  return readFromStorage().preferences;
}

// ---------------------------------------------------------------------------
// Pure utility functions (usable outside React)
// ---------------------------------------------------------------------------

/** Read current preferences (or null if no choice made). */
export function getConsentPreferences(): ConsentPreferences | null {
  return readFromStorage().preferences;
}

/** Whether the user has made any consent choice at all. */
export function hasConsented(): boolean {
  return readFromStorage().preferences !== null;
}

/** Whether analytics consent is granted. */
export function isAnalyticsAllowed(): boolean {
  return readFromStorage().preferences?.analytics === true;
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export function useConsent() {
  const preferences = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const acceptAll = useCallback(() => {
    const prefs: ConsentPreferences = { analytics: true, sessionRecording: true };
    writeToStorage(prefs);
  }, []);

  const rejectAll = useCallback(() => {
    const prefs: ConsentPreferences = { analytics: false, sessionRecording: false };
    writeToStorage(prefs);
  }, []);

  const updatePreferences = useCallback((prefs: ConsentPreferences) => {
    writeToStorage(prefs);
  }, []);

  return {
    /** Current preferences, or null if no choice made yet. */
    preferences,
    /** Whether user has made any consent decision. */
    hasConsented: preferences !== null,
    acceptAll,
    rejectAll,
    updatePreferences,
  };
}
