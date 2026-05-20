-- ============================================================
-- Migration 6: Minor Fixes + RLS for all untracked tables
-- Fixes: constraints, missing columns, FK rules, RLS policies
-- for all 36 tables not covered by previous migrations.
-- ============================================================

-- ============================================================
-- 1. CONSTRAINTS ON dishes
-- ============================================================

-- dish_role CHECK — includes all values from Doc 11A + seeded data
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'dishes' AND constraint_name = 'dishes_dish_role_check'
  ) THEN
    ALTER TABLE public.dishes ADD CONSTRAINT dishes_dish_role_check
      CHECK (dish_role IN (
        'main','side','accompaniment','dessert','snack',
        'beverage','standalone','carb_base','protein','vegetable'
      ));
  END IF;
END $$;

-- ============================================================
-- 2. UNIQUE CONSTRAINT ON tags (category, value)
-- Doc 11A: prevents duplicates like 'deep_fried' and 'deep-fried'.
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tags' AND constraint_name = 'tags_category_value_unique'
  ) THEN
    ALTER TABLE public.tags
      ADD CONSTRAINT tags_category_value_unique UNIQUE (category, value);
  END IF;
END $$;

-- ============================================================
-- 3. user_consent — add data_consent_version if missing
-- DPDP requirement: must record which privacy policy was accepted.
-- ============================================================

ALTER TABLE public.user_consent
  ADD COLUMN IF NOT EXISTS data_consent_version TEXT;

-- ============================================================
-- 4. user_diet_rules — add allowed_meats if missing
-- Doc 11A §7: allowed_meats integer[] (not text[] — no language bugs)
-- ============================================================

ALTER TABLE public.user_diet_rules
  ADD COLUMN IF NOT EXISTS allowed_meats INTEGER[] NOT NULL DEFAULT '{}';

-- ============================================================
-- 5. ingredients_master — add is_jain_excluded
-- Required for auto-derivation of dishes.is_jain via ingredient flags.
-- Onion + Garlic = Jain excluded. Root vegetables too (add as needed).
-- ============================================================

ALTER TABLE public.ingredients_master
  ADD COLUMN IF NOT EXISTS is_jain_excluded BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.ingredients_master
SET is_jain_excluded = TRUE
WHERE name IN ('Onion', 'Garlic');

-- ============================================================
-- 6. cuisines_master — add missing columns from Doc 11A spec
-- Brings cuisines_master to full parity with the expanded cuisines table.
-- ============================================================

ALTER TABLE public.cuisines_master
  ADD COLUMN IF NOT EXISTS cuisine_group   TEXT,
  ADD COLUMN IF NOT EXISTS parent_cuisine  INTEGER REFERENCES public.cuisines_master(id),
  ADD COLUMN IF NOT EXISTS state_origin    TEXT,
  ADD COLUMN IF NOT EXISTS description     TEXT,
  ADD COLUMN IF NOT EXISTS icon_url        TEXT;

-- ============================================================
-- 7. migration_log — seed entry for initial migration
-- ============================================================

INSERT INTO public.migration_log (migration_name, notes)
VALUES
  ('20260519000001_sprint1_sprint2_schema', 'Initial Sprint 1+2 schema, seeds: 17 cuisines, 20 ingredients, 51 aliases, 20 dishes'),
  ('20260520000001_fix_diet_rules_and_trigger', 'Added food_pref to user_diet_rules, hardened handle_new_user trigger'),
  ('20260520000002_seed_data_and_food_pref_fix', 'Re-seeded cuisines, ingredients, aliases, dishes with ON CONFLICT DO NOTHING'),
  ('20260520000003_fix_profiles_username_not_null', 'Dropped NOT NULL on username/email/food_pref/home_state/role in profiles'),
  ('20260520000004_fix_critical_schema_gaps', 'Tier 2+3 Food DNA columns, user_recipe_affinity.is_eligible, never_list.is_active, dish_popularity MV, 18 RE indexes'),
  ('20260520000005_fix_moderate_schema_gaps', 'user_inferred_prefs per-slot tolerance, app_events session_id, suggestion_logs ref_type, behavioral_profile distribution vectors'),
  ('20260520000006_fix_minor_and_rls', 'Constraints, cuisines_master columns, ingredients_master.is_jain_excluded, RLS for all untracked tables')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. FK CONSTRAINTS for untracked tables
-- Using DO blocks to skip if constraint already exists.
-- ============================================================

-- never_list → profiles (CASCADE: user deleted = never list deleted)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'never_list_user_id_fkey'
  ) THEN
    ALTER TABLE public.never_list
      ADD CONSTRAINT never_list_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- never_list → dishes (RESTRICT: can't delete dish if users have never'd it)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'never_list_dish_id_fkey'
  ) THEN
    ALTER TABLE public.never_list
      ADD CONSTRAINT never_list_dish_id_fkey
      FOREIGN KEY (dish_id) REFERENCES public.dishes(id);
  END IF;
