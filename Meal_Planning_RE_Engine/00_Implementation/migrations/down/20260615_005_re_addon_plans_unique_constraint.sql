-- Down: Revert to narrow unique constraint (SCHEMA-RE-015)

ALTER TABLE public.re_user_addon_plans
  DROP CONSTRAINT IF EXISTS re_uap_unique_addon_row;

ALTER TABLE public.re_user_addon_plans
  ADD CONSTRAINT re_user_addon_plans_profile_id_plan_week_start_day_of_week__key
  UNIQUE (profile_id, plan_week_start, day_of_week, meal_slot, target_member_segment);
