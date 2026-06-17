-- Rollback: remove nonveg_scheduled_slot added in BUILD-04
ALTER TABLE public.re_user_weekly_plans
  DROP COLUMN IF EXISTS nonveg_scheduled_slot;
