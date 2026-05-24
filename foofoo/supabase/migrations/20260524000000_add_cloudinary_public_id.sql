-- Migration: add cloudinary_public_id column to dishes
-- Sprint 7 — Cloudinary image integration
-- Run with: supabase db push
--
-- After applying this migration, run the sync-cloudinary-images Edge Function
-- to populate cloudinary_public_id for matched dishes.

ALTER TABLE dishes
  ADD COLUMN IF NOT EXISTS cloudinary_public_id text;

COMMENT ON COLUMN dishes.cloudinary_public_id IS
  'Cloudinary public_id of the primary hero image, e.g. "curd_rice_hero_01_qxxbm7". '
  'Null until the sync-cloudinary-images Edge Function has been run. '
  'Build Cloudinary URL via: https://res.cloudinary.com/dzlqsobol/image/upload/<transforms>/<cloudinary_public_id>';

-- Index for quick lookup (e.g. if we ever query by Cloudinary ID)
CREATE INDEX IF NOT EXISTS idx_dishes_cloudinary_public_id
  ON dishes (cloudinary_public_id)
  WHERE cloudinary_public_id IS NOT NULL;
