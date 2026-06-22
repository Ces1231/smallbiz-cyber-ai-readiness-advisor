create table if not exists public.launch_plans (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  business_idea_id    uuid not null references public.business_ideas(id) on delete cascade,

  tier                text not null,

  checklist           jsonb,
  cost_calculator     jsonb,
  pricing_packages    jsonb,
  thirty_day_plan     jsonb,
  business_plan_text  text,
  mission_vision      text,
  customer_persona    jsonb,
  funding_checklist   jsonb,
  cyber_ai_checklist  jsonb,
  ninety_day_roadmap  jsonb,

  pdf_url             text,
  pdf_generated_at    timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (business_idea_id, tier)
);

create index launch_plans_user_id_idx on public.launch_plans(user_id);
create index launch_plans_idea_id_idx on public.launch_plans(business_idea_id);

alter table public.launch_plans enable row level security;

create policy "Users manage own launch_plans"
  on public.launch_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
