import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEditWateringInterval } from "./use-edit-watering-interval";

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

describe("useEditWateringInterval", () => {
  beforeEach(() => {
    mockSupabaseFrom = vi.fn();
  });

  it("editInterval: success path returns ok=true, dispatches mp:plant-frequency-updated", async () => {
    const chain = makeChain({ error: null });
    mockSupabaseFrom.mockReturnValue(chain);
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    dispatchSpy.mockClear();

    const { result } = renderHook(() => useEditWateringInterval());

    let res: { ok: boolean } | undefined;
    await act(async () => {
      res = await result.current.editInterval("plant-001", 5);
    });

    expect(res?.ok).toBe(true);
    expect(mockSupabaseFrom).toHaveBeenCalledWith("plant_searches");
    expect(chain.update).toHaveBeenCalledWith({ watering_interval_days: 5 });
    expect(chain.eq).toHaveBeenCalledWith("id", "plant-001");
    const dispatched = dispatchSpy.mock.calls.find(
      ([e]) => (e as CustomEvent).type === "mp:plant-frequency-updated",
    );
    expect(dispatched).toBeDefined();
    const detail = (dispatched![0] as CustomEvent).detail;
    expect(detail.plant_search_id).toBe("plant-001");
    expect(detail.new_interval_days).toBe(5);
  });

  it("editInterval: error path returns ok=false, does NOT dispatch", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const chain = makeChain({ error: { message: "CHECK constraint violation" } });
    mockSupabaseFrom.mockReturnValue(chain);
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    dispatchSpy.mockClear();

    const { result } = renderHook(() => useEditWateringInterval());

    let res: { ok: boolean } | undefined;
    await act(async () => {
      res = await result.current.editInterval("plant-001", 99);
    });

    expect(res?.ok).toBe(false);
    const dispatched = dispatchSpy.mock.calls.find(
      ([e]) => (e as CustomEvent).type === "mp:plant-frequency-updated",
    );
    expect(dispatched).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("editInterval: persists the exact value sent (1, 7, 60 boundaries)", async () => {
    const chain = makeChain({ error: null });
    mockSupabaseFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useEditWateringInterval());

    for (const value of [1, 7, 60]) {
      await act(async () => {
        await result.current.editInterval("plant-001", value);
      });
      expect(chain.update).toHaveBeenCalledWith({ watering_interval_days: value });
    }
  });
});
