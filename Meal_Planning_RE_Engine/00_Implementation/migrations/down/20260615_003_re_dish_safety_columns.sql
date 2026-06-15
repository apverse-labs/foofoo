-- Down: Remove is_jain + allergen_ids from re_class_dish_options (SCHEMA-RE-013)

DROP INDEX IF EXISTS idx_re_cdo_allergen_ids;
DROP INDEX IF EXISTS idx_re_cdo_is_jain;

ALTER TABLE public.re_class_dish_options
  DROP COLUMN IF EXISTS allergen_ids,
  DROP COLUMN IF EXISTS is_jain;
