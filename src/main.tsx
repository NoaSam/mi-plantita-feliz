import { createRoot } from "react-dom/client";
import { initPostHog } from "./lib/track";
import App from "./App.tsx";
import "./index.css";

// Initialize PostHog only if the user has previously consented to analytics.
// First-time visitors will not have PostHog loaded until they accept cookies.
initPostHog();

// PWA: register service worker with error handling
if ("serviceWorker" in navigator) {
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
