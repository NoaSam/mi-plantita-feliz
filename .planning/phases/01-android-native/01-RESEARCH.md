# Phase 1: Android Native — Research

**Researched:** 2026-04-22
**Domain:** Capacitor 8 / Android native packaging from Vite + React PWA
**Confidence:** HIGH (stack verified against npm registry and official Capacitor docs)

---

## Summary

Phase 1 converts Mi Plantita Feliz from a deployed-to-Vercel PWA into an Android native app distributed via Google Play Store. The mechanism is Capacitor 8 — it wraps the compiled Vite output in an Android WebView and provides native plugin bridges for camera, storage persistence, and system chrome (splash screen, status bar).

The project has no Capacitor packages installed yet and no `capacitor.config.ts`. The entire native layer needs to be added on top of the existing Vite + React codebase. A PATTERNS.md file already maps every file that needs to change — this research document provides the technical grounding for those patterns.

The two highest-risk items are: (1) the service worker, which actively breaks Capacitor plugin injection if left running in the native shell; and (2) the base64 image storage pattern (`image_url` column stores a compressed data URL), which causes OOM crashes in Android WebView when loading history. Both require surgical changes but leave the PWA path intact.

**Primary recommendation:** Install Capacitor 8 packages, add `capacitor.config.ts` with `webDir: "dist"` and `base: "./"` in Vite, gate the service worker registration behind a `window.Capacitor` check, use `@capacitor/camera` with `CameraResultType.DataUrl`, upload images to Supabase Storage before saving to the DB, and generate Android assets via `@capacitor/assets`. Android Studio + JDK 21 must be installed before `npx cap add android` will succeed — neither is present on this machine.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Camera capture | Native (Android OS) | Frontend (React) | Native camera Intent provides frames; JS calls Capacitor plugin bridge |
| Photo transmission to AI | API (Supabase Edge Fn) | — | Already server-side; no change needed |
| Image persistence | Storage (Supabase Storage) | DB (plant_searches.image_url) | base64 removed from DB; Storage URL replaces it |
| Auth session persistence | Frontend (Capacitor Preferences) | — | localStorage unreliable across native restarts; plugin swap required |
| Service worker | Frontend (disabled for native) | — | Must not run inside Capacitor WebView |
| Splash screen | Native (Android OS / Capacitor plugin) | — | Drawn by OS before WebView loads; JS-only not possible |
| Status bar | Native (Android OS / Capacitor plugin) | — | Hardware chrome; CSS cannot reach it |
| App distribution | Platform (Google Play) | — | AAB upload via Play Console; keystore signed |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANDR-01 | La app se empaqueta con Capacitor y genera APK/AAB funcional | Capacitor 8 install + `npx cap add android` + `./gradlew bundleRelease` |
| ANDR-02 | La cámara funciona en el WebView de Android vía @capacitor/camera | `Camera.getPhoto({ resultType: CameraResultType.DataUrl })` replaces `<input capture>` |
| ANDR-03 | El service worker se desactiva en el build de Android para no interferir con plugins nativos | `window.Capacitor?.isNativePlatform?.()` guard in `src/main.tsx` |
| ANDR-04 | Las imágenes base64 se migran a Supabase Storage para evitar OOM en WebView | Upload to Supabase Storage bucket; store public URL in `image_url` column |
| ANDR-05 | El build de Android usa paths relativos (base: './') para que los assets carguen correctamente | `base: './'` in `vite.config.ts` when `VITE_CAPACITOR=true` |
| ANDR-06 | Los permisos de cámara incluyen rationale string y manejo de denegación | `Camera.checkPermissions()` + `Camera.requestPermissions()` + dialog UI for denied state |
| ANDR-07 | El APK/AAB cumple requisitos de Play Store (targetSdk, permisos, iconos) | targetSdk = 36 (Capacitor 8 default), adaptive icons via `@capacitor/assets` |
| ANDR-08 | Splash screen y status bar configurados con branding de la app | `@capacitor/splash-screen` + `@capacitor/status-bar` with `#2D5A27` brand color |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @capacitor/core | 8.3.1 | Capacitor runtime bridge | Current stable; required for all plugins |
| @capacitor/cli | 8.3.1 | CLI tools (cap sync, cap open, cap build) | Official CLI; same version as core |
| @capacitor/android | 8.3.1 | Android native project template | Official Android platform |
| @capacitor/camera | 8.1.0 | Native camera + photo picker | Official plugin; replaces `<input capture>` |
| @capacitor/splash-screen | 8.0.1 | Native splash screen before WebView loads | Official plugin; handles Android 12+ API |
| @capacitor/status-bar | 8.0.2 | Color + style of Android status bar | Official plugin |
| @capacitor/preferences | 8.x | Key/value storage for native auth sessions | Official replacement for localStorage in native |
| @capacitor/assets | 3.0.5 | Generate adaptive icons + splash images from source | Official asset generator tool |

