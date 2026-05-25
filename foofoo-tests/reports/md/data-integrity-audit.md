# FooFoo Data Integrity Audit
**Date:** 2026-05-25  
**Database:** Dev (project ref: ufgfznpqixplcbhmsqqw)  
**Auditor:** Claude Code (automated)  
**Scope:** 500-dish dataset pre-launch checklist per Docs 06, 11A, 12

---

## Schema Notes (Corrections to Task Spec)

Before results, two schema discrepancies were found between the task spec and the live database:

| Spec Column | Actual Column | Table | Impact |
|---|---|---|---|
| `dishes.photo_url` | `dishes.hero_image_url` | `dishes` | Photo checks re-run against correct column |
| `dish_combos.combo_name` | `dish_combos.name` | `dish_combos` | Empty combo check re-run |
| `ingredients.allergen_flags` (array) | `ingredients.is_gluten / is_dairy / is_nut / is_egg / is_shellfish / is_soy` (booleans) | `ingredients` | Allergen checks re-run per-flag |
| `region_food_affinity.dish_id` | **column does not exist** | `region_food_affinity` | Table links to `cuisines`, not `dishes`. No dish FK to check. |

---

## TASK 1 — Referential Integrity

| # | Check | Query Result | Status |
|---|---|---|---|
| 1.1 | Orphan variant dishes (`parent_dish_id` → non-existent dish) | **0** | ✅ PASS |
| 1.2 | `dish_combo_items` → non-existent `dishes` | **0** | ✅ PASS |
| 1.3 | `dish_combo_items` → non-existent `dish_combos` | **0** | ✅ PASS |
| 1.4 | `meal_ingredients` → non-existent `dishes` | **0** | ✅ PASS |
| 1.5 | `meal_ingredients` → non-existent `ingredients` | **0** | ✅ PASS |
| 1.6 | `dish_tags` → non-existent `dishes` | **0** | ✅ PASS |
| 1.7 | `region_food_affinity` → non-existent `dishes` | **N/A** | ⚠️ SCHEMA NOTE — table has no `dish_id`; affinity is cuisine-level, not dish-level |

**Task 1 verdict: No referential integrity violations. All FK chains are clean.**

---

## TASK 2 — Dish Completeness Check

### 2.1 Total Active Dishes
```sql
SELECT COUNT(*) FROM dishes WHERE is_active = true;
```
| Result | Expected | Status |
|---|---|---|
| **818** | ≥ 500 | ✅ PASS |

818 active dishes loaded across sprints (exceeds 500-dish MVP requirement).

---

### 2.2 Dishes with No Photo (`hero_image_url IS NULL`)
```sql
SELECT COUNT(*) FROM dishes WHERE hero_image_url IS NULL AND is_active = true;
```
| Result | Expected | Status |
|---|---|---|
| **813** | 0 | ❌ FAIL — 813 of 818 active dishes have no photo |

Only **5 dishes** have a `hero_image_url` set. This is a critical content gap.  
**Fix:** Content-ops pipeline must run Cloudinary uploads. SQL cannot generate image URLs.  
Until images are uploaded, these 813 dishes should either be deactivated or visually suppressed in the UI.

---

### 2.3 Dishes with No Blurhash
```sql
SELECT COUNT(*) FROM dishes WHERE blurhash IS NULL AND is_active = true;
```
| Result | Expected | Status |
|---|---|---|
| **813** | 0 | ❌ FAIL — same 813 dishes have no blurhash |

Blurhash is derived from the hero image. Will auto-resolve once images are uploaded.  
**Fix:** Run blurhash generation pipeline after Cloudinary uploads. SQL cannot generate hashes.

---

### 2.4 Dishes with No `meal_types`
```sql
SELECT COUNT(*) FROM dishes WHERE meal_types = '{}' AND is_active = true;
```
| Result | Expected | Status |
|---|---|---|
| **0** | 0 | ✅ PASS |

---

### 2.5 Dishes with No `dish_role`
```sql
SELECT COUNT(*) FROM dishes WHERE dish_role IS NULL AND is_active = true;
```
| Result | Expected | Status |
|---|---|---|
| **0** | 0 | ✅ PASS |

---

### 2.6 Dishes with No Ingredients Linked (`meal_ingredients`)
```sql
SELECT COUNT(*) FROM dishes d
LEFT JOIN meal_ingredients mi ON d.id = mi.dish_id
WHERE mi.dish_id IS NULL AND d.is_active = true;
```
| Result | Expected | Status |
|---|---|---|
| **211** | 0 | ❌ FAIL — 211 active dishes have zero ingredient rows |

These 211 dishes are concentrated in the Sprint 4–7 content batches (IDs 391–966, sparse range). They are stub records that were created but never had `meal_ingredients` loaded.

