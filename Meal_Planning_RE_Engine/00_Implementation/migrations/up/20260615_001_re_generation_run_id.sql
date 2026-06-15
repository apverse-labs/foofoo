-- B1: Add generation_run_id to re_user_weekly_plans and re_user_feedback
-- Links each feedback event back to the exact plan generation run that produced it.
-- Additive (nullable) — existing rows get NULL, no data loss.

ALTER TABLE re_user_weekly_plans
  ADD COLUMN IF NOT EXISTS generation_run_id UUID DEFAULT gen_random_uuid();

ALTER TABLE re_user_feedback
  ADD COLUMN IF NOT EXISTS generation_run_id UUID REFERENCES re_user_weekly_plans(generation_run_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_re_uwp_gen_run ON re_user_weekly_plans(generation_run_id);
CREATE INDEX IF NOT EXISTS idx_re_uf_gen_run  ON re_user_feedback(generation_run_id);
