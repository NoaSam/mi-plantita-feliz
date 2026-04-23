# Phase 1: Android Native — Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 9 files to modify or create
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `vite.config.ts` | config | transform | `vite.config.ts` (current) | exact — extend in place |
| `capacitor.config.ts` | config | transform | `vite.config.ts` (env pattern) | role-match |
| `package.json` | config | — | `package.json` (current) | exact — add scripts |
| `src/main.tsx` | utility | event-driven | `src/main.tsx` (current) | exact — conditional guard |
| `src/lib/platform.ts` | utility | request-response | `src/lib/platform.ts` (current) | exact — extend function |
| `src/components/PhotoCapture.tsx` | component | file-I/O | `src/components/PhotoCapture.tsx` (current) | exact — platform branch |
| `src/hooks/use-geolocation.ts` | hook | request-response | `src/hooks/use-geolocation.ts` (current) | exact — plugin swap |
| `index.html` | config | — | `index.html` (current) | exact — viewport tweak |
| `src/integrations/supabase/client.ts` | utility | CRUD | `src/integrations/supabase/client.ts` (current) | exact — storage swap |

---

## Pattern Assignments

### `vite.config.ts` (config, transform)

**Analog:** `vite.config.ts` (current file, lines 1–61)

**Current full pattern** (lines 1–61):
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: ["favicon.ico"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: "Mi jardín",
        short_name: "Mi jardín",
        description: "Identifica y cuida tus plantas con una foto",
        theme_color: "#2D5A27",
        background_color: "#FDFCF8",
        display: "standalone",
        orientation: "portrait",
        lang: "es",
        start_url: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
}));
```

**What Phase 1 modifies:**
- Expand `manifest.icons` array with all PWA densities (48, 72, 96, 128, 144, 192, 384, 512 px plus maskable variants).
- Add `screenshots` and `categories` fields inside `manifest: { ... }` — same nesting level as `icons`.
- No structural change to plugins array, resolver, or server config.

**Icon entry pattern to replicate** (copy for each new size):
```typescript
{ src: "/icons/pwa-48.png", sizes: "48x48", type: "image/png" },
```

**Maskable entry pattern** (add for 192 and 512):
```typescript
{ src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
```

**Screenshots entry pattern** (new field, same nesting as `icons`):
```typescript
screenshots: [
  {
    src: "/screenshots/home.png",
    sizes: "390x844",
    type: "image/png",
    form_factor: "narrow",
  },
],
```

---

### `capacitor.config.ts` (config, transform)

**Analog:** `vite.config.ts` — env variable pattern (lines 1–4) and `src/integrations/supabase/client.ts` — `import.meta.env` pattern (lines 5–6).

No existing `capacitor.config.ts` in the codebase. Use the pattern from how other config files are structured in this project: TypeScript, explicit types, no magic strings.

**Pattern to copy from `src/integrations/supabase/client.ts`** (lines 1–16):
```typescript
// Typed config, env vars surfaced as named constants, no inline magic strings
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

**Target shape for `capacitor.config.ts`** (no analog — use Capacitor docs pattern):
```typescript
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mijardin.app",
  appName: "Mi jardín",
  webDir: "dist",
  server: {
    // For local dev with hot reload — remove for production build
    // url: "http://YOUR_LOCAL_IP:8080",
    // cleartext: true,
  },
};

export default config;
```

---

### `package.json` (config, scripts)

**Analog:** `package.json` (current, lines 6–16)

**Current scripts pattern** (lines 6–16):
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "check:errors": "tsx scripts/check-errors.ts"
}
```

**What Phase 1 adds** — new scripts follow the same `"name": "command"` pattern, placed after `"build"`:
```json
"android": "npm run build && npx cap sync && npx cap open android",
"cap:sync": "npx cap sync",
"cap:build": "npm run build && npx cap sync"
```

---

### `src/main.tsx` (utility, event-driven)

**Analog:** `src/main.tsx` (current, lines 1–26) — specifically the `"serviceWorker" in navigator` guard pattern.

**Current SW registration pattern** (lines 10–24):
```typescript
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
```

**What Phase 1 modifies:**

The service worker must NOT be registered when running inside Capacitor (it serves from a local web server, not a remote URL, so SW causes conflicts). Add a Capacitor detection guard following the same `if ("featureString" in object)` pattern already in use:

```typescript
// Skip SW registration inside Capacitor native shell
const isCapacitor = !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

