-- =============================================================================
-- Migration: 20260525000001_persona_ingredient_gaps.sql
-- Adds ingredients referenced by the 50-persona test suite that are missing
-- from ingredients_master: mushrooms (exclusion), beef (exclusion), pork (exclusion),
-- and common ingredient aliases: shellfish group, soy, nuts umbrella aliases.
-- =============================================================================

-- ─── 1. Add missing exclusion ingredients ────────────────────────────────────
-- These are food items personas declare as exclusions (not allergens).

INSERT INTO public.ingredients_master (name, is_allergen)
VALUES
  ('Mushroom',  FALSE),
  ('Beef',      FALSE),
  ('Pork',      FALSE)
ON CONFLICT (name) DO NOTHING;

-- ─── 2. Add ingredient aliases ───────────────────────────────────────────────

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

  -- Nuts umbrella alias → map to Peanut as representative
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
