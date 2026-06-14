# RE Validation Campaign — Execution Log

Branch: `apverse-labs-RE` · DB (staging): `kwypxyqxojauhiehuirz` · Driven by `RE_VALIDATION_PROMPT_PACKS.md`

---

## PACK 0 — BUILD-00: Documentation & Source-Data Contract ✅ PASS

**Documents read (proof of binary extraction):** All 28 canonical DOC files extracted from
git via `git show` + Python `zipfile`(docx)/`openpyxl`(xlsx). DOC-00/24/README/MANIFEST (md)
read directly. Source workbook `Indian_Meal_Cohort_Persona_DB_v3.xlsx` fully parsed (22 sheets).

**Workbook row-count contract — verified by script (not prose):**
| Sheet | Expected | Actual | |
|---|---|---|---|
| Persona_Master_v3 | 41 | 41 | ✅ |
| Meal_Class_Master_v3 | 131 | 131 | ✅ |
| Cohort_Matrix_v3 | 2952 | 2952 | ✅ |
| Weekly_Class_Plan_v3 | 20664 | 20664 | ✅ |
| Class_Dish_Options_v3 | 1050 | 1050 | ✅ |
| Addon_Component_Class_Master | 24 | 24 | ✅ |
| Household_Addon_Component_Plan | 7992 | 7992 | ✅ |

**Glossary dumped** → `/tmp/re_canonical_glossary.json` (5 main cohorts, 41 sub-cohorts,
41 persona IDs, 131 meal-class codes, 24 add-on-class codes, 36 states).

**Exit criteria:** [x] all docs open & quoted · [x] row counts script-verified · [x] glossary dumped.

---

## PACK 1 — BUILD-01: Data Model & Seed Import ⚠️ 2 DEFECTS FOUND → FIX STAGED

**DB-vs-workbook reference-table diff (13 sheets):** 11 of 13 match exactly. Two defects:

1. **`re_class_dish_options` = 946, expected 1050 (104 missing).**
2. **`re_meal_class_overlap_rules` = 0, expected 13 (empty).**

**Root cause (single):** `seeds/import_workbook.py:258` intentionally EXCLUDED dish options
for the 13 `allowed_as_weekly_primary=FALSE` member-specific classes, and never seeded the
overlap-resolution table. Its justifying comment ("handled by add-on flow in BUILD-05") is
incorrect — BUILD-05 uses the separate `ADD_*` classes in `re_addon_dish_options`, not these
13 `BF_/LD_/SN_/DN_` classes. Net effect: a half-fix that dropped the dishes (good intent —
prevent primary hijack) but also dropped the canonical guard (`re_meal_class_overlap_rules`)
that is the *correct* mechanism, and broke add-on/combo-template expansion for
infant/child/elderly/pregnancy/postpartum/recovery/teen needs. Violates the 1050/13 contract.

**Safety verified before fix:** all 13 classes are flagged `allowed_as_weekly_primary=false`
in `re_meal_classes`, and **0 of 20,664 weekly rows use any of them as a primary class** — so
restoring their dishes cannot cause family-meal hijack; the dishes are only reachable for
add-on/combo expansion, exactly as DOC-04/DOC-06 intend.

**Correction prepared (additive, Rule 9 compliant; Up+Down written):**
- `migrations/up/20260614_008_re_restore_overlap_class_dishes.sql` — restores 104 dish options
  (verbatim from `Class_Dish_Options_v3`) + seeds 13 overlap rules (from
  `Meal_Class_Overlap_Resolution`). Idempotent (`ON CONFLICT` / `NOT EXISTS`).
- `migrations/down/..._down.sql` — reverses both inserts.
- `seeds/import_workbook.py` — fixed: no longer excludes the 13 classes; now also seeds
  `re_meal_class_overlap_rules`. Future re-runs are faithful to the workbook.

**STATUS: APPLIED to staging (founder approved "apply as I go").** Post-apply verification:
`re_class_dish_options = 1050` (131/131 classes have dishes, 0 missing),
`re_meal_class_overlap_rules = 13`. Registered as SCHEMA-RE-007.

