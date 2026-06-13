# BUILD-01: RE Data Model & Seed Import

**Target:** foofoo-staging ONLY (`kwypxyqxojauhiehuirz.supabase.co`)
**Branch:** `apverse-labs-RE`
**Date:** 2026-06-14

---

## What This Build Does

Creates all RE module database tables and seeds them with reference data extracted from the canonical workbook `Indian_Meal_Cohort_Persona_DB_v3.xlsx`.

No app code changes. No production rollout. No plan generation logic.

---

## Tables Created (20 new tables + 1 additive column)

| Table | Rows | Notes |
|-------|------|-------|
| `re_engine_versions` | 6 | 2 legacy + 4 classfirst |
| `re_states` | 36 | 28 states + 8 UTs |
| `re_city_migration_overlays` | 324 | Origin × destination combos |
| `re_main_cohorts` | 5 | MC1–MC5 |
| `re_personas` | 41 | Per main cohort |
| `re_subcohorts` | 41 | 1:1 with personas |
| `re_routing_rules` | 8 | Onboarding branching logic |
| `re_meal_classes` | 131 | 118 primary + 13 addon-only |
| `re_meal_class_overlap_rules` | 0 | Populated in BUILD-04 |
| `re_class_dish_options` | 1050 | Primary meal class dishes |
| `re_addon_classes` | 24 | Member-specific addon classes |
| `re_addon_dish_options` | 142 | Addon component dishes |
| `re_cohorts` | 2952 | State × city-tier × persona |
| `re_weekly_class_plans` | 20664 | 7-day class plans per cohort |
| `re_household_addon_plans` | 7992 | Member-specific addon plans |
| `re_nonveg_logic` | 36 | Nonveg defaults per state |
| `household_members` | — | Live user data (no seed) |
| `re_user_household_profiles` | — | Live user data (no seed) |
| `re_user_engine_assignments` | — | Live user data (no seed) |
| `profiles.re_engine_version` | — | Additive nullable column |

---

## Migration Files

```
Meal_Planning_RE_Engine/00_Implementation/migrations/
├── up/20260614_001_re_seed_tables.sql      ← apply (DDL only)
└── down/20260614_001_re_seed_tables_down.sql  ← rollback
```

---

## Running the Seed Import

### Prerequisites
- Python 3.9+
- `openpyxl` installed: `pip install openpyxl`
- Access to the canonical workbook at `Meal_Planning_RE_Technical_Docs_v1/09_Source_Data/Indian_Meal_Cohort_Persona_DB_v3.xlsx`

### Step 1 — Apply DDL migration
Apply `migrations/up/20260614_001_re_seed_tables.sql` via Supabase MCP or CLI to foofoo-staging.

### Step 2 — Generate SQL blocks
```bash
cd Meal_Planning_RE_Engine/00_Implementation/seeds
python import_workbook.py
# Output: /tmp/re_seed_blocks/block_000.sql through block_075.sql
```

### Step 3 — Execute blocks in order
Execute blocks in FK-dependency order:
1. `block_000.sql` — re_engine_versions (6 rows)
2. `block_001.sql` — re_states (36 rows)
3. `block_002.sql` — re_city_migration_overlays (324 rows)
4. `block_003.sql` — re_main_cohorts (5 rows)
5. `block_004.sql` — re_personas (41 rows)
6. `block_005.sql` — re_subcohorts (41 rows)
7. `block_006.sql` — re_routing_rules (8 rows)
8. `block_007.sql` — re_meal_classes (131 rows)
9. `block_008_01.sql` through `block_008_05.sql` — re_class_dish_options (210 rows each)
10. `block_009.sql` — re_addon_classes (24 rows)
11. `block_010.sql` — re_addon_dish_options (142 rows)
12. `block_011.sql` through `block_016.sql` — re_cohorts (500 rows each, ~2952 total)
13. `block_017.sql` through `block_058.sql` — re_weekly_class_plans (500 rows each, ~20664 total)
14. `block_059.sql` through `block_074.sql` — re_household_addon_plans (500 rows each, ~7992 total)
15. `block_075.sql` — re_nonveg_logic (36 rows, use lookup-based insert for state_id FK)

All inserts use `ON CONFLICT (...) DO NOTHING` — safe to re-run.

---

## Validation

Run the validation test suite (requires `SUPABASE_STAGING_ANON_KEY` env var):

```bash
cd Meal_Planning_RE_Engine/00_Implementation
SUPABASE_STAGING_ANON_KEY=<anon_key> npx jest --testPathPattern=seed_validation
```

Expected: 20 tests passing (VAL-01 through VAL-15).

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Version naming | `classfirst_v1` not `v1` | Avoids collision with legacy engine inline strings |
| `profiles.re_engine_version` | NULL = legacy | Additive — existing users unaffected |
| Cohort storage | Full table (2952 rows) | Enables fast cohort lookup without recompute |
| Weekly plans | Full table (20664 rows) | Precomputed; avoids real-time generation in cold-start |
| addon_class_code in weekly_plans | TEXT (no FK) | Source data uses sentinel 'none'; FK would fail |
| home_state normalization | UT_NORMALIZATION dict in seed script | 3 spelling differences between app and workbook |

---

## UT Normalization Map

The workbook uses `&` in some state/UT names where the app uses `and`:

| Workbook name | Normalized to |
|--------------|---------------|
| `Andaman and Nicobar Islands` | `Andaman & Nicobar Islands` |
| `Dadra and Nagar Haveli and Daman and Diu` | `Dadra & Nagar Haveli and Daman & Diu` |
| `Jammu and Kashmir` | `Jammu & Kashmir` |

---

## Next Build

**BUILD-02: Onboarding Profile Builder**
- Dynamic onboarding flow
- Household and member data capture
- Maps to `re_user_household_profiles` and `household_members`
