-- ============================================================
-- RE Module: Staging user_consent table
-- Schema: SCHEMA-RE-002
-- Date: 2026-06-14
-- Target: foofoo-staging ONLY
--
-- Adds the user_consent table so RE onboarding can record DPDP
-- consent in the same project where RE users are authenticated.
--
-- Mirrors the production schema from:
--   foofoo/supabase/migrations/20260519000001_sprint1_sprint2_schema.sql (line 74)
--   foofoo/supabase/migrations/20260520000006_fix_minor_and_rls.sql (line 45)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_consent (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data_consent_at       TIMESTAMPTZ,
  data_consent_version  TEXT DEFAULT '1.0',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_consent_user_id_idx ON public.user_consent (user_id);

ALTER TABLE public.user_consent ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_consent' AND policyname='consent_all_own') THEN
    CREATE POLICY consent_all_own ON public.user_consent FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_consent' AND policyname='user_consent_service_write') THEN
    CREATE POLICY user_consent_service_write ON public.user_consent FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
