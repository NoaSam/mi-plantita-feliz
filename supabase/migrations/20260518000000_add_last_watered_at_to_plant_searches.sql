-- Add last_watered_at to plant_searches: last time the user logged a watering
-- via Phase 3 Calendar v0. Nullable: rows existing before Phase 3 (and any
-- newly-created row) have no logged watering until the user taps Regada/Regar.
-- Countdown formula uses (last_watered_at + watering_interval_days days) - now().
-- RLS UPDATE policy from 20260515000000_add_plant_searches_update_policy.sql
-- already gates writes by auth.uid() = user_id; no per-column policy needed.
-- See: .planning/phases/03-calendar-v0/03-CONTEXT.md D-06
alter table plant_searches
  add column if not exists last_watered_at timestamptz;

-- ROLLBACK (manual, if needed):
--   alter table plant_searches drop column if exists last_watered_at;
-- VERIFICATION ajuste #3: documented for transparency. The column is
-- nullable and free of downstream dependencies — drop is safe at any time
-- before the feature ships to users (after ship, dropping loses data).
