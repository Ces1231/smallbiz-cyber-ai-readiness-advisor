CREATE TABLE public.advice_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_id   UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    dimension       TEXT NOT NULL CHECK (dimension IN ('cyber', 'ai', 'funding', 'executive_summary', 'roadmap')),
    provider        TEXT NOT NULL,
    model           TEXT NOT NULL,
    content         TEXT NOT NULL,
    prompt_hash     TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id, dimension)
);

ALTER TABLE public.advice_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their advice cache"
    ON public.advice_cache FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_advice_cache_lookup ON public.advice_cache(assessment_id, dimension);
