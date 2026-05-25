-- ============================================================
-- DATA INTEGRITY FIXES
-- Migration: 20260525000002_data_integrity_fixes.sql
-- Generated: 2026-05-25
-- Source:    foofoo-tests/reports/md/data-integrity-audit.md
-- DO NOT APPLY until approved (say "apply fixes")
-- ============================================================


-- ----------------------------------------------------------------
-- FIX F1: Deactivate 211 stub dishes
-- These dishes were loaded across Sprint 4-7 without meal_ingredients
-- and never ran the auto-derivation pipeline.
-- Deactivating hides them from the RE and UI until the content
-- team loads ingredients and triggers re-derivation.
--
-- Safe to re-activate per dish:
--   UPDATE dishes SET is_active = true WHERE id = <id>;
-- ----------------------------------------------------------------

UPDATE dishes
SET is_active  = false,
    updated_at = now()
WHERE is_active = true
  AND derived_at IS NULL
  AND id NOT IN (SELECT DISTINCT dish_id FROM meal_ingredients);

-- Expected: 211 rows updated


-- ----------------------------------------------------------------
-- FIX F2: Delete 5 empty dish_combos
-- These combo header records have no dish_combo_items rows.
-- Any client render call against them will return an empty combo,
-- which crashes the combo card UI.
-- Content team should re-add these combos with proper items
-- when the combo content is ready.
--
-- Combos removed:
--   id=18  Matar Kulcha
--   id=19  Chole Bhature (Delhi)
--   id=29  Keema Pav
--   id=32  Daal Bafla
--   id=34  Dal Pakwan
-- ----------------------------------------------------------------

DELETE FROM dish_combos
WHERE id IN (18, 19, 29, 32, 34);

-- Expected: 5 rows deleted


-- ----------------------------------------------------------------
-- FIX F3: Correct invalid state code TG → TS (Telangana)
-- TG is not a valid ISO 3166-2:IN state code.
-- The correct code for Telangana is TS.
-- 3 rows in region_food_affinity used TG (cuisine_ids: 2, 9, 13),
-- creating a phantom 31st state alongside the correct TS entries.
-- After this fix: 30 distinct codes, TS has 5 rows.
-- ----------------------------------------------------------------

UPDATE region_food_affinity
SET state_code = 'TS'
WHERE state_code = 'TG';

-- Expected: 3 rows updated


-- ----------------------------------------------------------------
-- CONTENT-OPS ACTION ITEMS (cannot be resolved in SQL)
-- ----------------------------------------------------------------
-- C1: 813 active dishes have hero_image_url = NULL
--     → Run Cloudinary upload pipeline for all dishes
--     → Then UPDATE dishes SET hero_image_url = '<url>' per dish
--
-- C2: 813 active dishes have blurhash = NULL
--     → Run blurhash generation after C1 completes
--     → Then UPDATE dishes SET blurhash = '<hash>' per dish
--
-- C3: ingredients table (78 rows) is missing:
--       - 'atta' / 'maida'  (should have is_gluten = true)
--       - 'cheese'           (should have is_dairy = true)
--     → Add ingredient rows when these are needed for new dishes
-- ----------------------------------------------------------------
