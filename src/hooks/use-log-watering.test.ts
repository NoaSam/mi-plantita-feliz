import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLogWatering } from "./use-log-watering";

const makeChain = (result: { error: unknown }) => {
  const chain = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => Promise.resolve(result)),
  };
  return chain;
};

let mockSupabaseFrom: ReturnType<typeof vi.fn>;
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

describe("useLogWatering", () => {
  beforeEach(() => {
    mockSupabaseFrom = vi.fn();
  });

  it("logWatering: success path returns ok=true and dispatches mp:plant-watered", async () => {
    const chain = makeChain({ error: null });
    mockSupabaseFrom.mockReturnValue(chain);

    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const { result } = renderHook(() => useLogWatering());

    let res: { ok: boolean } | undefined;
    await act(async () => {
      res = await result.current.logWatering("plant-001");
    });

    expect(res?.ok).toBe(true);
    expect(mockSupabaseFrom).toHaveBeenCalledWith("plant_searches");
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ last_watered_at: expect.any(String) }),
    );
    expect(chain.eq).toHaveBeenCalledWith("id", "plant-001");
    expect(dispatchSpy).toHaveBeenCalled();
    const dispatched = dispatchSpy.mock.calls.find(
      ([e]) => (e as CustomEvent).type === "mp:plant-watered",
    );
    expect(dispatched).toBeDefined();
  });

  it("logWatering: error path returns ok=false and does NOT dispatch", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const chain = makeChain({ error: { message: "RLS denied" } });
    mockSupabaseFrom.mockReturnValue(chain);
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    dispatchSpy.mockClear();

    const { result } = renderHook(() => useLogWatering());

    let res: { ok: boolean } | undefined;
    await act(async () => {
      res = await result.current.logWatering("plant-001");
    });

    expect(res?.ok).toBe(false);
    const dispatched = dispatchSpy.mock.calls.find(
      ([e]) => (e as CustomEvent).type === "mp:plant-watered",
    );
    expect(dispatched).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("revertWatering: success sends UPDATE with previous timestamp", async () => {
    const chain = makeChain({ error: null });
    mockSupabaseFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useLogWatering());
    const previous = "2026-05-10T10:00:00Z";

    let res: { ok: boolean } | undefined;
    await act(async () => {
      res = await result.current.revertWatering("plant-001", previous);
    });

    expect(res?.ok).toBe(true);
    expect(chain.update).toHaveBeenCalledWith({ last_watered_at: previous });
    expect(chain.eq).toHaveBeenCalledWith("id", "plant-001");
  });

  it("revertWatering: previous=null persists null (for plants that were pending-first)", async () => {
    const chain = makeChain({ error: null });
    mockSupabaseFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useLogWatering());

    let res: { ok: boolean } | undefined;
    await act(async () => {
      res = await result.current.revertWatering("plant-001", null);
    });

    expect(res?.ok).toBe(true);
    expect(chain.update).toHaveBeenCalledWith({ last_watered_at: null });
  });

  it("revertWatering: error path returns ok=false", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const chain = makeChain({ error: { message: "fail" } });
    mockSupabaseFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useLogWatering());

    let res: { ok: boolean } | undefined;
    await act(async () => {
      res = await result.current.revertWatering("plant-001", "2026-05-10T10:00:00Z");
    });

    expect(res?.ok).toBe(false);
    consoleSpy.mockRestore();
  });
});
