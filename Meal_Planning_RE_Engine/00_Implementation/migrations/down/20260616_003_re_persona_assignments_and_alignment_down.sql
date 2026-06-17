-- SCHEMA-RE-019/020 rollback

ALTER TABLE public.re_user_household_profiles
  DROP COLUMN IF EXISTS cook_capability,
  DROP COLUMN IF EXISTS member_segments,
  DROP COLUMN IF EXISTS diet_mode;

DROP TABLE IF EXISTS public.re_user_persona_assignments;
