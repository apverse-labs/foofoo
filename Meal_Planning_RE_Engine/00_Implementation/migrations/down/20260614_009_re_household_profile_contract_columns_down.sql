-- DOWN: 20260614_009 — drop the DOC-10 contract columns added to re_user_household_profiles.
ALTER TABLE public.re_user_household_profiles
  DROP COLUMN IF EXISTS city_tier,
  DROP COLUMN IF EXISTS migration_overlay,
  DROP COLUMN IF EXISTS nonveg_mode,
  DROP COLUMN IF EXISTS egg_allowed,
  DROP COLUMN IF EXISTS fasting_pattern,
  DROP COLUMN IF EXISTS weekday_time_pressure,
  DROP COLUMN IF EXISTS class_affinity_vector;
