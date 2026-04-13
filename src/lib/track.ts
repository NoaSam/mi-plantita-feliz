import posthog from "posthog-js";
import { isAnalyticsAllowed } from "@/hooks/use-consent";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PH_KEY = "phc_p3FGSVLkKb7iQPUb5cyVQ2BCWfs2o488wzdofj4tZDsh";
const isLocalhost =
  location.hostname === "localhost" || location.hostname === "127.0.0.1";

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
 */
export function initPostHog(): void {
  if (initialized) return;
  if (!isAnalyticsAllowed()) return;

  posthog.init(PH_KEY, {
    api_host: "https://eu.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: !isLocalhost,
    capture_pageleave: !isLocalhost,
    autocapture: !isLocalhost,
    disable_session_recording: isLocalhost,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-ph-mask]",
    },
    opt_out_capturing_by_default: isLocalhost,
  });

  initialized = true;
}

/**
 * Track a custom event. No-op if PostHog is not initialized (no consent).
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

/**
 * Identify a user in PostHog. No-op if PostHog is not initialized (no consent).
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
