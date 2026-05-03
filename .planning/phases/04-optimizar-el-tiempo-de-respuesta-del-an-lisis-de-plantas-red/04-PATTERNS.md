# Phase 5: Optimizar el tiempo de respuesta del análisis de plantas — Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 4 files to create/modify
**Analogs found:** 4 / 4

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/hooks/use-plant-identifier.ts` | hook | streaming (SSE) | `src/hooks/use-plant-identifier.ts` (itself — modify) | self |
| `supabase/functions/identify-plant/index.ts` | service | event-driven (SSE producer) | `supabase/functions/identify-plant/index.ts` (itself — modify) | self |
| `src/workers/compress.worker.ts` | utility | transform (Web Worker) | `src/hooks/use-plant-identifier.ts` (compressImage fn inside) | partial |
| `src/components/LoadingScreen.tsx` | component | event-driven (optional SSE wiring) | `src/components/LoadingScreen.tsx` (itself — no-change recommended) | self |

---

## Pattern Assignments

### `src/hooks/use-plant-identifier.ts` (hook, streaming — modify)

**Analog:** `src/hooks/use-plant-identifier.ts` (the current file; this is a replacement of key sections)

**Current imports pattern** (lines 1-5):
```typescript
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";
import { getAnonymousId } from "@/lib/anonymous-id";
import type { Coords } from "@/hooks/use-geolocation";
```

**New imports to add** — replace the canvas `compressImage` internal function and add the env constants:
```typescript
import imageCompression from "browser-image-compression";

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/identify-plant`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```
Note: The project uses `VITE_SUPABASE_PUBLISHABLE_KEY` (not `VITE_SUPABASE_ANON_KEY`) — confirmed at `src/integrations/supabase/client.ts` line 5.

**Auth / session pattern** (lines 110-120 of current file — keep unchanged):
```typescript
const { data: { session } } = await supabase.auth.getSession();
const loggedIn = !!session?.user;

const requestBody = {
  image: compressed,
  ...(session?.user
    ? { user_id: session.user.id }
    : { anonymous_id: getAnonymousId() }),
  ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
};
```

**Replace `compressImage()` call** (current lines 108) — new non-blocking pattern:
```typescript
// NEW: browser-image-compression uses Web Worker internally (non-blocking)
const compressedBlob = await imageCompression(imageFile, {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 800,
  useWebWorker: true,
  fileType: "image/jpeg",
});
// Convert to base64 for edge function (fast — heavy CPU already done in Worker)
const compressed = await fileToBase64(compressedBlob);
```

**Replace `supabase.functions.invoke` with raw fetch + SSE reader** (replaces current lines 123-127):
```typescript
const response = await fetch(EDGE_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "apikey": ANON_KEY,
    "Authorization": `Bearer ${session?.access_token ?? ANON_KEY}`,
  },
  body: JSON.stringify(requestBody),
  signal: AbortSignal.timeout(INVOKE_TIMEOUT_MS),
});

if (!response.ok) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body?.error || `HTTP ${response.status}`);
}

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  // Split on SSE event boundary (double newline)
  const events = buffer.split("\n\n");
  buffer = events.pop() ?? "";

  for (const raw of events) {
    const eventName = raw.match(/^event: (.+)$/m)?.[1];
    const dataLine  = raw.match(/^data: (.+)$/m)?.[1];
    if (!dataLine) continue;
    const payload = JSON.parse(dataLine);

    if (eventName === "result") {
      // Show result immediately — before DB write completes
      setResult(buildPlantResult(payload, compressed));
      track("plant_identified", {
        plant_name: payload.name,
        logged_in: loggedIn,
        winning_model: payload.model,
      });
    }
    if (eventName === "error") throw new Error(payload.error);
    if (eventName === "done")  {
      // Update result with DB id + localStorage for anonymous
      setPlantSearchId(payload.plant_search_id);
    }
  }
}
```

