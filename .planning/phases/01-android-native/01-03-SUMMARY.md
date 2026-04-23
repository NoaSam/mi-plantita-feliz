---
plan: 03
phase: 01-android-native
status: complete
subsystem: storage
tags: [supabase-storage, edge-function, android, oom-fix]
dependency_graph:
  requires: [01-01]
  provides: [storage-bucket, image-url-in-db]
  affects: [plant_searches.image_url, identify-plant-function]
tech_stack:
  added: [supabase-storage]
  patterns: [upload-then-get-public-url, graceful-fallback]
key_files:
  created:
    - supabase/migrations/20260422000000_create_plant_images_bucket.sql
  modified:
    - supabase/functions/identify-plant/index.ts
decisions:
  - "Storage upload happens AFTER AI model calls succeed, BEFORE plant_searches.insert — avoids wasting Storage space on failed identifications"
  - "Graceful fallback to base64 if Storage upload fails — OOM risk on Android but no broken UX"
  - "Public bucket used so CDN URLs work in img src without auth headers"
  - "Service role client used for upload — bypasses RLS, works for both authenticated and anonymous users"
metrics:
  duration: 8m
  completed: 2026-04-23
  tasks_completed: 2
  files_changed: 2
---

# Phase 01 Plan 03: Supabase Storage for Plant Images Summary

**One-liner:** Plant images now upload to Supabase Storage CDN before DB insert, replacing inline base64 storage that caused Android WebView OOM crashes.

## What was done

- Created Supabase migration `20260422000000_create_plant_images_bucket.sql` that provisions the `plant-images` storage bucket (public) with three RLS policies: authenticated users upload to their own folder (`user_id/`), anonymous uploads to `anonymous/` folder, and public read access for CDN URL serving
- Modified `supabase/functions/identify-plant/index.ts` to upload the image buffer to Supabase Storage immediately after the AI model consensus winner is selected and before writing the `plant_searches` row
- `plant_searches.image_url` now receives a public CDN URL (`https://...supabase.co/storage/v1/object/public/plant-images/...`) for new records instead of a raw base64 data URI
- Existing base64 records in the database are untouched and continue to render correctly — the frontend `img src` attribute handles both `data:` URIs and `https://` URLs natively
- Upload failure path falls back silently to the original base64 value so identification always completes

## Files modified

- `supabase/migrations/20260422000000_create_plant_images_bucket.sql` (created) — Storage bucket + 3 RLS policies
- `supabase/functions/identify-plant/index.ts` (modified) — Storage upload block + `image_url: imageUrl` instead of `image_url: image`

## Verification

- Migration file exists: PASS (9 matches for plant-images/storage.buckets/storage.objects)
- Edge function contains storage upload: PASS (7 matches for storage/plant-images/publicUrl/imageUrl)
- `image_url: imageUrl` present (not old `image_url: image`): PASS
- Bucket name `plant-images` matches between migration and edge function: PASS
- No unintended file deletions in commit: PASS

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface

No new threat surface beyond what the plan's threat model covers. The public bucket and service-role upload path were explicitly modeled as T-01-06 (accepted) and T-01-07 (mitigated via RLS) in the plan.

## Self-Check: PASSED

- `/Users/noemisantos/mi-plantita-feliz/.claude/worktrees/agent-ade28a7e/supabase/migrations/20260422000000_create_plant_images_bucket.sql` — FOUND
- `/Users/noemisantos/mi-plantita-feliz/.claude/worktrees/agent-ade28a7e/supabase/functions/identify-plant/index.ts` — FOUND (modified)
- Commit `a0b9845` — FOUND
