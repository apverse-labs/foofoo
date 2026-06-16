# FooFoo RE — Running To-Do List
**Last updated:** 2026-06-16 | **Branch:** `claude/kind-bell-aljjei`
**Rule:** Every item has a sequence number. Sequence can be re-ordered as outcomes arrive. Update STATUS after each session.

---

## 🔴 P0 — BREAKING / SAFETY RISKS (fix before anything else)

| Seq | ID | Task | Files | Status |
|-----|-----|------|-------|--------|
| 1 | C-B5-DATA | Apply SCHEMA-RE-016-RESTORE to staging — `re_household_addon_plans` has 111 rows instead of 7,992. All addon plans (infant, diabetic, elderly) are broken. | `20260615_007_re_hacp_restore_all.sql` → apply to staging DB | ⏳ PENDING (requires DB access) |
| 2 | C-B6-ALLERG | Apply SCHEMA-RE-013 (`20260615_003_re_dish_safety_columns.sql`) to staging — adds `is_jain` + `allergen_ids` columns to `re_class_dish_options` | `20260615_003_re_dish_safety_columns.sql` → apply to staging DB | ⏳ PENDING (requires DB access) |
| 3 | C-B6-CODE | Wire allergen + Jain hard-filter into `expandClassToDishes()` — loads user's `excluded_ingredients`, filters dishes by `allergen_ids` overlap and `is_jain` flag. **Depends on seq 2.** | `re-dish-expander.repository.ts` | ✅ DONE (2026-06-16) |
| 4 | C-B7-SIGNAL | Add `SEARCH_ADD_DISH` as 9th feedback signal — strong positive (+0.40), also resets NOT_TODAY cooldown and overrides variety guard | `src/types/index.ts`, `re-feedback.repository.ts` | ✅ DONE (2026-06-16) |

---

## 🟡 P1 — CORE CORRECTNESS GAPS (fix this sprint)

| Seq | ID | Task | Files | Status |
|-----|-----|------|-------|--------|
| 5 | C-B4-VARIETY | Add class rotation guard to `generateUserWeeklyPlan()` — detect if same primary class appears >3× (breakfast) or >2× (dinner) in 7-day output and swap with secondary class | `re-plan.repository.ts` | ⏳ TODO |
| 6 | C-B4-COOK | Read `weekday_time_pressure` from `re_user_household_profiles` in `generateUserWeeklyPlan()` and use it to filter/swap high-complexity classes on weekdays | `re-plan.repository.ts` | ⏳ TODO |
| 7 | C-B2-ROUTING | Wire `re_routing_rules` DB table to runtime onboarding screen flow — replace hardcoded `buildScreenFlow()` with DB query | `re-onboarding-flow.ts` (or equivalent) | ⏳ TODO |
| 8 | C-B6-SCORE-CITY | Add current city lifestyle scoring component to `computeDishScore()` — +0.05 to +0.15 for city-relevant dishes | `re-dish-expander.repository.ts` | ⏳ TODO |
| 9 | C-B6-SCORE-COOK | Add cook capability scoring component to `computeDishScore()` — -0.20 to +0.10 based on `cook_dependency` vs dish complexity | `re-dish-expander.repository.ts` | ⏳ TODO |
| 10 | C-B6-SCORE-DNA | Add Food DNA match scoring component to `computeDishScore()` — -0.10 to +0.30 matching dish food_dna_tags against user preference vector | `re-dish-expander.repository.ts` | ⏳ TODO |

---

## 🟠 P2 — LEARNING LOOP GAPS (post-P1)

