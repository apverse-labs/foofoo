# CANONICAL_ID_REGISTRY

Distinct canonical IDs by category, sourced from the v3 source workbook (Tier 1).
`dup` = duplicate rows of the same ID within the source column (0 = clean PK).

| Category | Distinct | Rows | Dup | Source (sheet.col) | Sample |
|---|---|---|---|---|---|
| state_id | 36 | 36 | 0 | `State_Profile_v3.state_id` | S01, S02, S03, S04, S05 |
| persona_id | 41 | 41 | 0 | `Persona_Master_v3.persona_id` | P01, P02, P03, P04, P05 |
| main_cohort_id | 5 | 5 | 0 | `Main_Cohort_Hierarchy.main_cohort_id` | MC1, MC2, MC3, MC4, MC5 |
| sub_cohort_id | 41 | 41 | 0 | `Subcohort_Routing.sub_cohort_id` | SC1A, SC1B, SC1C, SC1D, SC1E |
| cohort_id | 2952 | 2952 | 0 | `Cohort_Matrix_v3.cohort_id` | S01_T1_P01, S01_T1_P02, S01_T1_P03, S01_T1_P04, S01_T1_P05 |
| meal_class_code | 131 | 131 | 0 | `Meal_Class_Master_v3.meal_class_code` | BF_STEAMED_FERMENTED_LIGHT, BF_FERMENTED_CREPE_PAN, BF_POHA_CHIVDA_LIGHT, BF_UPMA_DALIA_SEVAI, BF_STUFFED_FLATBREAD |
| addon_class_code | 24 | 24 | 0 | `Addon_Component_Class_Master.addon_class_code` | ADD_INFANT_6M_SOFT_PORRIDGE, ADD_INFANT_6M_DAL_KHICHDI, ADD_TODDLER_MILD_MINI_PLATE, ADD_CHILD_TIFFIN_SIDE, ADD_CHILD_PROTEIN_SIDE |
| routing_rule_id | 8 | 8 | 0 | `Routing_Rules_v3.rule_id` | R01, R02, R03, R04, R05 |
| dish_option_id | 1050 | 1050 | 0 | `Class_Dish_Options_v3.dish_option_id` | BF_STEAMED_FERMENTED_LIGHT_D01, BF_STEAMED_FERMENTED_LIGHT_D02, BF_STEAMED_FERMENTED_LIGHT_D03, BF_STEAMED_FERMENTED_LIGHT_D04, BF_STEAMED_FERMENTED_LIGHT_D05 |
| addon_dish_option_id | 142 | 142 | 0 | `Addon_Dish_Options.addon_dish_option_id` | ADD_INFANT_6M_SOFT_PORRIDGE_D01, ADD_INFANT_6M_SOFT_PORRIDGE_D02, ADD_INFANT_6M_SOFT_PORRIDGE_D03, ADD_INFANT_6M_SOFT_PORRIDGE_D04, ADD_INFANT_6M_SOFT_PORRIDGE_D05 |
| weekly_plan_day_id | 20664 | 20664 | 0 | `Weekly_Class_Plan_v3.plan_day_id` | S01_T1_P01_Mon, S01_T1_P01_Tue, S01_T1_P01_Wed, S01_T1_P01_Thu, S01_T1_P01_Fri |
| household_addon_plan_id | 7992 | 7992 | 0 | `Household_Addon_Component_Plan.addon_plan_id` | S01_T1_P06_Sun_SNACK_ADD_PREGNANCY_CALCIUM_PROTEIN_SIDE, S01_T1_P07_Mon_BREAKFAST_ADD_PREGNANCY_CALCIUM_PROTEIN_SIDE, S01_T1_P07_Wed_LUNCH_ADD_PREGNANCY_IRON_FOLATE_SIDE, S01_T1_P07_Fri_SNACK_ADD_PREGNANCY_CALCIUM_PROTEIN_SIDE, S01_T1_P07_Sun_LUNCH_ADD_PREGNANCY_IRON_FOLATE_SIDE |