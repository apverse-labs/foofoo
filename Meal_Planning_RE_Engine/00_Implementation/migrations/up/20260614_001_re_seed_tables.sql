-- ============================================================
-- RE Module BUILD-01: Data Model Migration (Up)
-- Target: foofoo-staging ONLY
-- Date: 2026-06-14
-- All tables use re_ prefix except household_members (core profile concept)
-- Additive only — no drops, no renames of existing tables
-- ============================================================

-- ── 1. RE ENGINE VERSIONS REGISTRY ─────────────────────────
CREATE TABLE IF NOT EXISTS public.re_engine_versions (
  version_code   TEXT PRIMARY KEY,
  version_label  TEXT NOT NULL,
  description    TEXT,
  is_active      BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. RE STATES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.re_states (
  state_id                   TEXT PRIMARY KEY,
  state_ut                   TEXT NOT NULL UNIQUE,
  region_archetype           TEXT,
  tier1_or_metro_cities      TEXT,
  tier2_cities               TEXT,
  nonveg_intensity           TEXT,
  primary_staple_base        TEXT,
  breakfast_class_pool       TEXT,
  weekday_lunch_class_pool   TEXT,
  weekday_dinner_class_pool  TEXT,
  weekend_special_class_pool TEXT,
  snack_class_pool           TEXT,
  nonveg_class_pool          TEXT,
  behavioral_notes           TEXT,
  planning_note              TEXT,
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. RE CITY MIGRATION OVERLAYS ───────────────────────────
CREATE TABLE IF NOT EXISTS public.re_city_migration_overlays (
  overlay_id                    SERIAL PRIMARY KEY,
  origin_state_ut               TEXT NOT NULL,
  destination_group_code        TEXT NOT NULL,
  destination_group_name        TEXT,
  home_state_signature_weight   NUMERIC(4,2),
  current_city_lifestyle_weight NUMERIC(4,2),
  national_modern_weight        NUMERIC(4,2),
  overlay_meal_classes          TEXT,
  planning_rule                 TEXT,
  v3_usage_note                 TEXT,
  created_at                    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (origin_state_ut, destination_group_code)
);

-- ── 4. RE MAIN COHORTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.re_main_cohorts (
  main_cohort_id       TEXT PRIMARY KEY,
  main_cohort_label    TEXT NOT NULL,
  user_understands_as  TEXT,
  subcohort_screen_copy TEXT,
  routing_notes        TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. RE PERSONAS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.re_personas (
  persona_id                  TEXT PRIMARY KEY,
  persona_name                TEXT NOT NULL,
  main_cohort_id              TEXT REFERENCES public.re_main_cohorts(main_cohort_id),
  sub_cohort_id               TEXT,
  sub_cohort_label            TEXT,
  age_band                    TEXT,
  household_stage             TEXT,
  lifecycle_health            TEXT,
  cook_dependency             TEXT,
  time_pressure               TEXT,
  nonveg_mode                 TEXT,
  revealed_behavior_summary   TEXT,
  bf_boost_classes            TEXT,
  ld_boost_classes            TEXT,
  sn_boost_classes            TEXT,
  dn_boost_classes            TEXT,
  onboarding_branch_trigger   TEXT,
  can_be_overlay              BOOLEAN DEFAULT FALSE,
  dependent_addon_default     TEXT,
  health_overlay_default      BOOLEAN DEFAULT FALSE,
  cook_overlay_default        BOOLEAN DEFAULT FALSE,
  recommended_onboarding_path TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. RE SUBCOHORTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.re_subcohorts (
  sub_cohort_id                TEXT PRIMARY KEY,
  sub_cohort_label             TEXT NOT NULL,
  main_cohort_id               TEXT REFERENCES public.re_main_cohorts(main_cohort_id),
  maps_to_persona_id           TEXT REFERENCES public.re_personas(persona_id),
  persona_name                 TEXT,
  show_as_chip_text            TEXT,
  ask_next                     TEXT,
  do_not_show_in_first_screen  BOOLEAN DEFAULT TRUE,
  created_at                   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. RE ROUTING RULES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.re_routing_rules (
  rule_id              TEXT PRIMARY KEY,
  shown_when           TEXT NOT NULL,
  input_type           TEXT,
  user_prompt_summary  TEXT,
  why_it_matters       TEXT,
  maps_to_fields       TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. RE MEAL CLASSES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.re_meal_classes (
  meal_class_code           TEXT PRIMARY KEY,
  slot_group                TEXT NOT NULL,
  class_name                TEXT NOT NULL,
  class_category            TEXT,
  diet_type                 TEXT,
  weekday_fit               INTEGER,
  weekend_fit               INTEGER,
  cook_complexity           TEXT,
  heaviness                 TEXT,
  primary_base              TEXT,
  cooking_methods           TEXT,
  texture                   TEXT,
  richness                  TEXT,
  example_dishes            TEXT,
  region_relevance          TEXT,
  behavioral_meaning        TEXT,
  food_dna_tags             TEXT,
  class_family_code         TEXT,
  planning_role             TEXT,
  allowed_as_weekly_primary BOOLEAN NOT NULL DEFAULT TRUE,
  addon_target_segment      TEXT,
  overlap_resolution        TEXT,
  db_use_note               TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_re_meal_classes_primary ON public.re_meal_classes(allowed_as_weekly_primary);
CREATE INDEX IF NOT EXISTS idx_re_meal_classes_slot    ON public.re_meal_classes(slot_group);

-- ── 9. RE MEAL CLASS OVERLAP RULES ──────────────────────────
CREATE TABLE IF NOT EXISTS public.re_meal_class_overlap_rules (
  overlap_id       SERIAL PRIMARY KEY,
  meal_class_code  TEXT REFERENCES public.re_meal_classes(meal_class_code),
  reason           TEXT,
  excluded_from    TEXT,
  action_note      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. RE CLASS DISH OPTIONS ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.re_class_dish_options (
  dish_option_id  TEXT PRIMARY KEY,
  meal_class_code TEXT NOT NULL REFERENCES public.re_meal_classes(meal_class_code),
  meal_class_name TEXT,
  dish_name       TEXT NOT NULL,
  diet_type       TEXT,
  region_relevance TEXT,
  slot_group      TEXT,
  usage_note      TEXT,
  source_logic    TEXT,
  class_use_scope TEXT,
  join_rule       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_re_class_dish_options_class ON public.re_class_dish_options(meal_class_code);

-- ── 11. RE ADDON CLASSES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.re_addon_classes (
  addon_class_code      TEXT PRIMARY KEY,
  slot_group            TEXT,
  target_member_segment TEXT NOT NULL,
  addon_class_name      TEXT NOT NULL,
  diet_type             TEXT,
  food_dna_role         TEXT,
  example_dishes        TEXT,
  planning_note         TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── 12. RE ADDON DISH OPTIONS ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.re_addon_dish_options (
  addon_dish_option_id    TEXT PRIMARY KEY,
  addon_class_code        TEXT NOT NULL REFERENCES public.re_addon_classes(addon_class_code),
  addon_class_name        TEXT,
  dish_or_component_name  TEXT NOT NULL,
  target_member_segment   TEXT,
  slot_group              TEXT,
  diet_type               TEXT,
  usage_note              TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_re_addon_dish_options_class ON public.re_addon_dish_options(addon_class_code);

-- ── 13. RE COHORTS (2,953 rows) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.re_cohorts (
  cohort_id                    TEXT PRIMARY KEY,
  state_id                     TEXT REFERENCES public.re_states(state_id),
  state_ut                     TEXT,
  city_tier_code               TEXT,
  city_tier                    TEXT,
  representative_cities        TEXT,
  main_cohort_id               TEXT REFERENCES public.re_main_cohorts(main_cohort_id),
  sub_cohort_id                TEXT REFERENCES public.re_subcohorts(sub_cohort_id),
  sub_cohort_label             TEXT,
  persona_id                   TEXT REFERENCES public.re_personas(persona_id),
  persona_name                 TEXT,
  age_band                     TEXT,
  household_stage              TEXT,
  lifecycle_health             TEXT,
  cook_dependency              TEXT,
  time_pressure                TEXT,
  nonveg_mode                  TEXT,
  nonveg_meals_per_week_default INTEGER,
  egg_meals_per_week_default    INTEGER,
  weekday_breakfast_class_mix  TEXT,
  weekday_lunch_class_mix      TEXT,
  weekday_snack_class_mix      TEXT,
  weekday_dinner_class_mix     TEXT,
  weekend_breakfast_class_mix  TEXT,
  weekend_lunch_class_mix      TEXT,
  weekend_snack_class_mix      TEXT,
  weekend_dinner_class_mix     TEXT,
  dependent_addon_required     BOOLEAN DEFAULT FALSE,
  dependent_member_segments    TEXT,
  health_overlay_default       BOOLEAN DEFAULT FALSE,
  cook_overlay_default         BOOLEAN DEFAULT FALSE,
  household_addon_logic        TEXT,
  state_signature_notes        TEXT,
  main_meal_vs_addon_rule      TEXT,
  planning_confidence          TEXT,
  cohort_display_name          TEXT,
  created_at                   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_re_cohorts_state      ON public.re_cohorts(state_id);
CREATE INDEX IF NOT EXISTS idx_re_cohorts_persona     ON public.re_cohorts(persona_id);
CREATE INDEX IF NOT EXISTS idx_re_cohorts_city_tier   ON public.re_cohorts(city_tier_code);

-- ── 14. RE WEEKLY CLASS PLANS (20,665 rows) ─────────────────
-- NOTE: primary/secondary/tertiary class columns FK to re_meal_classes
-- addon_class_code columns are TEXT (sentinel value 'none' used in source data)
CREATE TABLE IF NOT EXISTS public.re_weekly_class_plans (
  plan_day_id              TEXT PRIMARY KEY,
  cohort_id                TEXT NOT NULL REFERENCES public.re_cohorts(cohort_id),
  persona_id               TEXT REFERENCES public.re_personas(persona_id),
  day_of_week              TEXT NOT NULL,
  weekday_weekend          TEXT NOT NULL,
  breakfast_primary_class  TEXT REFERENCES public.re_meal_classes(meal_class_code),
  breakfast_secondary_class TEXT REFERENCES public.re_meal_classes(meal_class_code),
  breakfast_tertiary_class TEXT REFERENCES public.re_meal_classes(meal_class_code),
  breakfast_addon_class_code TEXT,
  lunch_primary_class      TEXT REFERENCES public.re_meal_classes(meal_class_code),
  lunch_secondary_class    TEXT REFERENCES public.re_meal_classes(meal_class_code),
  lunch_tertiary_class     TEXT REFERENCES public.re_meal_classes(meal_class_code),
  lunch_addon_class_code   TEXT,
  snack_primary_class      TEXT REFERENCES public.re_meal_classes(meal_class_code),
  snack_secondary_class    TEXT REFERENCES public.re_meal_classes(meal_class_code),
  snack_tertiary_class     TEXT REFERENCES public.re_meal_classes(meal_class_code),
  snack_addon_class_code   TEXT,
  dinner_primary_class     TEXT REFERENCES public.re_meal_classes(meal_class_code),
  dinner_secondary_class   TEXT REFERENCES public.re_meal_classes(meal_class_code),
  dinner_tertiary_class    TEXT REFERENCES public.re_meal_classes(meal_class_code),
  dinner_addon_class_code  TEXT,
  scheduled_nonveg_slot    TEXT,
  qa_mapping_status        TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_re_weekly_plans_cohort ON public.re_weekly_class_plans(cohort_id);
CREATE INDEX IF NOT EXISTS idx_re_weekly_plans_day    ON public.re_weekly_class_plans(day_of_week);

-- ── 15. RE HOUSEHOLD ADDON PLANS (7,993 rows) ───────────────
CREATE TABLE IF NOT EXISTS public.re_household_addon_plans (
  addon_plan_id                  TEXT PRIMARY KEY,
  cohort_id                      TEXT NOT NULL REFERENCES public.re_cohorts(cohort_id),
  state_ut                       TEXT,
  city_tier                      TEXT,
  persona_id                     TEXT REFERENCES public.re_personas(persona_id),
  persona_name                   TEXT,
  day_of_week                    TEXT NOT NULL,
  meal_slot                      TEXT NOT NULL,
  target_member_segment          TEXT NOT NULL,
  addon_class_code               TEXT NOT NULL REFERENCES public.re_addon_classes(addon_class_code),
  addon_class_name               TEXT,
  addon_examples                 TEXT,
  attached_to_main_class_code    TEXT,
  component_not_replacement_note TEXT,
  cooking_logic                  TEXT,
  created_at                     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_re_addon_plans_cohort  ON public.re_household_addon_plans(cohort_id);
CREATE INDEX IF NOT EXISTS idx_re_addon_plans_segment ON public.re_household_addon_plans(target_member_segment);

-- ── 16. RE NONVEG LOGIC ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.re_nonveg_logic (
  state_id                 TEXT PRIMARY KEY REFERENCES public.re_states(state_id),
  state_ut                 TEXT,
  nonveg_intensity         TEXT,
  default_nonveg_per_week  INTEGER,
  default_egg_per_week     INTEGER,
  preferred_nonveg_classes TEXT,
  planning_notes           TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ── 17. HOUSEHOLD MEMBERS (no re_ prefix — core profile) ────
CREATE TABLE IF NOT EXISTS public.household_members (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_segment           TEXT NOT NULL,
  age_band                 TEXT,
  display_name             TEXT,
  is_primary_plan_receiver BOOLEAN DEFAULT FALSE,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_household_members_profile ON public.household_members(profile_id);

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='household_members' AND policyname='hm_all_own') THEN
    CREATE POLICY hm_all_own ON public.household_members FOR ALL USING (auth.uid() = profile_id);
  END IF;
END $$;

-- ── 18. RE USER HOUSEHOLD PROFILES ─────────────────────────
CREATE TABLE IF NOT EXISTS public.re_user_household_profiles (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id             UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  main_cohort_id         TEXT REFERENCES public.re_main_cohorts(main_cohort_id),
  sub_cohort_id          TEXT REFERENCES public.re_subcohorts(sub_cohort_id),
  persona_id             TEXT REFERENCES public.re_personas(persona_id),
  cohort_id              TEXT REFERENCES public.re_cohorts(cohort_id),
  overlay_persona_ids    TEXT[],
  nonveg_meals_per_week  INTEGER,
  preferred_protein_types TEXT[],
  cook_dependency        TEXT,
  health_overlay_code    TEXT,
  health_scope           TEXT,
  city_destination_group TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.re_user_household_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='re_user_household_profiles' AND policyname='re_uhp_all_own') THEN
    CREATE POLICY re_uhp_all_own ON public.re_user_household_profiles FOR ALL USING (auth.uid() = profile_id);
  END IF;
END $$;

-- ── 19. RE USER ENGINE ASSIGNMENTS ──────────────────────────
CREATE TABLE IF NOT EXISTS public.re_user_engine_assignments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version_code TEXT NOT NULL REFERENCES public.re_engine_versions(version_code),
  assigned_at  TIMESTAMPTZ DEFAULT NOW(),
  assigned_by  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_re_user_assignments_profile ON public.re_user_engine_assignments(profile_id);

-- ── 20. ADDITIVE COLUMN ON profiles ─────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS re_engine_version TEXT
  REFERENCES public.re_engine_versions(version_code)
  DEFAULT NULL;
