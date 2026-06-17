-- BUILD-05: RE User Addon Plans
-- Target: foofoo-staging ONLY
-- Additive only — never drops or renames existing columns/tables

CREATE TABLE IF NOT EXISTS public.re_user_addon_plans (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_week_start           DATE NOT NULL,
  day_of_week               TEXT NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  meal_slot                 TEXT NOT NULL CHECK (meal_slot IN ('Breakfast','Lunch','Snack','Dinner')),
  target_member_segment     TEXT NOT NULL,
  addon_class_code          TEXT REFERENCES public.re_addon_classes(addon_class_code),
  addon_class_name          TEXT,
  -- The primary class this add-on is paired with (from re_household_addon_plans seed)
  attached_to_primary_class TEXT,
  engine_version            TEXT DEFAULT 'classfirst_v1',
  generated_at              TIMESTAMPTZ DEFAULT NOW(),
  -- One row per user / week / day / slot / segment
  UNIQUE (profile_id, plan_week_start, day_of_week, meal_slot, target_member_segment)
);

CREATE INDEX IF NOT EXISTS idx_re_uap_profile_week
  ON public.re_user_addon_plans(profile_id, plan_week_start);

CREATE INDEX IF NOT EXISTS idx_re_uap_profile_week_day
  ON public.re_user_addon_plans(profile_id, plan_week_start, day_of_week);

ALTER TABLE public.re_user_addon_plans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 're_user_addon_plans' AND policyname = 're_uap_all_own'
  ) THEN
    CREATE POLICY re_uap_all_own
      ON public.re_user_addon_plans FOR ALL
      USING (auth.uid() = profile_id);
  END IF;
END $$;