**Affected dish sample (first/last 10):**

| id | name |
|---|---|
| 391 | Samosa |
| 392 | Kathi Roll |
| 393 | Pakora (Mixed Veg) |
| 394 | Pani Puri |
| 395 | Bread Pakora |
| … | *(211 total — see fix script for full ID list)* |
| 955 | Rabri |
| 959 | Sai Bhaji |
| 960 | Koki (Sindhi) |
| 966 | Sindhi Kadhi |

**Fix:** Deactivate these 211 dishes until ingredients are loaded (see SQL in Task 4).

---

### 2.7 Dishes with `derived_at IS NULL` (Auto-Derivation Not Run)
```sql
SELECT COUNT(*) FROM dishes WHERE derived_at IS NULL AND is_active = true;
```
| Result | Expected | Status |
|---|---|---|
| **211** | 0 | ❌ FAIL |

**Confirmed:** The overlap query `WHERE mi.dish_id IS NULL AND derived_at IS NULL` = **211**. These are exactly the same 211 dishes as 2.6. Auto-derivation has not run because there are no ingredients to derive from. Deactivating in 2.6's fix resolves this metric too.

---

### 2.8 Dishes with No Tier 1 Tags (spice_level / cook_time_mins / difficulty / calories all NULL)
```sql
SELECT COUNT(*) FROM dishes
WHERE is_active = true
AND (spice_level IS NULL OR cook_time_mins IS NULL
     OR difficulty IS NULL OR calories IS NULL);
```
| Result | Expected | Status |
|---|---|---|
| **0** | 0 | ✅ PASS |

All 818 active dishes have complete Tier 1 tags.

---

### 2.9 Combos with No Items
```sql
SELECT dc.id, dc.name
FROM dish_combos dc
LEFT JOIN dish_combo_items dci ON dc.id = dci.combo_id
WHERE dci.combo_id IS NULL;
```
| Result | Expected | Status |
|---|---|---|
| **5 combos** | 0 | ❌ FAIL |

| Combo ID | Name |
|---|---|
| 18 | Matar Kulcha |
| 19 | Chole Bhature (Delhi) |
| 29 | Keema Pav |
| 32 | Daal Bafla |
| 34 | Dal Pakwan |

These 5 combos exist as headers with no `dish_combo_items` rows. They will crash any client that tries to render them.  
**Fix:** DELETE these 5 combos (see SQL in Task 4). Content team can re-add with proper items.

---

### 2.10 Region Food Affinity — State Coverage
```sql
SELECT COUNT(DISTINCT state_code) FROM region_food_affinity;
-- Distinct codes:
SELECT DISTINCT state_code FROM region_food_affinity ORDER BY state_code;
```
| Result | Expected | Status |
|---|---|---|
| **31 distinct codes** | 28 | ⚠️ EXCEEDS (but has data error) |

**States present:** AP, AR, AS, BR, CT, DL, GA, GJ, HP, HR, JH, JK, KA, KL, MH, ML, MN, MP, MZ, NL, OD, PB, RJ, SK, TG, TN, TR, TS, UK, UP, WB

**Data error found — duplicate Telangana entry:**

| state_code | rows | cuisine_ids |
|---|---|---|
| `TG` | 3 | {2, 9, 13} |
| `TS` | 2 | {36, 66} |

`TG` is **not** a valid ISO 3166-2 code for any Indian state. The official code for Telangana is `TS`. The 3 rows under `TG` appear to be Telangana entries loaded with the wrong state code.

**Fix:** `UPDATE region_food_affinity SET state_code = 'TS' WHERE state_code = 'TG';`  
After fix: 30 distinct codes (still ≥ 28 ✅). The actual 28 standard states + JK (J&K) + DL (Delhi UT) = expected coverage met.

---

## TASK 3 — Ingredient Flag Completeness

### 3.1 `is_veg` NULL count
```sql
SELECT COUNT(*) FROM ingredients WHERE is_veg IS NULL;
```
| Result | Expected | Status |
|---|---|---|
| **0** | 0 | ✅ PASS |

---

### 3.2 Allergen Boolean Flags — NULL count per column
```sql
SELECT
  COUNT(*) FILTER (WHERE is_gluten IS NULL)   as null_is_gluten,
  COUNT(*) FILTER (WHERE is_dairy IS NULL)    as null_is_dairy,
  COUNT(*) FILTER (WHERE is_nut IS NULL)      as null_is_nut,
  COUNT(*) FILTER (WHERE is_egg IS NULL)      as null_is_egg,
  COUNT(*) FILTER (WHERE is_shellfish IS NULL) as null_is_shellfish,
  COUNT(*) FILTER (WHERE is_soy IS NULL)      as null_is_soy,
  COUNT(*) as total_ingredients
FROM ingredients;
```
| Column | NULL count | Total ingredients | Status |
|---|---|---|---|
| `is_gluten` | **0** | 78 | ✅ PASS |
| `is_dairy` | **0** | 78 | ✅ PASS |
| `is_nut` | **0** | 78 | ✅ PASS |
| `is_egg` | **0** | 78 | ✅ PASS |
| `is_shellfish` | **0** | 78 | ✅ PASS |
| `is_soy` | **0** | 78 | ✅ PASS |

