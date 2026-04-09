-- model_evaluations: one row per model per plant identification request.
-- All writes come from the edge function using the service role client.
-- Target: 300 evaluations for statistical significance.

create table model_evaluations (
  id                uuid        primary key default gen_random_uuid(),
  plant_search_id   uuid        not null references plant_searches(id) on delete cascade,
  model             text        not null check (model in ('claude', 'gemini', 'gpt4o')),
  raw_name          text,
  scientific_name   text,
  description       text,
  care              text,
  diagnosis         text,
  response_ms       integer,
  success           boolean     not null default false,
  error_message     text,
  is_winner         boolean     not null default false,
  consensus_group   text        check (consensus_group in ('correct', 'no_consensus')),
  created_at        timestamptz not null default now()
);

create index model_evaluations_plant_search_id
  on model_evaluations (plant_search_id);

create index model_evaluations_model_consensus
  on model_evaluations (model, consensus_group)
  where success = true;

-- RLS enabled but no public policies — only service role can read/write
alter table model_evaluations enable row level security;
