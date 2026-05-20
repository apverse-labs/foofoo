-- ============================================================
-- Migration 7: Seed tags + dish_tags for 20 seeded dishes
-- Doc 11A §4: tags table stores Food DNA taxonomy values.
-- dish_tags is the junction table linking dishes to their tags.
-- All 20 Tier 1 + Tier 2 tag categories seeded from day one
-- per Doc 10 §4.4 mandate (null-safe progressive enrichment).
-- ============================================================

-- ============================================================
-- 1. SEED tags TABLE
-- All Tier 1 + Tier 2 categories. Tier 3 stubs included for
-- schema completeness — can be enriched later without a migration.
-- ============================================================

INSERT INTO public.tags (category, value, display_name, tier, is_food_dna) VALUES

  -- TIER 1: spice_level
  ('spice_level', 'level_1', 'Very Mild',    1, TRUE),
  ('spice_level', 'level_2', 'Mild',         1, TRUE),
  ('spice_level', 'level_3', 'Medium Spicy', 1, TRUE),
  ('spice_level', 'level_4', 'Hot',          1, TRUE),

  -- TIER 1: dish_category
  ('dish_category', 'paratha_roti',  'Paratha / Roti',   1, FALSE),
  ('dish_category', 'dosa_idli',     'Dosa / Idli',      1, FALSE),
  ('dish_category', 'snack_starter', 'Snack / Starter',  1, FALSE),
  ('dish_category', 'chaat',         'Chaat',            1, FALSE),
  ('dish_category', 'curry',         'Curry',            1, FALSE),
  ('dish_category', 'dal_lentil',    'Dal / Lentil',     1, FALSE),
  ('dish_category', 'biryani_pulao', 'Biryani / Pulao',  1, FALSE),
  ('dish_category', 'rice',          'Rice',             1, FALSE),
  ('dish_category', 'bread',         'Bread',            1, FALSE),
  ('dish_category', 'salad_raita',   'Salad / Raita',    1, FALSE),
  ('dish_category', 'dessert_sweet', 'Dessert / Sweet',  1, FALSE),
  ('dish_category', 'beverage',      'Beverage',         1, FALSE),

  -- TIER 1: weather_affinity
  ('weather_affinity', 'rainy',        'Rainy Day',    1, TRUE),
  ('weather_affinity', 'cold_weather', 'Cold Weather', 1, TRUE),
  ('weather_affinity', 'hot_weather',  'Hot Weather',  1, TRUE),
  ('weather_affinity', 'all_weather',  'All Weather',  1, TRUE),

  -- TIER 1: dish_role
  ('dish_role', 'main',          'Main',          1, FALSE),
  ('dish_role', 'side',          'Side',          1, FALSE),
  ('dish_role', 'accompaniment', 'Accompaniment', 1, FALSE),
  ('dish_role', 'dessert',       'Dessert',       1, FALSE),
  ('dish_role', 'snack',         'Snack',         1, FALSE),
  ('dish_role', 'beverage',      'Beverage',      1, FALSE),
  ('dish_role', 'standalone',    'Standalone',    1, FALSE),
  ('dish_role', 'carb_base',     'Carb Base',     1, FALSE),
  ('dish_role', 'protein',       'Protein',       1, FALSE),
  ('dish_role', 'vegetable',     'Vegetable',     1, FALSE),

  -- TIER 2: cooking_method
  ('cooking_method', 'steamed',         'Steamed',          2, TRUE),
  ('cooking_method', 'pan_fried',       'Pan Fried',        2, TRUE),
  ('cooking_method', 'deep_fried',      'Deep Fried',       2, TRUE),
  ('cooking_method', 'slow_cooked',     'Slow Cooked',      2, TRUE),
  ('cooking_method', 'sauteed',         'Sautéed',          2, TRUE),
  ('cooking_method', 'pressure_cooked', 'Pressure Cooked',  2, TRUE),
  ('cooking_method', 'grilled',         'Grilled',          2, TRUE),
  ('cooking_method', 'baked',           'Baked',            2, TRUE),
  ('cooking_method', 'raw',             'Raw',              2, TRUE),
  ('cooking_method', 'tandoor',         'Tandoor',          2, TRUE),
  ('cooking_method', 'boiled',          'Boiled',           2, TRUE),
  ('cooking_method', 'roasted',         'Roasted',          2, TRUE),

  -- TIER 2: texture
  ('texture', 'crispy',   'Crispy',   2, TRUE),
  ('texture', 'soft',     'Soft',     2, TRUE),
  ('texture', 'creamy',   'Creamy',   2, TRUE),
  ('texture', 'crunchy',  'Crunchy',  2, TRUE),
  ('texture', 'chewy',    'Chewy',    2, TRUE),
  ('texture', 'fluffy',   'Fluffy',   2, TRUE),
  ('texture', 'grainy',   'Grainy',   2, TRUE),
  ('texture', 'sticky',   'Sticky',   2, TRUE),

  -- TIER 2: heaviness
  ('heaviness', 'light',    'Light',    2, TRUE),
  ('heaviness', 'moderate', 'Moderate', 2, TRUE),
  ('heaviness', 'heavy',    'Heavy',    2, TRUE),

  -- TIER 2: richness
  ('richness', 'plain',     'Plain',     2, TRUE),
  ('richness', 'buttery',   'Buttery',   2, TRUE),
  ('richness', 'creamy',    'Creamy',    2, TRUE),
  ('richness', 'oily',      'Oily',      2, TRUE),
  ('richness', 'ghee_rich', 'Ghee Rich', 2, TRUE),

  -- TIER 2: sweetness
  ('sweetness', 'none',   'Not Sweet',      2, TRUE),
  ('sweetness', 'low',    'Slightly Sweet', 2, TRUE),
  ('sweetness', 'medium', 'Medium Sweet',   2, TRUE),
  ('sweetness', 'high',   'Very Sweet',     2, TRUE),

  -- TIER 2: primary_taste
  ('primary_taste', 'savory', 'Savory', 2, TRUE),
  ('primary_taste', 'sweet',  'Sweet',  2, TRUE),
  ('primary_taste', 'spicy',  'Spicy',  2, TRUE),
  ('primary_taste', 'tangy',  'Tangy',  2, TRUE),
  ('primary_taste', 'bitter', 'Bitter', 2, TRUE),
  ('primary_taste', 'umami',  'Umami',  2, TRUE),
  ('primary_taste', 'bland',  'Bland',  2, TRUE),

  -- TIER 3: fermentation
  ('fermentation', 'none',   'Not Fermented',      3, TRUE),
  ('fermentation', 'light',  'Lightly Fermented',  3, TRUE),
  ('fermentation', 'medium', 'Fermented',          3, TRUE),
  ('fermentation', 'heavy',  'Heavily Fermented',  3, TRUE),

  -- TIER 3: serving_temp
  ('serving_temp', 'hot',       'Hot',       3, TRUE),
  ('serving_temp', 'warm',      'Warm',      3, TRUE),
  ('serving_temp', 'room_temp', 'Room Temp', 3, TRUE),
  ('serving_temp', 'chilled',   'Chilled',   3, TRUE),
  ('serving_temp', 'frozen',    'Frozen',    3, TRUE),

  -- TIER 3: health_tags
  ('health_tags', 'high_protein',  'High Protein',  3, TRUE),
  ('health_tags', 'high_fibre',    'High Fibre',    3, TRUE),
  ('health_tags', 'low_carb',      'Low Carb',      3, TRUE),
  ('health_tags', 'gut_friendly',  'Gut Friendly',  3, TRUE),
  ('health_tags', 'iron_rich',     'Iron Rich',     3, TRUE),
  ('health_tags', 'calcium_rich',  'Calcium Rich',  3, TRUE),
  ('health_tags', 'low_calorie',   'Low Calorie',   3, TRUE),
  ('health_tags', 'diabetic_safe', 'Diabetic Safe', 3, TRUE),

  -- TIER 3: mouthfeel
  ('mouthfeel', 'dry',        'Dry',        3, TRUE),
  ('mouthfeel', 'juicy',      'Juicy',      3, TRUE),
  ('mouthfeel', 'smooth',     'Smooth',     3, TRUE),
  ('mouthfeel', 'grainy',     'Grainy',     3, TRUE),
  ('mouthfeel', 'gelatinous', 'Gelatinous', 3, TRUE),

  -- TIER 3: aroma_profile
  ('aroma_profile', 'smoky',     'Smoky',     3, TRUE),
  ('aroma_profile', 'spiced',    'Spiced',    3, TRUE),
  ('aroma_profile', 'herby',     'Herby',     3, TRUE),
  ('aroma_profile', 'neutral',   'Neutral',   3, TRUE),
  ('aroma_profile', 'pungent',   'Pungent',   3, TRUE),
  ('aroma_profile', 'floral',    'Floral',    3, TRUE),
  ('aroma_profile', 'fermented', 'Fermented', 3, TRUE)

