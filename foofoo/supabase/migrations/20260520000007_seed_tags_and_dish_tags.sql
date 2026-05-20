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

INSERT INTO public.tags (category, value, tier) VALUES

  -- TIER 1: spice_level (Doc 10 §4.2 — hard filter, day-one)
  ('spice_level', 'level_1', 1),   -- very mild (suitable for kids, elderly)
  ('spice_level', 'level_2', 1),   -- mild
  ('spice_level', 'level_3', 1),   -- medium
  ('spice_level', 'level_4', 1),   -- hot

  -- TIER 1: dish_category (Doc 11A §4 — primary classification)
  ('dish_category', 'paratha_roti',     1),
  ('dish_category', 'dosa_idli',        1),
  ('dish_category', 'snack_starter',    1),
  ('dish_category', 'chaat',            1),
  ('dish_category', 'curry',            1),
  ('dish_category', 'dal_lentil',       1),
  ('dish_category', 'biryani_pulao',    1),
  ('dish_category', 'rice',             1),
  ('dish_category', 'bread',            1),
  ('dish_category', 'salad_raita',      1),
  ('dish_category', 'dessert_sweet',    1),
  ('dish_category', 'beverage',         1),

  -- TIER 1: weather_affinity (Doc 10 §6 — weather filter)
  ('weather_affinity', 'rainy',        1),
  ('weather_affinity', 'cold_weather', 1),
  ('weather_affinity', 'hot_weather',  1),
  ('weather_affinity', 'all_weather',  1),

  -- TIER 1: dish_role (Doc 11A §2.1 — meal slot structuring)
  ('dish_role', 'main',          1),
  ('dish_role', 'side',          1),
  ('dish_role', 'accompaniment', 1),
  ('dish_role', 'dessert',       1),
  ('dish_role', 'snack',         1),
  ('dish_role', 'beverage',      1),
  ('dish_role', 'standalone',    1),
  ('dish_role', 'carb_base',     1),
  ('dish_role', 'protein',       1),
  ('dish_role', 'vegetable',     1),

  -- TIER 2: cooking_method (Doc 10 §4.4 — Tier 2 scoring)
  ('cooking_method', 'steamed',          2),
  ('cooking_method', 'pan_fried',        2),
  ('cooking_method', 'deep_fried',       2),
  ('cooking_method', 'slow_cooked',      2),
  ('cooking_method', 'sauteed',          2),
  ('cooking_method', 'pressure_cooked',  2),
  ('cooking_method', 'grilled',          2),
  ('cooking_method', 'baked',            2),
  ('cooking_method', 'raw',              2),
  ('cooking_method', 'tandoor',          2),
  ('cooking_method', 'boiled',           2),
  ('cooking_method', 'roasted',          2),

  -- TIER 2: texture (Doc 10 §4.4)
  ('texture', 'crispy',   2),
  ('texture', 'soft',     2),
  ('texture', 'creamy',   2),
  ('texture', 'crunchy',  2),
  ('texture', 'chewy',    2),
  ('texture', 'fluffy',   2),
  ('texture', 'grainy',   2),
  ('texture', 'sticky',   2),

  -- TIER 2: heaviness (1=light, 2=moderate, 3=heavy)
  -- Stored as tags for searchability alongside dishes.heaviness column
  ('heaviness', 'light',    2),
  ('heaviness', 'moderate', 2),
  ('heaviness', 'heavy',    2),

  -- TIER 2: richness (mirrors dishes.richness CHECK constraint)
  ('richness', 'plain',     2),
  ('richness', 'buttery',   2),
  ('richness', 'creamy',    2),
  ('richness', 'oily',      2),
  ('richness', 'ghee_rich', 2),

  -- TIER 2: sweetness (0–3 scale)
  ('sweetness', 'none',    2),
  ('sweetness', 'low',     2),
  ('sweetness', 'medium',  2),
  ('sweetness', 'high',    2),

  -- TIER 2: primary_taste (Doc 10 §4.4)
  ('primary_taste', 'savory',  2),
  ('primary_taste', 'sweet',   2),
  ('primary_taste', 'spicy',   2),
  ('primary_taste', 'tangy',   2),
  ('primary_taste', 'bitter',  2),
  ('primary_taste', 'umami',   2),
  ('primary_taste', 'bland',   2),

  -- TIER 3: fermentation (Phase 2+)
  ('fermentation', 'none',   3),
  ('fermentation', 'light',  3),
  ('fermentation', 'medium', 3),
  ('fermentation', 'heavy',  3),

  -- TIER 3: serving_temp (Phase 2+)
  ('serving_temp', 'hot',       3),
  ('serving_temp', 'warm',      3),
  ('serving_temp', 'room_temp', 3),
  ('serving_temp', 'chilled',   3),
  ('serving_temp', 'frozen',    3),

  -- TIER 3: health_tags (Phase 2+)
  ('health_tags', 'high_protein',   3),
  ('health_tags', 'high_fibre',     3),
  ('health_tags', 'low_carb',       3),
  ('health_tags', 'gut_friendly',   3),
  ('health_tags', 'iron_rich',      3),
  ('health_tags', 'calcium_rich',   3),
  ('health_tags', 'low_calorie',    3),
  ('health_tags', 'diabetic_safe',  3),

  -- TIER 3: mouthfeel (Phase 2+)
  ('mouthfeel', 'dry',      3),
  ('mouthfeel', 'juicy',    3),
  ('mouthfeel', 'smooth',   3),
  ('mouthfeel', 'grainy',   3),
  ('mouthfeel', 'gelatinous', 3),

  -- TIER 3: aroma_profile (Phase 2+)
  ('aroma_profile', 'smoky',      3),
  ('aroma_profile', 'spiced',     3),
  ('aroma_profile', 'herby',      3),
  ('aroma_profile', 'neutral',    3),
  ('aroma_profile', 'pungent',    3),
  ('aroma_profile', 'floral',     3),
  ('aroma_profile', 'fermented',  3)

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
