-- Add UPDATE RLS policy to plant_searches.
-- The original 20260404000000_create_plant_searches.sql declared only
-- SELECT/INSERT/DELETE policies. Without an UPDATE policy, Postgres RLS
-- silently denies every update — breaking phase 02.1's classify/revert
-- and the post-signup processPendingClassification flow.
--
-- `using` + `with check` ensures the row belongs to the caller BEFORE and
-- AFTER the update (prevents reassigning user_id to another account).
create policy "Users can update own searches"
  on plant_searches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
