create table if not exists public.business_ideas (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,

  -- Quiz answers (stored as-is for AI re-generation)
  skills              text[] not null default '{}',
  problems            text[] not null default '{}',
  business_type       text not null,
  starting_capital    text not null,
  weekly_hours        text not null,

  -- AI-generated results (stored after quiz submission)
  ai_suggestions      jsonb,
  selected_idea_index integer,

  -- Derived scores (from selected idea)
  business_fit_pct    integer,
  startup_cost_tier   text,
  difficulty_tier     text,
  revenue_potential   text,

  -- Simple mission statement (AI-generated preview)
  mission_statement   text,

  -- Status
  status              text not null default 'draft',

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index business_ideas_user_id_idx on public.business_ideas(user_id);
create index business_ideas_user_status_idx on public.business_ideas(user_id, status);

alter table public.business_ideas enable row level security;

create policy "Users manage own business_ideas"
  on public.business_ideas
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
