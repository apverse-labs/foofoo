-- B2: Add locked column for cross-device lock persistence
-- locked=true means the user has pinned this slot and the RE should not swap it.
-- Additive (NOT NULL DEFAULT false) — zero data loss, existing rows read as unlocked.

ALTER TABLE re_user_weekly_plans
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE re_user_addon_plans
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_re_uwp_locked ON re_user_weekly_plans(profile_id, locked) WHERE locked = true;
