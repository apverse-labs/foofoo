# BUILD-01: Data Model + Seed Import — Implementation Plan

> Status: **Plan only — no migrations created, no code written, no tables created**
> Branch: `apverse-labs-RE`
> Date: 2026-06-13
> Primary docs: DOC-22, DOC-05, DOC-07, DOC-08, Cohort_Matrix_v3, Weekly_Class_Plan_v3 (from workbook)

---

## 0. Source Workbook Structure Confirmed

`Indian_Meal_Cohort_Persona_DB_v3.xlsx` — 22 sheets confirmed present:

| Sheet | Rows | Purpose |
|-------|------|---------|
| Main_Cohort_Hierarchy | 5 | User-facing onboarding cards (MC1–MC5) |
| Subcohort_Routing | 41 | Sub-cohort chips → persona IDs |
| Persona_Master_v3 | 41 | Full persona priors |
| Routing_Rules_v3 | 8 | Dynamic onboarding rules |
| State_Profile_v3 | 36 | 36 state/UT food signatures |
| City_Migration_Overlay_v3 | 324 | Origin × destination city blend rules |
| Meal_Class_Master_v3 | 131 | Meal classes (118 primary-eligible, 13 addon-only) |
| Meal_Class_Overlap_Resolution | 13 | Classes excluded from primary weekly slots |
| Class_Dish_Options_v3 | ~900+ | Dishes by meal_class_code |
| Addon_Component_Class_Master | 24 | Member-specific addon class codes |
| Addon_Dish_Options | 143 | Dishes by addon_class_code |
| Cohort_Matrix_v3 | 2953 | State × city tier × persona cohort rows |
| Weekly_Class_Plan_v3 | 20,665 | 7-day class plan per cohort_id |
| Household_Addon_Component_Plan | 7993 | Addon schedule per cohort/day/slot/segment |
| NonVeg_Logic_v3 | 36 | State-level non-veg cadence |
| QA_Checks_v3 | — | QA metadata |
| Data_Dictionary_v3 | — | Schema guide |

---

## 1. Naming Convention — Version Registry (CRITICAL: Collision Resolution)

### The Problem

The existing codebase uses `'v1'` and `'v2'` as inline values for `re_version` inside `generate-daily-plan/index.ts`:
```typescript
const reVersion: 'v1' | 'v2' = inferredPrefs ? 'v2' : 'v1';
```
These refer to the **legacy dish-scoring engine** (dish-direct, no class layer).

The new household/class-first system defines internal sub-versions RE_V1–RE_V4 in the module docs, meaning something entirely different.

### Resolution — Final Naming Convention

| Identifier | Used Where | Meaning |
|-----------|-----------|---------|
| `legacy_dish_scoring_v1` | RE version registry only | Existing generate-daily-plan dish-direct scoring (no class layer), inferred_prefs=false |
| `legacy_dish_scoring_v2` | RE version registry only | Existing generate-daily-plan + inferred_prefs overlay, inferred_prefs=true |
| `classfirst_v1` | RE version registry + assignment column | New household/class-first cold-start engine (this build series, BUILD-01–04) |
| `classfirst_v2` | RE version registry | Future: history + feedback adaptation |
| `classfirst_v3` | RE version registry | Future: cluster-seeded |
| `classfirst_v4` | RE version registry | Future: full collaborative filtering |

**Table/column names:**

| Table | Column | Type | Notes |
|-------|--------|------|-------|
| `re_engine_versions` | `version_code` | TEXT PK | Values from table above (e.g. `classfirst_v1`) |
| `re_engine_versions` | `version_label` | TEXT | Human name (e.g. "Class-first cold-start V1") |
| `re_engine_versions` | `is_active` | BOOLEAN | Whether new signups can be assigned |
| `re_engine_versions` | `description` | TEXT | Brief description |
| `re_engine_versions` | `created_at` | TIMESTAMPTZ | |
| `re_user_engine_assignments` | `profile_id` | UUID FK → profiles | |
| `re_user_engine_assignments` | `version_code` | TEXT FK → re_engine_versions | |
| `re_user_engine_assignments` | `assigned_at` | TIMESTAMPTZ | |
| `re_user_engine_assignments` | `assigned_by` | TEXT | 'onboarding' \| 'admin_override' \| 'experiment' |

**profiles table additive column (no rename, no alter):**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS re_engine_version TEXT
  REFERENCES re_engine_versions(version_code)
  DEFAULT NULL;
