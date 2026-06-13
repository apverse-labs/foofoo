-- ============================================================
-- RE Module BUILD-01: Data Model Migration (Down / Rollback)
-- Drops in reverse dependency order
-- Does NOT drop: profiles, user_diet_rules, or any existing MVP table
-- ============================================================

ALTER TABLE public.profiles DROP COLUMN IF EXISTS re_engine_version;

DROP TABLE IF EXISTS public.re_user_engine_assignments;
DROP TABLE IF EXISTS public.re_user_household_profiles;
DROP TABLE IF EXISTS public.household_members;
DROP TABLE IF EXISTS public.re_household_addon_plans;
DROP TABLE IF EXISTS public.re_weekly_class_plans;
DROP TABLE IF EXISTS public.re_nonveg_logic;
DROP TABLE IF EXISTS public.re_cohorts;
DROP TABLE IF EXISTS public.re_addon_dish_options;
DROP TABLE IF EXISTS public.re_addon_classes;
DROP TABLE IF EXISTS public.re_class_dish_options;
DROP TABLE IF EXISTS public.re_meal_class_overlap_rules;
DROP TABLE IF EXISTS public.re_meal_classes;
DROP TABLE IF EXISTS public.re_routing_rules;
DROP TABLE IF EXISTS public.re_subcohorts;
DROP TABLE IF EXISTS public.re_personas;
DROP TABLE IF EXISTS public.re_main_cohorts;
DROP TABLE IF EXISTS public.re_city_migration_overlays;
DROP TABLE IF EXISTS public.re_states;
DROP TABLE IF EXISTS public.re_engine_versions;
