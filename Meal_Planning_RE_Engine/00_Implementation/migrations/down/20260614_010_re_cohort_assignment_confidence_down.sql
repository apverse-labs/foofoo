-- Rollback: remove confidence + routing_trace columns added in BUILD-03
ALTER TABLE public.re_user_household_profiles
  DROP COLUMN IF EXISTS confidence,
  DROP COLUMN IF EXISTS routing_trace;
