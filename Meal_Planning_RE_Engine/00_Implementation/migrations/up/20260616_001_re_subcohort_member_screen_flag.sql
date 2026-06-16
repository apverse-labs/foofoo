-- SCHEMA-RE-017: Add requires_member_screen flag to re_subcohorts
-- Replaces the hardcoded MEMBER_REQUIRING_SUBCOHORTS set in re-onboarding.repository.ts
-- with a DB-queryable flag. Additive (boolean, default false — existing rows unaffected).

ALTER TABLE public.re_subcohorts
  ADD COLUMN IF NOT EXISTS requires_member_screen BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.re_subcohorts.requires_member_screen IS
  'True if selecting this sub-cohort should trigger the household member capture screen during RE onboarding (e.g. pregnant, infant, toddler, elder, diabetic households).';

-- Pregnant / infant / baby sub-cohorts (MC2)
UPDATE public.re_subcohorts SET requires_member_screen = true
WHERE sub_cohort_id IN ('SC2D', 'SC2E', 'SC2F');

-- Family with children sub-cohorts (MC3 — toddler, school kid, teen, picky eater)
UPDATE public.re_subcohorts SET requires_member_screen = true
WHERE sub_cohort_id IN ('SC3A', 'SC3B', 'SC3C', 'SC3D');

-- Joint / multi-generation / health-overlay household sub-cohorts (MC4)
UPDATE public.re_subcohorts SET requires_member_screen = true
WHERE sub_cohort_id IN ('SC4A', 'SC4B', 'SC4C', 'SC4D', 'SC4E', 'SC4F');

CREATE INDEX IF NOT EXISTS idx_re_subcohorts_member_screen
  ON public.re_subcohorts(requires_member_screen)
  WHERE requires_member_screen = true;
