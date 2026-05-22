-- Sprint 5 Security Hardening
-- Applied 2026-05-22 via Supabase MCP (apply_migration name: sprint5_security_hardening,
-- recorded version 20260522054922).
--
-- Addresses the security advisor warnings flagged in the pre-Sprint 5 health check.
-- See logs/pre_sprint_reports/pre_sprint5_20260522.txt for context.

-- ──────────────────────────────────────────────────────────────────
-- Fix 1: RLS on public._seed_sessions (internal seed-tracking table)
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE public._seed_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON public._seed_sessions;
CREATE POLICY "Service role only" ON public._seed_sessions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────────
-- Fix 2: handle_new_user() is SECURITY DEFINER. It must not be callable
--        via PostgREST by anon or authenticated. Keep service_role and
--        postgres for the auth trigger.
-- ──────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- ──────────────────────────────────────────────────────────────────
-- Fix 3: dish_popularity is a materialized view that PostgREST was
--        auto-exposing to anon/authenticated. Edge Functions use the
--        service role and remain unaffected.
-- ──────────────────────────────────────────────────────────────────
REVOKE SELECT ON public.dish_popularity FROM anon, authenticated, PUBLIC;

-- ──────────────────────────────────────────────────────────────────
-- Fix 4: pin search_path on the 3 remaining flagged functions
--        (derive_dish_attributes was pinned in 20260522000001;
--         handle_new_user already had search_path=public).
-- ──────────────────────────────────────────────────────────────────
ALTER FUNCTION public.rollback_seed_session(text)
  SET search_path = public, pg_catalog;
ALTER FUNCTION public._trg_meal_ingredients_derive()
  SET search_path = public, pg_catalog;
ALTER FUNCTION public._trg_ingredients_master_derive()
  SET search_path = public, pg_catalog;

-- ──────────────────────────────────────────────────────────────────
-- Fix 6: standardise 'snacks' → 'snack' in dishes.meal_types[].
--        TypeScript MealSlot / DishRole types already use 'snack'
--        (src/types/index.ts:17–18); only the DB column was wrong.
--        Affects 296 dishes.
-- ──────────────────────────────────────────────────────────────────
UPDATE public.dishes
SET meal_types = array_replace(meal_types, 'snacks', 'snack')
WHERE 'snacks' = ANY(meal_types);

-- Fix 5 (leaked-password protection) is enabled via the Supabase
-- Dashboard → Authentication → Settings → Password Security. Not
-- expressible in SQL.
