import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePerfScreenLoaded } from "./use-perf-screen-loaded";
import { track } from "@/lib/track";

vi.mock("@/lib/track", () => ({
  track: vi.fn(),
}));

describe("usePerfScreenLoaded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Stable performance.now() value for deterministic assertions.
    vi.spyOn(performance, "now").mockReturnValue(1234);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Test 1 — does NOT fire when isReady=false", () => {
    renderHook(() => usePerfScreenLoaded("mis-plantas", false));
    expect(track).not.toHaveBeenCalled();
  });

  it("Test 2 — fires once when isReady=true on first render with correct payload", () => {
    renderHook(() =>
      usePerfScreenLoaded("mis-plantas", true, { plants_count: 5 }),
    );
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("perf_screen_loaded", {
      screen: "mis-plantas",
      ttfc_ms: 1234,
      plants_count: 5,
    });
  });

  it("Test 3 — fires when isReady transitions false → true", () => {
    const { rerender } = renderHook(
      ({ ready }: { ready: boolean }) =>
        usePerfScreenLoaded("regar", ready, { plants_count: 3 }),
      { initialProps: { ready: false } },
    );
    expect(track).not.toHaveBeenCalled();
    rerender({ ready: true });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("perf_screen_loaded", {
      screen: "regar",
      ttfc_ms: 1234,
      plants_count: 3,
    });
  });

  it("Test 4 — does NOT fire twice on subsequent re-renders after isReady stays true", () => {
    const { rerender } = renderHook(
      ({ n }: { n: number }) =>
        usePerfScreenLoaded("mapa", true, { plants_count: n }),
      { initialProps: { n: 5 } },
    );
    expect(track).toHaveBeenCalledTimes(1);
    rerender({ n: 6 });
    rerender({ n: 7 });
    expect(track).toHaveBeenCalledTimes(1); // still 1
  });

  it("Test 5 — ttfc_ms reflects Math.round(performance.now()) at effect time", () => {
    vi.spyOn(performance, "now").mockReturnValue(987.6);
    renderHook(() => usePerfScreenLoaded("mis-plantas", true));
    expect(track).toHaveBeenCalledWith(
      "perf_screen_loaded",
      expect.objectContaining({
        ttfc_ms: 988, // Math.round(987.6) = 988
      }),
    );
  });

  it("Test 6 — screen name is passed verbatim (mapa)", () => {
    renderHook(() =>
      usePerfScreenLoaded("mapa", true, { plants_count: 12 }),
    );
    expect(track).toHaveBeenCalledWith(
      "perf_screen_loaded",
      expect.objectContaining({
        screen: "mapa",
      }),
    );
  });

  it("Test 7 — empty extraProps (undefined) omits extra keys from payload", () => {
    renderHook(() => usePerfScreenLoaded("mis-plantas", true));
    expect(track).toHaveBeenCalledWith("perf_screen_loaded", {
      screen: "mis-plantas",
      ttfc_ms: expect.any(Number),
    });
  });

  it("Test 8 — fresh mount fires again (new hook instance = new fire)", () => {
    const { unmount } = renderHook(() =>
      usePerfScreenLoaded("regar", true, { plants_count: 2 }),
    );
    expect(track).toHaveBeenCalledTimes(1);
    unmount();
    renderHook(() => usePerfScreenLoaded("regar", true, { plants_count: 2 }));
    expect(track).toHaveBeenCalledTimes(2); // second mount = second fire
  });

  it("Test 9 — extraProps updates between renders do NOT re-fire", () => {
    const { rerender } = renderHook(
      ({ props }: { props: Record<string, unknown> }) =>
        usePerfScreenLoaded("mis-plantas", true, props),
      { initialProps: { props: { plants_count: 0 } } },
    );
    rerender({ props: { plants_count: 5 } });
    rerender({ props: { plants_count: 99 } });
    expect(track).toHaveBeenCalledTimes(1); // fired once, with initial props
    expect(track).toHaveBeenCalledWith("perf_screen_loaded", {
      screen: "mis-plantas",
      ttfc_ms: 1234,
      plants_count: 0,
    });
  });
});
