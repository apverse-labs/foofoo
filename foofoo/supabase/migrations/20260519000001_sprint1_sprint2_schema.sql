-- ============================================================
-- FooFoo Sprint 1 + Sprint 2 — Complete Schema Migration v2
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to run multiple times
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE + AUTH TRIGGER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT,
  name                  TEXT NOT NULL DEFAULT '',
  username              TEXT,
  avatar_url            TEXT,
  food_pref             TEXT CHECK (food_pref IN ('veg','non_veg','egg','vegan','jain')),
  home_state            TEXT,
  current_city          TEXT,
  household_type        TEXT,
  role                  TEXT CHECK (role IN ('cook','instruct')),
  onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_step       INTEGER NOT NULL DEFAULT 0,
  notification_time     TEXT DEFAULT '08:00',
  notifications_enabled BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add username unique index if it doesn't exist yet
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username)
  WHERE username IS NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_select_own') THEN
    CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_update_own') THEN
    CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_insert_own') THEN
    CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Trigger: auto-create profile row on every new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. USER CONSENT TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_consent (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data_consent_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_consent_user_id_idx ON public.user_consent (user_id);

ALTER TABLE public.user_consent ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_consent' AND policyname='consent_all_own') THEN
    CREATE POLICY consent_all_own ON public.user_consent FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 3. USER DIET RULES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_diet_rules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  food_pref            TEXT CHECK (food_pref IN ('veg','non_veg','egg','vegan','jain')),
  excluded_ingredients INTEGER[] NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_diet_rules_user_id_idx ON public.user_diet_rules (user_id);

ALTER TABLE public.user_diet_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_diet_rules' AND policyname='diet_rules_all_own') THEN
    CREATE POLICY diet_rules_all_own ON public.user_diet_rules FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 4. USER CATEGORY PREFERENCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_category_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_type TEXT NOT NULL CHECK (category_type IN ('cuisine','meal_item')),
  category_id   TEXT NOT NULL,
  bucket        TEXT NOT NULL CHECK (bucket IN ('F','O','N')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ucp_user_type_id_idx
  ON public.user_category_preferences (user_id, category_type, category_id);

CREATE INDEX IF NOT EXISTS ucp_user_type_idx
  ON public.user_category_preferences (user_id, category_type);

ALTER TABLE public.user_category_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_category_preferences' AND policyname='cat_prefs_all_own') THEN
    CREATE POLICY cat_prefs_all_own ON public.user_category_preferences FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 5. CUISINES MASTER TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cuisines_master (
  id             SERIAL PRIMARY KEY,
  code           TEXT NOT NULL,
  name           TEXT NOT NULL,
  display_name   TEXT NOT NULL,
  tier           INTEGER NOT NULL DEFAULT 1,
  display_order  INTEGER NOT NULL DEFAULT 1,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  is_user_facing BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cuisines_master_code_idx ON public.cuisines_master (code);

ALTER TABLE public.cuisines_master ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cuisines_master' AND policyname='cuisines_select_auth') THEN
    CREATE POLICY cuisines_select_auth ON public.cuisines_master FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

-- Seed cuisines (ON CONFLICT DO NOTHING — no column target needed)
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
-- 6. INGREDIENTS MASTER TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ingredients_master (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  is_allergen BOOLEAN NOT NULL DEFAULT FALSE,
  diet_flag   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ingredients_master_name_idx ON public.ingredients_master (name);

ALTER TABLE public.ingredients_master ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ingredients_master' AND policyname='ingredients_select_auth') THEN
    CREATE POLICY ingredients_select_auth ON public.ingredients_master FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

-- Seed allergens — using name as conflict key (unique index created above)
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
-- 7. INGREDIENT ALIASES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ingredient_aliases (
  id            SERIAL PRIMARY KEY,
  ingredient_id INTEGER NOT NULL REFERENCES public.ingredients_master(id) ON DELETE CASCADE,
  alias         TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ingredient_aliases_alias_idx ON public.ingredient_aliases (alias);

CREATE INDEX IF NOT EXISTS ingredient_aliases_ingr_idx ON public.ingredient_aliases (ingredient_id);

ALTER TABLE public.ingredient_aliases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ingredient_aliases' AND policyname='aliases_select_auth') THEN
    CREATE POLICY aliases_select_auth ON public.ingredient_aliases FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

-- Seed aliases — join on ingredient name to get correct ID even if SERIAL assigned differently
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
-- 8. DISHES TABLE + 20 SEED DISHES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dishes (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL,
  cuisine_id     INTEGER REFERENCES public.cuisines_master(id),
  diet_type      TEXT CHECK (diet_type IN ('veg','non_veg','egg','vegan','jain')),
  dish_role      TEXT NOT NULL DEFAULT 'main',
  meal_types     TEXT[] NOT NULL DEFAULT '{}',
  spice_level    INTEGER NOT NULL DEFAULT 2 CHECK (spice_level BETWEEN 1 AND 4),
  difficulty     TEXT NOT NULL DEFAULT 'medium',
  cook_time_mins INTEGER NOT NULL DEFAULT 30,
  calories       INTEGER NOT NULL DEFAULT 300,
  hero_image_url TEXT,
  blurhash       TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS dishes_slug_idx ON public.dishes (slug);

ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='dishes' AND policyname='dishes_select_auth') THEN
    CREATE POLICY dishes_select_auth ON public.dishes FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

-- Seed dishes — join on cuisine code for safe ID lookup
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
-- VERIFICATION — run these SELECTs to confirm success:
--   SELECT COUNT(*) FROM public.cuisines_master;   -- expect 17
--   SELECT COUNT(*) FROM public.ingredients_master; -- expect 20
--   SELECT COUNT(*) FROM public.ingredient_aliases; -- expect 51
--   SELECT COUNT(*) FROM public.dishes;             -- expect 20
-- ============================================================