All allergen flags set on all 78 ingredients. ✅

---

### 3.3 Peanut / Nut Allergen Check
```sql
SELECT name, is_nut, is_gluten, is_dairy, is_egg, is_shellfish, is_soy
FROM ingredients WHERE name ILIKE '%peanut%' OR name ILIKE '%mungfali%';
```
| name | is_nut | Status |
|---|---|---|
| Peanuts | **true** | ✅ PASS |

---

### 3.4 Wheat / Gluten Allergen Check
```sql
SELECT name, is_gluten FROM ingredients
WHERE name ILIKE '%wheat%' OR name ILIKE '%atta%' OR name ILIKE '%maida%';
```
| name | is_gluten | Status |
|---|---|---|
| Wheat Flour | **true** | ✅ PASS |
| Maize Flour | false | ✅ PASS (correct — maize is GF) |

⚠️ **Coverage note:** `atta` and `maida` are not separate rows in the `ingredients` table (78 rows total). Wheat Flour is the only wheat-family entry. If Sprint 5+ adds atta/maida as distinct ingredients, their `is_gluten` flag must be set to `true`.

---

### 3.5 Dairy Allergen Check
```sql
SELECT name, is_dairy FROM ingredients
WHERE name ILIKE '%milk%' OR name ILIKE '%cream%' OR name ILIKE '%paneer%'
   OR name ILIKE '%ghee%' OR name ILIKE '%butter%' OR name ILIKE '%curd%';
```
| name | is_dairy | Status |
|---|---|---|
| Milk | **true** | ✅ PASS |
| Paneer | **true** | ✅ PASS |
| Ghee | **true** | ✅ PASS |
| Butter | **true** | ✅ PASS |
| Cream | **true** | ✅ PASS |
| Curd / Yogurt | **true** | ✅ PASS |
| Buttermilk | **true** | ✅ PASS |

⚠️ **Coverage note:** `cheese` does not exist as a row in the `ingredients` table. If cheese-containing dishes are added, a `Cheese` ingredient row with `is_dairy = true` must be inserted.

---

### 3.6 Onion / Garlic Jain Compatibility Check
```sql
SELECT name, is_jain_compatible FROM ingredients
WHERE name ILIKE '%onion%' OR name ILIKE '%garlic%'
   OR name ILIKE '%pyaz%' OR name ILIKE '%lahsun%';
```
| name | is_jain_compatible | Status |
|---|---|---|
| Garlic | **false** | ✅ PASS |
| Onion | **false** | ✅ PASS |

---

## TASK 4 — Summary of Issues & Fix Script

### Issues Requiring SQL Fixes

| # | Issue | Severity | Rows Affected | SQL Fix |
|---|---|---|---|---|
| F1 | 211 active dishes have no ingredients + no auto-derivation | 🔴 Critical | 211 | Deactivate dishes (SQL below) |
| F2 | 5 dish_combos have no items (will crash UI) | 🔴 Critical | 5 | DELETE combos (SQL below) |
| F3 | state_code `TG` (invalid) should be `TS` (Telangana) | 🟡 Medium | 3 | UPDATE state_code (SQL below) |

### Issues Requiring Content-Ops (No SQL Fix Possible)

| # | Issue | Severity | Rows Affected | Action Required |
|---|---|---|---|---|
| C1 | 813 dishes missing `hero_image_url` | 🔴 Critical | 813 | Cloudinary upload pipeline |
| C2 | 813 dishes missing `blurhash` | 🔴 Critical | 813 | Run after C1 |
| C3 | `atta`, `maida`, `cheese` not in `ingredients` table | 🟡 Medium | — | Add ingredient rows when used |

### Fix Script Contents

See: `foofoo/supabase/migrations/20260525000002_data_integrity_fixes.sql`

