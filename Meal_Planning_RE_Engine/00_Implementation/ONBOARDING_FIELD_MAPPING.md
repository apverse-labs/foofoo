# RE Onboarding — Screen → DB Field Mapping

> Reference document for BUILD-02. No code is written here.
> All table names and column names are from the BUILD-01 plan.
> Branch: `apverse-labs-RE`
> Date: 2026-06-13

---

## Context

The new RE onboarding is a **parallel flow** for new signups only (founder Q2). Existing users remain on the legacy engine. The 8 routing rules in `re_routing_rules` (R01–R08 from `Routing_Rules_v3`) define the RE onboarding logic.

The existing legacy onboarding has 7 steps (step-1 through step-7). The RE onboarding replaces this flow for new signups at a feature flag level — it does **not** delete or alter the existing steps.

**Existing onboarding steps (legacy, for reference):**

| Step | Question | Legacy Table/Column |
|------|----------|-------------------|
| 1 | Name, username, city, home state | `profiles.full_name`, `profiles.username`, `profiles.current_city`, `profiles.home_state` |
| 2 | Food preference (veg/non-veg/egg/vegan/jain) | `user_diet_rules.food_pref`, `profiles.food_pref` |
| 3 | Allergen search | `user_diet_rules.excluded_ingredients` (INTEGER[]) |
| 4 | Cuisine buckets (F/O/N) | `user_category_preferences` (category_type='cuisine') |
| 5 | Breakfast dish buckets (F/O/N) | `user_category_preferences` (category_type='meal_item') |
| 6 | Lunch+dinner dish buckets (F/O/N) | `user_category_preferences` (category_type='meal_item') |
| 7 | Role (cook/instruct) + notifications | `profiles.role`, `profiles.notifications_enabled` |

---

## home_state Format Confirmed

`INDIAN_STATES` in `src/utils/indian-states.ts` uses **full names** (e.g. `"Madhya Pradesh"`, `"Andaman and Nicobar Islands"`). This mostly matches `re_states.state_ut` in the workbook with minor spelling differences in Union Territories (e.g. app says `"Andaman and Nicobar Islands"`, workbook says `"Andaman & Nicobar Islands"`). A normalization lookup must be applied at join time.

**BUILD-02 action:** The RE onboarding step-1 (or merged state picker) must use values seeded from `re_states.state_ut` directly, so new signups write the canonical form. Existing `INDIAN_STATES` list has 36 entries — exact match to workbook count. Minor `&` vs `and` differences in 2–3 UTs need a one-time mapping table in the resolver.

---

## RE Onboarding Steps — Screen → DB Mapping

### Step RE-1: Home State + Current City
**Routing Rule:** R07 — "Where are you from and where do you live now?"

| Input | Table | Column | Notes |
|-------|-------|--------|-------|
| Home state (picker) | `profiles` | `home_state TEXT` | Write canonical `re_states.state_ut` full name. Picker options seeded from `re_states.state_ut`. |
| Current city (free text or picker) | `profiles` | `current_city TEXT` | Free text for now; BUILD-03 resolves to `re_city_migration_overlays.destination_group_code`. |

**Option values source:** `re_states.state_ut` (36 rows, ordered alphabetically). Picker options are NOT hardcoded in the app — loaded from this table at runtime.

**Dynamic branching:** None at this step.

---

### Step RE-2: Main Cohort Selection
**Routing Rule:** R01 — "Select one of 5 household cards"

| Input | Table | Column | Notes |
|-------|-------|--------|-------|
| Selected main cohort card | `profiles` or `re_user_household_profiles` | `main_cohort_id TEXT` | Stored on the household profile, not the individual profiles row. See note below. |

**Option values source:** `re_main_cohorts` table — exactly 5 rows.

