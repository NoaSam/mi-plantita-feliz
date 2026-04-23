import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase client before importing auth service
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

// Mock track to avoid PostHog calls
vi.mock("@/lib/track", () => ({ track: vi.fn() }));

// Mock anonymous-id
vi.mock("@/lib/anonymous-id", () => ({
  hasAnonymousId: vi.fn(() => false),
  getAnonymousId: vi.fn(() => "test-anon-id"),
  clearAnonymousId: vi.fn(),
}));

import { signIn, signUp } from "./auth.service";
import { supabase } from "@/integrations/supabase/client";

describe("auth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    it("returns user on success", async () => {
      const mockUser = { id: "user-1", email: "test@test.com" };
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      } as any);

      const result = await signIn("test@test.com", "password123");

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it("translates 'Invalid login credentials' to Spanish", async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      } as any);

      const result = await signIn("test@test.com", "wrong");

      expect(result.error).toBe("Email o contraseña incorrectos");
      expect(result.user).toBeNull();
    });

    it("translates 'Email not confirmed' to Spanish", async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Email not confirmed" },
      } as any);

      const result = await signIn("test@test.com", "password123");

      expect(result.error).toBe("Confirma tu email antes de entrar");
    });

    it("returns fallback message for unknown errors", async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Some unknown error" },
      } as any);

      const result = await signIn("test@test.com", "password123");

      expect(result.error).toBe("Algo ha ido mal. Inténtalo de nuevo.");
    });
  });

  describe("signUp", () => {
    it("returns user on success", async () => {
      const mockUser = { id: "user-2", email: "new@test.com" };
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      } as any);

      const result = await signUp("new@test.com", "password123");

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it("translates 'User already registered' to Spanish", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already registered" },
      } as any);

      const result = await signUp("exists@test.com", "password123");

      expect(result.error).toBe("Ya existe una cuenta con este email");
    });

    it("translates password-too-short error to Spanish", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Password should be at least 6 characters" },
      } as any);

      const result = await signUp("test@test.com", "123");

      expect(result.error).toBe("La contraseña debe tener al menos 6 caracteres");
    });

    it("passes correct emailRedirectTo option", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: { id: "u" }, session: null },
        error: null,
      } as any);

      await signUp("test@test.com", "password123");

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "password123",
        options: {
          emailRedirectTo: expect.stringContaining("/mis-plantas?email_confirmed=true"),
        },
      });
    });
  });
});
