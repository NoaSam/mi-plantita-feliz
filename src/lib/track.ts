import posthog from "posthog-js";
import { isAnalyticsAllowed } from "@/hooks/use-consent";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PH_KEY = "phc_p3FGSVLkKb7iQPUb5cyVQ2BCWfs2o488wzdofj4tZDsh";
// Capacitor serves the WebView from https://localhost on Android, so the
// hostname check alone would incorrectly flag native builds as dev environment.
const isCapacitor = !!(
  window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
).Capacitor?.isNativePlatform?.();
const isLocalhost =
  !isCapacitor &&
  (location.hostname === "localhost" || location.hostname === "127.0.0.1");

const APP_VERSION = __APP_VERSION__;
const APP_PLATFORM = isCapacitor ? "android" : "web";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let initialized = false;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize PostHog **only** when the user has granted analytics consent.
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * On localhost dev (`npm run dev`) this is a complete no-op — keeps prod
 * analytics free of test events. Capacitor's `https://localhost` is NOT
 * dev (real users hit that), so the localhost guard sits below the
 * Capacitor check.
 */
export function initPostHog(): void {
  if (initialized) return;
  if (isLocalhost) return;
  if (!isAnalyticsAllowed()) return;

  posthog.init(PH_KEY, {
    api_host: "https://eu.i.posthog.com",
    person_profiles: "identified_only",
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-ph-mask]",
    },
  });

  // Register super properties — included automatically with every capture
  // until reset. Lets us filter by platform / version in PostHog without
  // adding them to each call site.
  posthog.register({
    app_version: APP_VERSION,
    app_platform: APP_PLATFORM,
  });

  initialized = true;
}

/**
 * Track a custom event. No-op if PostHog is not initialized (no consent
 * or running on dev localhost).
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

/**
 * Identify a user in PostHog. No-op if PostHog is not initialized.
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.identify(userId, traits);
}

/**
 * Reset PostHog identity (e.g. on sign-out). No-op if not initialized.
 */
export function resetPostHog(): void {
  if (!initialized) return;
  posthog.reset();
}
