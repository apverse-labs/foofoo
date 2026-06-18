-- SCHEMA-BASE-004 (Down)
-- Rolls back 20260617_005_staging_user_consent_columns_up.sql. STAGING ONLY.

ALTER TABLE public.user_consent
  DROP COLUMN IF EXISTS data_consent_version,
  DROP COLUMN IF EXISTS marketing_consent,
  DROP COLUMN IF EXISTS analytics_consent;
