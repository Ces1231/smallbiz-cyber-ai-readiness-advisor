create table if not exists public.advisor_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  business_idea_id    uuid references public.business_ideas(id) on delete set null,
  purchase_id         uuid references public.purchases(id) on delete set null,

  user_email          text not null,
  business_name       text,

  status              text not null default 'pending',

  notes               text,
  scheduled_at        timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index advisor_requests_user_id_idx on public.advisor_requests(user_id);
create index advisor_requests_status_idx on public.advisor_requests(status);

alter table public.advisor_requests enable row level security;

create policy "Users read own advisor_requests"
  on public.advisor_requests
  for select
  using (auth.uid() = user_id);
