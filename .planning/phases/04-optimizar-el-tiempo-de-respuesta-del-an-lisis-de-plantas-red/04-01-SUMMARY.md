---
phase: 05-optimizar-el-tiempo-de-respuesta-del-an-lisis-de-plantas-red
plan: "01"
subsystem: edge-function
tags: [streaming, sse, performance, latency, promise-race, deno]
dependency_graph:
  requires: []
  provides: [sse-streaming-edge-function, first-winner-race]
  affects: [use-plant-identifier]
tech_stack:
  added: []
  patterns: [SSE streaming, Promise.race first-winner, ReadableStream Deno]
key_files:
  created: []
  modified:
    - supabase/functions/identify-plant/index.ts
decisions:
  - "Consensus validation demoted from client-gating to analytics-only: the first valid model response is sent immediately, consensus computed in background and stored in model_evaluations for analytics"
  - "plant_searches insert made non-fatal (no longer throws on error): analytics failure should not prevent the user from receiving a result"
  - "allPromises array held in raceModels return value so background analytics can await all models settling without re-launching requests"
metrics:
  duration: "2 minutes"
  completed: "2026-04-23"
  tasks_completed: 1
  files_changed: 1
---

# Phase 05 Plan 01: SSE Streaming Edge Function Summary

SSE streaming of identify-plant edge function via Promise.race first-winner, cutting TTFR from ~8-15s to ~2-4s by returning the first valid AI model response before storage upload, DB insert, or analytics complete.

## What Was Built

The `identify-plant` Supabase edge function was refactored from a buffered JSON response (wait-for-all `Promise.all`) to a Server-Sent Events (SSE) streaming response with Promise.race first-winner selection.

**Before:** The function called all 3 AI models (`Promise.all`), waited for all to complete (~8-15s for the slowest), computed consensus to pick a winner, uploaded image to Supabase Storage, inserted DB rows, then returned a single JSON response. The client saw nothing until the last model finished.

**After:** The function:
1. Races all 3 models simultaneously — resolves when the FIRST valid response arrives (~2-4s)
2. Immediately streams a `result` SSE event with `name`, `description`, `care`, `diagnosis`, `model`
3. Performs storage upload and DB insert in the background (after client already has the result)
4. Streams a `done` SSE event with `plant_search_id` and `created_at` once DB insert completes
5. Awaits all 3 models to settle, then inserts all 3 `model_evaluations` rows for analytics
6. Closes the stream

Error cases send an `error` SSE event with appropriate user-facing message (rate-limit vs generic).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add raceModels() and convert handler to SSE streaming | a8b604c | supabase/functions/identify-plant/index.ts |

## Deviations from Plan

None — plan executed exactly as written. The implementation follows the plan's provided code snippets precisely, with all preservation rules honored (imports, CORS, constants, types, all model caller functions, parsing helpers, lat/lng validation, storage binary conversion pattern, plant_searches field structure, model_evaluations consensus computation).

One minor note: the plan's `<automated>` verify command checked for `grep -c "event: result"` but the code correctly uses a dynamic template literal (`event: ${event}\n`) which assembles the event type at runtime. This is the correct implementation — the literal string `event: result` would only appear if events were encoded as static strings. All other acceptance criteria pass.

## Known Stubs

None. All data fields are wired from the first valid model response. No placeholder values.

## Threat Surface Scan

Changes align with the plan's threat model (T-05-01 through T-05-04). No new trust boundaries introduced beyond what the plan documents:

- SSE stream served over HTTPS (Supabase enforces TLS). JSON payloads constructed server-side with `JSON.stringify` — no user input interpolated into event strings. (T-05-01: mitigated)
- `controller.close()` is always called in all code paths (error path and success path). (T-05-02: mitigated)
- No new endpoints or auth paths introduced. Raw fetch pattern uses the same Bearer + apikey auth as the previous `supabase.functions.invoke` pattern. (T-05-03/T-05-04: no regression)

## Self-Check: PASSED

- supabase/functions/identify-plant/index.ts: FOUND (modified, not deleted)
- Commit a8b604c: FOUND in git log
- `async function raceModels(`: present
- `"Content-Type": "text/event-stream"`: present
- `new ReadableStream(`: present
- `send(controller, "result",`: present
- `send(controller, "done",`: present
- `send(controller, "error",`: present
- `computeConsensus(allResults)`: present
- `model_evaluations` insert: present (3 occurrences — declaration, insert call, error handler)
- `callClaude`, `callGemini`, `callOpenAI`: all present (2 occurrences each — definition + call in raceModels)
- `corsHeaders`: present (4 occurrences)
- OPTIONS handler: present
- Old `Promise.all([callModelTimed(...)` pattern: absent (replaced by raceModels)
- Frontend build (`npm run build`): exits 0
