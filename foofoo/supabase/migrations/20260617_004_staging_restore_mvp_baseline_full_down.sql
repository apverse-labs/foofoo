-- SCHEMA-BASE-003 (Down)
-- Rolls back 20260617_003_staging_restore_mvp_baseline_full_up.sql. STAGING ONLY.
-- Drop in reverse dependency order, then revert added columns.

DROP MATERIALIZED VIEW IF EXISTS public.dish_popularity;

DROP TABLE IF EXISTS public.family_members;
DROP TABLE IF EXISTS public.recipe_steps;
DROP TABLE IF EXISTS public.recipes;
DROP TABLE IF EXISTS public.notification_log;
DROP TABLE IF EXISTS public.migration_log;
DROP TABLE IF EXISTS public.media_assets;
DROP TABLE IF EXISTS public.mv_refresh_history;
DROP TABLE IF EXISTS public.cache_metadata;
DROP TABLE IF EXISTS public.etl_jobs;
DROP TABLE IF EXISTS public.role_audit;
DROP TABLE IF EXISTS public.experiment_assignments;
DROP TABLE IF EXISTS public.experiments;
DROP TABLE IF EXISTS public.user_behavioral_profile;
DROP TABLE IF EXISTS public.app_events;
DROP TABLE IF EXISTS public.region_food_affinity;
DROP TABLE IF EXISTS public.weather_cache;
DROP TABLE IF EXISTS public.user_dish_patterns;
DROP TABLE IF EXISTS public.recommendation_debug_log;
DROP TABLE IF EXISTS public.user_recipe_affinity;
DROP TABLE IF EXISTS public.planner_carousel;
DROP TABLE IF EXISTS public.user_feedback;
DROP TABLE IF EXISTS public.term_synonyms;
DROP TABLE IF EXISTS public.meal_ingredients;
DROP TABLE IF EXISTS public.dish_combo_items;
DROP TABLE IF EXISTS public.dish_similar;
DROP TABLE IF EXISTS public.dish_tags;
DROP TABLE IF EXISTS public.tags;

ALTER TABLE public.user_category_preferences
  DROP COLUMN IF EXISTS item_id,
  DROP COLUMN IF EXISTS preference_bucket;

ALTER TABLE public.dishes
  DROP COLUMN IF EXISTS ingredient_ids,
  DROP COLUMN IF EXISTS is_jain,
  DROP COLUMN IF EXISTS derived_at;
