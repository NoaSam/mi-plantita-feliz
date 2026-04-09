import { createRoot } from "react-dom/client";
import "./lib/track"; // Init PostHog + session recording early
import App from "./App.tsx";
import "./index.css";

// Auto-reload when a new service worker takes control (PWA update)
navigator.serviceWorker?.addEventListener("controllerchange", () => {
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
