# CANONICAL_DATA_LEDGER

Exact canonical counts from the v3 source workbook (Tier 1). These are the parity targets.

| Entity | Sheet | Canonical count |
|---|---|---|
| states/UTs | State_Profile_v3 | 36 |
| city migration overlays | City_Migration_Overlay_v3 | 324 |
| main cohorts | Main_Cohort_Hierarchy | 5 |
| sub-cohorts | Subcohort_Routing | 41 |
| personas | Persona_Master_v3 | 41 |
| routing rules | Routing_Rules_v3 | 8 |
| cohorts (matrix) | Cohort_Matrix_v3 | 2952 |
| meal classes | Meal_Class_Master_v3 | 131 (?) |
| meal-class overlap rules | Meal_Class_Overlap_Resolution | 13 |
| class-dish options | Class_Dish_Options_v3 | 1050 |
| add-on classes | Addon_Component_Class_Master | 24 |
| add-on dish options | Addon_Dish_Options | 142 |
| weekly class-plan rows | Weekly_Class_Plan_v3 | 20664 |
| household add-on plan rows | Household_Addon_Component_Plan | 7992 |
| non-veg logic rows | NonVeg_Logic_v3 | 36 |

## Cross-source note (Tier-2 spec vs Tier-1 workbook)
- DOC-12 (Cohort_to_Weekly_Meal_Class_Matrix) spec workbook holds 31636 total rows across its sheets — must be reconciled against Weekly_Class_Plan_v3 in Phase 3.
- DOC-07 dish catalog spec rows: 1339 (vs workbook Class_Dish_Options_v3).
- DOC-08 Food DNA spec rows: 541.