| Cohort card shown | `main_cohort_id` | `subcohort_screen_copy` (drives next screen) |
|-------------------|-----------------|----------------------------------------------|
| Just me / shared adult household | MC1 | Show 5-6 sub-options: student/hostel, young professional, working woman, flatmates, migrant adult, desk/sedentary |
| Couple household | MC2 | Show DINK, newly married, mixed-state, planning pregnancy, pregnant, infant/baby household |
| Family with children | MC3 | Show toddler, school kid, teen, picky child, family budget, homemaker elaborate |
| Joint / elders / care household | MC4 | Show joint family, elderly couple, recovery light, elder+child, diabetic/BP member |
| Special goal or kitchen operating mode | MC5 | Show health/gym, Jain/fasting, nonveg mode, cook-assisted, maid-dependent, premium foodie (16 sub-options) |

**Important:** `re_main_cohorts.subcohort_screen_copy` is the authoritative copy text for the sub-cohort screen that follows. BUILD-02 must NOT hardcode this text — it reads from the table.

**Dynamic branching:** MC2 (if infant/baby selected) → triggers Step RE-4 (age band capture). MC3 → triggers child age-band chips. MC4 → triggers elder/diabetic member chips.

---

### Step RE-3: Sub-cohort Selection
**Routing Rule:** R02 — "Show only sub-cohorts under selected main cohort"

| Input | Table | Column | Notes |
|-------|-------|--------|-------|
| Selected sub-cohort chip | `re_user_household_profiles` | `sub_cohort_id TEXT` → FK `re_subcohorts` | Backend persona derived from sub_cohort mapping |
| Derived persona | `re_user_household_profiles` | `persona_id TEXT` → FK `re_personas` | Read from `re_subcohorts.maps_to_persona_id`; do not show to user |

**Option values source:** `re_subcohorts` filtered by `main_cohort_id`. Chip text from `re_subcohorts.show_as_chip_text`.

**Sub-cohort chip counts per main cohort:**
- MC1: 6 chips (SC1A–SC1F)
- MC2: 7 chips (SC2A–SC2G)
- MC3: 6 chips (SC3A–SC3F)
- MC4: 6 chips (SC4A–SC4F)
- MC5: 16 chips (SC5A–SC5P)

**Dynamic branching:**
- MC2 → SC2D (pregnant), SC2E (infant 0-6m), SC2F (baby 6-18m): triggers RE-4 for member age capture
- MC3 → SC3A (toddler), SC3B (school kids), SC3C (teens), SC3D (picky child): triggers RE-4 for child age-band
- MC4 → SC4A (joint family), SC4B (elderly couple), SC4C (recovery), SC4D (diabetic), SC4E (hypertension), SC4F (composite): triggers RE-4 for elder/condition confirmation
- MC5 → Selected sub-cohort IS the overlay — no further branching; flows to RE-5

---

### Step RE-4: Household Members (Conditional)
**Routing Rule:** R03 — "Do they need a separate soft/mild/extra component?"

Shown only when a member-specific sub-cohort was selected in RE-3 (infant, toddler, child, teen, elderly, pregnant, diabetic, recovery member).

| Input | Table | Column | Notes |
|-------|-------|--------|-------|
| Member segment confirmation | `household_members` | `member_segment TEXT` | One row per distinct member added |
| Age band | `household_members` | `age_band TEXT` | e.g. '0-6m', '6-18m', '2-5', '6-12', '13-18', '60+' |
| Add-on required? | `household_members` | (drives `re_household_addon_plans` lookup in BUILD-05) | Default: yes per R03 |

**Member segment values (from `re_addon_classes.target_member_segment`):**

| Segment code | When captured |
|-------------|---------------|
| `baby_6_18m` | SC2E/SC2F selected, age band 0-6m or 6-18m |
| `toddler` | SC3A selected, age band 2-5 |
| `school_child` | SC3B selected |
| `teen_high_appetite` | SC3C selected |
| `picky_child` | SC3D selected |
| `pregnant_member` | SC2D selected |
| `lactating_or_postpartum_mother` | Post-birth followup |
| `elderly_member` | SC4B, SC4F selected |
| `diabetic_member` | SC4D selected |
| `hypertension_heart_member` | SC4E selected |
| `recovery_member` | SC4C selected |

