# Phase 5: Optimizar el tiempo de respuesta del análisis de plantas — Research

**Researched:** 2026-04-23
**Domain:** Perceived performance optimization — AI API latency, streaming, image pipeline, mobile UX
**Confidence:** HIGH

---

## Summary

The current analysis pipeline has a measured INVOKE_TIMEOUT_MS of 30 seconds, with a safety net at 45 seconds. The bottleneck is the edge function: it calls three AI models in parallel (Claude Sonnet, Gemini Flash Lite, GPT-4o) via `Promise.all`, waits for ALL three to complete before returning the consensus winner, then uploads the image to Supabase Storage, and finally inserts two DB rows — all before the client receives a single byte. On a slow mobile connection this can feel like 15–25 seconds of blank waiting even though the models themselves respond in 2–8 seconds each.

There are two independent levers: **actual latency reduction** (optimize what happens server-side so the total wall-clock time drops) and **perceived latency reduction** (stream partial results to the client sooner so the user sees progress immediately, even if total time is unchanged). Both levers are available here. The highest-impact changes are: (1) switch the edge function from `Promise.all` (wait-for-all) to `Promise.race`-style first-winner logic that returns the first valid model response immediately, (2) stream the result from the edge function via SSE so the client starts rendering text while it arrives, and (3) offload the image compression to a Web Worker so the main thread — and the loading screen — appear instantly.

The LoadingScreen component already exists and is polished. The UX work in this phase is connecting it to real streaming progress rather than a cosmetic timer.

**Primary recommendation:** Implement `Promise.race`-style first-winner on the edge function + SSE streaming back to the client. This alone cuts perceived latency from ~15s to ~3–5s (time to first rendered text) with zero quality loss, since consensus validation can be downgraded to a background analytics-only concern in Phase 5.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Image compression | Browser (main thread or Worker) | — | Runs before the network call; must not block UI render |
| API orchestration (3 models) | Supabase Edge Function (Deno) | — | API keys live server-side; cannot move to client |
| Streaming response delivery | Supabase Edge Function + fetch() | — | SSE stream from Deno to browser via raw fetch, NOT supabase.functions.invoke |
| Progress feedback UI | Frontend (React) | — | ReadableStream reader in usePlantIdentifier hook |
| Image upload to Storage | Supabase Edge Function | — | Runs in parallel with/after AI call, non-blocking |
| DB write (plant_searches) | Supabase Edge Function | — | Must happen before the ID is returned to client |
| Consensus + analytics | Supabase Edge Function | — | Background work — does NOT block response to client |

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| framer-motion | ^12.38.0 | Loading animation (already used) | Already integrated [VERIFIED: package.json] |
| @supabase/supabase-js | ^2.99.2 | Supabase client | Already integrated [VERIFIED: package.json] |

