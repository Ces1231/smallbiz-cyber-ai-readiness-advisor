-- Migration: Create user_profiles table
-- Sprint: SPRINT-003
-- Run after: 20260617140000_create_advice_cache.sql

CREATE TABLE public.user_profiles (
    id                     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name          TEXT,
    tier                   TEXT NOT NULL DEFAULT 'free'
                               CHECK (tier IN ('free', 'pro', 'admin')),
    stripe_customer_id     TEXT UNIQUE,
    assessments_this_month INTEGER NOT NULL DEFAULT 0,
    month_reset_at         TIMESTAMPTZ NOT NULL
                               DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users read own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update display fields only (tier is immutable via API — changed by webhook)
CREATE POLICY "Users update own profile display fields"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND tier = (SELECT tier FROM public.user_profiles WHERE id = auth.uid())
    );

CREATE INDEX idx_user_profiles_stripe ON public.user_profiles(stripe_customer_id);
CREATE INDEX idx_user_profiles_tier   ON public.user_profiles(tier);

CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create a free-tier profile when a new Supabase Auth user is created
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, business_name, tier)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'business_name',
        'free'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- ROLLBACK:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS create_user_profile();
-- DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
-- DROP TABLE IF EXISTS public.user_profiles CASCADE;
