import { createRoot } from "react-dom/client";
import "./lib/track"; // Init PostHog + session recording early
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
