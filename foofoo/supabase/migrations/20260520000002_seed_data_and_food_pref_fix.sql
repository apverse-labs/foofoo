-- ============================================================
-- Sprint 2 Fix: missing food_pref column + all seed data
-- Paste this entire file into Supabase Dashboard → SQL Editor
-- ============================================================

-- Fix 1: Add food_pref to user_diet_rules (was missing from live DB)
ALTER TABLE public.user_diet_rules
  ADD COLUMN IF NOT EXISTS food_pref TEXT
    CHECK (food_pref IN ('veg','non_veg','egg','vegan','jain'));

-- Fix 2: Harden handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[handle_new_user] profile creation failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix 3: Back-fill profile rows for any existing auth users
INSERT INTO public.profiles (id, name)
SELECT au.id, COALESCE(au.raw_user_meta_data->>'full_name', '')
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Seed: cuisines_master (17 rows)
-- ============================================================
INSERT INTO public.cuisines_master (code, name, display_name, tier, display_order) VALUES
  ('north_indian',  'North Indian',  'North Indian',  1, 1),
  ('south_indian',  'South Indian',  'South Indian',  1, 2),
  ('punjabi',       'Punjabi',       'Punjabi',       1, 3),
  ('gujarati',      'Gujarati',      'Gujarati',      1, 4),
  ('maharashtrian', 'Maharashtrian', 'Maharashtrian', 1, 5),
  ('bengali',       'Bengali',       'Bengali',       1, 6),
  ('rajasthani',    'Rajasthani',    'Rajasthani',    1, 7),
  ('street_food',   'Street Food',   'Street Food',   1, 8),
  ('hyderabadi',    'Hyderabadi',    'Hyderabadi',    2, 1),
  ('goan',          'Goan',          'Goan',          2, 2),
  ('kerala',        'Kerala',        'Kerala',        2, 3),
  ('tamil',         'Tamil',         'Tamil',         2, 4),
  ('mughlai',       'Mughlai',       'Mughlai',       2, 5),
  ('indo_chinese',  'Indo-Chinese',  'Indo-Chinese',  2, 6),
  ('odia',          'Odia',          'Odia',          3, 1),
  ('kashmiri',      'Kashmiri',      'Kashmiri',      3, 2),
  ('continental',   'Continental',   'Continental',   3, 3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed: ingredients_master (20 rows)
-- ============================================================
INSERT INTO public.ingredients_master (name, is_allergen) VALUES
  ('Peanut',    TRUE),
  ('Milk',      TRUE),
  ('Cashew',    TRUE),
  ('Almond',    TRUE),
  ('Walnut',    TRUE),
  ('Pistachio', TRUE),
  ('Wheat',     TRUE),
  ('Egg',       TRUE),
  ('Fish',      TRUE),
  ('Prawn',     TRUE),
  ('Crab',      TRUE),
  ('Soy',       TRUE),
  ('Sesame',    TRUE),
  ('Mustard',   TRUE),
  ('Onion',     FALSE),
  ('Garlic',    FALSE),
  ('Coconut',   FALSE),
  ('Tomato',    FALSE),
  ('Paneer',    FALSE),
  ('Curd',      FALSE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed: ingredient_aliases (51 rows)
-- ============================================================
INSERT INTO public.ingredient_aliases (ingredient_id, alias)
SELECT im.id, a.alias
FROM (VALUES
  ('Peanut',    'peanut'),
  ('Peanut',    'groundnut'),
  ('Peanut',    'moongphali'),
  ('Milk',      'milk'),
  ('Milk',      'dairy'),
  ('Milk',      'lactose'),
  ('Milk',      'cream'),
  ('Cashew',    'cashew'),
  ('Cashew',    'kaju'),
  ('Almond',    'almond'),
  ('Almond',    'badam'),
  ('Walnut',    'walnut'),
  ('Walnut',    'akhrot'),
  ('Pistachio', 'pistachio'),
  ('Pistachio', 'pista'),
  ('Wheat',     'wheat'),
  ('Wheat',     'gluten'),
  ('Wheat',     'maida'),
  ('Wheat',     'atta'),
  ('Egg',       'egg'),
  ('Egg',       'eggs'),
  ('Egg',       'anda'),
  ('Fish',      'fish'),
  ('Fish',      'salmon'),
  ('Fish',      'tuna'),
  ('Fish',      'pomfret'),
  ('Fish',      'mackerel'),
  ('Prawn',     'prawn'),
  ('Prawn',     'shrimp'),
  ('Prawn',     'jhinga'),
  ('Crab',      'crab'),
  ('Crab',      'lobster'),
  ('Soy',       'soy'),
  ('Soy',       'soya'),
  ('Soy',       'tofu'),
  ('Sesame',    'sesame'),
  ('Sesame',    'til'),
  ('Mustard',   'mustard'),
  ('Mustard',   'sarso'),
  ('Onion',     'onion'),
  ('Onion',     'pyaz'),
  ('Garlic',    'garlic'),
  ('Garlic',    'lahsun'),
  ('Coconut',   'coconut'),
  ('Coconut',   'nariyal'),
  ('Tomato',    'tomato'),
  ('Paneer',    'paneer'),
  ('Paneer',    'cottage cheese'),
  ('Curd',      'curd'),
  ('Curd',      'yogurt'),
  ('Curd',      'dahi')
) AS a(ingredient_name, alias)
JOIN public.ingredients_master im ON im.name = a.ingredient_name
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed: dishes (20 rows)
-- ============================================================
INSERT INTO public.dishes (name, slug, cuisine_id, diet_type, dish_role, meal_types, spice_level, difficulty, cook_time_mins, calories)
SELECT
  d.name, d.slug,
  (SELECT id FROM public.cuisines_master WHERE code = d.cuisine_code),
  d.diet_type, d.dish_role,
  string_to_array(d.meal_types_str, ','),
  d.spice_level::INTEGER,
  d.difficulty,
  d.cook_time_mins::INTEGER,
  d.calories::INTEGER
FROM (VALUES
  ('Aloo Paratha',         'aloo-paratha',         'north_indian',  'veg',     'main', 'breakfast',       2, 'easy',   20, 320),
  ('Poha',                 'poha',                 'maharashtrian', 'veg',     'main', 'breakfast',       1, 'easy',   15, 200),
  ('Upma',                 'upma',                 'south_indian',  'veg',     'main', 'breakfast',       1, 'easy',   20, 180),
  ('Idli Sambar',          'idli-sambar',          'south_indian',  'veg',     'main', 'breakfast',       1, 'easy',   30, 220),
  ('Masala Dosa',          'masala-dosa',          'south_indian',  'veg',     'main', 'breakfast,lunch', 1, 'medium', 30, 280),
  ('Vada Pav',             'vada-pav',             'maharashtrian', 'veg',     'main', 'breakfast,lunch', 2, 'easy',   20, 350),
  ('Misal Pav',            'misal-pav',            'maharashtrian', 'veg',     'main', 'breakfast',       3, 'medium', 30, 380),
  ('Chole Bhature',        'chole-bhature',        'punjabi',       'veg',     'main', 'breakfast,lunch', 3, 'medium', 40, 520),
  ('Dal Makhani',          'dal-makhani',          'punjabi',       'veg',     'main', 'lunch,dinner',    2, 'hard',   60, 420),
  ('Butter Chicken',       'butter-chicken',       'north_indian',  'non_veg', 'main', 'lunch,dinner',    2, 'medium', 45, 480),
  ('Palak Paneer',         'palak-paneer',         'north_indian',  'veg',     'main', 'lunch,dinner',    2, 'medium', 35, 350),
  ('Rajma Chawal',         'rajma-chawal',         'north_indian',  'veg',     'main', 'lunch,dinner',    2, 'medium', 50, 450),
  ('Biryani',              'biryani',              'hyderabadi',    'non_veg', 'main', 'lunch,dinner',    3, 'hard',   60, 550),
  ('Sambar Rice',          'sambar-rice',          'south_indian',  'veg',     'main', 'lunch,dinner',    2, 'easy',   30, 380),
  ('Pav Bhaji',            'pav-bhaji',            'street_food',   'veg',     'main', 'lunch,dinner',    2, 'medium', 30, 400),
  ('Kadhi Pakora',         'kadhi-pakora',         'gujarati',      'veg',     'main', 'lunch,dinner',    2, 'medium', 40, 360),
  ('Fish Curry',           'fish-curry',           'goan',          'non_veg', 'main', 'lunch,dinner',    3, 'medium', 40, 420),
  ('Paneer Butter Masala', 'paneer-butter-masala', 'north_indian',  'veg',     'main', 'lunch,dinner',    2, 'medium', 35, 420),
  ('Rava Upma',            'rava-upma',            'south_indian',  'veg',     'main', 'breakfast',       1, 'easy',   15, 170),
  ('Methi Thepla',         'methi-thepla',         'gujarati',      'veg',     'main', 'breakfast,lunch', 2, 'easy',   25, 240)
) AS d(name, slug, cuisine_code, diet_type, dish_role, meal_types_str, spice_level, difficulty, cook_time_mins, calories)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Verify — these should all return the expected counts:
SELECT 'cuisines_master'    AS tbl, COUNT(*) AS rows FROM public.cuisines_master
UNION ALL
SELECT 'ingredients_master', COUNT(*) FROM public.ingredients_master
UNION ALL
SELECT 'ingredient_aliases', COUNT(*) FROM public.ingredient_aliases
UNION ALL
SELECT 'dishes',             COUNT(*) FROM public.dishes;
-- Expected: 17 / 20 / 51 / 20
-- ============================================================
