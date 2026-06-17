-- Down: Undo SCHEMA-RE-016-RESTORE
-- Removes all rows re-inserted by the restore migration.
-- WARNING: This deletes data. Only run if rolling back the restore intentionally.

DELETE FROM public.re_household_addon_plans
WHERE addon_plan_id IN (
  SELECT addon_plan_id FROM public.re_household_addon_plans
  WHERE cohort_id IS NOT NULL
);
