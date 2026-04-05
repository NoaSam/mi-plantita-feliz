import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import { track } from "./lib/track";
import App from "./App.tsx";
import "./index.css";

const phKey = import.meta.env.VITE_POSTHOG_KEY;
const phHost = import.meta.env.VITE_POSTHOG_HOST;

if (phKey) {
  posthog.init(phKey, {
    api_host: "https://mi-plantita-feliz.vercel.app/ingest",
    ui_host: "https://eu.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage",
  });
}

// Debug: fire test event on every page load
track("debug_page_load", { timestamp: Date.now() });

createRoot(document.getElementById("root")!).render(<App />);