| Seq | ID | Task | Files | Status |
|-----|-----|------|-------|--------|
| 11 | C-B7-DNA-VEC | Implement Food DNA preference vector — update on LOCK/ACCEPT/SWIPE_PAST; store in `re_user_preference_vectors` or add columns to `re_user_class_affinity` | `re-feedback.repository.ts`, migration needed | ⏳ TODO |
| 12 | C-B7-REPEAT | Implement repeat tolerance per meal slot — track lock_count by (profile, meal_slot) and use to relax variety penalty for users who prefer repeat meals | `re-feedback.repository.ts`, `re-dish-expander.repository.ts` | ⏳ TODO |
| 13 | C-B7-CUISINE | Implement cuisine drift tracking — track which cuisine families are gaining/losing preference over time; use as +/- modifier in scoring | `re-feedback.repository.ts`, `re-dish-expander.repository.ts` | ⏳ TODO |
| 14 | C-B7-COOK-TOL | Implement cook complexity tolerance tracking — track whether user consistently accepts or rejects high-complexity dishes; use in scoring | `re-feedback.repository.ts`, `re-dish-expander.repository.ts` | ⏳ TODO |

---

## 🔵 P3 — ARCHITECTURE / SPEC ALIGNMENT (when core is stable)

| Seq | ID | Task | Files | Status |
|-----|-----|------|-------|--------|
| 15 | C-B8-HTTP | Add HTTP Edge Function wrappers for 9 DOC-23 REST endpoints (so external systems and future server-side RE can call them) | `supabase/functions/re-*/index.ts` — 9 new functions | ⏳ TODO |
| 16 | C-B3-TABLE | Create `re_user_persona_assignments` table per DOC-22 (currently assignment data stored on `re_user_household_profiles`) | New migration | ⏳ TODO |
| 17 | C-B2-NAMES | Align `re_user_household_profiles` column names to DOC-22 spec: `cook_dependency`→`cook_capability`, expose `diet_mode` derived field, add `member_segments` view | Migration + code update | ⏳ TODO |
| 18 | C-B9-CMS-1 | Admin CMS: Meal Class Manager — add/edit/deprecate `re_meal_classes` | Edge Function + admin UI | ⏳ TODO |
| 19 | C-B9-CMS-2 | Admin CMS: Dish Catalog Manager — add/edit/remap `re_class_dish_options` | Edge Function + admin UI | ⏳ TODO |
| 20 | C-B9-CMS-3 | Admin CMS: Food DNA Tagger — update `food_dna_tags` per dish | Edge Function + admin UI | ⏳ TODO |
| 21 | C-B9-CMS-4 | Admin CMS: Add-on Manager — edit `re_addon_classes` / `re_addon_dish_options` | Edge Function + admin UI | ⏳ TODO |
| 22 | C-B9-CMS-5 | Admin CMS: Regional Overlay Manager — update `re_city_migration_overlays` | Edge Function + admin UI | ⏳ TODO |
| 23 | C-B9-CMS-6 | Admin CMS: Weekly Matrix Manager — update `re_weekly_class_plans` / `re_household_addon_plans` | Edge Function + admin UI | ⏳ TODO |
| 24 | C-B9-QA | Expand QA gate to 6+ checks (add diet-tag consistency, allergen coverage, cohort integrity, weekly plan slot count) | `re-admin.repository.ts` | ⏳ TODO |

---

## ✅ COMPLETED

| Seq | ID | Task | Completed |
|-----|-----|------|-----------|
| 3 | C-B6-CODE | Allergen + Jain hard-filter in `expandClassToDishes()` | 2026-06-16 |
| 4 | C-B7-SIGNAL | `SEARCH_ADD_DISH` 9th feedback signal | 2026-06-16 |

---

## SCHEMA PENDING APPLICATIONS (must be applied to staging DB before the code that depends on them goes live)

| Migration File | What it does | Depends on |
|----------------|-------------|------------|
| `20260615_003_re_dish_safety_columns.sql` | Adds `is_jain` + `allergen_ids` to `re_class_dish_options` | Seq 3 (allergen code) |
| `20260615_004_re_rename_household_members.sql` | Renames `household_members` → `re_household_members` | Code in `re-onboarding.repository.ts` must be updated simultaneously |
| `20260615_007_re_hacp_restore_all.sql` | Restores `re_household_addon_plans` from 111 → 7,992 rows | Seq 1 (data restore) |

**⚠️ SCHEMA-RE-014 WARNING:** Do NOT apply `20260615_004_re_rename_household_members.sql` until `re-onboarding.repository.ts` lines 164 and 176 are updated to reference `re_household_members`. Both must happen together or onboarding member writes will fail.
