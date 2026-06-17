-- BUILD-04: add nonveg_scheduled_slot to re_user_weekly_plans
-- DOC-13 §6 / DOC-15: the generated plan must carry the nonveg/egg schedule
-- (e.g. "Breakfast:egg_state_prior", "Lunch:nonveg_state_prior") so that
-- BUILD-06 dish expander knows which slot to activate nonveg candidates.
-- Additive (nullable). Safe on existing rows.

ALTER TABLE public.re_user_weekly_plans
  ADD COLUMN IF NOT EXISTS nonveg_scheduled_slot TEXT;