ON CONFLICT (category, value) DO NOTHING;

-- ============================================================
-- 2. SEED dish_tags FOR ALL 20 SEEDED DISHES
-- Uses subquery joins on slug (dishes) + category/value (tags)
-- to avoid hardcoding SERIAL IDs.
-- Dish slugs match exactly what was seeded in migration 1.
-- ============================================================

INSERT INTO public.dish_tags (dish_id, tag_id)
SELECT d.id, t.id FROM public.dishes d, public.tags t
WHERE (d.slug, t.category, t.value) IN (

  -- ── POHA ────────────────────────────────────────────────
  ('poha', 'spice_level',    'level_2'),
  ('poha', 'dish_category',  'snack_starter'),
  ('poha', 'weather_affinity','all_weather'),
  ('poha', 'dish_role',      'standalone'),
  ('poha', 'cooking_method', 'sauteed'),
  ('poha', 'texture',        'soft'),
  ('poha', 'heaviness',      'light'),
  ('poha', 'richness',       'plain'),
  ('poha', 'sweetness',      'none'),
  ('poha', 'primary_taste',  'savory'),

  -- ── UPMA ────────────────────────────────────────────────
  ('upma', 'spice_level',    'level_2'),
  ('upma', 'dish_category',  'snack_starter'),
  ('upma', 'weather_affinity','all_weather'),
  ('upma', 'dish_role',      'standalone'),
  ('upma', 'cooking_method', 'sauteed'),
  ('upma', 'texture',        'soft'),
  ('upma', 'heaviness',      'light'),
  ('upma', 'richness',       'plain'),
  ('upma', 'sweetness',      'none'),
  ('upma', 'primary_taste',  'savory'),

  -- ── RAVA UPMA ───────────────────────────────────────────
  ('rava-upma', 'spice_level',    'level_2'),
  ('rava-upma', 'dish_category',  'snack_starter'),
  ('rava-upma', 'weather_affinity','all_weather'),
  ('rava-upma', 'dish_role',      'standalone'),
  ('rava-upma', 'cooking_method', 'sauteed'),
  ('rava-upma', 'texture',        'soft'),
  ('rava-upma', 'heaviness',      'light'),
  ('rava-upma', 'richness',       'plain'),
  ('rava-upma', 'sweetness',      'none'),
  ('rava-upma', 'primary_taste',  'savory'),

  -- ── IDLI SAMBAR ─────────────────────────────────────────
  ('idli-sambar', 'spice_level',    'level_2'),
  ('idli-sambar', 'dish_category',  'dosa_idli'),
  ('idli-sambar', 'weather_affinity','all_weather'),
  ('idli-sambar', 'dish_role',      'standalone'),
  ('idli-sambar', 'cooking_method', 'steamed'),
  ('idli-sambar', 'texture',        'soft'),
  ('idli-sambar', 'heaviness',      'light'),
  ('idli-sambar', 'richness',       'plain'),
  ('idli-sambar', 'sweetness',      'none'),
  ('idli-sambar', 'primary_taste',  'savory'),
  ('idli-sambar', 'fermentation',   'medium'),

  -- ── MASALA DOSA ─────────────────────────────────────────
  ('masala-dosa', 'spice_level',    'level_2'),
  ('masala-dosa', 'dish_category',  'dosa_idli'),
  ('masala-dosa', 'weather_affinity','all_weather'),
  ('masala-dosa', 'dish_role',      'standalone'),
  ('masala-dosa', 'cooking_method', 'pan_fried'),
  ('masala-dosa', 'texture',        'crispy'),
  ('masala-dosa', 'heaviness',      'moderate'),
  ('masala-dosa', 'richness',       'oily'),
  ('masala-dosa', 'sweetness',      'none'),
  ('masala-dosa', 'primary_taste',  'savory'),
  ('masala-dosa', 'fermentation',   'medium'),

  -- ── ALOO PARATHA ────────────────────────────────────────
  ('aloo-paratha', 'spice_level',    'level_2'),
  ('aloo-paratha', 'dish_category',  'paratha_roti'),
  ('aloo-paratha', 'weather_affinity','cold_weather'),
  ('aloo-paratha', 'dish_role',      'main'),
  ('aloo-paratha', 'cooking_method', 'pan_fried'),
  ('aloo-paratha', 'texture',        'soft'),
  ('aloo-paratha', 'heaviness',      'moderate'),
  ('aloo-paratha', 'richness',       'buttery'),
  ('aloo-paratha', 'sweetness',      'none'),
  ('aloo-paratha', 'primary_taste',  'savory'),

  -- ── METHI THEPLA ────────────────────────────────────────
  ('methi-thepla', 'spice_level',    'level_2'),
  ('methi-thepla', 'dish_category',  'paratha_roti'),
  ('methi-thepla', 'weather_affinity','all_weather'),
  ('methi-thepla', 'dish_role',      'standalone'),
  ('methi-thepla', 'cooking_method', 'pan_fried'),
  ('methi-thepla', 'texture',        'soft'),
  ('methi-thepla', 'heaviness',      'light'),
  ('methi-thepla', 'richness',       'plain'),
  ('methi-thepla', 'sweetness',      'none'),
  ('methi-thepla', 'primary_taste',  'savory'),

  -- ── VADA PAV ────────────────────────────────────────────
  ('vada-pav', 'spice_level',    'level_3'),
  ('vada-pav', 'dish_category',  'chaat'),
  ('vada-pav', 'weather_affinity','rainy'),
  ('vada-pav', 'dish_role',      'snack'),
  ('vada-pav', 'cooking_method', 'deep_fried'),
  ('vada-pav', 'texture',        'crispy'),
  ('vada-pav', 'heaviness',      'moderate'),
  ('vada-pav', 'richness',       'oily'),
  ('vada-pav', 'sweetness',      'none'),
  ('vada-pav', 'primary_taste',  'savory'),

  -- ── MISAL PAV ───────────────────────────────────────────
  ('misal-pav', 'spice_level',    'level_4'),
  ('misal-pav', 'dish_category',  'curry'),
  ('misal-pav', 'weather_affinity','rainy'),
  ('misal-pav', 'dish_role',      'standalone'),
  ('misal-pav', 'cooking_method', 'sauteed'),
  ('misal-pav', 'texture',        'soft'),
  ('misal-pav', 'heaviness',      'moderate'),
  ('misal-pav', 'richness',       'oily'),
  ('misal-pav', 'sweetness',      'none'),
  ('misal-pav', 'primary_taste',  'spicy'),

  -- ── PAV BHAJI ───────────────────────────────────────────
  ('pav-bhaji', 'spice_level',    'level_3'),
  ('pav-bhaji', 'dish_category',  'snack_starter'),
  ('pav-bhaji', 'weather_affinity','rainy'),
  ('pav-bhaji', 'dish_role',      'standalone'),
  ('pav-bhaji', 'cooking_method', 'sauteed'),
  ('pav-bhaji', 'texture',        'soft'),
  ('pav-bhaji', 'heaviness',      'moderate'),
  ('pav-bhaji', 'richness',       'buttery'),
  ('pav-bhaji', 'sweetness',      'none'),
  ('pav-bhaji', 'primary_taste',  'savory'),

  -- ── CHOLE BHATURE ───────────────────────────────────────
  ('chole-bhature', 'spice_level',    'level_3'),
  ('chole-bhature', 'dish_category',  'curry'),
  ('chole-bhature', 'weather_affinity','cold_weather'),
  ('chole-bhature', 'dish_role',      'main'),
  ('chole-bhature', 'cooking_method', 'deep_fried'),
  ('chole-bhature', 'texture',        'crispy'),
  ('chole-bhature', 'heaviness',      'heavy'),
  ('chole-bhature', 'richness',       'oily'),
  ('chole-bhature', 'sweetness',      'none'),
  ('chole-bhature', 'primary_taste',  'savory'),

  -- ── DAL MAKHANI ─────────────────────────────────────────
  ('dal-makhani', 'spice_level',    'level_2'),
  ('dal-makhani', 'dish_category',  'dal_lentil'),
  ('dal-makhani', 'weather_affinity','cold_weather'),
  ('dal-makhani', 'dish_role',      'main'),
  ('dal-makhani', 'cooking_method', 'slow_cooked'),
  ('dal-makhani', 'texture',        'creamy'),
  ('dal-makhani', 'heaviness',      'heavy'),
  ('dal-makhani', 'richness',       'creamy'),
  ('dal-makhani', 'sweetness',      'none'),
  ('dal-makhani', 'primary_taste',  'savory'),

  -- ── BUTTER CHICKEN ──────────────────────────────────────
  ('butter-chicken', 'spice_level',    'level_2'),
  ('butter-chicken', 'dish_category',  'curry'),
  ('butter-chicken', 'weather_affinity','cold_weather'),
  ('butter-chicken', 'dish_role',      'main'),
  ('butter-chicken', 'cooking_method', 'grilled'),
  ('butter-chicken', 'texture',        'creamy'),
  ('butter-chicken', 'heaviness',      'heavy'),
  ('butter-chicken', 'richness',       'creamy'),
  ('butter-chicken', 'sweetness',      'low'),
  ('butter-chicken', 'primary_taste',  'savory'),

  -- ── PALAK PANEER ────────────────────────────────────────
  ('palak-paneer', 'spice_level',    'level_2'),
  ('palak-paneer', 'dish_category',  'curry'),
  ('palak-paneer', 'weather_affinity','cold_weather'),
  ('palak-paneer', 'dish_role',      'main'),
  ('palak-paneer', 'cooking_method', 'sauteed'),
  ('palak-paneer', 'texture',        'creamy'),
  ('palak-paneer', 'heaviness',      'moderate'),
  ('palak-paneer', 'richness',       'creamy'),
  ('palak-paneer', 'sweetness',      'none'),
  ('palak-paneer', 'primary_taste',  'savory'),

  -- ── RAJMA CHAWAL ────────────────────────────────────────
  ('rajma-chawal', 'spice_level',    'level_2'),
  ('rajma-chawal', 'dish_category',  'dal_lentil'),
  ('rajma-chawal', 'weather_affinity','cold_weather'),
  ('rajma-chawal', 'dish_role',      'main'),
  ('rajma-chawal', 'cooking_method', 'pressure_cooked'),
  ('rajma-chawal', 'texture',        'soft'),
  ('rajma-chawal', 'heaviness',      'heavy'),
  ('rajma-chawal', 'richness',       'plain'),
  ('rajma-chawal', 'sweetness',      'none'),
  ('rajma-chawal', 'primary_taste',  'savory'),

  -- ── KADHI PAKORA ────────────────────────────────────────
  ('kadhi-pakora', 'spice_level',    'level_2'),
  ('kadhi-pakora', 'dish_category',  'curry'),
  ('kadhi-pakora', 'weather_affinity','cold_weather'),
  ('kadhi-pakora', 'dish_role',      'main'),
  ('kadhi-pakora', 'cooking_method', 'deep_fried'),
  ('kadhi-pakora', 'texture',        'crispy'),
  ('kadhi-pakora', 'heaviness',      'moderate'),
  ('kadhi-pakora', 'richness',       'creamy'),
  ('kadhi-pakora', 'sweetness',      'none'),
  ('kadhi-pakora', 'primary_taste',  'tangy'),

  -- ── BIRYANI ─────────────────────────────────────────────
  ('biryani', 'spice_level',    'level_3'),
  ('biryani', 'dish_category',  'biryani_pulao'),
  ('biryani', 'weather_affinity','all_weather'),
  ('biryani', 'dish_role',      'main'),
  ('biryani', 'cooking_method', 'slow_cooked'),
  ('biryani', 'texture',        'soft'),
  ('biryani', 'heaviness',      'heavy'),
  ('biryani', 'richness',       'ghee_rich'),
  ('biryani', 'sweetness',      'none'),
  ('biryani', 'primary_taste',  'savory'),

  -- ── SAMBAR RICE ─────────────────────────────────────────
  ('sambar-rice', 'spice_level',    'level_2'),
  ('sambar-rice', 'dish_category',  'rice'),
  ('sambar-rice', 'weather_affinity','all_weather'),
  ('sambar-rice', 'dish_role',      'main'),
  ('sambar-rice', 'cooking_method', 'boiled'),
  ('sambar-rice', 'texture',        'soft'),
  ('sambar-rice', 'heaviness',      'light'),
  ('sambar-rice', 'richness',       'plain'),
  ('sambar-rice', 'sweetness',      'none'),
  ('sambar-rice', 'primary_taste',  'savory'),

  -- ── FISH CURRY ──────────────────────────────────────────
  ('fish-curry', 'spice_level',    'level_4'),
  ('fish-curry', 'dish_category',  'curry'),
  ('fish-curry', 'weather_affinity','rainy'),
  ('fish-curry', 'dish_role',      'main'),
  ('fish-curry', 'cooking_method', 'sauteed'),
  ('fish-curry', 'texture',        'soft'),
  ('fish-curry', 'heaviness',      'moderate'),
  ('fish-curry', 'richness',       'oily'),
  ('fish-curry', 'sweetness',      'none'),
  ('fish-curry', 'primary_taste',  'spicy'),

  -- ── PANEER BUTTER MASALA ────────────────────────────────
  ('paneer-butter-masala', 'spice_level',    'level_2'),
  ('paneer-butter-masala', 'dish_category',  'curry'),
  ('paneer-butter-masala', 'weather_affinity','cold_weather'),
  ('paneer-butter-masala', 'dish_role',      'main'),
  ('paneer-butter-masala', 'cooking_method', 'sauteed'),
  ('paneer-butter-masala', 'texture',        'creamy'),
  ('paneer-butter-masala', 'heaviness',      'heavy'),
  ('paneer-butter-masala', 'richness',       'creamy'),
  ('paneer-butter-masala', 'sweetness',      'low'),
  ('paneer-butter-masala', 'primary_taste',  'savory')

)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. BACK-FILL dishes columns from tags (Tier 1 denorm)
-- dishes.heaviness (SMALLINT) populated from heaviness tag.
-- Keeps column + tag in sync for RE hard filter + tag search.
-- ============================================================

UPDATE public.dishes d
SET heaviness = CASE
  WHEN t.value = 'light'    THEN 1
  WHEN t.value = 'moderate' THEN 2
  WHEN t.value = 'heavy'    THEN 3
END
FROM public.dish_tags dt
JOIN public.tags t ON t.id = dt.tag_id
WHERE dt.dish_id = d.id
  AND t.category = 'heaviness'
  AND d.heaviness IS NULL;

-- ============================================================
-- VERIFY
--   SELECT COUNT(*) FROM public.tags;
--   -- expect 90+
--
--   SELECT category, COUNT(*) FROM public.tags
--   GROUP BY category ORDER BY category;
--
--   SELECT COUNT(*) FROM public.dish_tags;
--   -- expect 200 (20 dishes × 10 tags each)
--
--   SELECT d.name, array_agg(t.category || ':' || t.value ORDER BY t.category)
--   FROM public.dishes d
--   JOIN public.dish_tags dt ON dt.dish_id = d.id
--   JOIN public.tags t ON t.id = dt.tag_id
--   GROUP BY d.name ORDER BY d.name;
--   -- each dish should show 10 tags across 10 categories
-- ============================================================
