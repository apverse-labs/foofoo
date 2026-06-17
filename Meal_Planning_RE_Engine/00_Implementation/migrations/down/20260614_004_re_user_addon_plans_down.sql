-- BUILD-05 rollback: drop re_user_addon_plans
-- Safe to run: table is staging-only and contains derived data (re-generatable)

DROP TABLE IF EXISTS public.re_user_addon_plans;
