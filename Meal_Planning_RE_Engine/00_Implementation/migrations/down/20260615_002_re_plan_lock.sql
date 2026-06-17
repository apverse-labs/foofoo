-- Down: Remove locked columns

DROP INDEX IF EXISTS idx_re_uwp_locked;
ALTER TABLE re_user_addon_plans  DROP COLUMN IF EXISTS locked;
ALTER TABLE re_user_weekly_plans DROP COLUMN IF EXISTS locked;
