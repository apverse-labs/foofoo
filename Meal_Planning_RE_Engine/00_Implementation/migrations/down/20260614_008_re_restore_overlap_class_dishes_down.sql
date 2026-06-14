-- DOWN: 20260614_008_re_restore_overlap_class_dishes.sql
-- Reverts the BUILD-01 correction. Removes the 104 restored class-dish options for the
-- 13 overlap (non-primary) meal classes and the 13 overlap-resolution guard rows.
-- Safe: these classes are never used as weekly primary, so removal cannot orphan a plan.

DELETE FROM public.re_class_dish_options
WHERE meal_class_code IN (
  'BF_KID_TIFFIN','BF_INFANT_6M_SOFT','BF_LACTATION_MOTHER','LD_CHILD_MILD_PLATE',
  'LD_ELDERLY_SOFT_DIGESTIVE','LD_TEEN_HIGH_CALORIE','LD_PREGNANCY_BALANCED',
  'LD_LACTATION_POSTPARTUM','LD_RECOVERY_SOFT_PROTEIN','SN_KIDS_TIFFIN_SNACK',
  'DN_FAMILY_COMFORT_MEAL','DN_EARLY_ELDERLY_DINNER','DN_CHILD_FRIENDLY_DINNER'
);

DELETE FROM public.re_meal_class_overlap_rules
WHERE excluded_from = 'weekly_primary_rotation';
