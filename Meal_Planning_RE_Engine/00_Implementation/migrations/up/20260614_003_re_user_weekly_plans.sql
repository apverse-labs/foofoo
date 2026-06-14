-- BUILD-04: RE User Weekly Plans
-- Target: foofoo-staging ONLY
-- Additive only

CREATE TABLE IF NOT EXISTS public.re_user_weekly_plans (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cohort_id       TEXT REFERENCES public.re_cohorts(cohort_id),
  plan_week_start DATE NOT NULL,
  day_of_week     TEXT NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  weekday_weekend TEXT NOT NULL CHECK (weekday_weekend IN ('Weekday','Weekend')),
  -- Primary class codes (from re_weekly_class_plans)
  breakfast_class TEXT,
  lunch_class     TEXT,
  snack_class     TEXT,
  dinner_class    TEXT,
  -- Display-friendly resolved names (denormalised for fast reads)
  breakfast_display TEXT,
  lunch_display     TEXT,
  snack_display     TEXT,
  dinner_display    TEXT,
  -- Overlay applied
  city_overlay_applied BOOLEAN DEFAULT FALSE,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  engine_version  TEXT DEFAULT 'classfirst_v1',
  UNIQUE (profile_id, plan_week_start, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_re_uwp_profile_week ON public.re_user_weekly_plans(profile_id, plan_week_start);

ALTER TABLE public.re_user_weekly_plans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='re_user_weekly_plans' AND policyname='re_uwp_all_own') THEN
    CREATE POLICY re_uwp_all_own ON public.re_user_weekly_plans FOR ALL USING (auth.uid() = profile_id);
  END IF;
END $$;
