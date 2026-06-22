-- Migration: Create subscriptions table
-- Sprint: SPRINT-003
-- Run after: 20260617150000_create_user_profiles.sql

CREATE TABLE public.subscriptions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_customer_id     TEXT NOT NULL,
    stripe_price_id        TEXT NOT NULL,
    status                 TEXT NOT NULL CHECK (status IN (
                               'active', 'canceled', 'past_due',
                               'trialing', 'unpaid', 'incomplete'
                           )),
    current_period_start   TIMESTAMPTZ NOT NULL,
    current_period_end     TIMESTAMPTZ NOT NULL,
    cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY "Users read own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE INDEX idx_subscriptions_user_id     ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id   ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_customer_id ON public.subscriptions(stripe_customer_id);

CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ROLLBACK:
-- DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
-- DROP TABLE IF EXISTS public.subscriptions CASCADE;
