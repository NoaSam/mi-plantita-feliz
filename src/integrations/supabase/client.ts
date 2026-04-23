import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { isNative } from '@/lib/platform';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

function buildCapacitorStorage() {
  // Dynamic import to avoid loading Capacitor in browser context
  const preferencesPromise = import("@capacitor/preferences").then(m => m.Preferences);

  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        const Preferences = await preferencesPromise;
        const { value } = await Preferences.get({ key });
        return value;
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        const Preferences = await preferencesPromise;
        await Preferences.set({ key, value });
      } catch { /* non-blocking */ }
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        const Preferences = await preferencesPromise;
        await Preferences.remove({ key });
      } catch { /* non-blocking */ }
    },
  };
}

const authStorage = isNative() ? buildCapacitorStorage() : localStorage;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