**Exit criteria:** [x] reference counts == workbook (all 13 sheets) · [x] zero invented IDs
(all values verbatim from workbook) · [x] import script faithful & idempotent. **PACK 1 PASS.**

---

## PACK 2 — BUILD-02: Onboarding & Household Profile Builder ⚠️ VALIDATED — schema fixed, UI-capture build remaining

**Two-flow resolution:** Both flows exist. Routing (`app/index.tsx:69-81`): RE flow
(`(re-onboarding)/re-step-1`) fires only when `EXPO_PUBLIC_RE_ONBOARDING_ENABLED=true` AND
`onboarding_step=0`; otherwise new users get the LEGACY `(onboarding)/step-N`. **Default = legacy.**
RE flow = 9 steps (state→main cohort→sub-cohort→members→cook→health→diet→reveal→process).

**DOC-10 18-field coverage:** 8 captured, 4 partial, 5 missing (full table in commit).
- Captured: main_cohort_id, sub_cohort_id, base_persona_id, overlay_persona_ids, home_state,
  current_city, diet_mode(as food_pref), cook_capability(as cook_dependency).
- Partial: city_tier (derived, unpersisted), migration_overlay (implied), nonveg_mode
  (only freq+protein), member_segments (only ONE member captured).
- Missing: egg_allowed, excluded_ingredients (hardcoded [] — NO allergy screen in RE flow),
  fasting_pattern, weekday_time_pressure, class_affinity_vector (NO swipe step exists).

**Corrections applied:**
- Migration 20260614_009 (SCHEMA-RE-008): added 7 DOC-10 contract columns to
  re_user_household_profiles (city_tier, migration_overlay, nonveg_mode, egg_allowed,
  fasting_pattern, weekday_time_pressure, class_affinity_vector). Applied to staging. Additive.

**Remaining BUILD-02 work (RN UI build — specced, NOT yet done):**
1. Add allergy-capture step to RE flow (excluded_ingredients integer IDs) — DOC-18 hard constraint.
2. Add class-level swipe step (DOC-10 step 8) → write class_affinity_vector keyed by re_meal_classes codes.
3. Multi-member capture loop (member_segments[] — required for the infant+diabetic-elder worked example / BUILD-05).
4. Capture weekday_time_pressure (DOC-16) + fasting_pattern (DOC-18) + nonveg_mode label + egg_allowed.
5. Persist onboarding_step in RE flow (resume bug) and decide canonical flow (retire/flag legacy).

**Exit criteria:** [~] one canonical flow (routing exists, default=legacy — decision pending) ·
[~] all contract fields persisted (schema ready; capture UI pending) · [ ] swipe=class-level (pending) ·
[x] dynamic branching live (member-step + nonveg gates present) · [ ] cold-start defaults on skip (pending).
**PACK 2: validation complete; schema corrected; UI build outstanding.**

---

## PACK 3 — BUILD-03: Cohort/Persona Assignment Engine ⚠️ 1 DEFECT FOUND → FIX STAGED

**Binary docs read:** DOC-03 (Cohort Hierarchy + Persona Mapping), DOC-09 (State/Region/City/Migration Overlay), DOC-15 (Non-Veg Consumption Patterns), DOC-20 (Cold Start Safe Assumptions). All extracted from git via zipfile.

**Workbook sheets read:** Routing_Rules_v3 (8 rules R01-R08), Persona_Master_v3 (41 rows P01-P41), Subcohort_Routing (41 rows SC1A-SC5P), State_Profile_v3 (36 states/UTs), City_Migration_Overlay_v3 (324 rows — 36 states × 9 destination groups), NonVeg_Logic_v3 (36 rows).

**DB-vs-workbook reference-table diff:**

