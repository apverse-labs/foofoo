-- BUILD-07: RE Feedback Learning Loop
-- Target: foofoo-staging ONLY
-- Additive only

-- ── 1. Raw feedback event log (append-only) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.re_user_feedback (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dish_option_id  TEXT NOT NULL,          -- from re_class_dish_options
  meal_class_code TEXT NOT NULL,
  signal_type     TEXT NOT NULL CHECK (signal_type IN (
                    'VIEW','ACCEPT','LOCK','TAP_RECIPE','ADD_TO_GROCERY',
                    'SWIPE_PAST','NOT_TODAY','NEVER','NEVER_REMOVE')),
  signal_weight   NUMERIC NOT NULL,       -- pre-computed at write time
  session_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_re_uf_profile_dish
  ON public.re_user_feedback(profile_id, dish_option_id);
CREATE INDEX IF NOT EXISTS idx_re_uf_profile_date
  ON public.re_user_feedback(profile_id, session_date DESC);

ALTER TABLE public.re_user_feedback ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='re_user_feedback' AND policyname='re_uf_own'
  ) THEN
    CREATE POLICY re_uf_own ON public.re_user_feedback
      FOR ALL USING (auth.uid() = profile_id);
  END IF;
END $$;

-- ── 2. Materialized dish preference state ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.re_user_dish_affinity (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dish_option_id  TEXT NOT NULL,
  meal_class_code TEXT,
  affinity_score  NUMERIC DEFAULT 0,     -- running weighted sum
  lock_count      INT DEFAULT 0,
  accept_count    INT DEFAULT 0,
  reject_count    INT DEFAULT 0,
  is_never        BOOLEAN DEFAULT FALSE, -- hard exclude until explicitly removed
  not_today_until DATE,                  -- NULL = no cooldown active
  last_updated    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, dish_option_id)
);

CREATE INDEX IF NOT EXISTS idx_re_uda_profile
  ON public.re_user_dish_affinity(profile_id);

ALTER TABLE public.re_user_dish_affinity ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='re_user_dish_affinity' AND policyname='re_uda_own'
  ) THEN
    CREATE POLICY re_uda_own ON public.re_user_dish_affinity
      FOR ALL USING (auth.uid() = profile_id);
  END IF;
END $$;

-- ── 3. Materialized class preference state ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.re_user_class_affinity (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meal_class_code TEXT NOT NULL,
  affinity_score  NUMERIC DEFAULT 0,
  signal_count    INT DEFAULT 0,
  last_updated    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, meal_class_code)
);

CREATE INDEX IF NOT EXISTS idx_re_uca_profile
  ON public.re_user_class_affinity(profile_id);

ALTER TABLE public.re_user_class_affinity ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='re_user_class_affinity' AND policyname='re_uca_own'
  ) THEN
    CREATE POLICY re_uca_own ON public.re_user_class_affinity
      FOR ALL USING (auth.uid() = profile_id);
  END IF;
END $$;
