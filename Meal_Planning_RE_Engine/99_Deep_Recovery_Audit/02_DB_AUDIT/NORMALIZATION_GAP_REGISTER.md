# Normalization Gap Register — foofoo-staging

Generated 2026-06-19. Scope: `information_schema.columns` for `public` schema,
filtered to `text`/`varchar` columns whose name matches `_pool|_mix|_classes|_boost|_types|_ids|_codes|_list`,
then manually inspected for delimiter-packed multi-valued content (1NF violations).

| Gap ID | Table | Column | Sample Value | Represents | Correct Normalized Table |
|--------|-------|--------|--------------|------------|---------------------------|
| GAP-01 | `re_personas` | `bf_boost_classes` | `BF_BREAD_MODERN_FAST\|BF_POHA_CHIVDA_LIGHT\|BF_UPMA_DALIA_SEVAI` | Breakfast meal-class codes the persona prefers (pipe-delimited) | `re_persona_class_affinity` (slot_group='Breakfast') — **targeted in Phase B of this prompt** |
| GAP-02 | `re_personas` | `ld_boost_classes` | `LD_ONE_POT_PRESSURE\|LD_LEFTOVER_REUSE\|LD_OUTSIDE_DELIVERY_INDIAN` | Lunch meal-class codes the persona prefers | `re_persona_class_affinity` (slot_group='Lunch') — **targeted in Phase B** |
| GAP-03 | `re_personas` | `sn_boost_classes` | `SN_TEA_BISCUIT_RUSK\|SN_MOMO_NOODLES_SNACK` | Snack meal-class codes the persona prefers | `re_persona_class_affinity` (slot_group='Snack') — **targeted in Phase B** |
| GAP-04 | `re_personas` | `dn_boost_classes` | `DN_ONE_POT_DINNER\|DN_LEFTOVER_THALI` | Dinner meal-class codes the persona prefers | `re_persona_class_affinity` (slot_group='Dinner') — **targeted in Phase B** |
| GAP-05 | `re_states` | `breakfast_class_pool` | `BF_STEAMED_FERMENTED_LIGHT\|BF_FERMENTED_CREPE_PAN\|BF_UPMA_DALIA_SEVAI\|...` | State-level breakfast class candidate pool | Already normalized into `re_state_class_affinity` under SCHEMA-RE-017 (2026-06-18). Column retained on `re_states` as the original source, no longer read by app code. |
| GAP-06 | `re_states` | `weekday_lunch_class_pool` | (pipe-delimited lunch class codes) | State-level weekday lunch class pool | Already normalized into `re_state_class_affinity` (SCHEMA-RE-017). |
| GAP-07 | `re_states` | `snack_class_pool` | (pipe-delimited snack class codes) | State-level snack class pool | Already normalized into `re_state_class_affinity` (SCHEMA-RE-017). |
| GAP-08 | `re_states` | `weekday_dinner_class_pool` | (pipe-delimited dinner class codes) | State-level weekday dinner class pool | Already normalized into `re_state_class_affinity` (SCHEMA-RE-017). |
| GAP-09 | `re_states` | `weekend_special_class_pool` | (pipe-delimited class codes) | State-level weekend-special class pool | Already normalized into `re_state_class_affinity` (SCHEMA-RE-017, day_type='Weekend'/'Both'). |
| GAP-10 | `re_states` | `nonveg_class_pool` | `LD_CHICKEN_HOME_CURRY\|LD_FISH_CURRY_RICE\|LD_CHICKEN_BIRYANI_PULAO\|...` | State-level nonveg class candidate pool | Already normalized into `re_state_class_affinity` (SCHEMA-RE-017). |
| GAP-11 | `re_cohorts` | `weekday_breakfast_class_mix` | `BF_BREAD_MODERN_FAST\|BF_POHA_CHIVDA_LIGHT\|BF_UPMA_DALIA_SEVAI\|...` | Cohort-level weekday breakfast class mix (Excel artifact) | Superseded — `re_cohorts` is the deprecated cohort-keyed table being phased out (SCHEMA-RE-017 repair log). No new normalized table planned; `re_persona_slot_plan` is the replacement data path. Not in scope for any current prompt. |
| GAP-12 | `re_cohorts` | `weekday_lunch_class_mix` | (pipe-delimited) | Cohort-level weekday lunch class mix | Same as GAP-11 — superseded, no action planned. |
| GAP-13 | `re_cohorts` | `weekday_snack_class_mix` | (pipe-delimited) | Cohort-level weekday snack class mix | Same as GAP-11. |
| GAP-14 | `re_cohorts` | `weekday_dinner_class_mix` | (pipe-delimited) | Cohort-level weekday dinner class mix | Same as GAP-11. |
| GAP-15 | `re_cohorts` | `weekend_breakfast_class_mix` | (pipe-delimited) | Cohort-level weekend breakfast class mix | Same as GAP-11. |
| GAP-16 | `re_cohorts` | `weekend_lunch_class_mix` | `LD_ONE_POT_PRESSURE\|LD_LEFTOVER_REUSE\|LD_OUTSIDE_DELIVERY_INDIAN\|...` | Cohort-level weekend lunch class mix | Same as GAP-11. |
| GAP-17 | `re_cohorts` | `weekend_snack_class_mix` | (pipe-delimited) | Cohort-level weekend snack class mix | Same as GAP-11. |
| GAP-18 | `re_cohorts` | `weekend_dinner_class_mix` | (pipe-delimited) | Cohort-level weekend dinner class mix | Same as GAP-11. |
| GAP-19 | `re_city_migration_overlays` | `overlay_meal_classes` | `BF_BREAD_MODERN_FAST\|LD_MODERN_SALAD_BOWL\|LD_OUTSIDE_DELIVERY_INDIAN\|SN_BAKERY_CAFE` | Per-overlay candidate meal classes injected into the DOC-09 city-migration blend | Could normalize to a `re_city_overlay_class_options(overlay_code, slot_group, meal_class_code)` table. **Currently still actively read** by the DOC-09 city-overlay block in `re-plan.repository.ts` — not touched by this audit; flagged as a candidate for a future prompt only. |
| GAP-20 | `re_nonveg_logic` | `preferred_nonveg_classes` | `LD_CHICKEN_HOME_CURRY\|LD_FISH_CURRY_RICE\|LD_CHICKEN_BIRYANI_PULAO\|LD_EGG_CURRY_BHURJI\|LD_MUTTON_SUNDAY_CURRY` | Ranked nonveg class candidates per nonveg-logic rule, used to pick `scheduled_nonveg_slot` | Could normalize to `re_nonveg_class_preference(rule_id/nonveg_mode, rank, meal_class_code)`. **Directly relevant to the known SCHEMA-RE-017 limitation** that `re_persona_slot_plan` has no `scheduled_nonveg_slot` equivalent — this column is a candidate source for a future fix, but is out of scope for this audit/Phase B. |

## Notes

- All `_pool`/`_mix` columns use `|` (pipe) as delimiter; `re_personas` boost columns also use `|` (the prompt's ETL script assumes `,` via `string_to_array(..., ',')` — **this is a delimiter mismatch that must be fixed before running Phase B's ETL**, see Phase B section below).
- No column matching the search patterns was found to use a comma delimiter; the source workbook's RE tables consistently use `|`.
- Scope of this register is `text`/`varchar` columns only; existing native `ARRAY` columns (e.g. `re_class_dish_options.allergen_ids INTEGER[]`, `re_user_household_profiles.overlay_persona_ids TEXT[]`) are already correctly typed and excluded.
- GAP-01 through GAP-04 (`re_personas` boost columns) are the only gaps in scope for Phase B of this prompt. All others are either already normalized (GAP-05–10), explicitly out of scope / superseded (GAP-11–18), or flagged for a possible future prompt (GAP-19, GAP-20) — not actioned here.
