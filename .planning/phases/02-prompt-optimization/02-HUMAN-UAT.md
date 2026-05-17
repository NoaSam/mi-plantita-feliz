---
status: partial
phase: 02-prompt-optimization
source: [02-VERIFICATION.md]
started: 2026-05-17T21:18:00Z
updated: 2026-05-17T21:18:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Deploy the edge function update to Supabase
expected: `curl -s -X POST https://<project>.supabase.co/functions/v1/identify-plant -H "Authorization: Bearer <anon>" -d '{"image":"data:image/jpeg;base64,..."}'` returns a JSON body that includes `"watering_interval_days": <integer or null>` alongside the existing `name`/`description`/`care`/`diagnosis` fields. Equivalent: identify a plant from the production app and check the network response or `plant_searches` row.
result: [pending]

### 2. Populate the benchmark golden set and run baseline vs new prompt
expected: With 20-25 labeled rows in `scripts/.benchmark-golden-set.json`, `ANTHROPIC_API_KEY=... GEMINI_API_KEY=... OPENAI_API_KEY=... npm run benchmark:prompt` prints a REPORT block. PRIMARY identification accuracy on the new prompt is **notably higher** than the same metric measured against the pre-Phase-2 prompt (re-run by temporarily replacing SYSTEM_PROMPT with the old text). SECONDARY watering stddev is bounded; SANITY non-null rate is ≥ 80% for clearly identifiable plants.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
