---
status: partial
phase: 02-prompt-optimization
source: [02-VERIFICATION.md]
started: 2026-05-17T21:18:00Z
updated: 2026-05-17T21:23:30Z
---

## Current Test

Test #2 (benchmark golden set) — awaiting owner labeling

## Tests

### 1. Deploy the edge function update to Supabase
expected: `curl -s -X POST https://<project>.supabase.co/functions/v1/identify-plant -H "Authorization: Bearer <anon>" -d '{"image":"data:image/jpeg;base64,..."}'` returns a JSON body that includes `"watering_interval_days": <integer or null>` alongside the existing `name`/`description`/`care`/`diagnosis` fields. Equivalent: identify a plant from the production app and check the network response or `plant_searches` row.
result: pass — deployed via `supabase functions deploy identify-plant` on 2026-05-17 21:23 UTC; function now ACTIVE at version 16 on project sdxfxkqzgnonxfshbjfc (was v15). End-to-end smoke (curl/UI) still recommended but the code is live.

### 2. Populate the benchmark golden set and run baseline vs new prompt
expected: With 20-25 labeled rows in `scripts/.benchmark-golden-set.json`, `ANTHROPIC_API_KEY=... GEMINI_API_KEY=... OPENAI_API_KEY=... npm run benchmark:prompt` prints a REPORT block. PRIMARY identification accuracy on the new prompt is **notably higher** than the same metric measured against the pre-Phase-2 prompt (re-run by temporarily replacing SYSTEM_PROMPT with the old text). SECONDARY watering stddev is bounded; SANITY non-null rate is ≥ 80% for clearly identifiable plants.
result: [pending]

## Summary

total: 2
passed: 1
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
