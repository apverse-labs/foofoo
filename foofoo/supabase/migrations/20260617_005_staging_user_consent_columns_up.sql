-- SCHEMA-BASE-004 (Up)
-- CI re-run surfaced dpdp-compliance.test.ts failures: staging's user_consent
-- table predates the data_consent_version / marketing_consent / analytics_consent
-- columns that exist on production. Without data_consent_version, the upsert in
-- createDpdpTestUser() (dpdp-compliance.test.ts) fails with PGRST204, which is
-- why downstream tests also saw 0 rows / PGRST116. STAGING ONLY.
-- Source of truth: production project ufgfznpqixplcbhmsqqw.

ALTER TABLE public.user_consent
  ADD COLUMN IF NOT EXISTS data_consent_version text NOT NULL DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS analytics_consent boolean DEFAULT true;
