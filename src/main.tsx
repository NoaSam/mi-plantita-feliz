import { createRoot } from "react-dom/client";
import { initPostHog } from "./lib/track";
import App from "./App.tsx";
import "./index.css";

// Initialize PostHog only if the user has previously consented to analytics.
// First-time visitors will not have PostHog loaded until they accept cookies.
initPostHog();

// Skip SW registration inside Capacitor native shell -- SW intercepts
// Capacitor bridge requests and causes "Plugin not implemented" errors.
const isCapacitor = !!(
  window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
).Capacitor?.isNativePlatform?.();

// PWA: register service worker with error handling
if ("serviceWorker" in navigator && !isCapacitor) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // SW registration can fail on some mobile browsers — non-blocking
      });
  });

  // Auto-reload when a new service worker takes control (PWA update)
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
