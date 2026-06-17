-- SCHEMA-RE-018: P2 Learning Loop tables
-- Seq 11: re_user_food_dna_vector  — per-tag affinity learned from LOCK/ACCEPT/SWIPE
-- Seq 12: re_user_dish_affinity.repeat_preferred — relax variety penalty for repeat lockers
-- Seq 13: re_user_class_family_affinity — cuisine drift tracking via class_family_code
-- Seq 14: re_user_class_affinity cook tolerance columns — adapt cookCapabilityScore from behavior

-- ── Seq 11: Food DNA preference vector ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.re_user_food_dna_vector (
  profile_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dna_tag       TEXT        NOT NULL,
  affinity_score FLOAT      NOT NULL DEFAULT 0,
  signal_count  INTEGER     NOT NULL DEFAULT 0,
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, dna_tag)
);

CREATE INDEX IF NOT EXISTS idx_re_dna_vector_profile ON public.re_user_food_dna_vector(profile_id);

ALTER TABLE public.re_user_food_dna_vector ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='re_user_food_dna_vector' AND policyname='dna_vec_own') THEN
    CREATE POLICY dna_vec_own ON public.re_user_food_dna_vector FOR ALL USING (auth.uid() = profile_id);
  END IF;
END $$;

COMMENT ON TABLE public.re_user_food_dna_vector IS
  'Per-user Food DNA tag preference vector. Tags come from re_meal_classes.food_dna_tags. Updated on every LOCK/ACCEPT/SWIPE_PAST/NOT_TODAY signal.';

-- ── Seq 12: Repeat tolerance flag on dish affinity ───────────────────────────

ALTER TABLE public.re_user_dish_affinity
  ADD COLUMN IF NOT EXISTS repeat_preferred BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.re_user_dish_affinity.repeat_preferred IS
  'Set to true when lock_count >= 3 for this dish. Suppresses the variety penalty so the user keeps seeing their preferred repeats.';

-- ── Seq 13: Class family affinity (cuisine drift) ────────────────────────────

CREATE TABLE IF NOT EXISTS public.re_user_class_family_affinity (
  profile_id         UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_family_code  TEXT   NOT NULL,
  affinity_score     FLOAT  NOT NULL DEFAULT 0,
  signal_count       INTEGER NOT NULL DEFAULT 0,
  last_updated       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, class_family_code)
);

CREATE INDEX IF NOT EXISTS idx_re_cfa_profile ON public.re_user_class_family_affinity(profile_id);

ALTER TABLE public.re_user_class_family_affinity ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='re_user_class_family_affinity' AND policyname='cfa_own') THEN
    CREATE POLICY cfa_own ON public.re_user_class_family_affinity FOR ALL USING (auth.uid() = profile_id);
  END IF;
END $$;

COMMENT ON TABLE public.re_user_class_family_affinity IS
  'Per-user cuisine family affinity (drift). class_family_code from re_meal_classes (e.g. RICE_BASED, FLATBREAD, CURRY). Updated on LOCK/ACCEPT/SWIPE_PAST.';

-- ── Seq 14: Cook complexity tolerance on class affinity ───────────────────────

ALTER TABLE public.re_user_class_affinity
  ADD COLUMN IF NOT EXISTS high_complexity_accepts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS high_complexity_rejects INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.re_user_class_affinity.high_complexity_accepts IS
  'Count of LOCK/ACCEPT signals on high-complexity dishes in this class. Used to raise cook tolerance above the profile-level cook_dependency setting.';
COMMENT ON COLUMN public.re_user_class_affinity.high_complexity_rejects IS
  'Count of SWIPE_PAST/NOT_TODAY signals on high-complexity dishes in this class. Used to lower tolerance.';
