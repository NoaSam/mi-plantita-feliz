-- Add watering_interval_days to plant_searches: structured frequency used by Calendar v0 (Phase 3).
-- Nullable: model returns null when it can't determine the value with confidence (D-02).
-- Range 1-60 days enforced at the edge function via toIntOrNull; check constraint is belt-and-suspenders.
-- Historical rows stay NULL; backfill deferred (see CONTEXT.md § Claude's Discretion).
-- See: .planning/phases/02-prompt-optimization/02-CONTEXT.md
alter table plant_searches
  add column if not exists watering_interval_days integer
    check (watering_interval_days is null or (watering_interval_days >= 1 and watering_interval_days <= 60));