`[VERIFIED: npm registry — versions confirmed 2026-04-22]`

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @capacitor/geolocation | 8.x | Native GPS (replaces navigator.geolocation) | PATTERNS.md already maps use-geolocation.ts |
| @capacitor/filesystem | 8.x | Read local file URIs (optional) | Only if webPath conversion to blob fails |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @capacitor/camera DataUrl result | CameraResultType.Uri + fetch(webPath) | Uri is more memory-efficient for large photos but adds complexity; DataUrl simpler for existing code that expects base64 |
| Supabase Storage for images | Keep base64 in DB | base64 causes OOM in WebView history list; Supabase Storage is the correct fix |
| @capacitor/assets | Manual density bucket icons | Manual work for 12+ density sizes; automated tool is standard |
| @capacitor/preferences auth adapter | Ionic Secure Storage | Preferences is free; Secure Storage is paid Ionic product |

**Installation:**
```bash
npm install @capacitor/core @capacitor/android @capacitor/camera \
  @capacitor/splash-screen @capacitor/status-bar @capacitor/preferences \
  @capacitor/geolocation
npm install --save-dev @capacitor/cli @capacitor/assets
```

---

## Architecture Patterns

### System Architecture Diagram

```
User taps camera button
        |
        v
[PhotoCapture.tsx]
  isNative()?
  ├── YES → Camera.getPhoto({ resultType: DataUrl })
  │         ↓
  │    DataUrl string
  │         ↓
  │    fetch(dataUrl) → Blob → new File(blob, "photo.jpg")
  │         ↓
  └── NO  → <input type="file" capture="environment">
             ↓
           FileReader.readAsDataURL → File object
                    ↓
              [use-plant-identifier.ts]
              compressImage(dataUrl) → compressed base64
                    ↓
              supabase.functions.invoke("identify-plant", { image: compressed })
                    ↓
              [Edge Function: identify-plant]
              1. AI identifies plant (3 models, consensus)
              2. supabase.storage.upload(image) → Storage URL    ← ANDR-04 change
              3. plant_searches.insert({ image_url: storageUrl })  ← was base64
                    ↓
              PlantResult { imageUrl: storageUrl } returned
                    ↓
              [use-plant-history.ts]
              SELECT plant_searches → imageUrl is now a URL string
              → <img src={publicUrl}> loads from CDN, not from DOM memory
```

### Recommended Project Structure (additions to existing src/)

```
/
├── capacitor.config.ts          # NEW — Capacitor root config
├── android/                     # GENERATED by npx cap add android
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml   # Camera permission + rationale strings
│   │   │   └── res/
│   │   │       ├── mipmap-*/         # Adaptive icons (generated by @capacitor/assets)
│   │   │       └── values/
│   │   │           └── strings.xml   # Rationale strings for permissions
│   │   └── build.gradle             # Signing config + SDK versions
│   └── variables.gradle             # targetSdkVersion = 36, minSdkVersion = 24
├── assets/                      # NEW — source images for @capacitor/assets
│   ├── icon-only.png            # 1024×1024px square icon (no padding)
│   ├── icon-foreground.png      # 1024×1024px foreground layer for adaptive icon
│   ├── icon-background.png      # 1024×1024px background layer (green #2D5A27)
│   ├── splash.png               # 2732×2732px splash (light mode)
│   └── splash-dark.png          # 2732×2732px splash (dark mode, optional)
└── src/
    ├── lib/
    │   └── platform.ts          # MODIFIED — add isNative(), isAndroid()
    ├── main.tsx                 # MODIFIED — SW registration guarded by !isNative()
    ├── components/
    │   └── PhotoCapture.tsx     # MODIFIED — add Capacitor Camera branch
    ├── hooks/
    │   └── use-geolocation.ts   # MODIFIED — @capacitor/geolocation for native
    └── integrations/supabase/
        └── client.ts            # MODIFIED — @capacitor/preferences for auth storage
```

### Pattern 1: Capacitor Config (capacitor.config.ts)

**What:** Root config file that Capacitor CLI reads for `appId`, `webDir`, plugin settings.
**When to use:** Required; created once, lives at project root.