**Age band chips:** Shown dynamically based on sub-cohort.
- If MC2+infant: "0–6 months" / "6–18 months"
- If MC3+toddler: "2–3 years" / "3–5 years"
- If MC3+school: "6–9 years" / "10–12 years"
- If MC3+teen: "13–16 years" / "16–18 years"
- If MC4+elderly: "60–70 years" / "70+ years"

Age band option values are **not seeded from a table** — they are hardcoded in the onboarding screen because they are UI scaffolding, not canonical data. The `household_members.age_band` column stores the selected value as-is.

**Dynamic branching:**
- MC4 health condition sub-cohorts: also capture whether the health condition affects the whole household (everyone) or just one member. Stored as `health_scope = 'all' | 'member_only'` on `re_user_household_profiles`. If `member_only`, health classes stay as addon; if `all`, health-appropriate classes can enter main rotation.

---

### Step RE-5: Diet + Non-Veg Guardrails
**Routing Rule:** R06 — "Veg, egg, nonveg, Jain, vegan, allergies; non-veg frequency"

| Input | Table | Column | Notes |
|-------|-------|--------|-------|
| Diet type | `user_diet_rules` | `food_pref TEXT` | Existing column — already captured in legacy step-2. For RE new signups, this is step RE-5. Same values: veg/non_veg/egg/vegan/jain |
| Non-veg frequency (if non_veg selected) | `re_user_household_profiles` | `nonveg_meals_per_week INTEGER` | New column. Overrides persona default. |
| Proteins eaten (if non_veg) | `re_user_household_profiles` | `preferred_protein_types TEXT[]` | e.g. ['chicken','fish','egg']. Drives nonveg class filtering. |
| Allergens | `user_diet_rules` | `excluded_ingredients INTEGER[]` | Existing column — same as legacy step-3 |

**Option values source:** Diet type options are static enum (same as legacy). Non-veg proteins are static chips (chicken, mutton, fish, prawn/seafood, egg). No table needed.

**Dynamic branching:**
- `food_pref = 'jain'` → add `jain_member` to household add-on targets; Jain class pool activated
- `food_pref = 'non_veg'` → show non-veg frequency chips ("1-2 times/week", "3-4 times", "daily") and protein type chips
- `food_pref = 'veg'` or `'vegan'` → nonveg class pool excluded from main rotation (hard filter)

---

### Step RE-6: Cooking System
**Routing Rule:** R05 — "Self-cook, skilled cook, cook needs instructions, maid/helper, tiffin/PG, delivery-heavy"

| Input | Table | Column | Notes |
|-------|-------|--------|-------|
| Cook dependency type | `re_user_household_profiles` | `cook_dependency TEXT` | Adjusts complexity and instruction detail in plan |

**Option chips** (static, not table-driven):

| Chip text | `cook_dependency` value |
|-----------|------------------------|
| I cook myself | `self_cook` |
| Skilled cook / knows recipes | `skilled_cook` |
| Cook needs instructions step by step | `cook_needs_instruction` |
| Maid/helper — simple dishes only | `maid_simple` |
| Tiffin / PG / hostel — no kitchen | `tiffin_pg_no_kitchen` |
| Mostly delivery + occasional home | `delivery_heavy` |

**Option values source:** Static chips in screen — not table-driven. The `cook_dependency` value maps to `re_personas.cook_dependency` field for cohort lookup.

**Dynamic branching:**
- `cook_needs_instruction` → persona weight shifts toward lower-complexity classes
- `tiffin_pg_no_kitchen` → certain home-cooked classes excluded from primary plan

---

### Step RE-7: Health + Lifestyle Overlay
**Routing Rule:** R04 — "Health overlay — for everyone or one member?"

Shown when health intent or a specific health condition was indicated via sub-cohort (SC5A–SC5E for goals, or SC4D/SC4E for conditions) OR when a household member with a health condition was added in RE-4.

