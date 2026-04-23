import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    functions: { invoke: vi.fn() },
  },
}));

// Mock track
vi.mock("@/lib/track", () => ({ track: vi.fn() }));

// Mock anonymous-id
vi.mock("@/lib/anonymous-id", () => ({
  getAnonymousId: vi.fn(() => "test-anon-id"),
}));

import { usePlantIdentifier } from "./use-plant-identifier";

function createMockFile(type: string, sizeBytes: number, name = "photo.jpg"): File {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], name, { type });
}

describe("usePlantIdentifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("input validation", () => {
    it("rejects non-image files", async () => {
      const { result } = renderHook(() => usePlantIdentifier());
      const textFile = createMockFile("text/plain", 100, "notes.txt");

      await act(async () => {
        await result.current.identify(textFile);
      });

      expect(result.current.error).toBe("El archivo debe ser una imagen");
      expect(result.current.result).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it("rejects files over 10 MB", async () => {
      const { result } = renderHook(() => usePlantIdentifier());
      const bigFile = createMockFile("image/jpeg", 11 * 1024 * 1024, "huge.jpg");

      await act(async () => {
        await result.current.identify(bigFile);
      });

      expect(result.current.error).toBe("La imagen no puede superar los 10 MB");
      expect(result.current.result).toBeNull();
    });

    it("rejects application/pdf as non-image", async () => {
      const { result } = renderHook(() => usePlantIdentifier());
      const pdf = createMockFile("application/pdf", 500, "doc.pdf");

      await act(async () => {
        await result.current.identify(pdf);
      });

      expect(result.current.error).toBe("El archivo debe ser una imagen");
    });

    it("rejects video files", async () => {
      const { result } = renderHook(() => usePlantIdentifier());
      const video = createMockFile("video/mp4", 500, "clip.mp4");

      await act(async () => {
        await result.current.identify(video);
      });

      expect(result.current.error).toBe("El archivo debe ser una imagen");
    });
  });

  describe("state management", () => {
    it("starts with clean state", () => {
      const { result } = renderHook(() => usePlantIdentifier());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("clears previous error on new identify call", async () => {
      const { result } = renderHook(() => usePlantIdentifier());

      // First call: trigger validation error
      await act(async () => {
        await result.current.identify(createMockFile("text/plain", 100));
      });
      expect(result.current.error).toBe("El archivo debe ser una imagen");

      // Second call: different error, proving previous was cleared
      await act(async () => {
        await result.current.identify(createMockFile("image/jpeg", 11 * 1024 * 1024));
      });
      expect(result.current.error).toBe("La imagen no puede superar los 10 MB");
    });

    it("exposes setResult to allow external reset", () => {
      const { result } = renderHook(() => usePlantIdentifier());
      expect(typeof result.current.setResult).toBe("function");
    });
  });
});
