-- Make user_id nullable to allow anonymous searches
alter table plant_searches
  alter column user_id drop not null;

-- Add anonymous_id column for tracking anonymous users
alter table plant_searches
  add column anonymous_id text;

-- Index for fast claim lookups
create index plant_searches_anonymous_id
  on plant_searches (anonymous_id)
  where anonymous_id is not null;

-- Replace the insert policy to allow both authenticated and anonymous inserts
drop policy "Users can insert own searches" on plant_searches;

-- Authenticated insert: same semantics as before
create policy "Authenticated users can insert own searches"
  on plant_searches for insert
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
  );

-- Anonymous insert: no session, user_id must be null, anonymous_id required
create policy "Anonymous users can insert searches"
  on plant_searches for insert
  with check (
    auth.uid() is null
    and user_id is null
    and anonymous_id is not null
  );

-- Claim function: transfers anonymous rows to the authenticated user
-- Runs as table owner (SECURITY DEFINER) to bypass RLS for the UPDATE
create or replace function claim_anonymous_searches(p_anonymous_id text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.plant_searches
  set
    user_id      = auth.uid(),
    anonymous_id = null
  where
    anonymous_id = p_anonymous_id
    and user_id is null;
end;
$$;

-- Only authenticated users can call claim
revoke all on function claim_anonymous_searches(text) from anon;
grant execute on function claim_anonymous_searches(text) to authenticated;
