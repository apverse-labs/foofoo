-- SCHEMA-RE-013: Add is_jain + allergen_ids to re_class_dish_options
-- P0 safety: enables allergen hard-filter and Jain hard-filter in the
-- dish expander (re-dish-expander.repository.ts) to exclude unsafe candidates
-- before any scoring occurs.
-- Additive (nullable / defaulted) — existing rows read as non-Jain, no allergens.

ALTER TABLE public.re_class_dish_options
  ADD COLUMN IF NOT EXISTS is_jain      BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allergen_ids INTEGER[]     NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.re_class_dish_options.is_jain      IS 'True if the dish qualifies as Jain (no root vegetables, no onion/garlic)';
COMMENT ON COLUMN public.re_class_dish_options.allergen_ids IS 'Array of allergen IDs (from re_allergens or ingredients_master) present in this dish option';

CREATE INDEX IF NOT EXISTS idx_re_cdo_is_jain      ON public.re_class_dish_options(is_jain);
CREATE INDEX IF NOT EXISTS idx_re_cdo_allergen_ids ON public.re_class_dish_options USING GIN (allergen_ids);
