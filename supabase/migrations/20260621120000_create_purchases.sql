create table if not exists public.purchases (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,

  product_key               text not null,

  stripe_payment_intent_id  text unique,
  stripe_customer_id        text,
  amount_cents              integer,
  currency                  text not null default 'usd',

  status                    text not null default 'pending',

  purchased_at              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index purchases_user_id_idx on public.purchases(user_id);
create index purchases_user_product_idx on public.purchases(user_id, product_key, status);
create index purchases_payment_intent_idx on public.purchases(stripe_payment_intent_id);

alter table public.purchases enable row level security;

create policy "Users read own purchases"
  on public.purchases
  for select
  using (auth.uid() = user_id);