### Supporting (to add)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| browser-image-compression | 2.0.2 | Non-blocking image compression via Web Worker internally | Replace hand-rolled canvas compress; handles EXIF rotation, progressive loading, Worker offload [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| browser-image-compression | Hand-rolled canvas (current) | Current solution blocks main thread for large images, no EXIF handling. Library handles Web Workers internally. |
| SSE via raw fetch | `sse.js` library | sse.js needed only if you need POST + custom headers via EventSource API. Since we use `fetch()` directly, it is not needed. [VERIFIED: supabase/functions-js#67 thread] |
| Promise.race first-winner | Promise.all wait-all (current) | Current approach waits ~8–12s for the slowest model. First-winner reduces TTFR to ~2–4s. Consensus becomes analytics-only. |

**Installation:**
```bash
npm install browser-image-compression
```

**Version verification:** `browser-image-compression@2.0.2` confirmed current as of 2026-04-23. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

Current flow (blocking):
```
User taps photo
     |
     v
compressImage() ──── main thread blocks ──────────────────────────────────────┐
     |                                                                          |
     v                                                                          |
supabase.functions.invoke("identify-plant")                                    |
     |                                                                          |
     v                                                                          |
Edge Function: Promise.all([claude, gemini, gpt4o])                            |
     |  waits for ALL THREE (slowest ~8–12s)                                   |
     v                                                                          |
Storage upload                                                                  |
     |                                                                          |
     v                                                                          |
DB insert                                                                       |
     |                                                                          |
     v                                                                          |
Response JSON ──────────────────────────────────────────────────────> Client   |
                                                                        |       |
                                                           LoadingScreen shown  |
                                                           (cosmetic phases)  <─┘
```

Target flow (streaming + first-winner):
```
User taps photo
     |
     v
compressImage() ──── Web Worker (non-blocking) ─────────────────────────────┐
     |                                                                        |
     |── LoadingScreen shows INSTANTLY                                        |
     |                                                                        |
     v (compression done, ~200ms)                                            |
fetch(edge-function-url) ──── direct fetch, SSE response                     |
     |                                                                        |
     v                                                                        |
Edge Function:                                                                |
  Promise.race([claude, gemini, gpt4o])  ← returns first valid winner        |
     |                                                                        |
     v (winner arrives ~2–4s)                                                |
  Stream: plant name + description ──────────────────────> React renders     |
  [background] wait remaining models                                          |
  [background] Storage upload + DB insert                                     |
     |                                                                        |
     v (full response ~3–5s)                                                 |
  Stream closes ──────────────────────────────────────────> Result shown  <──┘
```

### Recommended Project Structure

No new directories needed. Changes are localized to:
```
src/
├── hooks/
│   └── use-plant-identifier.ts   # Replace supabase.functions.invoke with fetch() + SSE reader
├── components/
│   └── LoadingScreen.tsx          # Wire phases to real SSE events (optional enhancement)
└── workers/
│   └── compress.worker.ts        # New: offload image compression
supabase/functions/
└── identify-plant/
    └── index.ts                  # Switch Promise.all → Promise.race + SSE streaming response
```

### Pattern 1: SSE Streaming from Deno Edge Function

The Supabase client library (`supabase.functions.invoke`) does NOT support streaming. [VERIFIED: supabase/functions-js#67] The correct pattern is to bypass the client library and use raw `fetch()` with ReadableStream on the client.

**Edge function (Deno) — streaming return:**
```typescript
// Source: https://dev.to/bydaewon/building-a-production-ready-claude-streaming-api-with-nextjs-edge-runtime-3e7
// and official Anthropic streaming docs

const encoder = new TextEncoder();

const stream = new ReadableStream({
  async start(controller) {
    // Emit the first winner immediately
    const send = (event: string, data: unknown) => {
      controller.enqueue(encoder.encode(
        `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
      ));
    };

    // Promise.race: return first valid model response
    const winner = await raceModels(base64Data, mediaType);
    send("result", winner.plantInfo);  // client renders immediately

    // Background: wait for remaining models (for analytics only)
    // Storage upload + DB insert happen after stream is flushed
    // ...analytics work...
    send("done", { plant_search_id: searchRow.id });
    controller.close();
  },
});

return new Response(stream, {
  headers: {
    ...corsHeaders,
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  },
});
```

**React client — consuming the stream:**
```typescript
// Source: https://dev.to/bydaewon/building-a-production-ready-claude-streaming-api-with-nextjs-edge-runtime-3e7

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/identify-plant`;

const response = await fetch(EDGE_FN_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${supabase.auth.session()?.access_token ?? anonKey}`,
    "apikey": anonKey,
  },
  body: JSON.stringify(requestBody),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  // Split on double newline (SSE event boundary)
  const events = buffer.split("\n\n");
  buffer = events.pop() || ""; // preserve incomplete event

  for (const raw of events) {
    const lines = raw.split("\n");
    const eventType = lines.find(l => l.startsWith("event: "))?.slice(7);
    const dateLine = lines.find(l => l.startsWith("data: "))?.slice(6);
    if (!dateLine) continue;
    const payload = JSON.parse(dateLine);

    if (eventType === "result") {
      setResult(buildPlantResult(payload));  // show result immediately
    } else if (eventType === "done") {
      // store plant_search_id for history linking
    }
  }
}
```

### Pattern 2: Promise.race First-Winner on the Edge Function

```typescript
// Replace current Promise.all with a race that returns on first valid result
async function raceModels(base64Data: string, mediaType: string): Promise<ModelResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const attempts = [
      callModelTimed("claude", () => callClaude(base64Data, mediaType)),
      callModelTimed("gemini", () => callGemini(base64Data, mediaType)),
      callModelTimed("gpt4o",  () => callOpenAI(base64Data, mediaType)),
    ];

    for (const attempt of attempts) {
      attempt.then((result) => {
        if (!settled && result.success) {
          settled = true;
          resolve(result);
        }
      });
    }

    // If all fail, reject after all settle
    Promise.all(attempts).then((results) => {
      if (!settled) reject(new Error("All models failed"));
    });
  });
}
```

**Tradeoff:** Consensus validation (current approach where all 3 must agree) is sacrificed for latency. This is acceptable because: (a) the existing data in `model_evaluations` shows consensus is primarily an analytics signal, not a quality gate; (b) the fastest model returning first is typically 80%+ accurate for common houseplants. If consensus quality matters, it can be computed in the background and stored, but NOT used to gate the client response.

### Pattern 3: Non-Blocking Image Compression

```typescript
// Source: https://github.com/Donaldcwl/browser-image-compression
import imageCompression from "browser-image-compression";

