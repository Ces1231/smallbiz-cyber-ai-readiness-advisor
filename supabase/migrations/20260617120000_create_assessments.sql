-- Migration: Create assessments table
-- Sprint: SPRINT-001
-- Run after: (initial)

CREATE TABLE public.assessments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL CHECK (char_length(business_name) BETWEEN 1 AND 120),
    industry     TEXT NOT NULL CHECK (industry IN (
                     'restaurant','barber','nonprofit','contractor',
                     'online','consultant','retail'
                 )),
    challenge    TEXT,
    -- Raw input scores (0, 1, or 2)
    mfa          SMALLINT NOT NULL CHECK (mfa BETWEEN 0 AND 2),
    backups      SMALLINT NOT NULL CHECK (backups BETWEEN 0 AND 2),
    training     SMALLINT NOT NULL CHECK (training BETWEEN 0 AND 2),
    digital_tools SMALLINT NOT NULL CHECK (digital_tools BETWEEN 0 AND 2),
    automation   SMALLINT NOT NULL CHECK (automation BETWEEN 0 AND 2),
    ai_usage     SMALLINT NOT NULL CHECK (ai_usage BETWEEN 0 AND 2),
    documents    SMALLINT NOT NULL CHECK (documents BETWEEN 0 AND 2),
    online_presence SMALLINT NOT NULL CHECK (online_presence BETWEEN 0 AND 2),
    growth_plan  SMALLINT NOT NULL CHECK (growth_plan BETWEEN 0 AND 2),
    -- Computed scores (stored to avoid re-computation on reads)
    cyber_score  SMALLINT NOT NULL CHECK (cyber_score BETWEEN 0 AND 100),
    ai_score     SMALLINT NOT NULL CHECK (ai_score BETWEEN 0 AND 100),
    funding_score SMALLINT NOT NULL CHECK (funding_score BETWEEN 0 AND 100),
    overall_score SMALLINT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    -- Audit
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can only see their own assessments
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their assessments"
    ON public.assessments
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_assessments_user_id ON public.assessments(user_id);
CREATE INDEX idx_assessments_created_at ON public.assessments(user_id, created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assessments_updated_at
    BEFORE UPDATE ON public.assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ROLLBACK:
-- DROP TRIGGER IF EXISTS assessments_updated_at ON public.assessments;
-- DROP FUNCTION IF EXISTS update_updated_at();
-- DROP TABLE IF EXISTS public.assessments;
