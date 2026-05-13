-- Add context to plant_searches to support dual-mode classification.
-- Values: 'home' (Mis plantas / calendar) | 'wild' (Descubrimiento / map) | 'unclassified' (default)
-- See: .planning/phases/02.1-foundations-classification-result-actions-reveal/02.1-SCHEMA-AUDIT.md
alter table plant_searches
  add column if not exists context text not null default 'unclassified'
    check (context in ('home', 'wild', 'unclassified'));

-- Composite partial index for surface queries (calendar, map, home unclassified count).
-- WHERE user_id is not null skips anonymous rows that don't surface in user UIs.
create index if not exists plant_searches_user_context_date
  on plant_searches (user_id, context, created_at desc)
  where user_id is not null;
