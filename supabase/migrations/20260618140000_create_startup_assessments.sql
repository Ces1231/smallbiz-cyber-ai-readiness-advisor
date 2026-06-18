create table if not exists public.startup_assessments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Step 1: Business Idea
  business_idea       text,
  target_customer     text,
  -- Step 2: Budget & Finance
  startup_budget      int,  -- in dollars
  monthly_expenses    int,
  has_funding_source  boolean default false,
  -- Step 3: Business Formation
  formation_type      text,  -- LLC, Sole Prop, Corporation, Partnership
  state_of_formation  text,
  -- Step 4: Licenses & Permits
  has_business_license  boolean default false,
  has_industry_permit   boolean default false,
  industry_type         text,
  -- Step 5: Documentation
  has_ein               boolean default false,
  has_business_plan     boolean default false,
  has_bank_account      boolean default false,
  -- Step 6: Online Presence
  has_domain            boolean default false,
  has_social_media      boolean default false,
  has_website           boolean default false,
  -- Step 7: Tech & AI Readiness
  digital_tools_planned   int default 0,  -- 0=none,1=some,2=full
  automation_planned       int default 0,
  ai_usage_planned         int default 0,
  -- Step 8: Cybersecurity Basics
  password_manager_planned  boolean default false,
  backup_plan_exists        boolean default false,
  -- Step 9: Growth Plan
  has_growth_goals      boolean default false,
  revenue_target_year1  int,
  -- Scores (computed server-side on save)
  formation_score   int,
  finance_score     int,
  digital_score     int,
  launch_readiness  int,  -- overall 0-100
  -- Metadata
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.startup_assessments enable row level security;

create policy "Users manage own startup_assessments"
  on public.startup_assessments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
