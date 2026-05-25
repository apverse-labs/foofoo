-- ============================================================
-- RLS Policy Audit Fixes — 2026-05-25
-- Project: ufgfznpqixplcbhmsqqw (dev/Mumbai)
--
-- Findings from: foofoo-tests/reports/md/rls-audit.md
--
-- SECTION 1: REVOKE anon/authenticated EXECUTE on SECURITY DEFINER
--            functions that should only be callable by pg_cron
-- SECTION 2: Add explicit service_role policies to 6 policy-less tables
-- SECTION 3: Drop 25 duplicate policies (old verbose names)
-- SECTION 4: Add explicit service_role write policies to all tables
-- SECTION 5: Fix mutable search_path on trigger function
-- ============================================================

-- ── SECTION 1: REVOKE anon EXECUTE on SECURITY DEFINER functions ─────────
-- replace_planner_carousel_slot: atomic helper, not callable by anon
REVOKE EXECUTE ON FUNCTION public.replace_planner_carousel_slot(uuid, text, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.replace_planner_carousel_slot(uuid, text, jsonb) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.replace_planner_carousel_slot(uuid, text, jsonb) TO service_role;

-- CRON wrapper functions: called by pg_cron only (postgres superuser context).
-- pg_cron is unaffected by EXECUTE revocations; app users must not call these.
REVOKE EXECUTE ON FUNCTION public.run_calculate_inferred_prefs()  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_compute_recipe_affinity()   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_daily_analytics_email()     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_morning_notifications()     FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.run_calculate_inferred_prefs()  TO service_role;
GRANT EXECUTE ON FUNCTION public.run_compute_recipe_affinity()   TO service_role;
GRANT EXECUTE ON FUNCTION public.run_daily_analytics_email()     TO service_role;
GRANT EXECUTE ON FUNCTION public.run_morning_notifications()     TO service_role;

-- ── SECTION 2: ADD POLICIES TO 6 TABLES WITH RLS BUT NO POLICIES ─────────
-- RLS enabled + no policy = all PostgREST access blocked (correct for ops tables).
-- Explicit service_role policies silence the advisor and document intent.

CREATE POLICY "audit_log_service_only"       ON public.audit_log         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "etl_jobs_service_only"        ON public.etl_jobs          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "cache_metadata_service_only"  ON public.cache_metadata     FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "migration_log_service_only"   ON public.migration_log      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mv_refresh_history_service_only" ON public.mv_refresh_history FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "role_audit_service_only"      ON public.role_audit         FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── SECTION 3: DROP DUPLICATE POLICIES ───────────────────────────────────
-- Each table has two identical policies (original verbose + canonical short name).
-- Keeping the short-name canonical policies; dropping the verbose originals.

DROP POLICY IF EXISTS "Users manage own events"           ON public.app_events;
DROP POLICY IF EXISTS "Users manage own family"           ON public.family_members;
DROP POLICY IF EXISTS "Users manage own never list"       ON public.never_list;
DROP POLICY IF EXISTS "Users read own notifications"      ON public.notification_log;
DROP POLICY IF EXISTS "Users manage own planner"          ON public.planner;
DROP POLICY IF EXISTS "Users read own carousel"           ON public.planner_carousel;
DROP POLICY IF EXISTS "Users read own debug logs"         ON public.recommendation_debug_log;
DROP POLICY IF EXISTS "Users insert own suggestion logs"  ON public.suggestion_logs;
DROP POLICY IF EXISTS "Users read own suggestion logs"    ON public.suggestion_logs;
DROP POLICY IF EXISTS "Users read own behavioral profile" ON public.user_behavioral_profile;
DROP POLICY IF EXISTS "Users manage own category prefs"  ON public.user_category_preferences;
DROP POLICY IF EXISTS "Users manage own consent"         ON public.user_consent;
DROP POLICY IF EXISTS "Users manage own diet rules"      ON public.user_diet_rules;
DROP POLICY IF EXISTS "Users read own dish patterns"     ON public.user_dish_patterns;
DROP POLICY IF EXISTS "Users manage own feedback"        ON public.user_feedback;
DROP POLICY IF EXISTS "Users read own inferred prefs"    ON public.user_inferred_prefs;
DROP POLICY IF EXISTS "Users read own recipe affinity"   ON public.user_recipe_affinity;
DROP POLICY IF EXISTS "Users read own experiments"       ON public.experiment_assignments;
DROP POLICY IF EXISTS "Public read cuisine_groups"       ON public.cuisine_groups;
DROP POLICY IF EXISTS "Public read cuisines"             ON public.cuisines;
DROP POLICY IF EXISTS "Public read dish_combo_items"     ON public.dish_combo_items;
DROP POLICY IF EXISTS "Public read dish_combos"          ON public.dish_combos;
DROP POLICY IF EXISTS "Public read dish_similar"         ON public.dish_similar;
DROP POLICY IF EXISTS "Public read dish_tags"            ON public.dish_tags;
DROP POLICY IF EXISTS "Public read dishes"               ON public.dishes;
DROP POLICY IF EXISTS "Public read ing_aliases"          ON public.ingredient_aliases;
DROP POLICY IF EXISTS "Public read ingredients"          ON public.ingredients;
DROP POLICY IF EXISTS "Public read meal_ingredients"     ON public.meal_ingredients;
DROP POLICY IF EXISTS "Public read tags"                 ON public.tags;
DROP POLICY IF EXISTS "Public read term_synonyms"        ON public.term_synonyms;

-- ── SECTION 4: ADD EXPLICIT service_role WRITE POLICIES ──────────────────
-- service_role bypasses RLS natively; these policies silence linter warnings
-- and make intent explicit for future developers.

-- Reference / food knowledge tables
CREATE POLICY "dishes_service_write"             ON public.dishes                  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "dish_tags_service_write"          ON public.dish_tags               FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "dish_similar_service_write"       ON public.dish_similar            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "dish_combos_service_write"        ON public.dish_combos             FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "dish_combo_items_service_write"   ON public.dish_combo_items        FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "meal_ingredients_service_write"   ON public.meal_ingredients        FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "ingredients_service_write"        ON public.ingredients             FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "ingredients_master_service_write" ON public.ingredients_master      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "ingredient_aliases_service_write" ON public.ingredient_aliases      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "region_affinity_service_write"    ON public.region_food_affinity    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "weather_cache_service_write"      ON public.weather_cache           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "term_synonyms_service_write"      ON public.term_synonyms           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "tags_service_write"               ON public.tags                    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "cuisines_service_write"           ON public.cuisines                FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "cuisines_master_service_write"    ON public.cuisines_master         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "cuisine_groups_service_write"     ON public.cuisine_groups          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "media_assets_service_write"       ON public.media_assets            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "recipes_service_write"            ON public.recipes                 FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "recipe_steps_service_write"       ON public.recipe_steps            FOR ALL TO service_role USING (true) WITH CHECK (true);

-- User data tables (Edge Functions read/write these)
CREATE POLICY "planner_service_write"                ON public.planner                   FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "planner_carousel_service_write"       ON public.planner_carousel          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "suggestion_logs_service_write"        ON public.suggestion_logs           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "notification_log_service_write"       ON public.notification_log          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "recommendation_debug_service_write"   ON public.recommendation_debug_log  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_inferred_prefs_service_write"    ON public.user_inferred_prefs       FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_recipe_affinity_service_write"   ON public.user_recipe_affinity      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_behavioral_profile_service_write" ON public.user_behavioral_profile  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_dish_patterns_service_write"     ON public.user_dish_patterns        FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_consent_service_write"           ON public.user_consent              FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "experiment_assignments_service_write" ON public.experiment_assignments    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "experiments_service_write"            ON public.experiments               FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "app_events_service_write"             ON public.app_events                FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "family_members_service_write"         ON public.family_members            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "never_list_service_write"             ON public.never_list                FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "profiles_service_write"               ON public.profiles                  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_diet_rules_service_write"        ON public.user_diet_rules           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_category_prefs_service_write"    ON public.user_category_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_feedback_service_write"          ON public.user_feedback             FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── SECTION 5: FIX MUTABLE search_path ON TRIGGER FUNCTION ───────────────
-- Without a pinned search_path, a malicious search_path could redirect calls
-- to attacker-controlled schema objects. Pin to 'public, pg_catalog'.
ALTER FUNCTION public.sync_user_category_prefs_columns()
  SET search_path = public, pg_catalog;
