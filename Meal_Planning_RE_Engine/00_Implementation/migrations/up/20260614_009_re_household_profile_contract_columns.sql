-- 20260614_009_re_household_profile_contract_columns.sql
-- BUILD-02 / PACK 2 correction: add the DOC-10 output-contract columns that the
-- household profile was missing so onboarding capture has a faithful target.
-- Additive only (new nullable columns, backward compatible). No drops/renames.
ALTER TABLE public.re_user_household_profiles
  ADD COLUMN IF NOT EXISTS city_tier            TEXT,
  ADD COLUMN IF NOT EXISTS migration_overlay    TEXT,
  ADD COLUMN IF NOT EXISTS nonveg_mode          TEXT,
  ADD COLUMN IF NOT EXISTS egg_allowed          BOOLEAN,
  ADD COLUMN IF NOT EXISTS fasting_pattern      TEXT,
  ADD COLUMN IF NOT EXISTS weekday_time_pressure TEXT,
  ADD COLUMN IF NOT EXISTS class_affinity_vector JSONB;

COMMENT ON COLUMN public.re_user_household_profiles.class_affinity_vector IS
  'DOC-10 step 8 swipe output: {meal_class_code: weight} from class-level onboarding swipes.';
COMMENT ON COLUMN public.re_user_household_profiles.weekday_time_pressure IS
  'DOC-16: low|medium|high — controls weekday class complexity.';
