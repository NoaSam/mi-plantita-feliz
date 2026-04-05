import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
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

createRoot(document.getElementById("root")!).render(<App />);