**Error handling pattern** (lines 175-183 of current file — keep structure unchanged):
```typescript
} catch (e) {
  const msg = e instanceof Error ? e.message : "Error desconocido";
  console.error("[identify] ERROR:", msg);
  setError(msg);
  track("plant_identification_failed", { error: msg });
} finally {
  console.log("[identify] finally: setIsLoading(false)");
  setIsLoading(false);
}
```

**Safety timeout pattern** (lines 77-90 of current file — keep unchanged):
```typescript
const safetyTimer = useRef<ReturnType<typeof setTimeout>>();
useEffect(() => {
  if (isLoading) {
    safetyTimer.current = setTimeout(() => {
      console.error("[identify] SAFETY TIMEOUT — forcing isLoading=false after", SAFETY_TIMEOUT_MS, "ms");
      setError("La identificación tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.");
      setIsLoading(false);
    }, SAFETY_TIMEOUT_MS);
  } else {
    clearTimeout(safetyTimer.current);
  }
  return () => clearTimeout(safetyTimer.current);
}, [isLoading]);
```

**localStorage anonymous pattern** (lines 165-174 of current file — keep but adapt to use `plant_search_id` from `done` event):
```typescript
if (!session?.user && plantSearchId) {
  try {
    const history = JSON.parse(localStorage.getItem("plant-history") || "[]");
    history.unshift({ ...plantResult, id: plantSearchId });
    localStorage.setItem("plant-history", JSON.stringify(history.slice(0, 20)));
  } catch {
    // localStorage full or unavailable — ignore
  }
}
```

**`fileToBase64` utility** (lines 189-196 of current file — keep unchanged, used after compression):
```typescript
function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

---

### `supabase/functions/identify-plant/index.ts` (service, event-driven SSE producer — modify)

**Analog:** `supabase/functions/identify-plant/index.ts` (the current file; this is a structural modification)

**Existing imports and CORS pattern** (lines 1-12 — keep unchanged):
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type ModelName,
  extractScientificName,
  computeConsensus,
} from "./consensus.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
```

**Existing types and model callers** (lines 52-200 — keep ALL unchanged):
- `PlantInfo` interface
- `ModelResult` interface
- `callClaude()`, `callGemini()`, `callOpenAI()` functions
- `parseAIResponse()`, `isFallbackResult()`, `callModelTimed()` functions

**New: `raceModels()` function** — replaces the `Promise.all` block at lines 305-309:
```typescript
// NEW: raceModels — returns first valid result, lets others run in background
async function raceModels(
  base64Data: string,
  mediaType: string
): Promise<ModelResult | null> {
  return new Promise((resolve) => {
    let won = false;
    const all = [
      callModelTimed("claude", () => callClaude(base64Data, mediaType)),
      callModelTimed("gemini", () => callGemini(base64Data, mediaType)),
      callModelTimed("gpt4o",  () => callOpenAI(base64Data, mediaType)),
    ];

    for (const p of all) {
      p.then((r) => {
        if (!won && r.success) { won = true; resolve(r); }
      });
    }
    // Fallback: if all fail, resolve with any partial result (or null)
    Promise.all(all).then((rs) => {
      if (!won) resolve(rs.find((r) => r.success) ?? null);
    });
  });
}
```

