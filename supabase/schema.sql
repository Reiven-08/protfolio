-- Run manually in the Supabase SQL editor before running the migration script.
create table if not exists public.portfolio_content (
  section text primary key check (section in ('home', 'about', 'projects')),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolio_content enable row level security;
