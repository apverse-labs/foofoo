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

**STATUS: migration NOT YET APPLIED to staging.** The DB write was paused for founder approval
(shared-DB in-place modification). Once approved & applied, expected post-state:
`re_class_dish_options = 1050`, `re_meal_class_overlap_rules = 13`.

**Exit criteria:** [ ] reference counts == workbook (blocked on apply) · [x] zero invented IDs
(all values are verbatim workbook rows) · [x] import script faithful & idempotent.
