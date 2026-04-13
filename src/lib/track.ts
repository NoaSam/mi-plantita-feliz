import posthog from "posthog-js";

const PH_KEY = "phc_p3FGSVLkKb7iQPUb5cyVQ2BCWfs2o488wzdofj4tZDsh";
const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";

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

export function track(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties);
}

export { posthog };
