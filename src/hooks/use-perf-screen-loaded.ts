import { useEffect, useRef } from "react";
import { track } from "@/lib/track";

export type PerfScreenName = "mis-plantas" | "regar" | "mapa";

/**
 * Fire PostHog event `perf_screen_loaded` exactly once per component mount,
 * on the first render where `isReady === true`.
 *
 * Measures Time-to-First-Content (TTFC) as `Math.round(performance.now())` at
 * the effect execution time. This is a slight over-estimate of the true
 * first-paint (React commits, then browser paints; useEffect runs after
 * commit but before paint), which is acceptable per D-10 (±25% tolerance):
 * we WANT the number to include any post-mount data-readiness lag.
 *
 * Uses `useEffect` (NOT `useLayoutEffect`) to avoid blocking paint —
 * documented anti-pattern in RESEARCH.md.
 *
 * Uses `useRef` as the firing-guard so mutation doesn't cause re-render.
 * If the effect runs again (e.g., isReady toggles), the guard short-circuits.
 *
 * Super-properties `app_version` + `app_platform` are added automatically by
 * `initPostHog()` → `posthog.register()` (D-13). Do NOT pass them explicitly.
 *
 * @param screen     Static screen identifier for the event property.
 * @param isReady    Whether the screen has content ready to display
 *                   (typically `!isLoading`).
 * @param extraProps Additional event properties (e.g., `{ plants_count }`).
 *                   Captured at fire time; changes after fire are ignored.
 */
export function usePerfScreenLoaded(
  screen: PerfScreenName,
  isReady: boolean,
  extraProps?: Record<string, unknown>,
): void {
  const fired = useRef(false);

  useEffect(() => {
    if (!isReady || fired.current) return;
    fired.current = true;
    const ttfc_ms = Math.round(performance.now());
    track("perf_screen_loaded", {
      screen,
      ttfc_ms,
      ...(extraProps ?? {}),
    });
    // Deps intentionally limited to [isReady]: we want to fire on the
    // ready-transition and capture screen/extraProps at that moment. Adding
    // extraProps as a dep would still be no-op thanks to fired.current, but
    // would trigger unnecessary effect runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);
}
