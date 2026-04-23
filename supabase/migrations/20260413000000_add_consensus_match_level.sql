-- Add consensus_match_level to record which tier produced the consensus.
-- Values: 'exact' | 'normalized' | 'genus' | NULL (no consensus or model failed)
alter table model_evaluations
  add column if not exists consensus_match_level text
    check (consensus_match_level in ('exact', 'normalized', 'genus'));

-- Index for analytics queries filtering by match level
create index if not exists model_evaluations_match_level
  on model_evaluations (consensus_match_level)
  where consensus_match_level is not null;
