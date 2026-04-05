const PH_KEY = import.meta.env.VITE_POSTHOG_KEY;

let distinctId: string | null = null;

function getDistinctId(): string {
  if (distinctId) return distinctId;
  try {
    const stored = localStorage.getItem("ph_distinct_id");
    if (stored) {
      distinctId = stored;
      return distinctId;
    }
  } catch { /* ignore */ }
  distinctId = crypto.randomUUID();
  try { localStorage.setItem("ph_distinct_id", distinctId); } catch { /* ignore */ }
  return distinctId;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!PH_KEY) return;

  const payload = JSON.stringify({
    api_key: PH_KEY,
    event,
    properties: {
      ...properties,
      distinct_id: getDistinctId(),
      $current_url: window.location.href,
    },
    timestamp: new Date().toISOString(),
  });

  // Send directly to PostHog EU (no proxy, no relative URL)
  const url = "https://eu.i.posthog.com/capture/";

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