if ("serviceWorker" in navigator && !isCapacitor) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // SW registration can fail on some mobile browsers — non-blocking
      });
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}
```

---

### `src/lib/platform.ts` (utility, request-response)

**Analog:** `src/lib/platform.ts` (current, lines 1–3)

**Current pattern** (lines 1–3):
```typescript
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
```

**What Phase 1 adds** — same function signature style, same export pattern:

```typescript
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

/** True when running inside a Capacitor native shell (Android or iOS). */
export function isNative(): boolean {
  return !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}
```

**Usage site to update:** `src/components/PhotoCapture.tsx` line 7 — import `isNative` alongside `isIOS`.

---

### `src/components/PhotoCapture.tsx` (component, file-I/O)

**Analog:** `src/components/PhotoCapture.tsx` (current, lines 1–120)

**Current platform-branch pattern** (lines 6–8, 20–21, 69–116):
```typescript
// Import
import { isIOS } from "@/lib/platform";

// Usage — single branch on isIOS()
const ios = isIOS();

// JSX — two render paths
{ios ? (
  <input ref={cameraRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
) : (
  <>
    <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
    <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
  </>
)}
```

**What Phase 1 adds** — Capacitor Camera plugin path. Import `isNative` from `@/lib/platform`, add a new branch. Follow the same pattern: a `const` flag at the top of the function, a conditional in JSX, and keep `onCapture(file, coords)` as the single handoff point:

```typescript
import { isIOS, isNative } from "@/lib/platform";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

// Inside component:
const native = isNative();

const handleNativeCapture = async () => {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt, // shows "Camera" or "Gallery" sheet
      quality: 70,
    });
    if (!photo.dataUrl) return;
    // Convert dataUrl -> File to keep the same onCapture(File, Coords) contract
    const res = await fetch(photo.dataUrl);
    const blob = await res.blob();
    const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
    // Coords path is unchanged — re-use existing location consent flow
    if (shouldAskForLocation()) { ... }
  } catch {
    // User cancelled — ignore
  }
};
```

---

### `src/hooks/use-geolocation.ts` (hook, request-response)

**Analog:** `src/hooks/use-geolocation.ts` (current, lines 1–41)

**Current Web API pattern** (lines 15–23):
```typescript
function readPosition(): Promise<Coords | null> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60_000 },
    );
  });
}
```

**What Phase 1 modifies** — when `isNative()` is true, use `@capacitor/geolocation` instead of `navigator.geolocation`. Keep the same return type `Promise<Coords | null>` and same public hook API (`getLocation`, `getLocationSilently`) — callers in `PhotoCapture.tsx` must not change:

```typescript
import { isNative } from "@/lib/platform";
import { Geolocation } from "@capacitor/geolocation";

async function readPositionNative(): Promise<Coords | null> {
  try {
    const pos = await Geolocation.getCurrentPosition({ timeout: 5000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

function readPosition(): Promise<Coords | null> {
  if (isNative()) return readPositionNative();
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60_000 },
    );
  });
}
```

---

### `index.html` (config, viewport)

**Analog:** `index.html` (current, lines 1–27)

**Current viewport meta** (line 5):
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

**What Phase 1 verifies/modifies** — confirm `viewport-fit=cover` is present for Android notch/cutout safe areas. Update to:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

No other changes to `index.html`.

---

### `src/integrations/supabase/client.ts` (utility, CRUD)

**Analog:** `src/integrations/supabase/client.ts` (current, lines 1–17)

**Current auth storage pattern** (lines 11–16):
```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

**What Phase 1 modifies** — Capacitor uses a different storage adapter to persist sessions across native app restarts. The `@capacitor/preferences` plugin provides the equivalent of `localStorage` for native. Pattern: swap `storage: localStorage` for a `CapacitorPreferencesStorage` adapter, guarded by `isNative()`:

