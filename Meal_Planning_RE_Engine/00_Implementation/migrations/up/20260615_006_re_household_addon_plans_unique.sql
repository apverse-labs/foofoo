-- SCHEMA-RE-016: Add UNIQUE constraint to re_household_addon_plans
-- Prevents duplicate seed rows from causing "ON CONFLICT DO UPDATE command
-- cannot affect row a second time" in generateUserAddonPlan.
-- Root cause: import_workbook.py was run 72 times, creating 72 copies of
-- every row. Data dedup applied separately; this constraint prevents recurrence.

ALTER TABLE public.re_household_addon_plans
  ADD CONSTRAINT re_hap_unique_addon_row
  UNIQUE (persona_id, day_of_week, meal_slot, target_member_segment, addon_class_code);
