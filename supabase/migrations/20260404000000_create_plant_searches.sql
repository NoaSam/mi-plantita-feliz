-- Plant searches table: stores identification results per user
create table plant_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null,
  care text not null,
  diagnosis text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

-- Index for fast user-scoped queries ordered by date
create index plant_searches_user_date on plant_searches (user_id, created_at desc);

-- Row Level Security: users can only access their own data
alter table plant_searches enable row level security;

create policy "Users can read own searches"
  on plant_searches for select
  using (auth.uid() = user_id);

create policy "Users can insert own searches"
  on plant_searches for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own searches"
  on plant_searches for delete
  using (auth.uid() = user_id);
