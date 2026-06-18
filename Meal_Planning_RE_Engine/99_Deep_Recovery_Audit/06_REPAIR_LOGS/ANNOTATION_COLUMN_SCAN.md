# SCHEMA-RE-021 — Phase B: Codebase Reference Scan

- Date: 2026-06-19
- Branch: `apverse-labs-RE`
- Scope searched (literal, case-sensitive, all file types):
  - `foofoo/src/`
  - `foofoo/app/`
  - `foofoo/supabase/`
  - `foofoo-tests/`
- Purpose: determine whether any of the 15 candidate annotation columns (planned for rename under SCHEMA-RE-021) are referenced in application/test code, and classify the risk of each reference before any migration is written.

## Columns searched

1. `state_signature_notes`
2. `main_meal_vs_addon_rule`
3. `planning_confidence`
4. `household_addon_logic`
5. `routing_notes`
6. `behavioral_notes`
7. `planning_note`
8. `behavioral_meaning`
9. `db_use_note`
10. `revealed_behavior_summary`
11. `recommended_onboarding_path`
12. `planning_rule`
13. `v3_usage_note`
14. `planning_notes`
15. `example_dishes`

## Results

| # | Column | Matches | Classification |
|---|--------|---------|-----------------|
| 1 | `state_signature_notes` | 0 | Safe |
| 2 | `main_meal_vs_addon_rule` | 0 | Safe |
| 3 | `planning_confidence` | 0 | Safe |
| 4 | `household_addon_logic` | 0 | Safe |
| 5 | `routing_notes` | 0 | Safe |
| 6 | `behavioral_notes` | 0 | Safe |
| 7 | `planning_note` | **1** | **INSERT-UPDATE — BLOCKING** |
| 8 | `behavioral_meaning` | 0 | Safe |
| 9 | `db_use_note` | 0 | Safe |
| 10 | `revealed_behavior_summary` | 0 | Safe |
| 11 | `recommended_onboarding_path` | 0 | Safe |
| 12 | `planning_rule` | 0 | Safe |
| 13 | `v3_usage_note` | 0 | Safe |
| 14 | `planning_notes` | 0 | Safe |
| 15 | `example_dishes` | 0 | Safe |

## Blocking finding (must escalate before Phase C)

- **File:** `foofoo/src/repositories/re-cms.repository.ts`
- **Line:** 207
- **Code:**
  ```ts
  planning_note: input.planningNote ?? null,
  ```
- **Context:** object key inside a Supabase `.upsert({...})` call targeting `re_addon_classes` (upsert payload built ~lines 196–208), sourced from a TS interface field `AddonClassUpsertInput.planningNote` (line 190).
- **Classification:** **INSERT-UPDATE** — this writes to the `re_addon_classes.planning_note` column directly by name. Renaming the column to `planning_note_FounderInfoOnly` (lowercase-folded: `planning_note_founderinfoonly`) without updating this repository file would break the CMS upsert path for add-on classes (silent failure or Postgres "column does not exist" error on every founder/admin save of an add-on class record).

## Per the SCHEMA-RE-021 hard rule

> "Never proceed if Phase B finds WHERE/INSERT/UPDATE references — escalate first."

This scan found exactly one such reference (`planning_note` in `re-cms.repository.ts:207`, INSERT-UPDATE). **Phase C must not begin until this is escalated to and confirmed by the founder.**

The required fix, pending approval, is straightforward and low-risk: update line 207 of `re-cms.repository.ts` from
```ts
planning_note: input.planningNote ?? null,
```
to
```ts
planning_note_founderinfoonly: input.planningNote ?? null,
```
as part of the Phase C "code updates" commit (Commit #2), applied in the same change that runs the migration — so the rename and the code update land together and the CMS upsert path is never broken in between.

## Scope limitation

This scan covered only the four directories specified in the SCHEMA-RE-021 instructions. It does not cover other parts of the repository (e.g. root-level `supabase/` config outside `foofoo/`, any other modules, or RE engine source files outside these four paths).

## Outcome

**Phase B complete. 14 of 15 columns are safe with zero references. 1 of 15 (`planning_note`) has exactly one INSERT-UPDATE reference and requires founder escalation before Phase C proceeds.**