| Table | Expected | Actual | |
|---|---|---|---|
| re_routing_rules | 8 | 8 (R01-R08) | ✅ |
| re_personas | 41 | 41 | ✅ |
| re_main_cohorts | 5 | 5 | ✅ |
| re_subcohorts | 41 | 41 | ✅ |
| re_cohorts | 2952 | 2952 | ✅ |
| re_city_migration_overlays | 324 | 324 | ✅ |

**Code audit — `re-cohort-resolver.repository.ts`:**

The resolver is fully implemented and table-driven:
- `resolveCityDestinationGroup(stateId, currentCity)` — 4-step priority lookup (home T1 → home T2 → cross-state metro → PAN_INDIA_PG_HOSTEL). ✅
- `resolveCityTierCode(destinationGroupCode)` — maps 9 destination groups to T1/T2. ✅
- `buildOverlayPersonaIds(destinationGroup, healthOverlayCode, cookDependency)` — migration + health + cook overlays, deduplicated. ✅
- `runCohortAssignment(userId)` — full orchestrator: loads profile → resolves state_id via re_states → destination group → cohort_id (stateId_T1/T2_personaId) → verifies in re_cohorts → builds overlays → upserts to re_user_household_profiles. ✅

**`re_user_household_profiles` schema check:**
- `cohort_id` ✅, `overlay_persona_ids` (ARRAY) ✅, `city_destination_group` ✅, `main_cohort_id` ✅, `sub_cohort_id` ✅, `persona_id` ✅, `health_overlay_code` ✅, `cook_dependency` ✅

**DEFECT FOUND — `confidence` score absent (DOC-03 §6 violation):**

DOC-03 §6 specifies a mandatory confidence model:
> "Every persona assignment should carry a confidence score. High confidence: explicit sub-cohort + supporting answers. Medium: main cohort + household members. Low: skipped onboarding (→ DOC-20 cold-start)."

Expected output contract (DOC-03 §8):
```json
{
  "base_persona_id": "P41",
  "overlay_persona_ids": ["P15"],
  "confidence": 0.86,
  "routing_trace": ["main_cohort", "sub_cohort", "health_overlay"]
}
```

**Root cause:** `re_user_household_profiles` has no `confidence` column; `runCohortAssignment()` computes no confidence score; `routing_trace` is also not persisted (only logged via Logger.info). Two missing contract fields.

**Safety check:** Additive-only fix — add 2 nullable columns. No existing data at risk.

**V3-science trace — P41 composite:**
A household with MC4 (Joint/elders/care) → SC4F (child_plus_diabetic_elder_overlap) → P41 in UP (S26), living in Delhi (DELHI_NCR):
- `stateId` = S26
- `destinationGroupCode` = DELHI_NCR (not home state → cross-state)
- `cityTierCode` = T1
- `cohortId` = S26_T1_P41
- `overlayPersonaIds` = [P28 (migration), P15 (diabetic_management)]
- Expected confidence = LOW-MEDIUM (cross-state migration + health overlay = multiple explicit signals but missed fasting/swipe steps)
- Expected routing_trace = ["main_cohort", "sub_cohort", "health_overlay", "migration_overlay"]

**Correction prepared:**
- Migration `20260614_010_re_cohort_assignment_confidence.sql`: ADD COLUMN `confidence NUMERIC(4,3)` + `routing_trace TEXT[]` to `re_user_household_profiles`.
- Update `runCohortAssignment()` in `re-cohort-resolver.repository.ts` to compute and persist confidence score.

**STATUS: DEFECT — fix staged for apply.**

**Exit criteria:**
- [x] assignment is table-driven from routing rules (re_routing_rules 8/8, re_cohorts 2952/2952)
- [x] overlays persisted in DB (overlay_persona_ids ARRAY on re_user_household_profiles)
- [ ] confidence score persisted (column missing — DEFECT, fix staged)
- [x] state≠city blend verified in code (resolveCityDestinationGroup correctly separates home_state vs current_city)
- [x] resolver code exists and is table-driven
- [ ] routing_trace persisted (not stored — DEFECT, fix staged)

**PACK 3: validation complete; 1 defect found (missing confidence + routing_trace); fix to apply.**