```
NULL = user is on legacy engine. `'classfirst_v1'` = assigned to new engine. The resolver checks this column.

**Legacy code annotation (comment-only, no code change):**
In `foofoo/supabase/functions/generate-daily-plan/index.ts`, the line:
```typescript
const reVersion: 'v1' | 'v2' = inferredPrefs ? 'v2' : 'v1';
```
should have a comment added (in BUILD-08, not now):
```typescript
// Legacy dish-scoring variant. 'v1'='legacy_dish_scoring_v1', 'v2'='legacy_dish_scoring_v2'
// in re_engine_versions table. New users use classfirst_v1 engine instead.
```

---

## 2. Tables to Create

### 2A. New RE Seed Tables (prefix: `re_`)

All are additive new tables. None modifies or touches existing MVP tables.

| # | Table Name | PK | Source Sheet | Row Count |
|---|-----------|-----|-------------|-----------|
| 1 | `re_states` | `state_id` | State_Profile_v3 | 36 |
| 2 | `re_city_migration_overlays` | `overlay_id` (generated) | City_Migration_Overlay_v3 | 324 |
| 3 | `re_main_cohorts` | `main_cohort_id` | Main_Cohort_Hierarchy | 5 |
| 4 | `re_personas` | `persona_id` | Persona_Master_v3 | 41 |
| 5 | `re_subcohorts` | `sub_cohort_id` | Subcohort_Routing | 41 |
| 6 | `re_routing_rules` | `rule_id` | Routing_Rules_v3 | 8 |
| 7 | `re_meal_classes` | `meal_class_code` | Meal_Class_Master_v3 | 131 |
| 8 | `re_meal_class_overlap_rules` | `overlap_id` (generated) | Meal_Class_Overlap_Resolution | 13 |
| 9 | `re_class_dish_options` | `dish_option_id` | Class_Dish_Options_v3 | ~900+ |
| 10 | `re_addon_classes` | `addon_class_code` | Addon_Component_Class_Master | 24 |
| 11 | `re_addon_dish_options` | `addon_dish_option_id` | Addon_Dish_Options | 143 |
| 12 | `re_cohorts` | `cohort_id` | Cohort_Matrix_v3 | 2,953 |
| 13 | `re_weekly_class_plans` | `plan_day_id` | Weekly_Class_Plan_v3 | 20,665 |
| 14 | `re_household_addon_plans` | `addon_plan_id` | Household_Addon_Component_Plan | 7,993 |
| 15 | `re_nonveg_logic` | `state_id` | NonVeg_Logic_v3 | 36 |

### 2B. New RE Version Registry Tables (prefix: `re_`)

| Table Name | Purpose |
|-----------|---------|
| `re_engine_versions` | Registry of all engine version codes |
| `re_user_engine_assignments` | Audit log: which user was assigned which version and when |

### 2C. New Core Profile Extension Table (NO `re_` prefix — founder decision Q6)

| Table Name | Purpose | Note |
|-----------|---------|------|
| `household_members` | One row per household member with segment, age_band | Core profile concept, not RE-namespaced |

### 2D. Additive Column on Existing `profiles` Table

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `re_engine_version` | TEXT NULL FK → re_engine_versions | NULL | Which RE engine is assigned; NULL = legacy |

**No other existing tables are modified.** `planner`, `user_diet_rules`, `user_category_preferences` are untouched.

---

## 3. Full Table Schemas

### `re_states`
```sql
CREATE TABLE re_states (
  state_id              TEXT PRIMARY KEY,           -- S01, S02, ... S36
  state_ut              TEXT NOT NULL UNIQUE,        -- full name e.g. "Madhya Pradesh"
  region_archetype      TEXT,
  tier1_or_metro_cities TEXT,
  tier2_cities          TEXT,
  nonveg_intensity      TEXT,
  primary_staple_base   TEXT,
  breakfast_class_pool  TEXT,  -- pipe-separated meal_class_codes
  weekday_lunch_class_pool  TEXT,
  weekday_dinner_class_pool TEXT,
  weekend_special_class_pool TEXT,
  snack_class_pool      TEXT,
  nonveg_class_pool     TEXT,
  behavioral_notes      TEXT,
  planning_note         TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### `re_city_migration_overlays`
```sql
CREATE TABLE re_city_migration_overlays (
  overlay_id                   SERIAL PRIMARY KEY,
  origin_state_ut              TEXT NOT NULL,        -- full name, matches re_states.state_ut
  destination_group_code       TEXT NOT NULL,        -- e.g. MUMBAI_PUNE, DELHI_NCR
  destination_group_name       TEXT,
  home_state_signature_weight  NUMERIC(4,2),         -- e.g. 0.55
  current_city_lifestyle_weight NUMERIC(4,2),
  national_modern_weight       NUMERIC(4,2),
  overlay_meal_classes         TEXT,                 -- pipe-separated
  planning_rule                TEXT,
  v3_usage_note                TEXT,
  created_at                   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (origin_state_ut, destination_group_code)
);
```

### `re_main_cohorts`
```sql
CREATE TABLE re_main_cohorts (
  main_cohort_id          TEXT PRIMARY KEY,   -- MC1 ... MC5
  main_cohort_label       TEXT NOT NULL,
  user_understands_as     TEXT,
  subcohort_screen_copy   TEXT,
  routing_notes           TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);
```

### `re_personas`
```sql
CREATE TABLE re_personas (
  persona_id                 TEXT PRIMARY KEY,   -- P01 ... P41
  persona_name               TEXT NOT NULL,
  main_cohort_id             TEXT REFERENCES re_main_cohorts(main_cohort_id),
  sub_cohort_id              TEXT,               -- FK added after re_subcohorts created
  sub_cohort_label           TEXT,
  age_band                   TEXT,
  household_stage            TEXT,
  lifecycle_health           TEXT,
  cook_dependency            TEXT,
  time_pressure              TEXT,
  nonveg_mode                TEXT,
  revealed_behavior_summary  TEXT,
  bf_boost_classes           TEXT,              -- pipe-separated
  ld_boost_classes           TEXT,
  sn_boost_classes           TEXT,
  dn_boost_classes           TEXT,
  onboarding_branch_trigger  TEXT,
  can_be_overlay             BOOLEAN DEFAULT FALSE,
  dependent_addon_default    TEXT,
  health_overlay_default     BOOLEAN DEFAULT FALSE,
  cook_overlay_default       BOOLEAN DEFAULT FALSE,
  recommended_onboarding_path TEXT,
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);
```

### `re_subcohorts`
```sql
CREATE TABLE re_subcohorts (
  sub_cohort_id         TEXT PRIMARY KEY,        -- SC1A, SC1B, ...
  sub_cohort_label      TEXT NOT NULL,
  main_cohort_id        TEXT REFERENCES re_main_cohorts(main_cohort_id),
  maps_to_persona_id    TEXT REFERENCES re_personas(persona_id),
  persona_name          TEXT,
  show_as_chip_text     TEXT,
  ask_next              TEXT,
  do_not_show_in_first_screen BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### `re_routing_rules`
```sql
CREATE TABLE re_routing_rules (
  rule_id            TEXT PRIMARY KEY,   -- R01 ... R08
  shown_when         TEXT NOT NULL,
  input_type         TEXT,
  user_prompt_summary TEXT,
  why_it_matters     TEXT,
  maps_to_fields     TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
```

### `re_meal_classes`
```sql
CREATE TABLE re_meal_classes (
  meal_class_code              TEXT PRIMARY KEY,
  slot_group                   TEXT NOT NULL,        -- Breakfast / Lunch / Dinner / Snack
  class_name                   TEXT NOT NULL,
  class_category               TEXT,                 -- light_repeatable, heavy_home, etc.
  diet_type                    TEXT,                 -- veg / nonveg / mixed
  weekday_fit                  INTEGER,              -- 1-5 scale
  weekend_fit                  INTEGER,
  cook_complexity              TEXT,                 -- low / medium / high
  heaviness                    TEXT,
  primary_base                 TEXT,
  cooking_methods              TEXT,
  texture                      TEXT,
  richness                     TEXT,
  example_dishes               TEXT,
  region_relevance             TEXT,
  behavioral_meaning           TEXT,
  food_dna_tags                TEXT,                 -- pipe-separated tags
  class_family_code            TEXT,
  planning_role                TEXT,                 -- MAIN_PRIMARY / ADDON_ONLY_NOT_PRIMARY / COMBO_TEMPLATE_NOT_PRIMARY
  allowed_as_weekly_primary    BOOLEAN NOT NULL,     -- from allowed_as_weekly_primary_v3
  addon_target_segment         TEXT,                 -- null if not addon-only
  overlap_resolution           TEXT,
  db_use_note                  TEXT,
  created_at                   TIMESTAMPTZ DEFAULT NOW()
);

-- Constraint: Class in weekly plan primary slot must be primary-eligible
-- Enforced via import validation AND advisory check in resolver
CREATE INDEX idx_re_meal_classes_primary ON re_meal_classes(allowed_as_weekly_primary);
CREATE INDEX idx_re_meal_classes_slot ON re_meal_classes(slot_group);
```

### `re_meal_class_overlap_rules`
```sql
CREATE TABLE re_meal_class_overlap_rules (
  overlap_id       SERIAL PRIMARY KEY,
  meal_class_code  TEXT REFERENCES re_meal_classes(meal_class_code),
  reason           TEXT,
  excluded_from    TEXT,
  action_note      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### `re_class_dish_options`
```sql
CREATE TABLE re_class_dish_options (
  dish_option_id   TEXT PRIMARY KEY,              -- e.g. BF_STEAMED_FERMENTED_LIGHT_D01
  meal_class_code  TEXT NOT NULL REFERENCES re_meal_classes(meal_class_code),
  meal_class_name  TEXT,
  dish_name        TEXT NOT NULL,
  diet_type        TEXT,
  region_relevance TEXT,
  slot_group       TEXT,
  usage_note       TEXT,
  source_logic     TEXT,
  class_use_scope  TEXT,                          -- main_class_dish_pool
  join_rule        TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_re_class_dish_options_class ON re_class_dish_options(meal_class_code);
```

### `re_addon_classes`
```sql
CREATE TABLE re_addon_classes (
  addon_class_code    TEXT PRIMARY KEY,            -- e.g. ADD_INFANT_6M_SOFT_PORRIDGE
  slot_group          TEXT,
  target_member_segment TEXT NOT NULL,             -- baby_6_18m, toddler, elderly, etc.
  addon_class_name    TEXT NOT NULL,
  diet_type           TEXT,
  food_dna_role       TEXT,
  example_dishes      TEXT,
  planning_note       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### `re_addon_dish_options`
```sql
CREATE TABLE re_addon_dish_options (
  addon_dish_option_id    TEXT PRIMARY KEY,
  addon_class_code        TEXT NOT NULL REFERENCES re_addon_classes(addon_class_code),
  addon_class_name        TEXT,
  dish_or_component_name  TEXT NOT NULL,
  target_member_segment   TEXT,
  slot_group              TEXT,
  diet_type               TEXT,
  usage_note              TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_re_addon_dish_options_class ON re_addon_dish_options(addon_class_code);
```

### `re_cohorts`
```sql
CREATE TABLE re_cohorts (
  cohort_id                    TEXT PRIMARY KEY,    -- e.g. S13_T1_P02
  state_id                     TEXT REFERENCES re_states(state_id),
  state_ut                     TEXT,
  city_tier_code               TEXT,                -- T1, T2, T3
  city_tier                    TEXT,
  representative_cities        TEXT,
  main_cohort_id               TEXT REFERENCES re_main_cohorts(main_cohort_id),
  sub_cohort_id                TEXT REFERENCES re_subcohorts(sub_cohort_id),
  sub_cohort_label             TEXT,
  persona_id                   TEXT REFERENCES re_personas(persona_id),
  persona_name                 TEXT,
  -- persona fields (denormalized for query performance)
  age_band                     TEXT,
  household_stage              TEXT,
  lifecycle_health             TEXT,
  cook_dependency              TEXT,
  time_pressure                TEXT,
  nonveg_mode                  TEXT,
  nonveg_meals_per_week_default INTEGER,
  egg_meals_per_week_default   INTEGER,
  -- class mix pools (pipe-separated)
  weekday_breakfast_class_mix  TEXT,
  weekday_lunch_class_mix      TEXT,
  weekday_snack_class_mix      TEXT,
  weekday_dinner_class_mix     TEXT,
  weekend_breakfast_class_mix  TEXT,
  weekend_lunch_class_mix      TEXT,
  weekend_snack_class_mix      TEXT,
  weekend_dinner_class_mix     TEXT,
  -- addon flags
  dependent_addon_required     BOOLEAN DEFAULT FALSE,
  dependent_member_segments    TEXT,               -- pipe-separated
  health_overlay_default       BOOLEAN DEFAULT FALSE,
  cook_overlay_default         BOOLEAN DEFAULT FALSE,
  household_addon_logic        TEXT,
  state_signature_notes        TEXT,
  main_meal_vs_addon_rule      TEXT,
  planning_confidence          TEXT,
  cohort_display_name          TEXT,
  created_at                   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_re_cohorts_state ON re_cohorts(state_id);
CREATE INDEX idx_re_cohorts_persona ON re_cohorts(persona_id);
CREATE INDEX idx_re_cohorts_city_tier ON re_cohorts(city_tier_code);
```

### `re_weekly_class_plans`
```sql
CREATE TABLE re_weekly_class_plans (
  plan_day_id                TEXT PRIMARY KEY,      -- e.g. S13_T1_P02_Mon
  cohort_id                  TEXT NOT NULL REFERENCES re_cohorts(cohort_id),
  persona_id                 TEXT REFERENCES re_personas(persona_id),
  day_of_week                TEXT NOT NULL,         -- Mon/Tue/Wed/Thu/Fri/Sat/Sun
  weekday_weekend            TEXT NOT NULL,         -- Weekday / Weekend
  -- breakfast
  breakfast_primary_class    TEXT REFERENCES re_meal_classes(meal_class_code),
  breakfast_secondary_class  TEXT REFERENCES re_meal_classes(meal_class_code),
  breakfast_tertiary_class   TEXT REFERENCES re_meal_classes(meal_class_code),
  breakfast_addon_class_code TEXT,                  -- 'none' or addon_class_code
  -- lunch
  lunch_primary_class        TEXT REFERENCES re_meal_classes(meal_class_code),
  lunch_secondary_class      TEXT REFERENCES re_meal_classes(meal_class_code),
  lunch_tertiary_class       TEXT REFERENCES re_meal_classes(meal_class_code),
  lunch_addon_class_code     TEXT,
  -- snack
  snack_primary_class        TEXT REFERENCES re_meal_classes(meal_class_code),
  snack_secondary_class      TEXT REFERENCES re_meal_classes(meal_class_code),
  snack_tertiary_class       TEXT REFERENCES re_meal_classes(meal_class_code),
  snack_addon_class_code     TEXT,
  -- dinner
  dinner_primary_class       TEXT REFERENCES re_meal_classes(meal_class_code),
  dinner_secondary_class     TEXT REFERENCES re_meal_classes(meal_class_code),
  dinner_tertiary_class      TEXT REFERENCES re_meal_classes(meal_class_code),
  dinner_addon_class_code    TEXT,
  scheduled_nonveg_slot      TEXT,
  qa_mapping_status          TEXT,
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_re_weekly_plans_cohort ON re_weekly_class_plans(cohort_id);
CREATE INDEX idx_re_weekly_plans_day ON re_weekly_class_plans(day_of_week);
```

### `re_household_addon_plans`
```sql
CREATE TABLE re_household_addon_plans (
  addon_plan_id              TEXT PRIMARY KEY,
  cohort_id                  TEXT NOT NULL REFERENCES re_cohorts(cohort_id),
  state_ut                   TEXT,
  city_tier                  TEXT,
  persona_id                 TEXT REFERENCES re_personas(persona_id),
  persona_name               TEXT,
  day_of_week                TEXT NOT NULL,
  meal_slot                  TEXT NOT NULL,         -- Breakfast/Lunch/Snack/Dinner
  target_member_segment      TEXT NOT NULL,
  addon_class_code           TEXT NOT NULL REFERENCES re_addon_classes(addon_class_code),
  addon_class_name           TEXT,
  addon_examples             TEXT,
  attached_to_main_class_code TEXT,
  component_not_replacement_note TEXT,
  cooking_logic              TEXT,
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_re_addon_plans_cohort ON re_household_addon_plans(cohort_id);
CREATE INDEX idx_re_addon_plans_segment ON re_household_addon_plans(target_member_segment);
```

### `re_nonveg_logic`
```sql
CREATE TABLE re_nonveg_logic (
  state_id                    TEXT PRIMARY KEY REFERENCES re_states(state_id),
  state_ut                    TEXT,
  nonveg_intensity            TEXT,
  default_nonveg_per_week     INTEGER,
  default_egg_per_week        INTEGER,
  preferred_nonveg_classes    TEXT,               -- pipe-separated
  planning_notes              TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);
```

### `re_engine_versions`
```sql
CREATE TABLE re_engine_versions (
  version_code   TEXT PRIMARY KEY,
  version_label  TEXT NOT NULL,
  description    TEXT,
  is_active      BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Seed values inserted with migration:
-- ('legacy_dish_scoring_v1', 'Legacy dish-scoring V1', 'Existing generate-daily-plan, no class layer, inferred_prefs=false', false)
-- ('legacy_dish_scoring_v2', 'Legacy dish-scoring V2', 'Existing generate-daily-plan + inferred_prefs overlay', false)
-- ('classfirst_v1', 'Class-first cold-start V1', 'New household/class-first rule-based engine; BUILD-01 to BUILD-04', true)
-- ('classfirst_v2', 'Class-first feedback V2', 'History + feedback adaptation; future build', false)
-- ('classfirst_v3', 'Class-first cluster V3', 'Cluster-seeded; future build', false)
-- ('classfirst_v4', 'Class-first collaborative V4', 'Full collaborative filtering; future build', false)
```

### `re_user_engine_assignments`
```sql
CREATE TABLE re_user_engine_assignments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  version_code TEXT NOT NULL REFERENCES re_engine_versions(version_code),
  assigned_at  TIMESTAMPTZ DEFAULT NOW(),
  assigned_by  TEXT NOT NULL    -- 'onboarding' | 'admin_override' | 'experiment'
);

CREATE INDEX idx_re_user_assignments_profile ON re_user_engine_assignments(profile_id);
```

### `household_members`
```sql
CREATE TABLE household_members (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_segment   TEXT NOT NULL,  -- infant_0_6m, baby_6_18m, toddler, school_child, teen,
                                   -- elderly, pregnant_member, postpartum_member,
                                   -- diabetic_member, recovery_member, fitness_member
  age_band         TEXT,           -- e.g. '0-6m', '6-18m', '2-5', '6-12', '13-18', '60+'
  display_name     TEXT,           -- optional label user gives (e.g. "Amma", "Baby")
  is_primary_plan_receiver BOOLEAN DEFAULT FALSE,  -- is this member the household plan driver
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_household_members_profile ON household_members(profile_id);
```

### Additive column on `profiles`
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS re_engine_version TEXT
  REFERENCES re_engine_versions(version_code)
  DEFAULT NULL;
```

---

## 4. home_state Format Finding (Q9)

### Finding

The workbook `State_Profile_v3` uses **full state/UT names** (e.g. `"Madhya Pradesh"`, `"Maharashtra"`, `"Andaman & Nicobar Islands"`). State IDs (`S01`–`S36`) are internal keys only; they do not appear in user-facing fields.

The existing `profiles.home_state` column is `TEXT` (free text, per `20260519000001_sprint1_sprint2_schema.sql`). Current onboarding step-1 uses a modal picker from the `INDIAN_STATES` list in the app, which stores values in an unknown format (full name or abbreviation — needs code check in `step-1.tsx` before BUILD-02).

### Normalization Proposal

1. **`re_states.state_ut`** stores the canonical full name (e.g. `"Madhya Pradesh"`). This is the join key from `profiles.home_state` → `re_states`.
2. **No change to `profiles.home_state` column.** It remains TEXT. No migration to a FK column (that would break existing reads).
3. At query time: `JOIN re_states ON LOWER(TRIM(profiles.home_state)) = LOWER(re_states.state_ut)`. The resolver normalizes whitespace and case; it does not alter the stored value.
4. **BUILD-02 deliverable:** When the onboarding step-1 writes `home_state`, it must write the canonical full name from `re_states.state_ut` (the picker options are seeded from this table). This ensures all new signups match without normalization overhead.
5. **Existing profiles:** A background normalization view (not a migration) can surface mis-matches. No existing data is modified.

> **Open action before BUILD-02:** Confirm what exact string format the existing onboarding step-1.tsx `INDIAN_STATES` list uses. If it's abbreviations (e.g. "MP"), a mapping table will be needed.

---

## 5. Seed Import Order

Per DOC-22 `Import_Order` sheet (canonical):

| Step | RE Table | Source Sheet |
|------|---------|-------------|
| 1 | `re_states` | State_Profile_v3 |
| 2 | `re_city_migration_overlays` | City_Migration_Overlay_v3 |
| 3 | `re_main_cohorts` | Main_Cohort_Hierarchy |
| 4 | `re_personas` | Persona_Master_v3 |
| 5 | `re_subcohorts` | Subcohort_Routing |
| 6 | `re_routing_rules` | Routing_Rules_v3 |
| 7 | `re_meal_classes` | Meal_Class_Master_v3 |
| 8 | `re_meal_class_overlap_rules` | Meal_Class_Overlap_Resolution |
| 9 | `re_class_dish_options` | Class_Dish_Options_v3 |
| 10 | `re_addon_classes` | Addon_Component_Class_Master |
| 11 | `re_addon_dish_options` | Addon_Dish_Options |
| 12 | `re_cohorts` | Cohort_Matrix_v3 |
| 13 | `re_weekly_class_plans` | Weekly_Class_Plan_v3 |
| 14 | `re_household_addon_plans` | Household_Addon_Component_Plan |
| 15 | `re_nonveg_logic` | NonVeg_Logic_v3 |
| 16 | `re_engine_versions` | Hardcoded seed values |
| 17+ | `profiles.re_engine_version` | No import — column added, stays NULL |

The seed script must be **idempotent**: use `INSERT ... ON CONFLICT DO NOTHING` or `ON CONFLICT ... DO UPDATE SET` for stable PK rows. The `Cohort_Matrix_v3` (2,953 rows) and `Weekly_Class_Plan_v3` (20,665 rows) are large; the import script must batch in 500-row transactions.

---

## 6. Canonical ID Preservation

IDs come directly from the workbook. No invented IDs.

| ID Type | Source Column | Example | Table |
|---------|-------------|---------|-------|
| `state_id` | State_Profile_v3.state_id | S13 | re_states |
| `main_cohort_id` | Main_Cohort_Hierarchy.main_cohort_id | MC3 | re_main_cohorts |
| `sub_cohort_id` | Subcohort_Routing.sub_cohort_id | SC3A | re_subcohorts |
| `persona_id` | Persona_Master_v3.persona_id | P10 | re_personas |
| `meal_class_code` | Meal_Class_Master_v3.meal_class_code | BF_POHA_CHIVDA_LIGHT | re_meal_classes |
| `dish_option_id` | Class_Dish_Options_v3.dish_option_id | BF_POHA_CHIVDA_LIGHT_D01 | re_class_dish_options |
| `addon_class_code` | Addon_Component_Class_Master.addon_class_code | ADD_INFANT_6M_SOFT_PORRIDGE | re_addon_classes |
| `addon_dish_option_id` | Addon_Dish_Options.addon_dish_option_id | ADD_INFANT_6M_SOFT_PORRIDGE_D01 | re_addon_dish_options |
| `cohort_id` | Cohort_Matrix_v3.cohort_id | S13_T1_P02 | re_cohorts |
| `plan_day_id` | Weekly_Class_Plan_v3.plan_day_id | S13_T1_P02_Mon | re_weekly_class_plans |

The import script reads these columns verbatim and does not transform or abbreviate them.

---

## 7. Class/Dish Mismatch Prevention

### Constraint Design

1. **FK constraint at load time:** `re_class_dish_options.meal_class_code` is a FK → `re_meal_classes.meal_class_code`. Any dish imported with an invalid class code fails at the DB level.

2. **Addon FK constraint:** `re_addon_dish_options.addon_class_code` FK → `re_addon_classes.addon_class_code`. Addon dishes cannot be joined to main meal classes.

3. **Weekly plan FK constraints:** All `breakfast_primary_class`, `_secondary_class`, `_tertiary_class`, and equivalent columns in `re_weekly_class_plans` are FK → `re_meal_classes(meal_class_code)`. This prevents an addon-only class from ever being stored in a primary weekly slot at the DB level.

4. **`allowed_as_weekly_primary` guard (import validation):** The seed script additionally validates that no class with `allowed_as_weekly_primary = FALSE` appears in a primary/secondary/tertiary weekly plan slot. This catches any mismatch before data reaches the DB FK check.

5. **Resolver rule (BUILD-04):** `WeeklyClassPlanService` filters `re_meal_classes` by `allowed_as_weekly_primary = TRUE` before selecting classes for any slot. This is the runtime guard.

### The 13 Addon-Only Classes

These are explicitly marked `planning_role = ADDON_ONLY_NOT_PRIMARY` in the workbook:
`BF_KID_TIFFIN`, `BF_INFANT_6M_SOFT`, `BF_LACTATION_MOTHER`, `LD_CHILD_MILD_PLATE`, `LD_ELDERLY_SOFT_DIGESTIVE`, `LD_TEEN_HIGH_CALORIE`, `LD_PREGNANCY_BALANCED`, `LD_LACTATION_POSTPARTUM`, `LD_RECOVERY_SOFT_PROTEIN`, `SN_KIDS_TIFFIN_SNACK`, `DN_EARLY_ELDERLY_DINNER`, `DN_CHILD_FRIENDLY_DINNER`, plus `DN_FAMILY_COMFORT_MEAL` (marked `COMBO_TEMPLATE_NOT_PRIMARY`).

These 13 classes are stored in `re_meal_classes` with `allowed_as_weekly_primary = FALSE` and also have entries in `re_meal_class_overlap_rules` documenting why they are excluded.

---

## 8. Add-on-Only Class Governance

- `re_meal_classes.allowed_as_weekly_primary = FALSE` is the authoritative DB flag.
- `re_meal_classes.planning_role = 'ADDON_ONLY_NOT_PRIMARY'` provides the reason.
- `re_meal_classes.addon_target_segment` documents which member segment the class is for.
- `re_meal_class_overlap_rules` stores the narrative of why each class was moved out of the primary pool (from the Meal_Class_Overlap_Resolution sheet).
- The seed script refuses to import any row into `re_weekly_class_plans` primary/secondary/tertiary columns where the class has `allowed_as_weekly_primary = FALSE`.

---

## 9. Validation Rules (BUILD-01 Scope — Seed Data Integrity)

These are the tests to be written as part of BUILD-01. No plan generation tests (those are BUILD-04).

| Test ID | Rule | Implementation |
|---------|------|---------------|
| VAL-01 | Every `dish_option_id` in `re_class_dish_options` references a valid `meal_class_code` | FK satisfied; also a query check |
| VAL-02 | Every `meal_class_code` in `re_class_dish_options` exists in `re_meal_classes` | Covered by FK |
| VAL-03 | No `re_class_dish_options` row references a class with `allowed_as_weekly_primary = FALSE` — i.e., addon-only classes must not have entries in `re_class_dish_options` | Separate from addon dish pool |
| VAL-04 | Every `addon_dish_option_id` references a valid `addon_class_code` | FK + query check |
| VAL-05 | No `addon_class_code` appears in `re_class_dish_options` (addon dishes never cross into primary dish pool) | Query check |
| VAL-06 | Every `re_weekly_class_plans` primary/secondary/tertiary class code refers to a class with `allowed_as_weekly_primary = TRUE` | Query check across 20,665 rows |
| VAL-07 | Every `cohort_id` in `re_weekly_class_plans` exists in `re_cohorts` | FK |
| VAL-08 | `re_cohorts` row count = 2,953; `re_weekly_class_plans` row count = 20,665 (7 × 2,953 = 20,671, allow for any sparse gaps) | Row count check |
| VAL-09 | All 36 state IDs in `re_states` | Count check |
| VAL-10 | All 41 persona IDs in `re_personas` and `re_subcohorts` | Count check |
| VAL-11 | All 5 main cohort IDs in `re_main_cohorts` | Count check |
| VAL-12 | Meal class count = 131 total, 118 `allowed_as_weekly_primary = TRUE`, 13 FALSE | Count check |
| VAL-13 | Seed import is idempotent: run twice, row counts unchanged | Run import script twice |
| VAL-14 | `re_engine_versions` has exactly 6 rows (2 legacy + 4 classfirst) | Count check |
| VAL-15 | `profiles.re_engine_version` column exists and accepts NULL | Schema check |

---

## 10. Files Expected to Change

### New files (to be created in BUILD-01 implementation)

```
Meal_Planning_RE_Engine/
└── 00_Implementation/
    ├── migrations/
    │   ├── up/
    │   │   └── 20260614_001_re_seed_tables.sql   ← All CREATE TABLE + ALTER TABLE above
    │   └── down/
    │       └── 20260614_001_re_seed_tables_down.sql ← DROP TABLE in reverse order
    ├── seeds/
    │   └── import_workbook.py                     ← Python script: reads xlsx → inserts SQL
    └── __tests__/
        └── build01/
            └── seed_validation.test.ts             ← VAL-01 through VAL-15
```

### Existing files (additive change only)

| File | Change |
|------|--------|
| `foofoo/supabase/migrations/` | New migration file added (does NOT alter existing files) |
| `SYSTEM_STATE.md` | Schema Registry updated with SCHEMA-RE-001 |
| `IMPLEMENTATION_BUILD_TRACKER.md` | BUILD-01 marked ✅ after tests pass |

### Files NOT changed

| File | Reason |
|------|--------|
| `foofoo/supabase/functions/generate-daily-plan/index.ts` | Legacy engine untouched |
| `foofoo/supabase/functions/generate-daily-plan/scoring.ts` | Legacy engine untouched |
| `foofoo/supabase/migrations/20260519000001_sprint1_sprint2_schema.sql` | Never modify existing migrations |
| `planner` table | Q3 decision: no re_version stamp on existing tables |
| `user_diet_rules` table | No changes needed in BUILD-01 |

---

## 11. Rollback Plan (Down Migration)

The down migration drops tables in reverse creation order (children before parents):

```sql
-- 20260614_001_re_seed_tables_down.sql
ALTER TABLE profiles DROP COLUMN IF EXISTS re_engine_version;

DROP TABLE IF EXISTS re_user_engine_assignments;
DROP TABLE IF EXISTS re_engine_versions;
DROP TABLE IF EXISTS household_members;
DROP TABLE IF EXISTS re_household_addon_plans;
DROP TABLE IF EXISTS re_weekly_class_plans;
DROP TABLE IF EXISTS re_cohorts;
DROP TABLE IF EXISTS re_nonveg_logic;
DROP TABLE IF EXISTS re_household_addon_plans;
DROP TABLE IF EXISTS re_addon_dish_options;
DROP TABLE IF EXISTS re_addon_classes;
DROP TABLE IF EXISTS re_class_dish_options;
DROP TABLE IF EXISTS re_meal_class_overlap_rules;
DROP TABLE IF EXISTS re_meal_classes;
DROP TABLE IF EXISTS re_routing_rules;
DROP TABLE IF EXISTS re_subcohorts;
DROP TABLE IF EXISTS re_personas;
DROP TABLE IF EXISTS re_main_cohorts;
DROP TABLE IF EXISTS re_city_migration_overlays;
DROP TABLE IF EXISTS re_states;
```

The `planner`, `profiles`, `user_diet_rules`, and all existing tables are **not dropped** by the down migration because they were not created by this migration. The down migration only reverses what the up migration creates.

---

## 12. Deviations from RE_V2_Summary §2

> Note: `RE_V2_Summary.md` is absent from `apverse-labs-RE` (logged as missing in BUILD-00A). This plan was built from DOC-22, the workbook `DB_Implementation_v3` sheet, and the canonical table list in Section 2A above.

| Deviation | Reason |
|-----------|--------|
| `household_members` uses no `re_` prefix | Founder decision Q6: this is a core profile concept, not RE-specific |
| `re_city_migration_overlays` uses a `SERIAL overlay_id` PK instead of composite key | Composite keys (origin_state + destination_group_code) are harder to reference as FKs; unique constraint added instead |
| Legacy engine versions (`legacy_dish_scoring_v1/v2`) included in `re_engine_versions` | Naming collision resolution — needed to give legacy engines unambiguous identifiers in the registry |
| `profiles.re_engine_version` added as additive nullable column (not a separate table) | Allows fast single-table lookup; `re_user_engine_assignments` retains the full audit history |

---

## 13. Open Questions Before Implementation Can Begin

| # | Question | Blocking? |
|---|----------|----------|
| OQ-1 | What string format does `INDIAN_STATES` in `step-1.tsx` use? Full name ("Madhya Pradesh") or code ("MP")? | Yes — affects whether normalization step needed in seed join |
| OQ-2 | Should `re_cohorts` be materialized as a full table (2,953 rows) or derived at query time from state × city_tier × persona? The workbook provides it pre-computed; storing it is faster but large. | No — plan assumes full table as per workbook; can be revisited |
| OQ-3 | `re_weekly_class_plans` is 20,665 rows of pre-computed plan data. Should this be stored in Supabase or computed at runtime from `re_cohorts`? Storing it is direct; computing is more flexible. | No — plan assumes stored (matches workbook structure) |
| OQ-4 | Supabase project to apply to: is there a dedicated `apverse-labs-RE` branch on Supabase, or do migrations go to the same project as the existing app? | Yes — needed before running migrations |

---

## 14. SYSTEM_STATE.md Schema Entry (to register before applying migration)

When implementation is approved, this entry must be added to `SYSTEM_STATE.md` before the migration is applied:

```
| SCHEMA-RE-001 | 20260614_001_re_seed_tables | RE seed tables (19 new tables + profiles.re_engine_version column) | apverse-labs-RE | pending |
```

---

## Confirmation

- ✅ No migrations created
- ✅ No code written
- ✅ No tables created
- ✅ No commits to `main` or `develop`
- ✅ Plan only — awaiting founder approval before BUILD-01 implementation begins
