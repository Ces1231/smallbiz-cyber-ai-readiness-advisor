-- Add pro_annual to the allowed tiers check constraint on user_profiles
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_tier_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_tier_check
  CHECK (tier IN ('free', 'pro', 'pro_annual', 'admin'));
