import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("@/lib/track", () => ({ track: vi.fn() }));

type QueryResult = { data: unknown; error: unknown };

let nextResult: QueryResult = { data: [], error: null };
let chainCalls: { method: string; args: unknown[] }[] = [];
let fromCallCount = 0;

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
    from: vi.fn(() => {
      fromCallCount += 1;
      return makeChain(nextResult);
    }),
  },
}));

let mockUser: { id: string } | null = { id: "user-test-001" };
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

import { useHomePlants } from "./use-home-plants";

describe("useHomePlants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainCalls = [];
    fromCallCount = 0;
    mockUser = { id: "user-test-001" };
    nextResult = { data: [], error: null };
  });

  it("returns plants:[] and isLoading=false when user is null (no Supabase call)", async () => {
    // D-07: anon users have no classified context — skip Supabase entirely
    mockUser = null;
    const { result } = renderHook(() => useHomePlants());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plants).toEqual([]);
    expect(fromCallCount).toBe(0);
  });

  it("applies WHERE filter context=home + user_id and orders by created_at desc", async () => {
    const { result } = renderHook(() => useHomePlants());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const eqCalls = chainCalls.filter((c) => c.method === "eq");
    const orderCalls = chainCalls.filter((c) => c.method === "order");
    expect(eqCalls).toContainEqual({ method: "eq", args: ["user_id", "user-test-001"] });
    expect(eqCalls).toContainEqual({ method: "eq", args: ["context", "home"] });
    expect(orderCalls).toContainEqual({
      method: "order",
      args: ["created_at", { ascending: false }],
    });
  });

  it("does NOT filter by lat/lng (home plants are not geotagged)", async () => {
    const { result } = renderHook(() => useHomePlants());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const notCalls = chainCalls.filter((c) => c.method === "not");
    expect(notCalls.length).toBe(0);
  });

  it("maps snake_case columns to camelCase including watering_interval_days and last_watered_at", async () => {
    nextResult = {
      data: [
        {
          id: "plant-1",
          name: "Monstera deliciosa (Monstera deliciosa)",
          image_url: "https://img/1.jpg",
          watering_interval_days: 7,
          last_watered_at: "2026-05-15T10:00:00Z",
          created_at: "2026-05-10T10:00:00Z",
        },
        {
          id: "plant-2",
          name: "Pothos",
          image_url: "https://img/2.jpg",
          watering_interval_days: null,
          last_watered_at: null,
          created_at: "2026-04-01T10:00:00Z",
        },
      ],
      error: null,
    };
    const { result } = renderHook(() => useHomePlants());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plants).toEqual([
      {
        id: "plant-1",
        name: "Monstera deliciosa (Monstera deliciosa)",
        imageUrl: "https://img/1.jpg",
        createdAt: "2026-05-10T10:00:00Z",
        wateringIntervalDays: 7,
        lastWateredAt: "2026-05-15T10:00:00Z",
      },
      {
        id: "plant-2",
        name: "Pothos",
        imageUrl: "https://img/2.jpg",
        createdAt: "2026-04-01T10:00:00Z",
        wateringIntervalDays: null,
        lastWateredAt: null,
      },
    ]);
  });

  it("returns empty plants[] on Supabase error and logs", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    nextResult = { data: null, error: { message: "boom" } };
    const { result } = renderHook(() => useHomePlants());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plants).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching home plants:",
      "boom",
    );
    consoleSpy.mockRestore();
  });

  it("refetches when mp:plant-context-updated event fires (D-05 reactivity)", async () => {
    const { result } = renderHook(() => useHomePlants());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsBefore = fromCallCount;

    act(() => {
      window.dispatchEvent(new CustomEvent("mp:plant-context-updated"));
    });

    await waitFor(() => expect(fromCallCount).toBeGreaterThan(callsBefore));
  });

  it("refetches when mp:pending-classification-resolved event fires (anon→auth claim)", async () => {
    const { result } = renderHook(() => useHomePlants());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsBefore = fromCallCount;

    act(() => {
      window.dispatchEvent(new CustomEvent("mp:pending-classification-resolved"));
    });

    await waitFor(() => expect(fromCallCount).toBeGreaterThan(callsBefore));
  });

  it("refetches when mp:plant-watered event fires (sub-phase 3-03 reactivity)", async () => {
    const { result } = renderHook(() => useHomePlants());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsBefore = fromCallCount;

    act(() => {
      window.dispatchEvent(new CustomEvent("mp:plant-watered"));
    });

    await waitFor(() => expect(fromCallCount).toBeGreaterThan(callsBefore));
  });
});