END $$;

-- suggestion_logs → profiles (SET NULL: anonymise on user deletion per DPDP)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'suggestion_logs_user_id_fkey'
  ) THEN
    ALTER TABLE public.suggestion_logs
      ADD CONSTRAINT suggestion_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- planner → profiles (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'planner_user_id_fkey'
  ) THEN
    ALTER TABLE public.planner
      ADD CONSTRAINT planner_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- planner_carousel → planner (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'planner_carousel_planner_id_fkey'
  ) THEN
    ALTER TABLE public.planner_carousel
      ADD CONSTRAINT planner_carousel_planner_id_fkey
      FOREIGN KEY (planner_id) REFERENCES public.planner(id) ON DELETE CASCADE;
  END IF;
END $$;

-- user_inferred_prefs → profiles (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_inferred_prefs_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_inferred_prefs
      ADD CONSTRAINT user_inferred_prefs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- user_behavioral_profile → profiles (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_behavioral_profile_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_behavioral_profile
      ADD CONSTRAINT user_behavioral_profile_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- user_recipe_affinity → profiles (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_recipe_affinity_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_recipe_affinity
      ADD CONSTRAINT user_recipe_affinity_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- user_dish_patterns → profiles (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_dish_patterns_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_dish_patterns
      ADD CONSTRAINT user_dish_patterns_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- region_food_affinity → cuisines_master (RESTRICT)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'region_food_affinity_cuisine_id_fkey'
  ) THEN
    ALTER TABLE public.region_food_affinity
      ADD CONSTRAINT region_food_affinity_cuisine_id_fkey
      FOREIGN KEY (cuisine_id) REFERENCES public.cuisines_master(id);
  END IF;
END $$;

-- dish_tags → dishes (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'dish_tags_dish_id_fkey'
  ) THEN
    ALTER TABLE public.dish_tags
      ADD CONSTRAINT dish_tags_dish_id_fkey
      FOREIGN KEY (dish_id) REFERENCES public.dishes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- dish_tags → tags (RESTRICT)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'dish_tags_tag_id_fkey'
  ) THEN
    ALTER TABLE public.dish_tags
      ADD CONSTRAINT dish_tags_tag_id_fkey
      FOREIGN KEY (tag_id) REFERENCES public.tags(id);
  END IF;
END $$;

-- meal_ingredients → dishes (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'meal_ingredients_dish_id_fkey'
  ) THEN
    ALTER TABLE public.meal_ingredients
      ADD CONSTRAINT meal_ingredients_dish_id_fkey
      FOREIGN KEY (dish_id) REFERENCES public.dishes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- meal_ingredients → ingredients_master (RESTRICT)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'meal_ingredients_ingredient_id_fkey'
  ) THEN
    ALTER TABLE public.meal_ingredients
      ADD CONSTRAINT meal_ingredients_ingredient_id_fkey
      FOREIGN KEY (ingredient_id) REFERENCES public.ingredients_master(id);
  END IF;
END $$;

-- audit_log → profiles (RETAIN — no cascade. Audit logs survive user deletion.)
-- No FK added intentionally. audit_log.user_id may reference deleted users.

-- ============================================================
-- 9. ENABLE RLS + POLICIES for all untracked tables
-- Pattern: user-owned = WHERE user_id = auth.uid()
--          knowledge base = SELECT for authenticated only
--          ops tables = service role only (no user policies)
-- ============================================================

-- --- never_list ---
ALTER TABLE public.never_list ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='never_list' AND policyname='never_list_all_own') THEN
    CREATE POLICY never_list_all_own ON public.never_list FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- planner ---
ALTER TABLE public.planner ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='planner' AND policyname='planner_all_own') THEN
    CREATE POLICY planner_all_own ON public.planner FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- planner_carousel (no direct user_id — join through planner) ---
