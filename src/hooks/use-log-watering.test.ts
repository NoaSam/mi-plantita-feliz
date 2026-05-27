import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLogWatering } from "./use-log-watering";
import type { HomePlant } from "@/hooks/use-home-plants";

const makeChain = (result: { error: unknown }) => {
  const chain = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => Promise.resolve(result)),
  };
  return chain;
};

const mockPlant: HomePlant = {
  id: "plant-001",
  name: "Test Plant (Test scientific)",
  imageUrl: "data:image/jpeg;base64,test",
  createdAt: "2026-05-10T10:00:00Z",
  wateringIntervalDays: 7,
  lastWateredAt: "2026-05-10T10:00:00Z",
};

const mockPlantPendingFirst: HomePlant = {
  ...mockPlant,
  wateringIntervalDays: null,
  lastWateredAt: null,
};

let mockSupabaseFrom: ReturnType<typeof vi.fn>;
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

vi.mock("@/lib/track", () => ({
  track: vi.fn(),
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
      res = await result.current.logWatering(mockPlant);
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
      res = await result.current.logWatering(mockPlant);
    });

    expect(res?.ok).toBe(false);
    const dispatched = dispatchSpy.mock.calls.find(
      ([e]) => (e as CustomEvent).type === "mp:plant-watered",
    );
    expect(dispatched).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("logWatering: pending-first plant tracks was_first_time=true", async () => {
    const chain = makeChain({ error: null });
    mockSupabaseFrom.mockReturnValue(chain);
    const { track } = await import("@/lib/track");
    vi.mocked(track).mockClear();

    const { result } = renderHook(() => useLogWatering());

    await act(async () => {
      await result.current.logWatering(mockPlantPendingFirst);
    });

    expect(track).toHaveBeenCalledWith(
      "watering_logged",
      expect.objectContaining({
        plant_search_id: "plant-001",
        was_first_time: true,
        interval_days: null,
      }),
    );
  });

});
