-- Migration: Create baselines table
-- Sprint: SPRINT-001
-- Run after: 20260617120000_create_assessments.sql

CREATE TABLE public.baselines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_id   UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    -- Snapshot at the time of saving (denormalized for fast reads)
    business_name   TEXT NOT NULL,
    cyber_score     SMALLINT NOT NULL,
    ai_score        SMALLINT NOT NULL,
    funding_score   SMALLINT NOT NULL,
    overall_score   SMALLINT NOT NULL,
    saved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Only one active baseline per user
    UNIQUE (user_id)
);

ALTER TABLE public.baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their baselines"
    ON public.baselines FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_baselines_user_id ON public.baselines(user_id);

-- ROLLBACK:
-- DROP TABLE IF EXISTS public.baselines;
