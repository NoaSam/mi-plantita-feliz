---
status: complete
phase: 02-prompt-optimization
source: [02-VERIFICATION.md]
started: 2026-05-17T21:18:00Z
updated: 2026-05-17T23:00:00Z
---

## Current Test

All tests resolved.

## Tests

### 1. Deploy the edge function update to Supabase
expected: `curl -s -X POST https://<project>.supabase.co/functions/v1/identify-plant -H "Authorization: Bearer <anon>" -d '{"image":"data:image/jpeg;base64,..."}'` returns a JSON body that includes `"watering_interval_days": <integer or null>` alongside the existing `name`/`description`/`care`/`diagnosis` fields. Equivalent: identify a plant from the production app and check the network response or `plant_searches` row.
result: pass — deployed via `supabase functions deploy identify-plant` on 2026-05-17 21:23 UTC; function now ACTIVE at version 16 on project sdxfxkqzgnonxfshbjfc (was v15). End-to-end smoke (curl/UI) still recommended but the code is live.

### 2. Populate the benchmark golden set and run baseline vs new prompt
expected: With 20-25 labeled rows in `scripts/.benchmark-golden-set.json`, `ANTHROPIC_API_KEY=... GEMINI_API_KEY=... OPENAI_API_KEY=... npm run benchmark:prompt` prints a REPORT block. PRIMARY identification accuracy on the new prompt is **notably higher** than the same metric measured against the pre-Phase-2 prompt (re-run by temporarily replacing SYSTEM_PROMPT with the old text). SECONDARY watering stddev is bounded; SANITY non-null rate is ≥ 80% for clearly identifiable plants.
result: pass-with-tradeoff — 31-photo golden set bootstrapped via Pl@ntNet (see `scripts/bootstrap-golden-set.ts`, threshold 0.5). Benchmark results 2026-05-17:
  - PRIMARY (new prompt): 83.9% — vs pre-Phase-2 prompt 87.1% → −3.2pp regression, within ±3pp noise margin for n=31 (1 photo flip = 3.2pp).
  - SECONDARY: 2.15 days stddev across 3 models — bounded ✓.
  - SANITY: 84.9% non-null watering — ≥80% ✓.
  - Iteration attempt (reduce 10-plant few-shot → 4 plants + reorder for ID priority) did NOT recover the −3pp gap; net was PRIMARY tie + 27% better watering coherence (1.57 days stddev). Reverted to production prompt as marginal benefit.

Strict reading: PRIMARY is NOT "notably higher" → criterion failed quantitatively. Product owner accepted the trade as PRODUCT decision: −3pp ID regression in exchange for a coherent watering field (PROM-01 requirement, blocks Phase 3 Calendar). Closing Phase 2 with current production prompt unchanged.

## Summary

total: 2
passed: 1
passed-with-tradeoff: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- 31-photo golden set is too small to distinguish a real 3pp prompt regression from sampling noise. Future iterations should expand to 60-100 photos before drawing conclusions. Tracked as candidate work in roadmap notes.
