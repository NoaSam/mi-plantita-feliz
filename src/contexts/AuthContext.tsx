import { createContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  emailVerified: boolean;
  clearEmailVerified: () => void;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isEmailConfirm = params.has("email_confirmed");
    let handlingConfirm = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Email verification redirect: Supabase auto-signs in from URL tokens.
      // We sign out immediately so the user must log in manually.
      if (isEmailConfirm && !handlingConfirm && session) {
        handlingConfirm = true;
        await supabase.auth.signOut();
        setEmailVerified(true);
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (event === "INITIAL_SESSION" || (handlingConfirm && event === "SIGNED_OUT")) {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("signOut failed:", error.message);
  };

  const clearEmailVerified = () => setEmailVerified(false);

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, emailVerified, clearEmailVerified, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
