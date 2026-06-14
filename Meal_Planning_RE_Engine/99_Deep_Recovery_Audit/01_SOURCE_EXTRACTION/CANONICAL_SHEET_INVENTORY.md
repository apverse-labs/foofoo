# CANONICAL_SHEET_INVENTORY

Every sheet in the source workbook + all spec workbooks, with structure and candidate keys.
All formulas/DV/named-ranges/hidden = 0 across the board (see SOURCE_READ_PROOF).

## SOURCE WORKBOOK (Tier 1) — `Indian_Meal_Cohort_Persona_DB_v3.xlsx` (22 sheets)
| Sheet | State | Rows(data) | Cols | Candidate key cols | Remarks cols |
|---|---|---|---|---|---|
| README | visible | 8 | 2 | — | — |
| Main_Cohort_Hierarchy | visible | 5 | 5 | main_cohort_id, main_cohort_label, subcohort_screen_copy | routing_notes |
| Subcohort_Routing | visible | 41 | 9 | main_cohort_id, main_cohort_label, sub_cohort_id, sub_cohort_label, maps_to_persona_id, persona_name | — |
| Persona_Master_v3 | visible | 41 | 22 | persona_id, persona_name, bf_boost_classes, ld_boost_classes, sn_boost_classes, dn_boost_classes | — |
| Routing_Rules_v3 | visible | 8 | 6 | rule_id | why_it_matters |
| State_Profile_v3 | visible | 36 | 15 | state_id, state_ut, breakfast_class_pool, weekday_lunch_class_pool, weekday_dinner_class_pool, weekend_special_class_pool | behavioral_notes, planning_note_v3 |
| City_Migration_Overlay_v3 | visible | 324 | 11 | origin_state_ut, destination_group_code, home_state_signature_weight, current_city_lifestyle_weight, overlay_meal_classes | v3_usage_note |
| Meal_Class_Master_v3 | visible | 131 | 23 | meal_class_code, class_name, class_category, example_dishes, class_family_code, addon_target_segment_v3 | db_use_note_v3 |
| Meal_Class_Overlap_Resolution | visible | 13 | 7 | meal_class_code, class_name, addon_target_segment | — |
| Class_Dish_Options_v3 | visible | 1050 | 11 | dish_option_id, meal_class_code, meal_class_name, dish_name, class_use_scope_v3 | usage_note |
| Addon_Component_Class_Master | visible | 24 | 8 | addon_class_code, addon_class_name, example_dishes | planning_note |
| Addon_Dish_Options | visible | 142 | 8 | addon_dish_option_id, addon_class_code, addon_class_name, dish_or_component_name | usage_note |
| Cohort_Matrix_v3 | visible | 2952 | 38 | cohort_id, state_id, state_ut, city_tier_code, city_tier, main_cohort_id | state_signature_notes |
| Weekly_Class_Plan_v3 | visible | 20664 | 23 | plan_day_id, cohort_id, persona_id, breakfast_primary_class, breakfast_secondary_class, breakfast_tertiary_class | — |
| Weekly_Plan_Normalization_Note | visible | 1 | 1 | — | note |
| Weekly_Plan_Join_Rules | visible | 4 | 2 | — | — |
| Household_Addon_Component_Plan | visible | 7992 | 15 | addon_plan_id, cohort_id, state_ut, city_tier, persona_id, persona_name | component_not_replacement_note |
| NonVeg_Logic_v3 | visible | 36 | 13 | state_ut, regular_nonveg_persona_meals_week, preferred_nonveg_classes, state_notes | state_notes, weekly_schedule_note |
| DB_Implementation_v3 | visible | 10 | 5 | — | notes |
| Sources_v3 | visible | 7 | 5 | source_id | confidence_note |
| QA_Checks_v3 | visible | 7 | 4 | check_id | — |
| Data_Dictionary_v3 | visible | 20 | 3 | — | description |

## SPEC DOC-02 — `DOC-02_Domain_Glossary_Canonical_Definitions_v1.0.xlsx` (6 sheets)
| Sheet | State | Rows(data) | Cols | Candidate key cols | Remarks cols |
|---|---|---|---|---|---|
| README | visible | 11 | 2 | — | — |
| Glossary | visible | 20 | 4 | — | Implementation note |
| Enums | visible | 9 | 3 | — | Notes |
| ID_Conventions | visible | 8 | 4 | — | — |
| Source_Data_Dictionary | visible | 20 | 3 | — | description |
| Sources | visible | 7 | 5 | source_id | confidence_note |

## SPEC DOC-05 — `DOC-05_Meal_Class_Taxonomy_v1.0.xlsx` (5 sheets)
| Sheet | State | Rows(data) | Cols | Candidate key cols | Remarks cols |
|---|---|---|---|---|---|
| README | visible | 11 | 2 | — | — |
| Meal_Class_Master_v3 | visible | 131 | 23 | meal_class_code, class_name, class_category, example_dishes, class_family_code, addon_target_segment_v3 | db_use_note_v3 |
| Meal_Class_Overlap_Resolution | visible | 13 | 7 | meal_class_code, class_name, addon_target_segment | — |
| Addon_Component_Class_Master | visible | 24 | 8 | addon_class_code, addon_class_name, example_dishes | planning_note |
| Implementation_Rules | visible | 6 | 3 | — | — |