ALTER TABLE public.planner_carousel ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='planner_carousel' AND policyname='planner_carousel_all_own') THEN
    CREATE POLICY planner_carousel_all_own ON public.planner_carousel
      FOR ALL USING (
        planner_id IN (SELECT id FROM public.planner WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- --- suggestion_logs (user_id is nullable for anonymised rows) ---
ALTER TABLE public.suggestion_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='suggestion_logs' AND policyname='suggestion_logs_select_own') THEN
    CREATE POLICY suggestion_logs_select_own ON public.suggestion_logs
      FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='suggestion_logs' AND policyname='suggestion_logs_insert_own') THEN
    CREATE POLICY suggestion_logs_insert_own ON public.suggestion_logs
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- --- user_inferred_prefs ---
ALTER TABLE public.user_inferred_prefs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_inferred_prefs' AND policyname='user_inferred_prefs_all_own') THEN
    CREATE POLICY user_inferred_prefs_all_own ON public.user_inferred_prefs
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- user_behavioral_profile ---
ALTER TABLE public.user_behavioral_profile ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_behavioral_profile' AND policyname='behavioral_profile_all_own') THEN
    CREATE POLICY behavioral_profile_all_own ON public.user_behavioral_profile
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- user_recipe_affinity ---
ALTER TABLE public.user_recipe_affinity ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_recipe_affinity' AND policyname='recipe_affinity_all_own') THEN
    CREATE POLICY recipe_affinity_all_own ON public.user_recipe_affinity
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- user_dish_patterns ---
ALTER TABLE public.user_dish_patterns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_dish_patterns' AND policyname='dish_patterns_all_own') THEN
    CREATE POLICY dish_patterns_all_own ON public.user_dish_patterns
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- user_feedback ---
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_feedback' AND policyname='user_feedback_all_own') THEN
    CREATE POLICY user_feedback_all_own ON public.user_feedback
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- app_events ---
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_events' AND policyname='app_events_all_own') THEN
    CREATE POLICY app_events_all_own ON public.app_events
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- notification_log ---
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notification_log' AND policyname='notification_log_select_own') THEN
    CREATE POLICY notification_log_select_own ON public.notification_log
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- recommendation_debug_log ---
ALTER TABLE public.recommendation_debug_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='recommendation_debug_log' AND policyname='debug_log_select_own') THEN
    CREATE POLICY debug_log_select_own ON public.recommendation_debug_log
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- family_members ---
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='family_members' AND policyname='family_members_all_own') THEN
    CREATE POLICY family_members_all_own ON public.family_members
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- experiment_assignments ---
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='experiment_assignments' AND policyname='experiment_assignments_select_own') THEN
    CREATE POLICY experiment_assignments_select_own ON public.experiment_assignments
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- Knowledge base — read-only for authenticated ---
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tags' AND policyname='tags_select_auth') THEN
    CREATE POLICY tags_select_auth ON public.tags FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

ALTER TABLE public.dish_tags ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='dish_tags' AND policyname='dish_tags_select_auth') THEN
    CREATE POLICY dish_tags_select_auth ON public.dish_tags FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

ALTER TABLE public.dish_combos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='dish_combos' AND policyname='dish_combos_select_auth') THEN
    CREATE POLICY dish_combos_select_auth ON public.dish_combos FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

ALTER TABLE public.dish_combo_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='dish_combo_items' AND policyname='dish_combo_items_select_auth') THEN
    CREATE POLICY dish_combo_items_select_auth ON public.dish_combo_items FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

ALTER TABLE public.dish_similar ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='dish_similar' AND policyname='dish_similar_select_auth') THEN
    CREATE POLICY dish_similar_select_auth ON public.dish_similar FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ingredients' AND policyname='ingredients_select_auth') THEN
    CREATE POLICY ingredients_select_auth ON public.ingredients FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

ALTER TABLE public.meal_ingredients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='meal_ingredients' AND policyname='meal_ingredients_select_auth') THEN
    CREATE POLICY meal_ingredients_select_auth ON public.meal_ingredients FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

ALTER TABLE public.term_synonyms ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='term_synonyms' AND policyname='term_synonyms_select_auth') THEN
    CREATE POLICY term_synonyms_select_auth ON public.term_synonyms FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='recipes' AND policyname='recipes_select_auth') THEN
    CREATE POLICY recipes_select_auth ON public.recipes FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='recipe_steps' AND policyname='recipe_steps_select_auth') THEN
    CREATE POLICY recipe_steps_select_auth ON public.recipe_steps FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

ALTER TABLE public.region_food_affinity ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='region_food_affinity' AND policyname='region_affinity_select_auth') THEN
    CREATE POLICY region_affinity_select_auth ON public.region_food_affinity FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='weather_cache' AND policyname='weather_cache_select_auth') THEN
    CREATE POLICY weather_cache_select_auth ON public.weather_cache FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

ALTER TABLE public.cuisine_groups ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cuisine_groups' AND policyname='cuisine_groups_select_auth') THEN
    CREATE POLICY cuisine_groups_select_auth ON public.cuisine_groups FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

ALTER TABLE public.cuisines ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cuisines' AND policyname='cuisines_select_auth') THEN
    CREATE POLICY cuisines_select_auth ON public.cuisines FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='experiments' AND policyname='experiments_select_auth') THEN
    CREATE POLICY experiments_select_auth ON public.experiments FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='media_assets' AND policyname='media_assets_select_auth') THEN
    CREATE POLICY media_assets_select_auth ON public.media_assets FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

-- --- Operations tables — no user-level policies (service role only) ---
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etl_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mv_refresh_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFY
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public' ORDER BY tablename;
--   -- Should show policies for all user-owned + knowledge base tables
--
--   SELECT tablename FROM pg_tables
--   WHERE schemaname = 'public' AND rowsecurity = FALSE;
--   -- Should return 0 rows (all tables have RLS enabled)
-- ============================================================
