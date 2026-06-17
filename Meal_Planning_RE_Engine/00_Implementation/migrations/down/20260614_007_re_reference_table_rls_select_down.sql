-- Down: SCHEMA-RE-006 — remove SELECT policies from RE reference tables

DROP POLICY IF EXISTS re_states_select ON public.re_states;
DROP POLICY IF EXISTS re_meal_classes_select ON public.re_meal_classes;
DROP POLICY IF EXISTS re_class_dish_options_select ON public.re_class_dish_options;
DROP POLICY IF EXISTS re_addon_classes_select ON public.re_addon_classes;
DROP POLICY IF EXISTS re_addon_dish_options_select ON public.re_addon_dish_options;
DROP POLICY IF EXISTS re_cohorts_select ON public.re_cohorts;
DROP POLICY IF EXISTS re_main_cohorts_select ON public.re_main_cohorts;
DROP POLICY IF EXISTS re_subcohorts_select ON public.re_subcohorts;
DROP POLICY IF EXISTS re_personas_select ON public.re_personas;
DROP POLICY IF EXISTS re_weekly_class_plans_select ON public.re_weekly_class_plans;
DROP POLICY IF EXISTS re_household_addon_plans_select ON public.re_household_addon_plans;
DROP POLICY IF EXISTS re_city_migration_overlays_select ON public.re_city_migration_overlays;
DROP POLICY IF EXISTS re_engine_versions_select ON public.re_engine_versions;
DROP POLICY IF EXISTS re_meal_class_overlap_rules_select ON public.re_meal_class_overlap_rules;
DROP POLICY IF EXISTS re_nonveg_logic_select ON public.re_nonveg_logic;
DROP POLICY IF EXISTS re_routing_rules_select ON public.re_routing_rules;
DROP POLICY IF EXISTS re_uea_all_own ON public.re_user_engine_assignments;