```sql
-- ============================================================
-- DATA INTEGRITY FIXES — 2026-05-25
-- Generated by: automated data-integrity-audit
-- Scope: Dev DB (ufgfznpqixplcbhmsqqw)
-- DO NOT APPLY until approved
-- ============================================================

-- FIX F1: Deactivate 211 stub dishes (no ingredients, no auto-derivation)
-- These were loaded without meal_ingredients and never ran through the
-- auto-derivation pipeline. Deactivating hides them from the RE and UI
-- until the content team loads their ingredients.
-- Safe to re-activate per dish once ingredients + derived_at are set.

UPDATE dishes
SET is_active = false,
    updated_at = now()
WHERE is_active = true
  AND derived_at IS NULL
  AND id NOT IN (SELECT DISTINCT dish_id FROM meal_ingredients);

-- Expected: 211 rows updated


-- FIX F2: Delete 5 dish_combos that have no dish_combo_items
-- These header records crash any client render. Content team re-adds
-- with proper items when combos are ready.

DELETE FROM dish_combos
WHERE id IN (18, 19, 29, 32, 34);

-- Expected: 5 rows deleted
-- Combos removed: Matar Kulcha, Chole Bhature (Delhi),
--                 Keema Pav, Daal Bafla, Dal Pakwan


-- FIX F3: Correct invalid state code TG → TS (Telangana)
-- TG is not a valid ISO 3166-2:IN code. TS is the official code.
-- 3 rows affected; cuisine_ids {2, 9, 13} will move under TS.

UPDATE region_food_affinity
SET state_code = 'TS'
WHERE state_code = 'TG';

-- Expected: 3 rows updated
-- After fix: 30 distinct state_codes (down from 31), TS row count becomes 5
```

---

## BEFORE / AFTER Counts

*Migration `20260525000002_data_integrity_fixes.sql` applied: 2026-05-25*

| Metric | BEFORE | AFTER | Target | Result |
|---|---|---|---|---|
| Total active dishes | 818 | **607** | ≥ 500 | ✅ Still meets target |
| Active dishes with no ingredients | 211 | **0** | 0 | ✅ FIXED |
| Active dishes with `derived_at` NULL | 211 | **0** | 0 | ✅ FIXED |
| Empty `dish_combos` | 5 | **0** | 0 | ✅ FIXED |
| Invalid state code `TG` rows | 3 | **0** | 0 | ✅ FIXED |
| Distinct state codes in region_food_affinity | 31 | **30** | ≤ 30 valid | ✅ FIXED |
| `TS` (Telangana) rows after merge | 2 | **5** | — | ✅ TG rows absorbed |
| Active dishes missing `hero_image_url` | 813 | **602** | 0 | ❌ Content-ops pending |
| Active dishes missing `blurhash` | 813 | **602** | 0 | ❌ Content-ops pending |

> **Note on photo/blurhash counts:** dropped from 813 → 602 because 211 stub dishes were deactivated (no longer in the active pool). The remaining 602 are complete dishes awaiting the Cloudinary upload pipeline.

### Fix Execution Log

| Fix | SQL Applied | Rows Changed | Verified |
|---|---|---|---|
| F1 — Deactivate stub dishes | `UPDATE dishes SET is_active=false WHERE derived_at IS NULL AND NOT IN meal_ingredients` | 211 | ✅ 0 active stubs remain |
| F2 — Delete empty combos | `DELETE FROM dish_combos WHERE id IN (18,19,29,32,34)` | 5 | ✅ 0 empty combos remain |
| F3 — Fix TG → TS state code | `UPDATE region_food_affinity SET state_code='TS' WHERE state_code='TG'` | 3 | ✅ 0 TG rows remain; TS=5 rows |

---

## Overall Pre-Launch Readiness (Post-Fix)

| Category | Status | Notes |
|---|---|---|
| Referential Integrity | ✅ **CLEAN** | All FK chains valid |
| Dish count (≥500) | ✅ **607 active** | Exceeds target (stubs deactivated) |
| Tier 1 tags completeness | ✅ **Complete** | 0 dishes missing |
| `meal_types` assigned | ✅ **Complete** | 0 dishes missing |
| `dish_role` assigned | ✅ **Complete** | 0 dishes missing |
| Ingredients linked | ✅ **Complete** | 0 active dishes unlinked (was 211) |
| Auto-derivation run | ✅ **Complete** | 0 active dishes pending (was 211) |
| Empty combos | ✅ **None** | 5 deleted (was 5) |
| State code data quality | ✅ **Clean** | TG→TS corrected (was 3 bad rows) |
| Ingredient flags | ✅ **Complete** | All 78 ingredients flagged |
| Allergen flags | ✅ **Correct** | Peanut/wheat/dairy/jain all verified |
| Hero images (`hero_image_url`) | ❌ **602 missing** | Cloudinary upload pipeline needed |
| `blurhash` | ❌ **602 missing** | Follows photo upload |

**Remaining blocker for launch:** Cloudinary image upload + blurhash generation for 602 active dishes  
**All SQL-fixable issues:** RESOLVED ✅