```typescript
import { isNative } from "@/lib/platform";

// Capacitor Preferences adapter (only loaded in native context)
const authStorage = isNative()
  ? buildCapacitorStorage()   // wraps @capacitor/preferences
  : localStorage;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

The `buildCapacitorStorage()` helper must implement the `{ getItem, setItem, removeItem }` interface that `@supabase/supabase-js` expects for `auth.storage`.

---

## Shared Patterns

### Platform Detection Guard
**Source:** `src/lib/platform.ts` (lines 1–3) + `src/components/PhotoCapture.tsx` (lines 20–21)
**Apply to:** `src/main.tsx`, `src/hooks/use-geolocation.ts`, `src/integrations/supabase/client.ts`, `src/components/PhotoCapture.tsx`

The project already uses a simple boolean function pattern for platform detection. All Capacitor-aware branches follow this convention:
```typescript
const native = isNative(); // or isIOS(), isAndroid()
if (native) { /* Capacitor path */ } else { /* Web path */ }
```

### `import.meta.env` Environment Variables
**Source:** `src/integrations/supabase/client.ts` (lines 5–6)
**Apply to:** `capacitor.config.ts` (if any env vars needed), any new utility that reads config

```typescript
const VALUE = import.meta.env.VITE_SOME_KEY;
```

### Non-blocking Error Handling in Browser APIs
**Source:** `src/main.tsx` (lines 14–16) and `src/lib/anonymous-id.ts` (lines 7–11)
**Apply to:** All Capacitor plugin calls

The project consistently uses silent try/catch for non-critical native API failures:
```typescript
.catch(() => {
  // failure reason — non-blocking
});
// or
try { ... } catch { /* ignore */ }
```

### localStorage Abstraction with try/catch
**Source:** `src/lib/anonymous-id.ts` (lines 15–25), `src/lib/geo-permission.ts` (lines 9–21)
**Apply to:** `src/integrations/supabase/client.ts` Capacitor storage adapter

Every localStorage access in this codebase is wrapped in try/catch. The Capacitor Preferences adapter must follow the same pattern:
```typescript
export function getGeoPermission(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}
```

### Supabase Auth Session Pattern
**Source:** `src/contexts/AuthContext.tsx` (lines 31–57)
**Apply to:** All new Capacitor code that needs to know auth state

The single source of truth for auth state is `supabase.auth.onAuthStateChange`. No new code should read auth state directly — use `useAuth()` hook or the existing `AuthContext`.

---

## No Analog Found

No files in Phase 1 lack an analog. All modifications are extensions of existing files. The only truly new file is `capacitor.config.ts`, which has no existing analog in the codebase but follows the TypeScript typed-config pattern from `vite.config.ts`.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `capacitor.config.ts` | config | transform | New file with no existing analog — use Capacitor CLI docs shape, typed with `CapacitorConfig` |
| `android/` directory | native project | — | Generated by `npx cap add android` — not hand-authored |

---

## Key Constraints for Phase 1

1. **PWA must keep working.** Every web-facing change is additive or guarded by `isNative()`. The service worker, manifest, and existing camera flow remain intact for PWA users.

2. **`onCapture(file: File, coords: Coords | null)` contract is frozen.** `PhotoCapture.tsx` calls this signature. Capacitor Camera integration must convert its `DataUrl` result to a `File` before calling `onCapture` — the caller (`Index.tsx` line 49) must not change.

3. **`@/lib/platform.ts` is the single source of truth for platform detection.** Never inline `window.Capacitor` checks in components — add a named function to `platform.ts` and import it.

4. **Supabase client is a singleton.** The `isNative()` check in `client.ts` runs once at module load time — safe for Capacitor because the native context is known at startup.

---

## Metadata

**Analog search scope:** `src/`, `supabase/functions/`, `vite.config.ts`, `package.json`, `index.html`
**Files scanned:** 18
**Pattern extraction date:** 2026-04-22
