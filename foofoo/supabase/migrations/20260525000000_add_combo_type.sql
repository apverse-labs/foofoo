-- Migration: add combo_type to dish_combos (Doc #11A Section 5)
-- combo_type classifies how dishes in a combo relate to each other

ALTER TABLE public.dish_combos
  ADD COLUMN IF NOT EXISTS combo_type text
    CHECK (combo_type IN ('inseparable', 'base_with_sides', 'thali'));

-- Backfill existing rows with a sensible default
UPDATE public.dish_combos SET combo_type = 'inseparable' WHERE combo_type IS NULL;
