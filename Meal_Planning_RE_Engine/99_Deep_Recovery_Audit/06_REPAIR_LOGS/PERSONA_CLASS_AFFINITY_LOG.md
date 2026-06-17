# PERSONA_CLASS_AFFINITY_LOG — SCHEMA-RE-019

Date: 2026-06-19
Branch: apverse-labs-RE
DB: foofoo-staging (kwypxyqxojauhiehuirz)

## Source

`re_personas.bf_boost_classes` / `ld_boost_classes` / `sn_boost_classes` / `dn_boost_classes`
(pipe-delimited TEXT columns — confirmed via sample query, NOT comma-delimited as the
original prompt's literal ETL SQL assumed; see NORMALIZATION_GAP_REGISTER.md GAP-01..04
and AskUserQuestion confirmation to fix the delimiter to `'|'`).

## Migrations applied

- `up/20260619_002_re_persona_class_affinity.sql` — creates `re_persona_class_affinity`
  (persona_id, slot_group, meal_class_code, affinity_weight, source_column), unique
  constraint on (persona_id, slot_group, meal_class_code), FKs to `re_personas` and
  `re_meal_classes`, index on (persona_id, slot_group).
- `down/20260619_002_re_persona_class_affinity_down.sql` — drops the table.
- `up/20260619_003_re_persona_class_affinity_etl.sql` — 4 INSERT...SELECT...UNNEST blocks
  (Breakfast/Lunch/Snack/Dinner), `string_to_array(col, '|')`, `EXISTS` filter against
  `re_meal_classes` to silently drop orphan codes, `ON CONFLICT ... DO NOTHING` for
  idempotent re-runs.

## Row counts before/after ETL

| Stage | Rows |
|---|---|
| Before ETL | 0 |
| After ETL | 426 |

## Per-slot distribution (post-ETL)

| Slot | Rows |
|---|---|
| Breakfast | 123 |
| Lunch | 131 |
| Snack | 85 |
| Dinner | 87 |

## Persona coverage

- Distinct personas with at least one affinity row: 41 / 41 (all personas).

## Orphan codes

- 0 orphan class codes found (all boost-class tokens matched an existing
  `re_meal_classes.meal_class_code` after `TRIM`). The `EXISTS` filter in the ETL would
  have silently dropped any orphan rather than erroring — none were dropped.

## Validation queries run

- `SELECT count(*) FROM re_persona_class_affinity;` → 426
- `SELECT count(DISTINCT persona_id) FROM re_persona_class_affinity;` → 41
- `SELECT slot_group, count(*) FROM re_persona_class_affinity GROUP BY slot_group;` →
  matches the per-slot table above
- Orphan check (rows in `re_persona_class_affinity` with no matching `re_meal_classes`
  row) → 0

## Code change (Step B5)

- `foofoo/src/repositories/re-dish-expander.repository.ts`:
  - Added `fetchPersonaClassAffinities(personaId, classCodes)` — reads
    `re_persona_class_affinity` filtered by persona and class codes, returns
    `meal_class_code → affinity_weight` map; fails closed (returns `{}` on error).
  - `UserHouseholdProfileRow` extended with `persona_id`.
  - `re_user_household_profiles` select in `fetchTodayDishCandidates` now also reads
    `persona_id`.
  - `fetchPersonaClassAffinities(personaId, slotClassCodes)` is now fetched in parallel
    alongside the other affinity/history fetches.
  - `classAffinity` passed into `expandClassToDishes` now follows a 3-tier fallback:
    1. Behavioural: `re_user_class_affinity` value (via existing `classAffinityMap`), if present.
    2. Persona prior: `re_persona_class_affinity` value (via new `personaClassAffinityMap`), if present.
    3. True cold start: `0`.
- `npx tsc --noEmit` → 0 errors.

## Files modified

- `Meal_Planning_RE_Engine/00_Implementation/migrations/up/20260619_002_re_persona_class_affinity.sql` (new)
- `Meal_Planning_RE_Engine/00_Implementation/migrations/down/20260619_002_re_persona_class_affinity_down.sql` (new)
- `Meal_Planning_RE_Engine/00_Implementation/migrations/up/20260619_003_re_persona_class_affinity_etl.sql` (new)
- `foofoo/src/repositories/re-dish-expander.repository.ts` (edited)

## Notes / deferred work

Source boost columns (`bf_boost_classes`, `ld_boost_classes`, `sn_boost_classes`,
`dn_boost_classes`) remain on `re_personas` and will be renamed in Prompt 3 as part of
a column hygiene pass. They are untouched by this prompt per the hard rule against
dropping/altering them here.
