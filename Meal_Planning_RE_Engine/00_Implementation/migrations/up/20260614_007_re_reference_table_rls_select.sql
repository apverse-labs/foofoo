-- SCHEMA-RE-006: Add SELECT policies to RE reference/seed tables
-- These tables are read-only lookup data; authenticated app users must be able
-- to read them. Anon access is intentionally excluded (users must be signed in).
-- User-facing tables already have correct own-row policies — untouched here.
-- Also adds own-row policy to re_user_engine_assignments (was missing).

-- ── Reference tables: SELECT for authenticated ────────────────────────────────

CREATE POLICY re_states_select
  ON public.re_states FOR SELECT TO authenticated USING (true);

CREATE POLICY re_meal_classes_select
  ON public.re_meal_classes FOR SELECT TO authenticated USING (true);

CREATE POLICY re_class_dish_options_select
  ON public.re_class_dish_options FOR SELECT TO authenticated USING (true);

CREATE POLICY re_addon_classes_select
  ON public.re_addon_classes FOR SELECT TO authenticated USING (true);

CREATE POLICY re_addon_dish_options_select
  ON public.re_addon_dish_options FOR SELECT TO authenticated USING (true);

CREATE POLICY re_cohorts_select
  ON public.re_cohorts FOR SELECT TO authenticated USING (true);

CREATE POLICY re_main_cohorts_select
  ON public.re_main_cohorts FOR SELECT TO authenticated USING (true);

CREATE POLICY re_subcohorts_select
  ON public.re_subcohorts FOR SELECT TO authenticated USING (true);

CREATE POLICY re_personas_select
  ON public.re_personas FOR SELECT TO authenticated USING (true);

CREATE POLICY re_weekly_class_plans_select
  ON public.re_weekly_class_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY re_household_addon_plans_select
  ON public.re_household_addon_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY re_city_migration_overlays_select
  ON public.re_city_migration_overlays FOR SELECT TO authenticated USING (true);

CREATE POLICY re_engine_versions_select
  ON public.re_engine_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY re_meal_class_overlap_rules_select
  ON public.re_meal_class_overlap_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY re_nonveg_logic_select
  ON public.re_nonveg_logic FOR SELECT TO authenticated USING (true);

CREATE POLICY re_routing_rules_select
  ON public.re_routing_rules FOR SELECT TO authenticated USING (true);

-- ── re_user_engine_assignments: own-row policy (was missing) ──────────────────

CREATE POLICY re_uea_all_own
  ON public.re_user_engine_assignments
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
