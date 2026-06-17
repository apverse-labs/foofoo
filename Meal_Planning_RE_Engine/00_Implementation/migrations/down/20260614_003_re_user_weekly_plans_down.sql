-- BUILD-04: RE User Weekly Plans — DOWN / rollback
-- Target: foofoo-staging ONLY
-- Reverses 20260614_003_re_user_weekly_plans.sql

DROP POLICY IF EXISTS re_uwp_all_own ON public.re_user_weekly_plans;
DROP INDEX IF EXISTS public.idx_re_uwp_profile_week;
DROP TABLE IF EXISTS public.re_user_weekly_plans;
