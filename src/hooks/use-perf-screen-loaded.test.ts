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
    // The hook calls performance.now() twice per useful mount:
    //   1st call — captured lazily by useRef at mount (anchor)
    //   2nd call — inside useEffect when isReady=true (fires event)
    // Returning 1000 then 2234 makes the delta 1234, keeping existing
    // ttfc_ms assertions valid. Any further calls (re-renders,
    // rerenders-that-refetch-props) get 2234 too — still no-op due to
    // firing guard.
    let calls = 0;
    vi.spyOn(performance, "now").mockImplementation(() => {
      calls += 1;
      return calls === 1 ? 1000 : 2234;
    });
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

  it("Test 5 — ttfc_ms reflects Math.round(performance.now() - mountAnchor)", () => {
    // Override the beforeEach mock: mount at 100.2ms, effect at 1088.0ms
    // → delta = 987.8 → Math.round = 988
    let n = 0;
    vi.spyOn(performance, "now").mockImplementation(() => {
      n += 1;
      return n === 1 ? 100.2 : 1088.0;
    });
    renderHook(() => usePerfScreenLoaded("mis-plantas", true));
    expect(track).toHaveBeenCalledWith(
      "perf_screen_loaded",
      expect.objectContaining({
        ttfc_ms: 988,
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