**New: Deno.serve handler with SSE streaming** — replaces lines 284-459:
```typescript
// NEW: SSE streaming response — client gets result without waiting for DB/storage
const encoder = new TextEncoder();
const send = (
  ctrl: ReadableStreamDefaultController,
  event: string,
  data: unknown
) => {
  ctrl.enqueue(
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  );
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { image, user_id, anonymous_id, lat, lng } = body;

    const match = image?.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) throw new Error("Invalid image format");
    const mediaType = match[1];
    const base64Data = match[2];

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const readable = new ReadableStream({
      async start(controller) {
        // STEP 1: race — get first winner, background the rest
        const winner = await raceModels(base64Data, mediaType);

        if (!winner) {
          send(controller, "error", {
            error: "No se pudo identificar la planta. Inténtalo de nuevo.",
          });
          controller.close();
          return;
        }

        // STEP 2: send result to client IMMEDIATELY
        send(controller, "result", {
          name:        winner.plantInfo!.name,
          description: winner.plantInfo!.description,
          care:        winner.plantInfo!.care,
          diagnosis:   winner.plantInfo!.diagnosis,
          model:       winner.model,
        });

        // STEP 3: background work (storage + DB) — client is NOT waiting
        // Storage upload (keep existing upload logic)
        const folderPrefix = user_id ?? "anonymous";
        const fileName = `${folderPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        let imageUrl = image;

        try {
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

          const { error: uploadError } = await supabaseAdmin.storage
            .from("plant-images")
            .upload(fileName, bytes, {
              contentType: mediaType,
              cacheControl: "31536000",
              upsert: false,
            });

          if (!uploadError) {
            const { data: urlData } = supabaseAdmin.storage
              .from("plant-images").getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
          }
        } catch (e) {
          console.error("Storage upload exception:", e);
        }

        // DB insert — plant_searches (keep existing logic)
        const { data: searchRow, error: searchError } = await supabaseAdmin
          .from("plant_searches")
          .insert({
            name:        winner.plantInfo!.name,
            description: winner.plantInfo!.description,
            care:        winner.plantInfo!.care,
            diagnosis:   winner.plantInfo!.diagnosis,
            image_url:   imageUrl,
            model:       winner.model,
            ...(user_id ? { user_id } : { user_id: null, anonymous_id: anonymous_id ?? null }),
            ...(typeof lat === "number" && isFinite(lat) && lat >= -90 && lat <= 90 &&
               typeof lng === "number" && isFinite(lng) && lng >= -180 && lng <= 180
              ? { lat, lng } : {}),
          })
          .select("id, created_at")
          .single();

        if (searchError) console.error("plant_searches insert error:", searchError);

        // Send done event with the DB id (client links result to history)
        send(controller, "done", {
          plant_search_id: searchRow?.id ?? null,
          created_at:      searchRow?.created_at ?? null,
        });

        // Analytics: model_evaluations (background only — non-blocking from client perspective)
        // Note: winner is known; remaining model results are available from `all` promises above
        // (Pass allResults to this function or collect inside raceModels for analytics)

        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
      },
    });
  } catch (e) {
    console.error("identify-plant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

**Analytics pattern for model_evaluations** — keep existing rows insert logic (lines 399-425) but fire it after the `done` event, passing `allResults` collected from the race:
```typescript
// Collect all results for analytics (DO NOT await before result event)
const { error: evalError } = await supabaseAdmin
  .from("model_evaluations")
  .insert(evaluationRows);

if (evalError) {
  // Non-fatal: user still gets their result
  console.error("model_evaluations insert error:", evalError);
}
```

**Rate-limit error pattern** (lines 323-333 of current file — preserve logic, adapt to SSE):
```typescript
const isRateLimit = /* check winner or allResults */ someResult?.errorMessage?.startsWith("RATE_LIMIT:");
send(controller, "error", {
  error: isRateLimit
    ? "Demasiadas consultas. Espera un momento y vuelve a intentarlo."
    : "No se pudo identificar la planta. Inténtalo de nuevo.",
});
```

---

### `src/workers/compress.worker.ts` (utility, transform — new file)

**Analog:** `src/hooks/use-plant-identifier.ts` — internal `compressImage()` function (lines 24-60) is the closest analog for the work being offloaded. The new worker is a thin wrapper around `browser-image-compression`.

No direct Worker file analog exists in the codebase. However, the pattern for the worker is intentionally minimal — `browser-image-compression` manages the Worker lifecycle internally when `useWebWorker: true`. Creating a custom `compress.worker.ts` is therefore **not required** for this phase; the library handles off-thread execution automatically.

**If a custom worker is desired** (e.g., to expose a `postMessage` interface), pattern it after the existing `compressImage` function's structure:
```typescript
// src/workers/compress.worker.ts  (new — only if custom Worker interface is needed)
import imageCompression from "browser-image-compression";

self.onmessage = async (e: MessageEvent<{ file: File; maxSizeMB: number; maxWidthOrHeight: number }>) => {
  const { file, maxSizeMB, maxWidthOrHeight } = e.data;
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: false, // already inside a Worker
      fileType: "image/jpeg",
    });
    self.postMessage({ success: true, blob: compressed });
  } catch (err) {
    self.postMessage({ success: false, error: (err as Error).message });
  }
};
```

**Vite Worker import pattern** (for the consuming hook if custom Worker is used):
```typescript
// In use-plant-identifier.ts — Vite Web Worker import syntax
import CompressWorker from "@/workers/compress.worker?worker";
const worker = new CompressWorker();
```

**Recommended approach for this phase:** Skip the custom worker file. Call `browser-image-compression` directly in `use-plant-identifier.ts` with `useWebWorker: true`. The library handles off-thread execution. `src/workers/compress.worker.ts` is in scope only if the team wants an explicit Worker abstraction.

---

### `src/components/LoadingScreen.tsx` (component, event-driven — no change recommended)

**Analog:** `src/components/LoadingScreen.tsx` (itself)

**RESEARCH.md recommendation:** Keep the cosmetic phases as-is. The real win in this phase is the `result` SSE event rendering immediately. The animated phases provide perceived-performance theater regardless of actual timing.

**Current state pattern** (lines 43-60 — keep as-is):
```typescript
export default function LoadingScreen() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [curiosity, setCuriosity] = useState(() => pickRandom(curiosities));

  useEffect(() => {
    const timer = setInterval(() => {
      setPhaseIndex((prev) => Math.min(prev + 1, phases.length - 1));
    }, PHASE_DURATION_MS);
    return () => clearInterval(timer);
  }, []);
  // ...
}
```

**If SSE-driven phases are desired** (optional enhancement), the component would accept props:
```typescript
// Optional: add props only if SSE wiring is in scope for this phase
interface LoadingScreenProps {
  /** Override phase index from real SSE events. Undefined = use cosmetic timer */
  activePhase?: number;
}
export default function LoadingScreen({ activePhase }: LoadingScreenProps = {}) {
  const [cosmeticIndex, setCosmeticIndex] = useState(0);
  const phaseIndex = activePhase ?? cosmeticIndex;
  // ... rest unchanged
}
```

**framer-motion animation pattern** (lines 65-78 — copy for any new loading indicator):
```typescript
<motion.div
  animate={{ scale: [1, 1.08, 1], rotate: [0, 6, -6, 0] }}
  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
>
  <Leaf className="size-16 text-primary" strokeWidth={1.5} />
  <motion.div
    className="absolute inset-0 rounded-full border-2 border-primary/20"
    style={{ margin: "-12px" }}
    animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
  />
</motion.div>
```

---

## Shared Patterns

### Auth header construction for raw fetch
**Source:** `src/integrations/supabase/client.ts` (line 5) + `src/hooks/use-plant-identifier.ts` (lines 110-112)
**Apply to:** `src/hooks/use-plant-identifier.ts` SSE fetch call

The project's anon key env var is `VITE_SUPABASE_PUBLISHABLE_KEY` (NOT `VITE_SUPABASE_ANON_KEY`):
```typescript
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
// session is obtained from:
const { data: { session } } = await supabase.auth.getSession();
// Authorization header:
"Authorization": `Bearer ${session?.access_token ?? ANON_KEY}`
```

### Error handling in hooks
**Source:** `src/hooks/use-plant-identifier.ts` (lines 175-183)
**Apply to:** All async operations in `use-plant-identifier.ts`
```typescript
} catch (e) {
  const msg = e instanceof Error ? e.message : "Error desconocido";
  console.error("[identify] ERROR:", msg);
  setError(msg);
  track("plant_identification_failed", { error: msg });
} finally {
  setIsLoading(false);
}
```

### CORS headers in edge function
**Source:** `supabase/functions/identify-plant/index.ts` (lines 8-12)
**Apply to:** All edge function responses including the new SSE response
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
// Always handle OPTIONS preflight:
if (req.method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders });
}
```

### Tracking / PostHog analytics
**Source:** `src/hooks/use-plant-identifier.ts` (lines 141-149) + `src/lib/track.ts`
**Apply to:** `use-plant-identifier.ts` — fire `track("plant_identified", ...)` on `result` SSE event (not at the end of the full stream)
```typescript
track("plant_identified", {
  plant_name: payload.name,
  logged_in: loggedIn,
  winning_model: payload.model,
  has_location: !!coords,
});
```

### Non-fatal error pattern for background work
**Source:** `supabase/functions/identify-plant/index.ts` (lines 361-373)
**Apply to:** Storage upload and DB insert in the SSE streaming handler
```typescript
try {
  // ... upload / DB work ...
} catch (e) {
  console.error("Storage upload exception:", e);
  // Non-fatal: fall back gracefully
}
```

### Input validation pattern
**Source:** `src/hooks/use-plant-identifier.ts` (lines 98-103)
**Apply to:** Keep as-is at the top of the `identify` callback (runs before compression)
```typescript
if (!imageFile.type.startsWith("image/")) {
  throw new Error("El archivo debe ser una imagen");
}
if (imageFile.size > MAX_FILE_SIZE) {
  throw new Error("La imagen no puede superar los 10 MB");
}
```

### SSE buffer pattern (TCP chunk safety)
**Source:** RESEARCH.md Pitfall 2 — no existing analog in codebase
**Apply to:** `use-plant-identifier.ts` SSE reader loop
```typescript
// Accumulate chunks, split on double-newline boundary, preserve incomplete tail
const events = buffer.split("\n\n");
buffer = events.pop() ?? "";
for (const raw of events) {
  const eventName = raw.match(/^event: (.+)$/m)?.[1];
  const dataLine  = raw.match(/^data: (.+)$/m)?.[1];
  if (!dataLine) continue;
  // JSON.parse errors are caught by the outer try/catch
  const payload = JSON.parse(dataLine);
}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/workers/compress.worker.ts` | utility | transform | No Web Worker files exist in the codebase. Not required if `browser-image-compression` with `useWebWorker: true` is used directly — the library manages the Worker lifecycle internally. |

---

## Test File Pattern

**Source:** `src/hooks/use-plant-identifier.test.ts`
**Apply to:** Tests for the modified `use-plant-identifier.ts`

The existing test file tests input validation and state management via `renderHook` + `act`. The streaming changes require updating the `supabase.functions.invoke` mock to a `fetch` mock:

```typescript
// Existing mock to REPLACE:
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    functions: { invoke: vi.fn() },  // <-- remove this
  },
}));

// New mock pattern for fetch SSE:
globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  body: new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(
        'event: result\ndata: {"name":"Potus","description":"...","care":"...","diagnosis":"...","model":"claude"}\n\n'
      ));
      controller.enqueue(encoder.encode(
        'event: done\ndata: {"plant_search_id":"test-id"}\n\n'
      ));
      controller.close();
    }
  }),
});
```

Test structure pattern (lines 1-5 of test file — keep):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
```

---

## Metadata

**Analog search scope:** `src/hooks/`, `src/components/`, `supabase/functions/`, `src/lib/`, `src/workers/`
**Files scanned:** 11 source files
**Pattern extraction date:** 2026-04-23