```typescript
// Source: https://capacitorjs.com/docs/config
/// <reference types="@capacitor/splash-screen" />
/// <reference types="@capacitor/status-bar" />
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mijardin.app",        // Must be unique reverse-domain format
  appName: "Mi jardín",
  webDir: "dist",                    // Vite output directory
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#FDFCF8",    // App background color
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",                 // White text for dark green background
      backgroundColor: "#2D5A27",   // Brand green
    },
  },
};

export default config;
```

`[CITED: https://capacitorjs.com/docs/config]`
`[CITED: https://capacitorjs.com/docs/apis/splash-screen]`
`[CITED: https://capacitorjs.com/docs/apis/status-bar]`

### Pattern 2: Vite Config for Capacitor (ANDR-05)

**What:** `base: "./"` makes all asset paths relative, required for Capacitor WebView.
**When to use:** Production builds destined for Android. Guarded by env var to avoid breaking Vercel PWA deploy.

```typescript
// Source: Capacitor docs — assets must use relative paths in native WebView
export default defineConfig(({ mode }) => {
  const isCapacitor = process.env.VITE_CAPACITOR === "true";

  return {
    base: isCapacitor ? "./" : "/",   // "./" for Android, "/" for Vercel
    plugins: [
      react(),
      !isCapacitor && VitePWA({ /* existing config */ }),
    ].filter(Boolean),
    // ... rest of config
  };
});
```

Add to `package.json` scripts:
```json
"build:android": "VITE_CAPACITOR=true vite build",
"android": "npm run build:android && npx cap sync && npx cap open android",
"cap:sync": "npm run build:android && npx cap sync"
```

`[ASSUMED]` — The `VITE_CAPACITOR` env var pattern is inferred from Capacitor community patterns. Official Capacitor docs confirm `base: "./"` is required; the env var mechanism is a common implementation approach.

### Pattern 3: Service Worker Guard (ANDR-03)

**What:** Prevents service worker registration in Capacitor native shell.
**Why:** SW intercepts network requests before Capacitor bridge, breaking plugin injection and causing "Plugin not implemented" errors.

