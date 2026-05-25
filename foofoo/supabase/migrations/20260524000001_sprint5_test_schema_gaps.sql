-- =============================================================================
-- Migration: 20260524000001_sprint5_test_schema_gaps.sql
-- Sprint 5 — Schema gaps identified by integration test suite
--
-- Changes:
--   1. user_category_preferences: add item_id (integer) + preference_bucket
--      alongside existing category_id / bucket columns. Sync trigger keeps
--      both column-sets consistent so app code (old schema) and test/RE code
--      (new Doc #11A schema) work simultaneously.
--   2. user_inferred_prefs: add decay_config jsonb (RE learning curve config)
--   3. Drop deprecated tables that Doc #11A marks as removed
-- =============================================================================

-- ─── 1. user_category_preferences: new Doc #11A columns ──────────────────────

-- Allow inserts that only supply item_id (old category_id NOT NULL would block)
ALTER TABLE public.user_category_preferences
  ALTER COLUMN category_id DROP NOT NULL;

-- New schema columns from Doc #11A §7
ALTER TABLE public.user_category_preferences
  ADD COLUMN IF NOT EXISTS item_id         INTEGER,
  ADD COLUMN IF NOT EXISTS preference_bucket TEXT
    CHECK (preference_bucket IN ('frequently', 'occasionally', 'never'));

-- Backfill preference_bucket from existing bucket values (F/O/N → full text)
UPDATE public.user_category_preferences
SET preference_bucket = CASE bucket
  WHEN 'F' THEN 'frequently'
  WHEN 'O' THEN 'occasionally'
  WHEN 'N' THEN 'never'
END
WHERE bucket IS NOT NULL
  AND preference_bucket IS NULL;

-- Backfill item_id for meal_item rows (category_id is a numeric string here)
UPDATE public.user_category_preferences
SET item_id = category_id::integer
WHERE category_type = 'meal_item'
  AND category_id ~ '^[0-9]+$'
  AND item_id IS NULL;

-- Backfill item_id for cuisine rows via code→id lookup in cuisines table
UPDATE public.user_category_preferences ucp
SET item_id = c.id
FROM public.cuisines c
WHERE ucp.category_type = 'cuisine'
  AND ucp.category_id = c.code
  AND ucp.item_id IS NULL;

-- Sync trigger: keeps old and new column-sets consistent on every write
CREATE OR REPLACE FUNCTION sync_user_category_prefs_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- New schema → old schema (item_id/preference_bucket given, derive category_id/bucket)
  IF NEW.item_id IS NOT NULL AND (NEW.category_id IS NULL OR NEW.category_id = '') THEN
    NEW.category_id := NEW.item_id::TEXT;
  END IF;

  IF NEW.preference_bucket IS NOT NULL AND NEW.bucket IS NULL THEN
    NEW.bucket := CASE NEW.preference_bucket
      WHEN 'frequently'   THEN 'F'
      WHEN 'occasionally' THEN 'O'
      WHEN 'never'        THEN 'N'
    END;
  END IF;

  -- Old schema → new schema (category_id/bucket given, derive preference_bucket at least)
  IF NEW.bucket IS NOT NULL AND NEW.preference_bucket IS NULL THEN
    NEW.preference_bucket := CASE NEW.bucket
      WHEN 'F' THEN 'frequently'
      WHEN 'O' THEN 'occasionally'
      WHEN 'N' THEN 'never'
    END;
  END IF;

  -- If category_id is numeric and item_id not set, populate item_id
  IF NEW.category_id IS NOT NULL AND NEW.item_id IS NULL
     AND NEW.category_id ~ '^[0-9]+$' THEN
    NEW.item_id := NEW.category_id::integer;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_category_prefs ON public.user_category_preferences;
CREATE TRIGGER trg_sync_category_prefs
  BEFORE INSERT OR UPDATE ON public.user_category_preferences
  FOR EACH ROW EXECUTE FUNCTION sync_user_category_prefs_columns();

COMMENT ON COLUMN public.user_category_preferences.item_id IS
  'Doc #11A §7 — integer ID of cuisine/item. Mirrors category_id (text). Kept in sync by trigger.';
COMMENT ON COLUMN public.user_category_preferences.preference_bucket IS
  'Doc #11A §7 — full-text bucket: frequently | occasionally | never. Mirrors bucket (F/O/N).';


-- ─── 2. user_inferred_prefs: decay_config ─────────────────────────────────────

ALTER TABLE public.user_inferred_prefs
  ADD COLUMN IF NOT EXISTS decay_config JSONB
    DEFAULT '{"week_1":1.0,"week_2_4":0.5,"month_2_3":0.2,"beyond":0.05}'::jsonb;

-- Backfill NULL rows with default
UPDATE public.user_inferred_prefs
SET decay_config = '{"week_1":1.0,"week_2_4":0.5,"month_2_3":0.2,"beyond":0.05}'::jsonb
WHERE decay_config IS NULL;

COMMENT ON COLUMN public.user_inferred_prefs.decay_config IS
  'RE history decay weights per time window. Default: week_1=1.0, week_2_4=0.5, month_2_3=0.2, beyond=0.05';


-- ─── 3. Drop deprecated tables (Doc #11A §6 — Dropped tables) ─────────────────

-- These were replaced by user_category_preferences + user_diet_rules
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.user_cuisine_preferences CASCADE;

-- Replaced by ingredients + ingredient_aliases
DROP TABLE IF EXISTS public.ingredient_normalization CASCADE;

-- Typo'd duplicate of migration_log
DROP TABLE IF EXISTS public.migration_log_ist CASCADE;
