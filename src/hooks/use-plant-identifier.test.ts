import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock supabase client (auth only)
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

// Mock track
vi.mock("@/lib/track", () => ({ track: vi.fn() }));

// Mock anonymous-id
vi.mock("@/lib/anonymous-id", () => ({
  getAnonymousId: vi.fn(() => "test-anon-id"),
}));

// Mock browser-image-compression
vi.mock("browser-image-compression", () => ({
  default: vi.fn().mockResolvedValue(new Blob(["fake-compressed"], { type: "image/jpeg" })),
}));

import { usePlantIdentifier } from "./use-plant-identifier";

function createMockFile(type: string, sizeBytes: number, name = "photo.jpg"): File {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], name, { type });
}

const MOCK_JSON_RESPONSE = {
  name: "Potus (Epipremnum aureum)",
  description: "Una planta tropical",
  care: "Riego moderado",
  diagnosis: "Se ve sana",
  model: "claude",
  plant_search_id: "test-uuid-123",
  created_at: "2026-04-23T10:00:00Z",
};

describe("usePlantIdentifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(MOCK_JSON_RESPONSE),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  describe("successful identification", () => {
    it("fetches JSON and sets result", async () => {
      const { result } = renderHook(() => usePlantIdentifier());
      const imageFile = createMockFile("image/jpeg", 1024, "plant.jpg");

      await act(async () => {
        await result.current.identify(imageFile);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.result).not.toBeNull();
      expect(result.current.result!.name).toBe("Potus (Epipremnum aureum)");
      expect(result.current.result!.model).toBe("claude");
      expect(result.current.result!.id).toBe("test-uuid-123");
      expect(result.current.isLoading).toBe(false);
    });

    it("handles HTTP error from edge function", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: "Internal Server Error" }),
      });

      const { result } = renderHook(() => usePlantIdentifier());
      const imageFile = createMockFile("image/jpeg", 1024, "plant.jpg");

      await act(async () => {
        await result.current.identify(imageFile);
      });

      expect(result.current.error).toBe("Internal Server Error");
      expect(result.current.isLoading).toBe(false);
    });

    it("sends correct headers in fetch call", async () => {
      const { result } = renderHook(() => usePlantIdentifier());
      const imageFile = createMockFile("image/jpeg", 1024, "plant.jpg");

      await act(async () => {
        await result.current.identify(imageFile);
      });

      const [calledUrl, calledOptions] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(calledUrl).toContain("functions/v1/identify-plant");
      expect(calledOptions.method).toBe("POST");
      expect(calledOptions.headers["Content-Type"]).toBe("application/json");
      expect(calledOptions.headers).toHaveProperty("apikey");
      expect(calledOptions.headers).toHaveProperty("Authorization");
    });
  });
});