| Input | Table | Column | Notes |
|-------|-------|--------|-------|
| Health overlay code | `re_user_household_profiles` | `health_overlay_code TEXT` | e.g. `weight_loss`, `diabetic_management`, `high_protein_fitness`, `jain_fasting` |
| Health scope | `re_user_household_profiles` | `health_scope TEXT` | `'all'` = affects whole household plan; `'member_only'` = addon only |
| Member segment if member_only | `household_members` | `member_segment` | Already captured in RE-4; reconfirmed here |

**Health overlay values** (from `re_addon_classes.target_member_segment` and persona `health_overlay_default`):

| Chip shown | `health_overlay_code` | Scope options |
|-----------|----------------------|---------------|
| Weight loss / calorie count | `weight_loss` | all / member_only |
| Gym / high protein | `high_protein_fitness` | all / member_only |
| Vegetarian protein | `veg_protein_seeker` | all / member_only |
| Diabetic / low-GI | `diabetic_management` | always member_only if MC4; ask if MC5 |
| Hypertension / heart | `hypertension_heart` | always member_only if MC4 |
| Fasting / ritual | `fasting_ritual` | all / member_only |
| Pregnancy nutrition | `pregnancy_support` | always member_only |
| Postpartum recovery | `postpartum_lactation` | always member_only |

**Dynamic branching:**
- `health_scope = 'all'` → health-appropriate classes enter main weekly plan rotation (e.g. `BF_OATS_MUESLI_FIT`, `DN_LOW_CARB_DINNER`)
- `health_scope = 'member_only'` → health classes are add-on only; main family plan is unaffected

---

### Step RE-8: Cohort Assignment (Backend — No User Screen)
**Routing Rule:** Derived from all previous answers.

This is a backend operation, not a screen. It runs at the END of the onboarding flow.

| Derived output | Table | Column | Notes |
|---------------|-------|--------|-------|
| Cohort ID lookup | `re_cohorts` | `cohort_id` | Resolved from state_id + city_tier_code + persona_id |
| Primary persona assignment | `re_user_household_profiles` | `cohort_id TEXT`, `persona_id TEXT` | Stored for plan generation |
| Overlay persona IDs | `re_user_household_profiles` | `overlay_persona_ids TEXT[]` | e.g. health overlay + migrant overlay + cook overlay |
| Engine version assignment | `profiles` | `re_engine_version = 'classfirst_v1'` | Written at end of onboarding |
| Engine assignment audit | `re_user_engine_assignments` | One row inserted | `assigned_by = 'onboarding'` |
| Plan-ready flag | `profiles` | `onboarding_step = 8` (or equivalent) | Signals app to generate first plan |

**Cohort ID resolution logic (BUILD-03):**
```
cohort_id = state_id + '_' + city_tier_code + '_' + persona_id
example: 'S13_T1_P09'  (Madhya Pradesh, Tier1, Couple with baby 6-18 months)
```

**State → `state_id` mapping:**
- `home_state` (e.g. "Madhya Pradesh") → JOIN `re_states` on `state_ut` → `state_id` (e.g. S13)

**City → `city_tier_code` mapping (BUILD-03):**
- `current_city` (free text) → resolved to `destination_group_code` (e.g. MUMBAI_PUNE) → mapped to `city_tier_code` (T1/T2). This resolution is part of BUILD-03, not BUILD-01.

**Overlay persona logic:**
- City migration overlay → from `re_city_migration_overlays` (origin_state + destination_group_code)
- Health overlay → from health_overlay_code captured in RE-7
- Cook overlay → from cook_dependency captured in RE-6
- All overlays stored as array on `re_user_household_profiles.overlay_persona_ids`

---

## `re_user_household_profiles` Table (New — Created in BUILD-01)

This table holds the structured household profile built from RE onboarding answers. It is separate from the existing `profiles` table.

