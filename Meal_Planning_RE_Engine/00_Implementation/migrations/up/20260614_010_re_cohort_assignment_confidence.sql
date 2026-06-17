-- BUILD-03: add confidence score + routing_trace to re_user_household_profiles
-- DOC-03 §6 requires every persona assignment to carry a confidence score.
-- DOC-03 §8 requires routing_trace to be stored alongside the assignment.
-- Additive only (nullable columns). Safe on existing rows.

ALTER TABLE public.re_user_household_profiles
  ADD COLUMN IF NOT EXISTS confidence     NUMERIC(4,3),    -- 0.000–1.000
  ADD COLUMN IF NOT EXISTS routing_trace  TEXT[];          -- e.g. ARRAY['main_cohort','sub_cohort','health_overlay']
