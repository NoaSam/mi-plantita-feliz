import posthog from "posthog-js";

const PH_KEY = "phc_p3FGSVLkKb7iQPUb5cyVQ2BCWfs2o488wzdofj4tZDsh";

posthog.init(PH_KEY, {
  api_host: "https://eu.i.posthog.com",
  person_profiles: "identified_only",
  capture_pageview: true,
  capture_pageleave: true,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: "[data-ph-mask]",
  },
});

export function track(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties);
}

export { posthog };
