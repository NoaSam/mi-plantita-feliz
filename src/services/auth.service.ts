import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";
import { hasAnonymousId, getAnonymousId, clearAnonymousId } from "@/lib/anonymous-id";
import { isNative } from "@/lib/platform";

const PRODUCTION_URL = "https://mi-plantita-feliz.vercel.app";

const ERROR_MAP: Record<string, string> = {
  "Invalid login credentials": "Email o contraseña incorrectos",
  "Email not confirmed": "Confirma tu email antes de entrar",
  "User already registered": "Ya existe una cuenta con este email",
  "Password should be at least 6 characters":
    "La contraseña debe tener al menos 6 caracteres",
  "Signup requires a valid password":
    "La contraseña debe tener al menos 6 caracteres",
};

function normalizeError(message: string): string {
  const mapped = ERROR_MAP[message];
  if (!mapped) console.error("[auth] unmapped error:", message);
  return mapped ?? "Algo ha ido mal. Inténtalo de nuevo.";
}

export async function claimAnonymousSearches(): Promise<{ count: number }> {
  if (!hasAnonymousId()) return { count: 0 };
  const anonymousId = getAnonymousId();

  // CR-04 defense: refuse to RPC with an empty/falsy anonymous_id. Belt + suspenders
  // against an attacker clearing localStorage between the hasAnonymousId() check and
  // the read above.
  if (!anonymousId) return { count: 0 };

  // Count BEFORE the RPC — RPC doesn't return count, and after RPC the rows are
  // owned by user_id so a count by anonymous_id would return 0.
  const { count, error: countError } = await supabase
    .from("plant_searches")
    .select("*", { count: "exact", head: true })
    .eq("anonymous_id", anonymousId);

  if (countError) {
    console.warn("count anonymous searches failed:", countError.message);
  }

  const { error } = await supabase.rpc("claim_anonymous_searches", {
    p_anonymous_id: anonymousId,
  });
  if (error) {
    console.warn("claim_anonymous_searches failed:", error.message);
    return { count: 0 };
  }

  clearAnonymousId();

  const claimedCount = count ?? 0;
  if (claimedCount > 0) {
    track("anon_searches_claimed", { count: claimedCount });
  }
  return { count: claimedCount };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (data.user) track("user_signed_in", { user_id: data.user.id });
  return {
    user: data.user ?? null,
    error: error ? normalizeError(error.message) : null,
  };
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: (isNative() ? PRODUCTION_URL : window.location.origin) + "/mis-plantas?email_confirmed=true" },
  });
  if (data.user && !error) track("user_signed_up");
  return {
    user: data.user ?? null,
    error: error ? normalizeError(error.message) : null,
  };
}