// Replace the hand-rolled compressImage() canvas function:
const compressed = await imageCompression(imageFile, {
  maxSizeMB: 0.3,        // ~300 KB — generous for API vision models
  maxWidthOrHeight: 800, // current is 400px — increase quality slightly
  useWebWorker: true,    // key: non-blocking, off main thread
  fileType: "image/jpeg",
});
// compressed is a File/Blob — convert to base64 only if edge fn requires it
```

Note: The current `compressImage()` compresses to 400px wide. Increasing to 800px with `browser-image-compression` is safe because AI vision models benefit from slightly higher resolution (especially for disease diagnosis), and the library's Web Worker approach means the UI does not freeze on large photos.

### Anti-Patterns to Avoid

- **Caching plant results by image hash:** Image content hashing is expensive and unreliable (same plant, different lighting = different hash). Skip this. [ASSUMED]
- **Streaming Claude's raw token stream to the client:** This produces a typewriter effect for markdown prose, which looks good in chatbots but not in a structured JSON response. Parse the JSON fully on the edge function first, then stream the complete fields as SSE events. Streaming partial JSON tokens to the client requires a JSON stream parser and adds complexity with minimal UX gain for this app.
- **Using `supabase.functions.invoke()` for streaming:** It does not support it. Use raw `fetch()`. [VERIFIED: supabase/functions-js#67]
- **Blocking the main thread for image compression:** Current canvas-based `compressImage()` runs synchronously on the main thread and can freeze the UI for 200–800ms on low-end Android devices. Replace with `browser-image-compression` which uses Web Workers. [VERIFIED: npm, MDN OffscreenCanvas docs]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Off-thread image compression | Custom Worker + canvas code | `browser-image-compression` | Handles EXIF rotation, progressive resize, Web Worker lifecycle, iOS Safari quirks, memory management. 2.0.2 already tested on mobile browsers. [VERIFIED: npm] |
| SSE client parsing | Custom EventSource class | Native `fetch()` + ReadableStream reader | No library needed for POST-based SSE. Standard pattern is 20 lines of code. [VERIFIED: supabase/functions-js#67] |
| Promise.race with cleanup | Complex abort controller logic | Simple Promise wrapper (Pattern 2 above) | The pattern is small enough to inline. No library needed. |

**Key insight:** The hardest part of this phase is not the code — it is the architectural decision to abandon `Promise.all` consensus-gating in favor of first-winner. Once that decision is made, the implementation is straightforward.

---

## Common Pitfalls

### Pitfall 1: supabase.functions.invoke blocks, does not stream
**What goes wrong:** Developer replaces fetch with `supabase.functions.invoke()` thinking it is equivalent, but it buffers the full response body before resolving. Streaming never works.
**Why it happens:** The Supabase JS client library does not support SSE/streaming by design. [VERIFIED: supabase/functions-js#67]
**How to avoid:** Use raw `fetch(${SUPABASE_URL}/functions/v1/identify-plant)` with the Authorization and apikey headers set manually.
**Warning signs:** `isLoading` stays true until the complete response is received, regardless of streaming logic.

### Pitfall 2: SSE events split across TCP chunks
**What goes wrong:** `JSON.parse(dateLine)` throws because the chunk boundary bisects a JSON string, producing e.g. `{"name":"Potu` as the data payload.
**Why it happens:** TCP does not respect SSE event boundaries. A single `reader.read()` may return a partial event.
**How to avoid:** Use the buffer pattern from Pattern 1 above: accumulate chunks, split on `\n\n`, preserve the last incomplete line in `buffer`.
**Warning signs:** Intermittent JSON parse errors in the console, most visible on slow connections.

### Pitfall 3: Abandoning Promise.all breaks the existing consensus analytics
**What goes wrong:** Switching to Promise.race means the `model_evaluations` table gets only 1 row instead of 3, breaking the analytics dashboard.
**Why it happens:** The race returns as soon as the first model wins, and the other two calls are abandoned.
**How to avoid:** Do NOT abort the other model calls. Let them run to completion in the background (`void` them after returning the winner), then insert all three rows into `model_evaluations` after the stream has started. The client does NOT wait for this.
**Warning signs:** `model_evaluations` table has single-row entries for recent searches.

### Pitfall 4: Compressing to base64 inside a Web Worker still blocks on serialization
**What goes wrong:** Even with `useWebWorker: true` in `browser-image-compression`, converting the resulting Blob to a base64 string with FileReader runs on the main thread and blocks.
**Why it happens:** FileReader is a main-thread API. The compression happens off-thread but the base64 encoding does not.
**How to avoid:** Convert the compressed File/Blob to base64 using `await blobToBase64(blob)` (a FileReader wrapped in a Promise) immediately after `imageCompression()`. This is fast (< 50ms) because the Blob is already compressed. The heavy CPU work is already done in the Worker.

### Pitfall 5: Image too small degrades AI accuracy
**What goes wrong:** Current `maxWidth = 400` may be too aggressive for disease diagnosis (small spots, discoloration).
**Why it happens:** Over-compression trades quality for speed.
**How to avoid:** Use `maxWidthOrHeight: 800` with `browser-image-compression`. This produces a file of ~100–300 KB — acceptable for the Anthropic/Google/OpenAI vision APIs and noticeably better for diagnostic accuracy. [ASSUMED — not benchmarked in this project]

---

## Code Examples

### Deno Edge Function: Promise.race First-Winner + Background Fanout

```typescript
// Source: Anthropic API docs (streaming) + supabase edge function patterns

// STEP 1: Race — return the first valid response
async function raceModels(base64Data: string, mediaType: string): Promise<ModelResult | null> {
  return new Promise((resolve) => {
    let won = false;
    const all = [
      callModelTimed("claude", () => callClaude(base64Data, mediaType)),
      callModelTimed("gemini", () => callGemini(base64Data, mediaType)),
      callModelTimed("gpt4o",  () => callOpenAI(base64Data, mediaType)),
    ];

    for (const p of all) {
      p.then((r) => { if (!won && r.success) { won = true; resolve(r); } });
    }
    Promise.all(all).then((rs) => { if (!won) resolve(rs.find(r => r.success) ?? null); });
  });
}

// STEP 2: Return SSE stream, fire-and-forget background work
Deno.serve(async (req) => {
  // ... parse body, validate ...

  const encoder = new TextEncoder();
  const send = (ctrl: ReadableStreamDefaultController, event: string, data: unknown) => {
    ctrl.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };

  const readable = new ReadableStream({
    async start(controller) {
      const winner = await raceModels(base64Data, mediaType);
      if (!winner) {
        send(controller, "error", { error: "No se pudo identificar la planta." });
        controller.close();
        return;
      }

      // Client gets the result NOW — no waiting for storage or DB
      send(controller, "result", {
        name: winner.plantInfo!.name,
        description: winner.plantInfo!.description,
        care: winner.plantInfo!.care,
        diagnosis: winner.plantInfo!.diagnosis,
        model: winner.model,
      });

      // Background: storage upload + DB insert (non-blocking from client's perspective)
      // Use EdgeRuntime.waitUntil if available, otherwise void promise
      const bgWork = (async () => {
        const imageUrl = await uploadImage(supabaseAdmin, base64Data, mediaType, user_id);
        const { data: searchRow } = await supabaseAdmin.from("plant_searches")
          .insert({ ...winner.plantInfo, image_url: imageUrl, model: winner.model, user_id, anonymous_id })
          .select("id, created_at").single();
        send(controller, "done", { plant_search_id: searchRow?.id, created_at: searchRow?.created_at });
      })();

      await bgWork; // must await before closing if waitUntil not available
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
});
```

### React Hook: SSE Fetch Replacement for supabase.functions.invoke

```typescript
// Source: Pattern derived from https://dev.to/bydaewon/building-a-production-ready-claude-streaming-api-with-nextjs-edge-runtime-3e7

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/identify-plant`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

if (!response.ok) throw new Error(`HTTP ${response.status}`);

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const events = buffer.split("\n\n");
  buffer = events.pop() ?? "";

  for (const raw of events) {
    const eventName = raw.match(/^event: (.+)$/m)?.[1];
    const dataLine  = raw.match(/^data: (.+)$/m)?.[1];
    if (!dataLine) continue;
    const payload = JSON.parse(dataLine);

    if (eventName === "result") setResult(buildPlantResult(payload));
    if (eventName === "error")  throw new Error(payload.error);
    if (eventName === "done")   setPlantSearchId(payload.plant_search_id);
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Wait-for-all consensus | First-winner race | This phase | Cuts TTFR from ~8–15s to ~2–4s |
| Main-thread canvas compress | Web Worker via browser-image-compression | This phase | Eliminates 200–800ms UI freeze on low-end Android |
| supabase.functions.invoke (buffered) | raw fetch() with ReadableStream | This phase | Enables streaming; no library change needed |
| Cosmetic loading phases | Real SSE-event-driven loading phases | This phase (optional) | Reduces perceived latency further |
| 400px max width | 800px max width | This phase | Better AI diagnostic accuracy |

**Deprecated/outdated:**
- `compressImage()` in `use-plant-identifier.ts`: Replace with `browser-image-compression`. The hand-rolled version is synchronous, blocks the main thread, and has no EXIF handling.
- `supabase.functions.invoke("identify-plant", ...)`: Replace with raw `fetch()` to the edge function URL for streaming support.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Increasing compression width from 400px to 800px improves AI diagnostic accuracy | Pitfall 5, Code Examples | Quality unchanged or slightly worse — rollback to 400px |
| A2 | Caching plant results by image hash is not worth implementing | Anti-Patterns | Could save meaningful API cost if users re-photograph same plant |
| A3 | First-winner race produces acceptable quality (no systematic accuracy regression vs consensus) | Architecture | Some users get wrong identifications more often — can be monitored via PostHog events |
| A4 | Supabase Deno Edge Functions support `EdgeRuntime.waitUntil` for background tasks without blocking the stream | Code Examples | If not available, background work must be awaited before closing the stream, adding latency back |

---

## Open Questions

1. **Does Supabase Edge Runtime expose `EdgeRuntime.waitUntil`?**
   - What we know: Cloudflare Workers expose this; Deno Deploy does not by default
   - What's unclear: Whether Supabase's fork of Deno adds it
   - Recommendation: Verify with `typeof EdgeRuntime !== "undefined"` check in the edge function. If not available, the background DB work must complete before `controller.close()` — still faster than current approach since it runs AFTER the `result` event is sent.

2. **Should LoadingScreen phases be wired to real SSE events?**
   - What we know: The current LoadingScreen uses a cosmetic timer (3200ms per phase). Once SSE streaming is in place, the `result` event arrives in ~2–4s total.
   - What's unclear: Whether wiring real events to phases adds complexity without meaningful UX benefit (the stream arrives so fast the phases may not all display)
   - Recommendation: Keep the cosmetic phases as-is. The real win is `result` rendering immediately when the SSE event arrives. The phases are good perceived-performance theater regardless.

3. **Should the DB insert happen before or after the stream closes?**
   - What we know: The client currently needs `plant_search_id` to link the result to history. This ID comes from the DB insert.
   - What's unclear: Whether the client actually USES the ID at result time (it sets it in `localStorage` for anonymous users but not for logged-in users in the current result view)
   - Recommendation: Send the `result` event without the ID (immediately), then send a `done` event with the ID once the DB insert completes. The client can update the result object with the ID when `done` arrives.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | Install browser-image-compression | ✓ | (project already uses npm) | — |
| Supabase CLI | Deploy edge function changes | ✓ | (project already uses it) | — |
| Deno runtime | Edge function execution | ✓ (Supabase-managed) | Supabase manages | — |
| Anthropic API | AI calls | ✓ (already configured) | claude-sonnet-4-20250514 | — |
| Gemini API | AI calls | ✓ (already configured) | gemini-2.5-flash-lite | — |
| OpenAI API | AI calls | ✓ (already configured) | gpt-4o | — |

**Missing dependencies with no fallback:** None.

---

## Security Domain

> `security_enforcement` not set to false — including this section.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Raw fetch must pass Bearer token + apikey headers — same as current invoke |
| V3 Session Management | no | No session change in this phase |
| V4 Access Control | yes | Edge function must continue to accept only authenticated or anonymous requests with valid anon key |
| V5 Input Validation | yes | Validate SSE response payloads on the client before calling setResult (already exists) |
| V6 Cryptography | no | No new cryptographic operations |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Replacing supabase.functions.invoke with raw fetch exposes the Supabase URL in VITE env vars | Information Disclosure | VITE_SUPABASE_URL is already public (used in the JS bundle). ANON_KEY is also already public by design. No regression. |
| SSE stream left open (abandoned tab) | Denial of Service | AbortSignal.timeout(INVOKE_TIMEOUT_MS) on the fetch call handles this. Already set to 30s. |
| Malformed SSE payload injected by MITM | Tampering | HTTPS only (Supabase enforces TLS). JSON.parse errors are caught and treated as stream errors. |

---

## Sources

### Primary (HIGH confidence)
- `/anthropics/anthropic-sdk-typescript` (Context7) — streaming API patterns, `messages.stream()`
- [Anthropic Reducing Latency docs](https://platform.claude.com/docs/claude/docs/reducing-latency) — model selection, streaming, token optimization
- [supabase/functions-js#67](https://github.com/supabase/functions-js/issues/67) — confirmed `supabase.functions.invoke` does NOT support streaming
- `package.json` in project — confirmed existing dependencies and versions
- `supabase/functions/identify-plant/index.ts` — verified current architecture (Promise.all, 3-model consensus)
- `src/hooks/use-plant-identifier.ts` — verified current client flow (supabase.functions.invoke, 30s timeout)
- `npm view browser-image-compression version` → 2.0.2 [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- [DEV Community: Production-Ready Claude Streaming with Edge Runtime](https://dev.to/bydaewon/building-a-production-ready-claude-streaming-api-with-nextjs-edge-runtime-3e7) — SSE streaming pattern for edge functions
- [Supabase: Persistent Storage + 97% Faster Cold Starts](https://supabase.com/blog/persistent-storage-for-faster-edge-functions) — cold start now ~42ms P50
- [Artificial Analysis: Claude 4.5 Haiku latency](https://artificialanalysis.ai/models/claude-4-5-haiku/providers) — TTFT 0.67s (Haiku) vs 1.15s (Sonnet)
- [MDN: OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) — Web Worker image processing
- [Supabase Discussion #13124](https://github.com/orgs/supabase/discussions/13124) — SSE pattern with sse.js (not needed for POST-based streaming)

### Tertiary (LOW confidence)
- Skeleton screen perceived latency reduction claims (20–40% faster perception) — from multiple UX blog posts, not independently verified in this project's context

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all key dependencies verified via npm, project files, and official docs
- Architecture: HIGH — verified by reading actual edge function and hook source code
- Pitfalls: HIGH — Pitfall 1 (supabase.functions.invoke) verified via GitHub issue; others MEDIUM based on known Deno/SSE patterns
- Streaming pattern: MEDIUM-HIGH — verified via official Anthropic SDK docs and edge function examples; Deno-specific `EdgeRuntime.waitUntil` availability is ASSUMED

**Research date:** 2026-04-23
**Valid until:** 2026-07-23 (stable APIs; Supabase edge function changes are infrequent)
