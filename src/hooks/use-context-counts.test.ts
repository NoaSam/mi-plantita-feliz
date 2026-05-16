import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// Mock track to avoid PostHog calls (PATTERNS.md test convention)
vi.mock("@/lib/track", () => ({ track: vi.fn() }));

// Chainable Supabase mock builder. Each .from() call returns a new chain
// whose terminal Promise resolves to { data, error, count }.
// Patterns: PATTERNS.md lines 667-682 (canonical Supabase test idiom).
type QueryResult = { data: unknown; error: unknown; count: number | null };

let homeResult: QueryResult;
let wildWithResult: QueryResult;
let wildWithoutResult: QueryResult;
let unclassifiedResult: QueryResult;
let queryCounter: number;
let chainCalls: { method: string; args: unknown[] }[];

function makeChain(result: QueryResult) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "not", "or", "order", "limit"] as const;
  for (const m of methods) {
    chain[m] = vi.fn((...args: unknown[]) => {
      chainCalls.push({ method: m, args });
      return chain;
    });
  }
  // Thenable so `await chain` resolves to result.
  (chain as { then: (resolve: (r: QueryResult) => void) => void }).then = (
    resolve,
  ) => resolve(result);
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => {
      queryCounter += 1;
      // Order within each round: home → wild_with → wild_without → unclassified
      // (matches Promise.all order in the hook). Use modulo so refetch rounds
      // (queries 5-8, 9-12, ...) map to the same positions as the initial round.
      const positionInRound = ((queryCounter - 1) % 4) + 1;
      if (positionInRound === 1) return makeChain(homeResult);
      if (positionInRound === 2) return makeChain(wildWithResult);
      if (positionInRound === 3) return makeChain(wildWithoutResult);
      return makeChain(unclassifiedResult);
    }),
  },
}));

// Default to a logged-in user; individual tests can override.
let mockUser: { id: string } | null = { id: "test-user-id" };
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

import { useContextCounts } from "./use-context-counts";

describe("useContextCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryCounter = 0;
    chainCalls = [];
    mockUser = { id: "test-user-id" };
    homeResult = { data: null, error: null, count: 0 };
    wildWithResult = { data: null, error: null, count: 0 };
    wildWithoutResult = { data: null, error: null, count: 0 };
    unclassifiedResult = { data: null, error: null, count: 0 };
  });

  it("returns ZERO counts and isLoading=false when no user (D-07)", async () => {
    mockUser = null;
    const { result } = renderHook(() => useContextCounts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.home).toBe(0);
    expect(result.current.wild_with_coords).toBe(0);
    expect(result.current.wild_without_coords).toBe(0);
    expect(result.current.unclassified).toBe(0);
    expect(queryCounter).toBe(0); // Supabase NOT called
  });

  it("runs 4 parallel queries to plant_searches when user is present", async () => {
    const { result } = renderHook(() => useContextCounts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(queryCounter).toBe(4);
  });

  it("filters each query by user_id", async () => {
    const { result } = renderHook(() => useContextCounts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const userIdCalls = chainCalls.filter(
      (c) => c.method === "eq" && c.args[0] === "user_id" && c.args[1] === "test-user-id",
    );
    expect(userIdCalls.length).toBe(4);
  });

  it("filters wild_with_coords by context=wild AND lat,lng NOT NULL (SPEC-AC10)", async () => {
    const { result } = renderHook(() => useContextCounts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const ctxWildCalls = chainCalls.filter(
      (c) => c.method === "eq" && c.args[0] === "context" && c.args[1] === "wild",
    );
    // wild_with AND wild_without both filter context=wild → 2 calls
    expect(ctxWildCalls.length).toBe(2);
    const notLatCalls = chainCalls.filter(
      (c) => c.method === "not" && c.args[0] === "lat" && c.args[1] === "is" && c.args[2] === null,
    );
    const notLngCalls = chainCalls.filter(
      (c) => c.method === "not" && c.args[0] === "lng" && c.args[1] === "is" && c.args[2] === null,
    );
    expect(notLatCalls.length).toBe(1);
    expect(notLngCalls.length).toBe(1);
  });

  it("filters wild_without_coords with .or('lat.is.null,lng.is.null')", async () => {
    const { result } = renderHook(() => useContextCounts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const orCalls = chainCalls.filter(
      (c) => c.method === "or" && c.args[0] === "lat.is.null,lng.is.null",
    );
    expect(orCalls.length).toBe(1);
  });

  it("returns the exact counts from each bucket", async () => {
    homeResult = { data: null, error: null, count: 3 };
    wildWithResult = { data: null, error: null, count: 5 };
    wildWithoutResult = { data: null, error: null, count: 1 };
    unclassifiedResult = { data: null, error: null, count: 7 };
    const { result } = renderHook(() => useContextCounts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.home).toBe(3);
    expect(result.current.wild_with_coords).toBe(5);
    expect(result.current.wild_without_coords).toBe(1);
    expect(result.current.unclassified).toBe(7);
  });

  it("returns ZERO counts on Supabase error (graceful degradation)", async () => {
    wildWithResult = { data: null, error: { message: "boom" }, count: null };
    const { result } = renderHook(() => useContextCounts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.home).toBe(0);
    expect(result.current.wild_with_coords).toBe(0);
    expect(result.current.wild_without_coords).toBe(0);
    expect(result.current.unclassified).toBe(0);
  });

  it("refetches counts when window dispatches mp:pending-classification-resolved (SPEC-AC2)", async () => {
    const { result } = renderHook(() => useContextCounts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(queryCounter).toBe(4);
    // Mutate the would-be next result so refetch picks it up.
    wildWithResult = { data: null, error: null, count: 1 };
    await act(async () => {
      window.dispatchEvent(new CustomEvent("mp:pending-classification-resolved"));
    });
    await waitFor(() => expect(result.current.wild_with_coords).toBe(1));
    expect(queryCounter).toBe(8); // 4 initial + 4 refetch
  });
});
