import { createRoot } from "react-dom/client";
import "./lib/track"; // Init PostHog + session recording early
import App from "./App.tsx";
import "./index.css";

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
