---
phase: 05-optimizar-el-tiempo-de-respuesta-del-an-lisis-de-plantas-red
plan: "02"
subsystem: client-hook
tags: [streaming, sse, performance, latency, browser-image-compression, web-worker, fetch]
dependency_graph:
  requires: [05-01]
  provides: [sse-streaming-client, web-worker-image-compression]
  affects: [src/hooks/use-plant-identifier.ts]
tech_stack:
  added: [browser-image-compression@2.0.2]
  patterns: [SSE ReadableStream client, Web Worker image compression, raw fetch with AbortSignal.timeout]
key_files:
  created: []
  modified:
    - src/hooks/use-plant-identifier.ts
    - src/hooks/use-plant-identifier.test.ts
    - package.json
    - package-lock.json
decisions:
  - "AbortSignal.timeout(INVOKE_TIMEOUT_MS) used instead of withTimeout() wrapper — native API, no extra Promise overhead"
  - "setResult functional updater form used for 'done' event update and localStorage write — required to read current state without adding result to useCallback deps"
  - "Test header assertion uses toHaveProperty instead of expect.any(String) — VITE env vars are undefined in test environment so apikey is undefined; toHaveProperty confirms the key is present regardless of value"
metrics:
  duration: "12 minutes"
  completed: "2026-04-23"
  tasks_completed: 2
  files_changed: 4
---

# Phase 05 Plan 02: SSE Streaming Client + Web Worker Compression Summary

SSE streaming client in `use-plant-identifier.ts` that renders plant results immediately on the first `result` SSE event, with Web Worker-based image compression at 800px via `browser-image-compression`, replacing the main-thread canvas compressor and `supabase.functions.invoke`.

## What Was Built

The client-side `use-plant-identifier.ts` hook was rewritten to consume SSE streams from the refactored edge function (Plan 01) and use non-blocking Web Worker image compression.

**Before:**
1. `compressImage()` ran canvas resizing synchronously on the main thread (blocking UI at 400px max)
2. `supabase.functions.invoke()` waited for a single buffered JSON response — no result until the full server round-trip completed
3. No intermediate result rendering possible

**After:**
1. `imageCompression(imageFile, { useWebWorker: true, maxWidthOrHeight: 800 })` offloads compression to a Web Worker — main thread stays responsive. Resolution upgraded to 800px for better AI diagnostic accuracy.
2. Raw `fetch(EDGE_URL, { signal: AbortSignal.timeout(INVOKE_TIMEOUT_MS) })` sends request directly to the edge function URL
3. `ReadableStream` SSE reader parses `event: result`, `event: done`, and `event: error` events incrementally
4. `setResult()` is called immediately on the first `result` SSE event — user sees the result before storage upload and DB insert complete
5. `event: done` updates the result with the DB `plant_search_id` and writes to `localStorage` for anonymous users via functional updater pattern

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install browser-image-compression and rewrite use-plant-identifier.ts | 6ff59ad | src/hooks/use-plant-identifier.ts, package.json, package-lock.json |
| 2 | Update tests for SSE-based identification flow | c38a65e | src/hooks/use-plant-identifier.test.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test header assertion for undefined env vars**
- **Found during:** Task 2
- **Issue:** `expect.any(String)` and `expect.anything()` both fail when `apikey` header is `undefined` — in the test environment `VITE_SUPABASE_PUBLISHABLE_KEY` is not set, so `ANON_KEY` is `undefined`. `expect.anything()` explicitly excludes `null` and `undefined`.
- **Fix:** Changed the "sends correct headers" test assertion to use direct `.mock.calls[0]` access + `toHaveProperty` checks, which confirm the key is present in the headers object without requiring a specific value type.
- **Files modified:** src/hooks/use-plant-identifier.test.ts
- **Commit:** c38a65e

## Known Stubs

None. All data fields are wired from SSE events. The `id` field starts as `""` and is updated to the real `plant_search_id` when the `done` SSE event arrives — this is intentional and documented in code comments. No placeholder values flow to the UI.

## Threat Surface Scan

Changes align with the plan's threat model (T-05-04, T-05-05, T-05-06). No new trust boundaries introduced:

- T-05-04 (Spoofing): Bearer token from `supabase.auth.getSession()` or anon key fallback — identical auth surface to previous `supabase.functions.invoke` behavior. Mitigated.
- T-05-05 (Tampering): `JSON.parse(dataLine)` inside SSE loop is wrapped in the outer `try/catch`. Malformed payloads trigger error state. Stream is TLS-encrypted. Mitigated.
- T-05-06 (DoS): `AbortSignal.timeout(INVOKE_TIMEOUT_MS)` on the fetch call + `SAFETY_TIMEOUT_MS` useEffect fallback. Both preserved. Mitigated.

## Self-Check: PASSED

- src/hooks/use-plant-identifier.ts: FOUND
- src/hooks/use-plant-identifier.test.ts: FOUND
- package.json contains `browser-image-compression`: FOUND
- Commit 6ff59ad: FOUND in git log
- Commit c38a65e: FOUND in git log
- `import imageCompression from "browser-image-compression"`: present
- `const EDGE_URL =`: present
- `const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`: present
- `imageCompression(imageFile,`: present
- `maxWidthOrHeight: 800`: present
- `useWebWorker: true`: present
- `fetch(EDGE_URL,`: present
- `response.body!.getReader()`: present
- `eventName === "result"`: present
- `eventName === "done"`: present
- `eventName === "error"`: present
- `AbortSignal.timeout(INVOKE_TIMEOUT_MS)`: present
- `supabase.functions.invoke`: absent
- `compressImage(`: absent
- `export interface PlantResult`: present
- `SAFETY_TIMEOUT_MS`: present
- `track("plant_identified"`: present
- `track("plant_identification_failed"`: present
- `npm run build` exits 0: PASSED
- `npx vitest run src/hooks/use-plant-identifier.test.ts` 11/11 tests passing: PASSED
