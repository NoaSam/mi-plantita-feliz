const PH_KEY = import.meta.env.VITE_POSTHOG_KEY;
const PH_HOST = import.meta.env.VITE_POSTHOG_HOST;

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

  const host = "/ingest";
  const payload = {
    api_key: PH_KEY,
    event,
    properties: {
      ...properties,
      distinct_id: getDistinctId(),
      $current_url: window.location.href,
    },
    timestamp: new Date().toISOString(),
  };

  // Use sendBeacon for reliability (survives page transitions)
  const sent = navigator.sendBeacon?.(
    `${host}/capture/`,
    new Blob([JSON.stringify(payload)], { type: "application/json" })
  );

  // Fallback to fetch if sendBeacon fails
  if (!sent) {
    fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }
}
