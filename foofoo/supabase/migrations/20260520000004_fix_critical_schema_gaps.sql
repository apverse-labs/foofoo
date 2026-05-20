-- ============================================================
-- Migration 4: Critical Schema Gaps — Must run before RE build
-- Fixes: Food DNA columns on dishes, user_recipe_affinity,
--        never_list, dish_popularity MV, all 16 RE indexes
-- ============================================================

-- ============================================================
-- 1. ADD TIER 2 + TIER 3 FOOD DNA COLUMNS TO dishes
-- Doc 10 §4.4: "All 20 dimension columns exist from day one,
-- even though most are null at launch."
-- RE checks for null before using — null = skip, not zero.
-- ============================================================

-- Tier 2 (weeks 4-8 post-launch)
ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS cooking_method   TEXT[],
  ADD COLUMN IF NOT EXISTS primary_taste    TEXT[],
  ADD COLUMN IF NOT EXISTS texture          TEXT[],
  ADD COLUMN IF NOT EXISTS heaviness        SMALLINT CHECK (heaviness BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS richness         TEXT
    CHECK (richness IN ('plain','buttery','creamy','oily','ghee_rich')),
  ADD COLUMN IF NOT EXISTS sweetness        SMALLINT CHECK (sweetness BETWEEN 0 AND 3),
  ADD COLUMN IF NOT EXISTS weather_affinity TEXT[];

-- Tier 3 (Phase 2+)
ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS mouthfeel              TEXT[],
  ADD COLUMN IF NOT EXISTS aroma_profile          TEXT[],
  ADD COLUMN IF NOT EXISTS fermentation           TEXT
    CHECK (fermentation IN ('none','light','medium','heavy')),
  ADD COLUMN IF NOT EXISTS serving_temp           TEXT
    CHECK (serving_temp IN ('hot','warm','room_temp','chilled','frozen')),
  ADD COLUMN IF NOT EXISTS health_tags            TEXT[],
  ADD COLUMN IF NOT EXISTS ingredient_complexity  SMALLINT
    CHECK (ingredient_complexity BETWEEN 1 AND 3);

-- ============================================================
-- 2. FIX user_recipe_affinity
-- Doc 11 §4.3: static_score caches non-changing RE boosts.
-- is_eligible caches hard-filter result — cuts scoring 60%.
-- ============================================================

ALTER TABLE public.user_recipe_affinity
  ADD COLUMN IF NOT EXISTS static_score  NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS is_eligible   BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 3. FIX never_list
-- Doc 10 §9: is_active needed for reactivation on mode change.
-- reactivation_trigger records what caused reactivation.
-- ============================================================

ALTER TABLE public.never_list
  ADD COLUMN IF NOT EXISTS ref_type             TEXT
    CHECK (ref_type IN ('dish','combo','ingredient')),
  ADD COLUMN IF NOT EXISTS is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reactivation_trigger TEXT;

-- Back-fill: all existing rows are active dish-level never entries
UPDATE public.never_list
SET ref_type = 'dish', is_active = TRUE
WHERE ref_type IS NULL;

-- ============================================================
-- 4. CREATE dish_popularity MATERIALIZED VIEW
-- Doc 11A §3.2: Dish-centric analytics refreshed daily.
-- Refreshed by CRON: REFRESH MATERIALIZED VIEW CONCURRENTLY dish_popularity
-- Logged in mv_refresh_history after each refresh.
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.dish_popularity AS
SELECT
  sl.dish_id,
  COUNT(*)
    FILTER (WHERE sl.action IN (
      'viewed','swiped_to','swiped_past','locked',
      'tapped_detail','not_today'
    )) AS total_views,
  COUNT(*)
    FILTER (WHERE sl.action IN ('locked','tapped_detail'))
    AS total_accepts,
  COUNT(*)
    FILTER (WHERE sl.action IN ('never','not_today'))
    AS total_rejects,
  ROUND(
    COUNT(*) FILTER (WHERE sl.action IN ('locked','tapped_detail'))::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE sl.action IN (
      'viewed','swiped_to','swiped_past','locked','tapped_detail','not_today'
    )), 0),
    3
  ) AS acceptance_rate,
  -- trending_score: 7-day decay-weighted acceptance rate
  ROUND(
    COUNT(*) FILTER (
      WHERE sl.action IN ('locked','tapped_detail')
        AND sl.created_at >= NOW() - INTERVAL '7 days'
    )::NUMERIC /
    NULLIF(COUNT(*) FILTER (
      WHERE sl.created_at >= NOW() - INTERVAL '7 days'
        AND sl.action IN (
          'viewed','swiped_to','swiped_past','locked','tapped_detail','not_today'
        )
    ), 0),
    3
  ) AS trending_score,
  NULL::JSONB AS top_user_segments,   -- populated by clustering CRON (Phase 1.5)
  MODE() WITHIN GROUP (ORDER BY sl.meal_slot) AS best_slot,
  MODE() WITHIN GROUP (
    ORDER BY TO_CHAR(sl.created_at AT TIME ZONE 'Asia/Kolkata', 'Dy')
  ) AS best_day,
  ROUND(AVG(sl.position), 2) AS avg_carousel_position
