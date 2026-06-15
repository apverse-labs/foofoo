-- Down: Remove generation_run_id from re_user_weekly_plans and re_user_feedback

DROP INDEX IF EXISTS idx_re_uf_gen_run;
DROP INDEX IF EXISTS idx_re_uwp_gen_run;

ALTER TABLE re_user_feedback     DROP COLUMN IF EXISTS generation_run_id;
ALTER TABLE re_user_weekly_plans DROP COLUMN IF EXISTS generation_run_id;