```typescript
// Source: Capacitor troubleshooting docs — service workers break plugin injection
// src/main.tsx — modify existing SW registration block

const isCapacitor = !!(
  window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
).Capacitor?.isNativePlatform?.();

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

`[CITED: https://capacitorjs.com/docs/android/troubleshooting]`

### Pattern 4: Camera Plugin with Permission Handling (ANDR-02, ANDR-06)

**What:** Replace `<input type="file" capture>` with `Camera.getPhoto()` for Android. Handle permission denied gracefully.
**When to use:** When `isNative()` returns true.

```typescript
// Source: https://capacitorjs.com/docs/apis/camera
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

async function takePlantPhoto(): Promise<File | null> {
  // 1. Check permission state
  const status = await Camera.checkPermissions();

  if (status.camera === "denied") {
    // Permanently denied — show dialog directing user to Settings
    showPermissionDeniedDialog(); // React toast or modal UI
    return null;
  }

  if (status.camera !== "granted") {
    // First time or prompt — request permission
    const requested = await Camera.requestPermissions({ permissions: ["camera"] });
    if (requested.camera !== "granted") return null;
  }

  // 2. Open camera or gallery (Prompt shows an action sheet)
  try {
    const photo = await Camera.getPhoto({
      quality: 70,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,  // "Take Photo" + "Choose from Gallery"
    });

    if (!photo.dataUrl) return null;

    // 3. Convert to File to match existing onCapture(File, Coords) contract
    const res = await fetch(photo.dataUrl);
    const blob = await res.blob();
    return new File([blob], "plant-photo.jpg", { type: "image/jpeg" });
  } catch {
    // User cancelled — not an error
    return null;
  }
}
```

**Permission rationale string** (in `android/app/src/main/res/values/strings.xml`):
```xml
<resources>
  <string name="app_name">Mi jardín</string>
  <!-- Capacitor camera plugin reads this key for Android rationale dialog -->
  <string name="PermissionRationaleCamera">
    Mi jardín necesita acceso a la cámara para fotografiar tus plantas e identificarlas.
  </string>
</resources>
```

`[CITED: https://capacitorjs.com/docs/apis/camera]`

**Note on @capacitor/camera v8:** Taking photos with `CameraSource.Camera` requires no AndroidManifest permissions declaration (camera permission is requested at runtime). Only `saveToGallery: true` would require READ/WRITE_EXTERNAL_STORAGE. `[CITED: https://capacitorjs.com/docs/apis/camera — v6 changelog note, applies through v8]`

### Pattern 5: Image Storage Migration (ANDR-04)

**What:** Upload image to Supabase Storage instead of storing base64 in `plant_searches.image_url`.
**Why:** A compressed base64 dataUrl is ~50-150KB of DOM text per history entry. Loading 20 history items in a WebView = 3MB of inline images in the DOM. This causes OOM on mid-range Android devices.
**Where the change happens:** In the `identify-plant` edge function, after AI analysis and before DB insert.

```typescript
// Source: Supabase Storage docs + Capacitor camera pattern
// Inside supabase/functions/identify-plant/index.ts

// After extracting base64Data from request body:
const imageBuffer = Uint8Array.from(atob(base64Data.split(",")[1]), (c) => c.charCodeAt(0));
const fileName = `${user_id ?? anonymous_id}/${Date.now()}.jpg`;

const { data: storageData, error: storageError } = await supabase.storage
  .from("plant-images")            // bucket must be created + RLS configured
  .upload(fileName, imageBuffer, {
    contentType: "image/jpeg",
    cacheControl: "31536000",      // 1 year — images are immutable
    upsert: false,
  });

// Get the public URL for display
const { data: { publicUrl } } = supabase.storage
  .from("plant-images")
  .getPublicUrl(fileName);

// Then insert publicUrl into plant_searches.image_url instead of the base64
await supabase.from("plant_searches").insert({
  // ...other fields...
  image_url: publicUrl,           // URL string, not data: URI
});
```

**Supabase Storage bucket setup** (migration file needed):
```sql
-- Create bucket for plant photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('plant-images', 'plant-images', true);

-- RLS: authenticated users can upload their own images
CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'plant-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: anyone can read (public bucket)
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'plant-images');
```

`[CITED: https://supabase.com/docs/guides/storage/uploads/standard-uploads]`
`[ASSUMED]` — The specific RLS policy for storage.objects using `storage.foldername()` is the documented Supabase pattern but the exact path structure (`user_id/timestamp.jpg`) is a design choice that needs validation.

### Pattern 6: Supabase Auth Persistence in Native (Capacitor Preferences)

**What:** Supabase auth sessions need to persist across Android app restarts. `localStorage` is wiped when the WebView is destroyed.
**When to use:** When `isNative()` is true.

```typescript
// Source: Supabase JS docs + Capacitor community pattern
// src/integrations/supabase/client.ts
import { Preferences } from "@capacitor/preferences";
import { isNative } from "@/lib/platform";

// Build a storage adapter that implements { getItem, setItem, removeItem }
function buildCapacitorStorage() {
  return {
    getItem: async (key: string) => {
      const { value } = await Preferences.get({ key });
      return value;
    },
    setItem: async (key: string, value: string) => {
      await Preferences.set({ key, value });
    },
    removeItem: async (key: string) => {
      await Preferences.remove({ key });
    },
  };
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: isNative() ? buildCapacitorStorage() : localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

`[ASSUMED]` — The Capacitor Preferences adapter interface matches what `@supabase/supabase-js` expects for `auth.storage`. This is a widely used community pattern but not explicitly documented in Supabase official docs.

### Pattern 7: Build and Sync Pipeline (ANDR-01)

**Complete workflow:**

```bash
# First time only — add Android platform
npx cap add android

# Every build cycle
npm run build:android       # Vite build with VITE_CAPACITOR=true, base: "./"
npx cap sync                # Copies dist/ to android/app/src/main/assets/public/
                            # Also installs Capacitor plugins into Android project

# Development (live reload on device/emulator)
npx cap open android        # Opens Android Studio
# In Android Studio: Run → Run 'app'

# Release build (from Android Studio)
# Build → Generate Signed Bundle/APK → Android App Bundle
# Output: android/app/release/app-release.aab
```

**Or command line release:**
```bash
cd android && ./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

`[CITED: https://ionic.io/blog/building-and-releasing-your-capacitor-android-app]`

### Anti-Patterns to Avoid

- **Importing @capacitor/* at module top level without platform check:** Capacitor plugin modules throw in browser (not native). Always guard with `isNative()` or use dynamic imports for plugin code paths.
- **Calling `Camera.getPhoto()` without checking permissions first:** On Android, calling the API without permissions granted will crash silently or return an unhelpful error. Always call `checkPermissions()` first.
- **Using `base: "/"` in Vite for native builds:** The Android WebView serves files from `file://` scheme; absolute paths starting with `/` won't resolve. Must use `base: "./"`.
- **Leaving the service worker active in native builds:** The SW intercepts requests before Capacitor's bridge, causing "Plugin not implemented" errors. The guard in `main.tsx` is non-negotiable.
- **Storing auth tokens in `localStorage` for native:** Sessions are lost on Android WebView recreation. Use `@capacitor/preferences`.
- **Treating `webPath` from Camera.getPhoto as a URL in img src:** `webPath` works in native but breaks in web context. The `DataUrl` result type is safer for cross-platform image display.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon density variants | Manual Photoshop/Figma export of 12+ sizes | `@capacitor/assets generate --android` | Handles mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi + adaptive icon XML + Android 12 splash API automatically |
| Camera permission rationale UI | Custom dialog component | `strings.xml` + OS native dialog | Android system reads `PermissionRationaleCamera` string and shows it in the permission dialog automatically |
| Storage adapter for Supabase | Custom AsyncStorage wrapper | `@capacitor/preferences` | Preferences uses native SharedPreferences under the hood; handles thread safety |
| Platform detection | `navigator.userAgent.includes("Android")` checks | `Capacitor.isNativePlatform()` | UA detection is unreliable inside WebView; Capacitor's own API is authoritative |

**Key insight:** The Capacitor plugin ecosystem handles the 90% case correctly. The edge cases (Android 12 splash screen, Photo Picker API for gallery access, permission rationale) have evolved across Android versions and require the official plugins to handle the version branching.

---

## Common Pitfalls

### Pitfall 1: Blank Screen After `npx cap sync`

**What goes wrong:** The Android app opens but shows a white screen. The browser console (Chrome DevTools → `chrome://inspect`) shows 404 errors on JS/CSS files.
**Why it happens:** Either `webDir` in `capacitor.config.ts` doesn't match Vite's `outDir` (default: `dist`), OR `base` is still `/` instead of `./` causing absolute asset paths that don't resolve in `file://` context.
**How to avoid:** Set `base: "./"` in Vite for Android builds. Confirm `capacitor.config.ts` has `webDir: "dist"`. Run `npx cap sync` after every build.
**Warning signs:** 404s on `/assets/*.js` in Chrome inspect. All JS files show as absolute paths in page source.

`[CITED: Capacitor troubleshooting docs + community reports]`

### Pitfall 2: "Plugin Not Implemented" for Camera

**What goes wrong:** `Camera.getPhoto()` throws `"Camera" plugin not implemented.` in the native build.
**Why it happens:** Service worker is still running, intercepting the Capacitor bridge's WebSocket/postMessage communication. The SW serves a cached version of the app that doesn't include the injected Capacitor bridge code.
**How to avoid:** The `isCapacitor` guard in `main.tsx` prevents SW registration. Additionally, Vite PWA plugin must be disabled for Android builds (the `!isCapacitor && VitePWA(...)` pattern in vite.config.ts).
**Warning signs:** Error message mentions "plugin not implemented" for any Capacitor plugin, not just Camera.

`[CITED: https://capacitorjs.com/docs/android/troubleshooting]`

### Pitfall 3: OOM Crash When Loading History

**What goes wrong:** The History page crashes or hangs on Android when loading more than 5-10 entries.
**Why it happens:** Each `plant_searches` row contains a full compressed base64 JPEG (~50-100KB as a string). Loading 20 rows in a WebView means 1-2MB of base64 decoded and rendered as inline `<img src="data:image/jpeg;base64,...">` elements — WebView heap exhausted on 2GB RAM devices.
**How to avoid:** ANDR-04 migration: store Supabase Storage URLs instead of base64 in `image_url`. The migration requires both: (1) updating the edge function to upload before inserting, and (2) a Supabase migration to add the Storage bucket.
**Warning signs:** App freezes or crashes specifically on History page with multiple entries. ADB logcat shows `OutOfMemoryError` in the WebView process.

`[ASSUMED]` — The OOM cause-and-effect is based on known Android WebView memory characteristics for base64 images. The specific threshold depends on device RAM but 2GB devices are the 5th percentile of Android market share.

### Pitfall 4: Auth Session Lost After App Restart

**What goes wrong:** User is logged in, closes the app, reopens — is logged out.
**Why it happens:** Supabase stores the session token in `localStorage`. On Android, WebView may be destroyed between app sessions, clearing localStorage. `@capacitor/preferences` persists to SharedPreferences (native).
**How to avoid:** The `buildCapacitorStorage()` adapter in `client.ts` resolves this. Must be applied before the first `createClient()` call.
**Warning signs:** User reports logout between app sessions, but logout does NOT happen in browser PWA.

`[CITED: Capacitor docs on storage + community reports]`

### Pitfall 5: Camera Hangs on First Open (Missing CAMERA Permission)

**What goes wrong:** User taps the camera button, nothing happens. No error shown.
**Why it happens:** `Camera.getPhoto()` internally checks for CAMERA permission. If not declared in AndroidManifest.xml, Android refuses to show the permission dialog and silently returns null.
**How to avoid:** `@capacitor/camera` declares `CAMERA` permission in its own merged manifest automatically when using `CameraSource.Camera`. No manual `AndroidManifest.xml` edit needed for camera-only (no gallery save). However, after `npx cap sync` you must verify the merged manifest includes it.
**Warning signs:** `getPhoto()` resolves immediately with undefined. No system permission dialog appears.

`[CITED: https://capacitorjs.com/docs/apis/camera — v8 permissions section]`

### Pitfall 6: targetSdk Below Play Store Requirement

**What goes wrong:** AAB upload rejected by Play Console: "Your app targets an old version of Android."
**Why it happens:** Capacitor 8 defaults to `targetSdkVersion = 36` and `minSdkVersion = 24` in `variables.gradle`. But if the project generates Android with Capacitor 7 settings and `targetSdk = 34`, it will be rejected after August 31 2025.
**How to avoid:** Use Capacitor 8 (which defaults to 36). Verify `android/variables.gradle` contains `targetSdkVersion = 36` after `npx cap add android`.
**Warning signs:** Play Console upload fails with API level error.

`[VERIFIED: Google Play developer docs — targetSdk 35 required for new apps from Aug 31 2025; Capacitor 8 defaults to 36 which satisfies this]`

### Pitfall 7: Status Bar Overlap on Android 15+

**What goes wrong:** App content is hidden under the status bar, or status bar background color is ignored.
**Why it happens:** Android 15 enforces edge-to-edge by default. `StatusBar.setBackgroundColor()` and `overlaysWebView` are deprecated/non-functional on Android 15+. Capacitor 8 removes `android.adjustMarginsForEdgeToEdge` in favor of CSS env variables.
**How to avoid:** Use CSS safe area insets: `padding-top: env(safe-area-inset-top)`. The `@capacitor/status-bar` plugin still controls text color (Light/Dark) on all Android versions.
**Warning signs:** Content is clipped at top of screen on Pixel 9 (Android 15) but fine on Pixel 6 (Android 13).

`[CITED: https://capacitorjs.com/docs/updating/8-0]`

---

## Code Examples

### Complete capacitor.config.ts

```typescript
// Source: https://capacitorjs.com/docs/config
/// <reference types="@capacitor/splash-screen" />
/// <reference types="@capacitor/status-bar" />
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mijardin.app",
  appName: "Mi jardín",
  webDir: "dist",
  android: {
    minWebViewVersion: 60,
    buildOptions: {
      releaseType: "AAB",
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#FDFCF8",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#2D5A27",
    },
  },
};

export default config;
```

### Generate Android Icons and Splash Screen

```bash
# Source: https://capacitorjs.com/docs/guides/splash-screens-and-icons
# 1. Install tool
npm install --save-dev @capacitor/assets

# 2. Create source assets directory
mkdir -p assets

# 3. Place source images (must be >= 1024x1024 for icon, >= 2732x2732 for splash)
# assets/icon-only.png        — 1024x1024, square icon with no padding
# assets/icon-foreground.png  — 1024x1024, icon foreground (transparency OK)
# assets/icon-background.png  — 1024x1024, solid green #2D5A27 background
# assets/splash.png           — 2732x2732, centered plant on #FDFCF8 background
# assets/splash-dark.png      — 2732x2732 dark variant (optional)

# 4. Generate all Android assets
npx @capacitor/assets generate --android \
  --iconBackgroundColor '#2D5A27' \
  --splashBackgroundColor '#FDFCF8'

# Output: android/app/src/main/res/mipmap-*/ic_launcher*.png
#         android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml (adaptive)
#         android/app/src/main/res/drawable/splash.png
```

### Keystore + Signing for Play Store Release

```bash
# Source: https://ionic.io/blog/building-and-releasing-your-capacitor-android-app
# Generate keystore (one-time, store securely)
keytool -genkey -v -keystore mi-jardin.keystore \
  -alias mi-jardin \
  -keyalg RSA -keysize 2048 \
  -validity 10000

# Store passwords in android/keystore.properties (NOT committed to git)
# storePassword=YOURPASSWORD
# keyPassword=YOURPASSWORD
# keyAlias=mi-jardin
# storeFile=../../mi-jardin.keystore

# Build signed AAB
cd android && ./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

**Add to `.gitignore`:**
```
# Android signing — never commit
*.keystore
*.jks
android/keystore.properties
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| APK upload to Play Store | AAB (Android App Bundle) required | 2021 | Capacitor `buildOptions.releaseType: "AAB"` generates correct format |
| Manual icon exports (12+ PNG files) | `@capacitor/assets generate` from 1 source | Capacitor 4+ | One 1024x1024 source image generates all densities + adaptive icon XML |
| `READ/WRITE_EXTERNAL_STORAGE` for gallery | Photo Picker API (no permissions needed) | Android 11+ / @capacitor/camera v6 | Camera to gallery no longer needs storage permissions declaration |
| `adjustMarginsForEdgeToEdge` config | CSS `env(safe-area-inset-*)` | Capacitor 8 / Android 15 | Status bar margin must be handled in CSS, not native config |
| `targetSdk 34` | `targetSdk 36` (Capacitor 8 default) | August 2025 | Play Store requires targetSdk 35+ for new apps; Capacitor 8 ships 36 |
| `CameraResultType.Uri` | `CameraResultType.DataUrl` (for this app) | — | DataUrl eliminates need for Filesystem API to read the URI; simpler for existing code |

**Deprecated/outdated:**
- `@ionic-native/*` wrappers: Angular-specific adapters, not needed in React + Capacitor setup
- `cordova-*` plugins: Cordova-era plugins incompatible with Capacitor 8
- `statusBar.overlaysWebView: true` on Android 15+: Setting is silently ignored on API 35+

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `VITE_CAPACITOR=true` env var pattern for conditional Vite config | Pattern 2 (Vite Config) | Low risk — alternative is separate `vite.capacitor.config.ts` file; both approaches work |
| A2 | `buildCapacitorStorage()` Supabase auth adapter matches `auth.storage` interface | Pattern 6 (Auth Persistence) | Medium risk — if interface mismatch, auth session won't persist; easy to verify at runtime |
| A3 | RLS policy `storage.foldername(name)[1]` correctly isolates user uploads | Pattern 5 (Image Storage) | Medium risk — incorrect RLS allows users to overwrite each other's images; test with two accounts |
| A4 | base64 OOM threshold is ~10 history entries on mid-range Android (2GB RAM) | Pitfall 3 | Low risk — threshold varies by device; the migration is correct regardless of exact threshold |
| A5 | `@capacitor/camera` v8 auto-declares `CAMERA` permission in merged manifest | Pitfall 5 | Low risk — verifiable after `npx cap sync` by checking merged AndroidManifest |

---

## Open Questions

1. **App ID (appId)**
   - What we know: Must be a unique reverse-domain string for Play Store
   - What's unclear: Does the owner have a domain registered? `com.mijardin.app` is used in examples here but needs confirmation
   - Recommendation: Confirm with product owner before first `npx cap add android`; changing appId after Play Store submission requires a new app listing

2. **Image Storage for Anonymous Users**
   - What we know: Anonymous identifications use `anonymous_id` instead of `user_id`; the Storage bucket RLS uses `user_id` as folder prefix
   - What's unclear: Should anonymous images go to a separate public folder? Or skip Storage and keep base64 for anonymous users only?
   - Recommendation: Use `anonymous_id` as folder prefix for anonymous uploads; add separate RLS policy. This keeps the code path consistent.

3. **Existing base64 Records in plant_searches**
   - What we know: Current production DB has existing rows with `image_url = "data:image/jpeg;base64,..."` strings
   - What's unclear: Do these need backfilling to Storage, or can the app gracefully handle both URL and data: URI formats?
   - Recommendation: Handle both in `<img src={imageUrl}>` — browsers and WebViews render data URIs natively. New writes go to Storage; old records remain as-is. This avoids a data migration.

4. **Google Play Developer Account**
   - What we know: A $25 one-time fee is required to create a Google Play Developer account
   - What's unclear: Does the owner have an existing Play Developer account?
   - Recommendation: Confirm before starting ANDR-07 tasks; the account setup is outside of code

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Capacitor 8 (requires 22+) | Yes | v25.2.1 | — |
| Android Studio 2025.2.1+ | npx cap add android, running emulator | No | — | None — must install |
| Java JDK 21 | Gradle build, Android Studio | No | — | Android Studio installs JDK automatically |
| Android SDK (API 24+, API 36) | Gradle compile + emulator | No | — | Android Studio SDK Manager |
| adb (Android Debug Bridge) | Device testing | No | — | Installed with Android Studio |
| Google Play Developer Account | APK/AAB upload to Play Store | Unknown | — | $25 one-time fee to create |

**Missing dependencies with no fallback (block execution):**
- Android Studio 2025.2.1 or newer — required for `npx cap add android` and for building the AAB. Wave 0 of the plan must include this installation step.
- Java JDK 21 — required for Gradle. Android Studio installs it automatically, so installing Android Studio resolves this.
- Android SDK — installs via Android Studio SDK Manager after Android Studio is installed.

**Missing dependencies with fallback:**
- Google Play Developer Account — code and build work without it; only needed for final distribution step (ANDR-07). Can be created in parallel with development.

**Installation path for unblocking development:**

```bash
# macOS — install Android Studio via official download or Homebrew cask
brew install --cask android-studio

# After Android Studio opens:
# 1. SDK Manager → SDK Platforms → Install API 36 (Android 16) + API 24 (min)
# 2. SDK Manager → SDK Tools → Install Android SDK Build-Tools, Platform-Tools
# 3. JDK 21 is bundled with Android Studio — no separate install needed

# Add to shell profile (~/.zshrc):
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
```

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Supabase Auth + @capacitor/preferences (session persistence) |
| V3 Session Management | Yes | `persistSession: true` in Supabase client; Preferences adapter |
| V4 Access Control | Yes | Supabase Storage RLS — users can only upload to their own folder |
| V5 Input Validation | Yes | Image size/type validation already in use-plant-identifier.ts |
| V6 Cryptography | Partial | Keystore for APK signing — use RSA-2048, 10000-day validity |

### Known Threat Patterns for Capacitor WebView Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Exposed Supabase anon key in JS bundle | Information Disclosure | Key is already `SUPABASE_PUBLISHABLE_KEY` (anon key) — this is expected; RLS enforces access |
| Camera permission abuse | Elevation of Privilege | `Camera.checkPermissions()` + rationale dialog; OS-level permission system |
| Session token in WebView localStorage | Information Disclosure | Migrate to @capacitor/preferences (SharedPreferences, not accessible to other apps) |
| Debug WebView enabled in release build | Information Disclosure | `android.webContentsDebuggingEnabled: false` (Capacitor default for release) |
| Cleartext HTTP traffic in release | Tampering | `server.cleartext: false` (Capacitor default); all Supabase calls use HTTPS |
| Keystore file committed to git | Information Disclosure | Add `*.keystore` and `keystore.properties` to `.gitignore` before first commit |

---

## Sources

### Primary (HIGH confidence)
- `/ionic-team/capacitor-docs` (Context7) — Capacitor 8 configuration, camera API, splash screen, status bar, Android troubleshooting, splash icons guide
- `npm registry` — All package versions verified 2026-04-22
- `https://capacitorjs.com/docs/updating/8-0` — Capacitor 8 breaking changes (minSdk=24, targetSdk=36, Node 22+, Android Studio Otter 2025.2.1)
- `https://developer.android.com/google/play/requirements/target-sdk` — Play Store targetSdk 35 requirement from Aug 31 2025
- `https://capacitorjs.com/docs/guides/splash-screens-and-icons` — @capacitor/assets usage and source image requirements
- `https://ionic.io/blog/building-and-releasing-your-capacitor-android-app` — Keystore + AAB release build process
- `https://supabase.com/docs/guides/storage/uploads/standard-uploads` — Supabase Storage upload pattern

### Secondary (MEDIUM confidence)
- `https://capacitorjs.com/docs/android/troubleshooting` — Service worker + plugin injection issue documented
- `https://capacitorjs.com/docs/getting-started/environment-setup` — Android Studio version requirements

### Tertiary (LOW confidence — flagged in Assumptions Log)
- Community patterns for `VITE_CAPACITOR` env var approach (multiple GitHub repos, no single official source)
- Supabase auth storage adapter for Capacitor Preferences (widely used pattern, not in Supabase official docs)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions npm-verified, Capacitor 8 confirmed as latest stable
- Architecture: HIGH — Capacitor docs explicitly confirm patterns for camera, SW guard, assets
- Pitfalls: HIGH for documented ones (blank screen, plugin injection); MEDIUM for OOM threshold specifics
- Play Store requirements: HIGH — verified against official Google developer docs

**Research date:** 2026-04-22
**Valid until:** 2026-07-22 (90 days — Capacitor releases are quarterly; Play Store policy changes have 30-day notice)