FROM public.suggestion_logs sl
WHERE sl.dish_id IS NOT NULL
GROUP BY sl.dish_id
WITH DATA;

-- UNIQUE index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_dish_popularity_dish_id
  ON public.dish_popularity (dish_id);

-- ============================================================
-- 5. ALL 16 RE-CRITICAL INDEXES
-- Doc 11 §6: without these, every RE query is a full table scan.
-- At 500 dishes × 10K users = unacceptable latency.
-- ============================================================

-- dishes — hard filter (most-queried RE path)
CREATE INDEX IF NOT EXISTS idx_dishes_filter
  ON public.dishes (cuisine_id, diet_type, is_active);

CREATE INDEX IF NOT EXISTS idx_dishes_meal_types
  ON public.dishes USING GIN (meal_types);

-- dishes — Food DNA matching (Tier 2 scoring)
CREATE INDEX IF NOT EXISTS idx_dishes_cooking_method
  ON public.dishes USING GIN (cooking_method);

CREATE INDEX IF NOT EXISTS idx_dishes_texture
  ON public.dishes USING GIN (texture);

CREATE INDEX IF NOT EXISTS idx_dishes_weather_affinity
  ON public.dishes USING GIN (weather_affinity);

-- dishes — full-text search
CREATE INDEX IF NOT EXISTS idx_dishes_search
  ON public.dishes USING GIN (search_vector);

-- meal_ingredients — ingredient joins
CREATE INDEX IF NOT EXISTS idx_meal_ingredients_dish
  ON public.meal_ingredients (dish_id);

CREATE INDEX IF NOT EXISTS idx_meal_ingredients_ingredient
  ON public.meal_ingredients (ingredient_id);

-- planner — fetch today's plan
CREATE INDEX IF NOT EXISTS idx_planner_user_date
  ON public.planner (user_id, plan_date DESC);

-- suggestion_logs — RE history queries
CREATE INDEX IF NOT EXISTS idx_suggestion_logs_user_date
  ON public.suggestion_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suggestion_logs_dish_action
  ON public.suggestion_logs (dish_id, action);

-- app_events — session + activity queries
CREATE INDEX IF NOT EXISTS idx_app_events_user_date
  ON public.app_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_events_created_at
  ON public.app_events (created_at);

-- user_recipe_affinity — eligible pool fetch (core RE optimisation)
CREATE INDEX IF NOT EXISTS idx_user_recipe_affinity_eligible
  ON public.user_recipe_affinity (user_id)
  WHERE is_eligible = TRUE;

-- never_list — active entries per user
CREATE INDEX IF NOT EXISTS idx_never_list_user_active
  ON public.never_list (user_id)
  WHERE is_active = TRUE;

-- audit_log — security queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_date
  ON public.audit_log (user_id, created_at DESC);

-- region_food_affinity — home state boost
CREATE INDEX IF NOT EXISTS idx_region_affinity_state
  ON public.region_food_affinity (state_code);

-- user_category_preferences — RE bucket lookups
CREATE INDEX IF NOT EXISTS idx_ucp_user_type
  ON public.user_category_preferences (user_id, category_type);

-- dish_tags — Food DNA tag joins
CREATE INDEX IF NOT EXISTS idx_dish_tags_dish_id
  ON public.dish_tags (dish_id);

-- ============================================================
-- VERIFY
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'dishes' AND column_name IN
--   ('cooking_method','texture','heaviness','weather_affinity','ingredient_complexity');
--   -- expect 5 rows
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'user_recipe_affinity'
--   AND column_name IN ('static_score','is_eligible');
--   -- expect 2 rows
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'never_list'
--   AND column_name IN ('is_active','reactivation_trigger','ref_type');
--   -- expect 3 rows
--
--   SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';
--   -- expect 'dish_popularity'
--
--   SELECT COUNT(*) FROM pg_indexes
--   WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
--   -- expect 18+ new indexes
-- ============================================================
