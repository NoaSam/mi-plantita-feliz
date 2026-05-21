import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/lib/track", () => ({ track: vi.fn() }));

type QueryResult = { data: unknown; error: unknown };

let nextResult: QueryResult = { data: [], error: null };
let chainCalls: { method: string; args: unknown[] }[] = [];

function makeChain(result: QueryResult) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "not", "or", "order", "limit"] as const;
  for (const m of methods) {
    chain[m] = vi.fn((...args: unknown[]) => {
      chainCalls.push({ method: m, args });
      return chain;
    });
  }
  (chain as { then: (resolve: (r: QueryResult) => void) => void }).then = (
    resolve,
  ) => resolve(result);
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => makeChain(nextResult)),
  },
}));

let mockUser: { id: string } | null = { id: "test-user-id" };
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

import { useWildPlantsWithCoords } from "./use-wild-plants-with-coords";

describe("useWildPlantsWithCoords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainCalls = [];
    mockUser = { id: "test-user-id" };
    nextResult = { data: [], error: null };
  });

  it("returns plants:[] and isLoading=false when no user (D-07)", async () => {
    // D-07: anon users have no context classified — no Supabase call made
    mockUser = null;
    const { result } = renderHook(() => useWildPlantsWithCoords());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plants).toEqual([]);
    expect(chainCalls.length).toBe(0); // Supabase not called
  });

  it("applies WHERE filter context=wild + lat,lng NOT NULL + user_id (SPEC-AC10)", async () => {
    // SPEC-AC10: unit test verifies the exact WHERE filter
    const { result } = renderHook(() => useWildPlantsWithCoords());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const eqCalls = chainCalls.filter((c) => c.method === "eq");
    const notCalls = chainCalls.filter((c) => c.method === "not");
    expect(eqCalls).toContainEqual({ method: "eq", args: ["user_id", "test-user-id"] });
    expect(eqCalls).toContainEqual({ method: "eq", args: ["context", "wild"] });
    expect(notCalls).toContainEqual({ method: "not", args: ["lat", "is", null] });
    expect(notCalls).toContainEqual({ method: "not", args: ["lng", "is", null] });
  });

  it("orders by created_at descending", async () => {
    const { result } = renderHook(() => useWildPlantsWithCoords());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const orderCalls = chainCalls.filter((c) => c.method === "order");
    expect(orderCalls).toContainEqual({
      method: "order",
      args: ["created_at", { ascending: false }],
    });
  });

  it("does NOT call limit() — returns full list", async () => {
    // SPEC.md Constraints: <20 pins typical, up to ~200 heavy users. Full list, no pagination.
    const { result } = renderHook(() => useWildPlantsWithCoords());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const limitCalls = chainCalls.filter((c) => c.method === "limit");
    expect(limitCalls.length).toBe(0);
  });

  it("maps snake_case columns to camelCase (image_url → imageUrl, created_at → createdAt)", async () => {
    nextResult = {
      data: [
        {
          id: "p1",
          name: "Monstera deliciosa (Monstera deliciosa)",
          image_url: "https://example.com/m.jpg",
          lat: 40.4168,
          lng: -3.7038,
          created_at: "2026-05-10T12:00:00Z",
          description: "Planta tropical",
        },
      ],
      error: null,
    };
    const { result } = renderHook(() => useWildPlantsWithCoords());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plants).toEqual([
      {
        id: "p1",
        name: "Monstera deliciosa (Monstera deliciosa)",
        imageUrl: "https://example.com/m.jpg",
        lat: 40.4168,
        lng: -3.7038,
        createdAt: "2026-05-10T12:00:00Z",
        description: "Planta tropical",
        context: "wild",
      },
    ]);
  });

  it("returns empty plants[] on Supabase error (graceful degradation)", async () => {
    nextResult = { data: null, error: { message: "boom" } };
    const { result } = renderHook(() => useWildPlantsWithCoords());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plants).toEqual([]);
  });

  it("handles null description column gracefully (defaults to empty string)", async () => {
    // Defense against nullable description column in plant_searches schema
    nextResult = {
      data: [
        {
          id: "p2",
          name: "Aloe vera",
          image_url: "https://example.com/a.jpg",
          lat: 41.0,
          lng: -3.0,
          created_at: "2026-05-12T10:00:00Z",
          description: null,
        },
      ],
      error: null,
    };
    const { result } = renderHook(() => useWildPlantsWithCoords());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plants[0].description).toBe("");
  });
});