## SPEC DOC-07 — `DOC-07_Dish_Catalog_Class_to_Dish_Mapping_v1.0.xlsx` (5 sheets)
| Sheet | State | Rows(data) | Cols | Candidate key cols | Remarks cols |
|---|---|---|---|---|---|
| README | visible | 11 | 2 | — | — |
| Class_Dish_Options_v3 | visible | 1050 | 11 | dish_option_id, meal_class_code, meal_class_name, dish_name, class_use_scope_v3 | usage_note |
| Addon_Dish_Options | visible | 142 | 8 | addon_dish_option_id, addon_class_code, addon_class_name, dish_or_component_name | usage_note |
| Meal_Class_Lookup | visible | 131 | 23 | meal_class_code, class_name, class_category, example_dishes, class_family_code, addon_target_segment_v3 | db_use_note_v3 |
| Mapping_Rules | visible | 5 | 3 | — | Reason |

## SPEC DOC-08 — `DOC-08_Food_DNA_Tagging_Specification_v1.0.xlsx` (5 sheets)
| Sheet | State | Rows(data) | Cols | Candidate key cols | Remarks cols |
|---|---|---|---|---|---|
| README | visible | 11 | 2 | — | — |
| Food_DNA_Dimensions | visible | 20 | 5 | — | — |
| Auto_Derive_Rules | visible | 7 | 3 | — | — |
| Sample_Tag_Template | visible | 4 | 9 | dish_name, meal_class_code | notes |
| Dish_Source_Lookup | visible | 499 | 11 | dish_option_id, meal_class_code, meal_class_name, dish_name, class_use_scope_v3 | usage_note |

## SPEC DOC-11 — `DOC-11_Onboarding_Answer_to_Feature_Mapping_v1.0.xlsx` (7 sheets)
| Sheet | State | Rows(data) | Cols | Candidate key cols | Remarks cols |
|---|---|---|---|---|---|
| README | visible | 11 | 2 | — | — |
| Main_Cohort_Hierarchy | visible | 5 | 5 | main_cohort_id, main_cohort_label, subcohort_screen_copy | routing_notes |
| Subcohort_Routing | visible | 41 | 9 | main_cohort_id, main_cohort_label, sub_cohort_id, sub_cohort_label, maps_to_persona_id, persona_name | — |
| Routing_Rules_v3 | visible | 8 | 6 | rule_id | why_it_matters |
| Persona_Lookup | visible | 41 | 22 | persona_id, persona_name, bf_boost_classes, ld_boost_classes, sn_boost_classes, dn_boost_classes | — |
| Answer_to_Feature_Map | visible | 12 | 6 | — | — |
| Household_Profile_Schema | visible | 9 | 5 | — | — |

## SPEC DOC-12 — `DOC-12_Cohort_to_Weekly_Meal_Class_Matrix_v1.0.xlsx` (8 sheets)
| Sheet | State | Rows(data) | Cols | Candidate key cols | Remarks cols |
|---|---|---|---|---|---|
| README | visible | 11 | 2 | — | — |
| Cohort_Matrix_v3 | visible | 2952 | 38 | cohort_id, state_id, state_ut, city_tier_code, city_tier, main_cohort_id | state_signature_notes |
| Weekly_Class_Plan_v3 | visible | 20664 | 23 | plan_day_id, cohort_id, persona_id, breakfast_primary_class, breakfast_secondary_class, breakfast_tertiary_class | — |
| Weekly_Plan_Join_Rules | visible | 4 | 2 | — | — |
| Weekly_Plan_Normalization_Note | visible | 1 | 1 | — | note |
| Household_Addon_Component_Plan | visible | 7992 | 15 | addon_plan_id, cohort_id, state_ut, city_tier, persona_id, persona_name | component_not_replacement_note |
| QA_Rules | visible | 6 | 3 | — | — |
| Implementation_Join_Logic | visible | 6 | 4 | — | — |

## SPEC DOC-22 — `DOC-22_Database_Schema_Seed_Data_Spec_v1.0.xlsx` (8 sheets)
| Sheet | State | Rows(data) | Cols | Candidate key cols | Remarks cols |
|---|---|---|---|---|---|
| README | visible | 11 | 2 | — | — |
| DB_Implementation_v3 | visible | 10 | 5 | — | notes |
| Import_Order | visible | 17 | 4 | — | notes |
| Canonical_Tables | visible | 16 | 4 | — | — |
| Column_Spec | visible | 10 | 5 | — | notes |
| Constraints | visible | 8 | 3 | constraint_id | — |
| Runtime_Entities | visible | 6 | 3 | — | notes |
| Data_Dictionary_v3 | visible | 20 | 3 | — | description |

## SPEC DOC-25 — `DOC-25_QA_Test_Cases_Validation_Spec_v1.0.xlsx` (6 sheets)
| Sheet | State | Rows(data) | Cols | Candidate key cols | Remarks cols |
|---|---|---|---|---|---|
| README | visible | 11 | 2 | — | — |
| QA_Checks_v3 | visible | 7 | 4 | check_id | — |
| Synthetic_Test_Cases | visible | 15 | 4 | test_id | — |
| Automated_Validation_Checks | visible | 10 | 3 | check_id | description |
| Build_Acceptance | visible | 10 | 2 | build_id | — |
| Edge_Cases | visible | 5 | 2 | — | — |
