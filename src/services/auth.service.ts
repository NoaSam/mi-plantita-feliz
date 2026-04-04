import { supabase } from "@/integrations/supabase/client";

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
  return ERROR_MAP[message] ?? "Algo ha ido mal. Inténtalo de nuevo.";
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return {
    user: data.user ?? null,
    error: error ? normalizeError(error.message) : null,
  };
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  });
  return {
    user: data.user ?? null,
    error: error ? normalizeError(error.message) : null,
  };
}
