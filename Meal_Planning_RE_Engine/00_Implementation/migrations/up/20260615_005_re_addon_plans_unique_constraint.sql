-- SCHEMA-RE-015: Widen re_user_addon_plans unique constraint to include addon_class_code
--
-- Root cause: re_household_addon_plans can contain multiple addon classes for the
-- same (persona, day, slot, member_segment) combination. When generateUserAddonPlan()
-- upserts the full batch, Postgres raises "ON CONFLICT DO UPDATE command cannot
-- affect row a second time" because two rows share the old conflict key.
--
-- Fix: include addon_class_code in the unique constraint so each distinct addon
-- class gets its own row. This is the correct cardinality — one user can have
-- multiple add-on components per slot (e.g., chutney + pickle at breakfast).

ALTER TABLE public.re_user_addon_plans
  DROP CONSTRAINT re_user_addon_plans_profile_id_plan_week_start_day_of_week__key;

ALTER TABLE public.re_user_addon_plans
  ADD CONSTRAINT re_uap_unique_addon_row
  UNIQUE (profile_id, plan_week_start, day_of_week, meal_slot, target_member_segment, addon_class_code);