```sql
CREATE TABLE re_user_household_profiles (
  id                         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id                 UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  -- Cohort assignment
  main_cohort_id             TEXT REFERENCES re_main_cohorts(main_cohort_id),
  sub_cohort_id              TEXT REFERENCES re_subcohorts(sub_cohort_id),
  persona_id                 TEXT REFERENCES re_personas(persona_id),
  cohort_id                  TEXT REFERENCES re_cohorts(cohort_id),
  overlay_persona_ids        TEXT[],          -- health, cook, migration overlays
  -- Diet
  nonveg_meals_per_week      INTEGER,         -- user-set, overrides persona default
  preferred_protein_types    TEXT[],          -- ['chicken','fish','egg'] etc.
  -- Cook
  cook_dependency            TEXT,
  -- Health
  health_overlay_code        TEXT,
  health_scope               TEXT,            -- 'all' | 'member_only'
  -- Plan generation state
  city_destination_group     TEXT,            -- resolved city group code
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);
```

> **Note:** This table should be added to the BUILD-01 migration. It was not in the original table list above (BUILD-01 plan Section 2) — add as item 2D-extra alongside `household_members`. The plan document will be updated in the approved implementation.

---

## Summary: All Tables Written to During RE Onboarding

| Onboarding Step | Tables Written |
|-----------------|---------------|
| RE-1 (location) | `profiles.home_state`, `profiles.current_city` |
| RE-2 (main cohort) | `re_user_household_profiles.main_cohort_id` |
| RE-3 (sub-cohort) | `re_user_household_profiles.sub_cohort_id`, `.persona_id` |
| RE-4 (household members) | `household_members` (one row per member), `re_user_household_profiles.health_scope` |
| RE-5 (diet/nonveg) | `user_diet_rules.food_pref`, `user_diet_rules.excluded_ingredients`, `re_user_household_profiles.nonveg_meals_per_week`, `.preferred_protein_types` |
| RE-6 (cook system) | `re_user_household_profiles.cook_dependency` |
| RE-7 (health overlay) | `re_user_household_profiles.health_overlay_code`, `.health_scope` |
| RE-8 (cohort assignment — backend) | `re_user_household_profiles.cohort_id`, `.overlay_persona_ids`, `.city_destination_group`, `profiles.re_engine_version`, `re_user_engine_assignments` |

---

## Tables That Supply Option Values to Onboarding Screens

| Screen element | Source table | Column(s) |
|---------------|-------------|----------|
| Home state picker | `re_states` | `state_ut` (ordered A-Z) |
| Main cohort cards (5) | `re_main_cohorts` | `main_cohort_label`, `user_understands_as` |
| Sub-cohort chips (per MC) | `re_subcohorts` WHERE `main_cohort_id = $selected` | `show_as_chip_text`, `sub_cohort_id` |
| Next question text after MC | `re_main_cohorts` | `subcohort_screen_copy` |
| Dynamic onboarding routing logic | `re_routing_rules` | `shown_when`, `input_type`, `user_prompt_summary` |
| City tier group (BUILD-03) | `re_city_migration_overlays` | `destination_group_code`, `destination_group_name` |

---

## Open Actions for BUILD-02

1. **Confirm UX flow:** Is RE onboarding a new 8-step flow replacing legacy steps, or appended after legacy step-1 for new signups? The legacy steps 2–7 capture food_pref and allergens which RE-5 also captures — one of the two flows must be the authoritative source.
2. **State name normalization:** The app `INDIAN_STATES` list has `"Andaman and Nicobar Islands"` but workbook has `"Andaman & Nicobar Islands"`. A 3-row normalization map is needed for the 3 UTs that differ. Build this map in BUILD-02 or BUILD-03.
3. **`re_user_household_profiles` table:** Must be added to the BUILD-01 migration (see note above). Confirm this with founder before implementation begins.
4. **City resolution:** `profiles.current_city` is free text. Mapping free text → `destination_group_code` (e.g. "Mumbai" → `MUMBAI_PUNE`) is needed. This is a BUILD-03 task. For BUILD-02, write the city string as entered and flag as "pending resolution."
