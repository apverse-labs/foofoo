-- =============================================================================
-- Migration: 20260525000001_persona_ingredient_gaps.sql
-- Adds ingredients referenced by the 50-persona test suite that are missing
-- from ingredients_master: mushrooms (exclusion), beef (exclusion), pork (exclusion),
-- and common ingredient aliases: shellfish group, soy, nuts umbrella aliases.
--
-- Note: ingredient_aliases.ingredient_id had a FK pointing to the 'ingredients'
-- table (which has no seed data). Step 1 corrects this to ingredients_master.
-- =============================================================================

-- ─── Step 1: Fix FK — ingredient_aliases wrongly references 'ingredients' ────
--   The 'ingredients' table is empty; all seeded data lives in ingredients_master.
--   Drop the wrong constraint and re-add it pointing at ingredients_master.

ALTER TABLE public.ingredient_aliases
  DROP CONSTRAINT IF EXISTS ingredient_aliases_ingredient_id_fkey;

ALTER TABLE public.ingredient_aliases
  ADD CONSTRAINT ingredient_aliases_ingredient_id_fkey
    FOREIGN KEY (ingredient_id)
    REFERENCES public.ingredients_master(id)
    ON DELETE CASCADE;

-- ─── Step 2: Add missing exclusion ingredients ────────────────────────────────
-- These are food items personas declare as exclusions (not allergens).

INSERT INTO public.ingredients_master (name, is_allergen)
VALUES
  ('Mushroom',  FALSE),
  ('Beef',      FALSE),
  ('Pork',      FALSE)
ON CONFLICT (name) DO NOTHING;

-- ─── Step 3: Add ingredient aliases ──────────────────────────────────────────

INSERT INTO public.ingredient_aliases (ingredient_id, alias)
SELECT im.id, a.alias
FROM (VALUES
  -- Mushroom aliases (common exclusion ingredient)
  ('Mushroom', 'mushroom'),
  ('Mushroom', 'mushrooms'),
  ('Mushroom', 'khumbi'),

  -- Beef aliases
  ('Beef',     'beef'),
  ('Beef',     'gai ka gosht'),

  -- Pork aliases
  ('Pork',     'pork'),
  ('Pork',     'pig'),
  ('Pork',     'bacon'),
  ('Pork',     'ham'),

  -- Soy aliases (Soy already in ingredients_master, just needs lowercase alias)
  ('Soy',      'soy'),
  ('Soy',      'soya'),
  ('Soy',      'tofu'),
  ('Soy',      'soy sauce'),
  ('Soy',      'edamame'),

  -- Shellfish group aliases → map to Prawn as representative allergen
  ('Prawn',    'shellfish'),
  ('Prawn',    'shrimp'),
  ('Prawn',    'lobster'),

  -- Crab aliases
  ('Crab',     'crab'),
  ('Crab',     'crab meat'),

  -- Nuts umbrella aliases → map to Peanut as representative
  ('Peanut',   'nuts'),
  ('Peanut',   'tree nuts'),
  ('Peanut',   'peanuts'),
  ('Peanut',   'groundnut'),
  ('Peanut',   'groundnuts'),
  ('Peanut',   'mungfali'),
  ('Cashew',   'cashew nuts'),
  ('Almond',   'almond nuts')

) AS a(ingredient_name, alias)
JOIN public.ingredients_master im ON im.name = a.ingredient_name
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.ingredients_master IS
  'Canonical ingredient list. Allergen flag drives RE hard filters. '
  'Aliases in ingredient_aliases enable natural-language lookups.';
