-- SCHEMA-BASE-002 (Down)
-- Rolls back 20260617_001_staging_restore_mvp_baseline_up.sql. STAGING ONLY.
-- Drop in reverse dependency order.

DROP TABLE IF EXISTS public.audit_log;
DROP TABLE IF EXISTS public.user_inferred_prefs;
DROP TABLE IF EXISTS public.suggestion_logs;
DROP TABLE IF EXISTS public.never_list;
DROP TABLE IF EXISTS public.planner;
DROP TABLE IF EXISTS public.ingredients;
DROP TABLE IF EXISTS public.dish_combos;
DROP TABLE IF EXISTS public.cuisines;
DROP TABLE IF EXISTS public.cuisine_groups;
