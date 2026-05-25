-- =============================================================================
-- Migration: 20260525000001_persona_ingredient_gaps.sql
-- Adds ingredients referenced by the 50-persona test suite that are missing
-- from ingredients_master: Mushroom, Beef, Pork (exclusion ingredients).
--
-- Notes:
-- • ingredient_aliases has an FK issue (references ingredients not ingredients_master)
--   that must be fixed separately before aliases can be added.
-- • The persona runner normalises ingredient names to lowercase on load, so
--   'Mushroom'→'mushroom', 'Beef'→'beef', 'Pork'→'pork' match persona definitions
--   without needing aliases.
-- =============================================================================

INSERT INTO public.ingredients_master (name, is_allergen)
VALUES
  ('Mushroom', FALSE),
  ('Beef',     FALSE),
  ('Pork',     FALSE)
ON CONFLICT (name) DO NOTHING;
