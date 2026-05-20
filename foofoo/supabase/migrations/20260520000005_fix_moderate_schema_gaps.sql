-- ============================================================
-- Migration 5: Moderate Schema Gaps — Fix before Sprint 3 demo
-- Fixes: user_inferred_prefs, user_dish_patterns, app_events,
--        recommendation_debug_log, suggestion_logs,
--        user_behavioral_profile
-- ============================================================

-- ============================================================
-- 1. FIX user_inferred_prefs
-- Doc 10 §13 + Doc 11 §4.3: per-slot repeat tolerance, coherence
-- sensitivity, and distribution prefs are all RE v2 inputs.
-- ============================================================

ALTER TABLE public.user_inferred_prefs
  -- Sweetness tolerance (Doc 10 §13: 15 sweet suggestions minimum)
  ADD COLUMN IF NOT EXISTS sweetness_tolerance        NUMERIC,

  -- Per-slot repeat tolerance (Doc 10 §8.2: "tracked separately B/L/D")
  -- Default 0.5 = 5-day window (scale 1-10, window = 12 - score)
  ADD COLUMN IF NOT EXISTS repeat_tolerance_breakfast  NUMERIC DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS repeat_tolerance_lunch      NUMERIC DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS repeat_tolerance_dinner     NUMERIC DEFAULT 0.5,

  -- Coherence sensitivity (Doc 10 §14: learned, not fixed rule)
  -- Scale 0-1. Default 0.5 = neutral.
  ADD COLUMN IF NOT EXISTS coherence_sensitivity       NUMERIC DEFAULT 0.5,

  -- Cooking method preference distribution (for Tier 2 scoring)
  -- e.g. {"steamed": 0.4, "fried": 0.3, "sauteed": 0.3}
  ADD COLUMN IF NOT EXISTS cooking_method_prefs        JSONB,

  -- Richness preference (plain/buttery/creamy/oily/ghee_rich)
  ADD COLUMN IF NOT EXISTS richness_pref               TEXT;

-- ============================================================
-- 2. FIX user_dish_patterns
-- Doc 11A §3.1: correct types + missing columns.
-- preferred_days should be text[] (day names), not int[].
-- frequency should be text (named category), not int.
-- ============================================================

-- Add the missing columns first (safe on any table state)
ALTER TABLE public.user_dish_patterns
  ADD COLUMN IF NOT EXISTS last_suggested   DATE,
  ADD COLUMN IF NOT EXISTS acceptance_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_count  INTEGER NOT NULL DEFAULT 0;

-- Fix column types only if table is empty (newly created, no CRON has run yet).
-- If the table has data, a separate data-migration is needed — flagged in re-validate list.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.user_dish_patterns) = 0 THEN
    -- preferred_days: integer array → text array (e.g. ['saturday','sunday'])
    ALTER TABLE public.user_dish_patterns
      ALTER COLUMN preferred_days TYPE TEXT[]
        USING NULL::TEXT[];

    -- frequency: integer → text (e.g. 'weekly','fortnightly','monthly','occasional')
    ALTER TABLE public.user_dish_patterns
      ALTER COLUMN frequency TYPE TEXT
        USING NULL::TEXT;

    RAISE NOTICE '[Migration 5] user_dish_patterns column types corrected (table was empty).';
  ELSE
    RAISE WARNING '[Migration 5] user_dish_patterns has data — preferred_days and frequency type fix SKIPPED. Run manual migration after backing up data.';
  END IF;
END $$;

-- ============================================================
-- 3. FIX app_events
-- Doc 11 §4.4: session_id required for session reconstruction
-- and avg_session_duration in the founder analytics email.
-- device_type + app_version for version-specific issue tracking.
-- ============================================================

ALTER TABLE public.app_events
  ADD COLUMN IF NOT EXISTS session_id   UUID,
  ADD COLUMN IF NOT EXISTS device_type  TEXT
    CHECK (device_type IN ('android','ios','web')),
  ADD COLUMN IF NOT EXISTS app_version  TEXT;

-- Index for session-level queries (founder email, PostHog funnels)
CREATE INDEX IF NOT EXISTS idx_app_events_session
  ON public.app_events (session_id)
  WHERE session_id IS NOT NULL;

-- ============================================================
-- 4. FIX recommendation_debug_log
-- Doc 11 §4.3: without final_score + weather_input, debugging
-- the RE scoring pipeline is effectively blind.
-- ============================================================

ALTER TABLE public.recommendation_debug_log
  ADD COLUMN IF NOT EXISTS final_score        NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS weather_input      JSONB,
  ADD COLUMN IF NOT EXISTS eligible_pool_size INTEGER;

-- ============================================================
-- 5. FIX suggestion_logs
-- Doc 11A §2.3: ref_type supports combo-level logging.
-- Without it, combo suggestions can't be tracked separately.
-- ============================================================

ALTER TABLE public.suggestion_logs
  ADD COLUMN IF NOT EXISTS ref_type TEXT
    CHECK (ref_type IN ('dish','combo'));

-- Back-fill: all existing rows are dish-level suggestions
UPDATE public.suggestion_logs
SET ref_type = 'dish'
WHERE ref_type IS NULL AND dish_id IS NOT NULL;

-- ============================================================
-- 6. FIX user_behavioral_profile
-- Doc 11 §4.4: RE v3 K-means clustering requires distribution
-- vectors as feature inputs. Without these jsonb columns,
-- clustering has nothing to compute on at 5K+ MAU.
-- ============================================================

ALTER TABLE public.user_behavioral_profile
  -- Cuisine acceptance distribution: {north_indian: 0.35, south_indian: 0.25, ...}
  ADD COLUMN IF NOT EXISTS cuisine_acceptance_dist  JSONB,

  -- Cooking method distribution (from accepted dish Tier 2 tags)
  ADD COLUMN IF NOT EXISTS cooking_method_dist      JSONB,

  -- Texture distribution (from accepted dish Tier 2 tags)
  ADD COLUMN IF NOT EXISTS texture_dist             JSONB,

  -- Spice distribution: {level_1: 0.1, level_2: 0.3, level_3: 0.4, level_4: 0.2}
  ADD COLUMN IF NOT EXISTS spice_dist               JSONB,

  -- Session metrics (from app_events aggregation)
  ADD COLUMN IF NOT EXISTS avg_session_duration     NUMERIC,   -- seconds
  ADD COLUMN IF NOT EXISTS sessions_per_week        NUMERIC,
  ADD COLUMN IF NOT EXISTS primary_meal_slot        TEXT,      -- breakfast/lunch/dinner
  ADD COLUMN IF NOT EXISTS days_active              INTEGER DEFAULT 0;

-- ============================================================
-- VERIFY
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'user_inferred_prefs'
--   AND column_name IN (
--     'sweetness_tolerance','repeat_tolerance_breakfast',
--     'coherence_sensitivity','cooking_method_prefs','richness_pref'
--   );
--   -- expect 5 rows
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'app_events'
--   AND column_name IN ('session_id','device_type','app_version');
--   -- expect 3 rows
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'recommendation_debug_log'
--   AND column_name IN ('final_score','weather_input','eligible_pool_size');
--   -- expect 3 rows
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'user_behavioral_profile'
--   AND column_name IN (
--     'cuisine_acceptance_dist','cooking_method_dist',
--     'texture_dist','spice_dist','avg_session_duration'
--   );
--   -- expect 5 rows
-- ============================================================
