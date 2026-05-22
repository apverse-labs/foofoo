-- Sprint 5 Day-0 Content Backfill
-- Applied 2026-05-22 via Supabase MCP across three migrations:
--   sprint5_backfill_ingredients         (20260522054922 → defines + runs backfill_ingredients_v1)
--   sprint5_auto_tag_dishes              (defines + runs auto_tag_dishes)
--   sprint5_rederive_dish_attributes     (rewrites derive_dish_attributes to slug-based logic)
--   sprint5_rederive_fix_etl_jobs_columns
--   sprint5_rederive_fix_status_constraint
-- This file consolidates the final state into one reproducible migration.

-- ──────────────────────────────────────────────────────────────────
-- Part A — Ingredient backfill function.
-- See supabase/functions/backfill-ingredients/index.ts for the spec.
-- Idempotent via meal_ingredients UNIQUE (dish_id, ingredient_id) +
-- ON CONFLICT DO NOTHING.
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.backfill_ingredients_v1()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
DECLARE
  patterns CONSTANT text[][] := ARRAY[
    ARRAY['biryani',  'basmati-rice,onion,ginger,garlic,garam-masala,curd,ghee,coriander-leaves'],
    ARRAY['pulao',    'basmati-rice,onion,ghee,cumin,garam-masala'],
    ARRAY['khichdi',  'rice,moong-dal,turmeric,cumin,ghee'],
    ARRAY['sambar',   'toor-dal,tomato,tamarind,turmeric,mustard-seeds,curry-leaves,drumstick'],
    ARRAY['rasam',    'toor-dal,tomato,tamarind,black-pepper,cumin,curry-leaves,coriander-leaves'],
    ARRAY['idli',     'urad-dal,rice,mustard-seeds,curry-leaves'],
    ARRAY['dosa',     'urad-dal,rice,mustard-seeds'],
    ARRAY['upma',     'semolina,onion,mustard-seeds,curry-leaves,ginger,peas,coriander-leaves'],
    ARRAY['poha',     'poha,onion,mustard-seeds,curry-leaves,turmeric,peanuts,coriander-leaves'],
    ARRAY['paratha',  'wheat-flour,ghee,cumin'],
    ARRAY['roti',     'wheat-flour,ghee'],
    ARRAY['paneer',   'paneer,onion,tomato,cream,cumin,coriander,turmeric,red-chilli,garam-masala'],
    ARRAY['dal',      'toor-dal,onion,tomato,turmeric,cumin,coriander,red-chilli,ghee,garlic,ginger'],
    ARRAY['chicken',  'chicken,onion,tomato,ginger,garlic,garam-masala,coriander,turmeric,red-chilli'],
    ARRAY['mutton',   'mutton,onion,ginger,garlic,garam-masala,coriander,turmeric,curd'],
    ARRAY['fish',     'fish,onion,tomato,turmeric,red-chilli,coriander,mustard-seeds,curry-leaves'],
    ARRAY['prawn',    'prawns,onion,tomato,turmeric,red-chilli,coriander,curry-leaves'],
    ARRAY['egg',      'eggs,onion,tomato,turmeric,cumin,coriander,red-chilli'],
    ARRAY['halwa',    'semolina,sugar,ghee,cardamom,cashews'],
    ARRAY['ladoo',    'besan,sugar,ghee,cardamom'],
    ARRAY['kheer',    'milk,rice,sugar,cardamom,cashews'],
    ARRAY['payasam',  'milk,rice,sugar,cardamom'],
    ARRAY['raita',    'curd,cumin,coriander-leaves,black-pepper'],
    ARRAY['chutney',  'coriander-leaves,mint,garlic,ginger,red-chilli,tamarind'],
    ARRAY['curry',    'onion,tomato,ginger,garlic,turmeric,coriander,red-chilli,garam-masala,sunflower-oil'],
    ARRAY['sabzi',    'onion,tomato,turmeric,coriander,red-chilli,cumin,sunflower-oil'],
    ARRAY['soup',     'onion,tomato,garlic,black-pepper,coriander-leaves'],
    ARRAY['rice',     'rice,cumin,ghee']
  ];

  cuisine_defaults CONSTANT jsonb := jsonb_build_object(
    'punjabi',        'onion,tomato,ginger,garlic,cumin,coriander,turmeric,red-chilli,ghee',
    'south_indian',   'mustard-seeds,curry-leaves,coconut,tamarind,urad-dal,red-chilli',
    'gujarati',       'mustard-seeds,turmeric,sugar,coriander-leaves',
    'maharashtrian',  'mustard-seeds,curry-leaves,coconut,tamarind,coriander-leaves',
    'bengali',        'mustard-oil,mustard-seeds,turmeric,ginger',
    'rajasthani',     'ghee,cumin,coriander,red-chilli'
  );

  cuisine_name_map CONSTANT jsonb := jsonb_build_object(
    'punjabi','punjabi','north indian','punjabi','delhi','punjabi','mughlai','punjabi',
    'awadhi','punjabi','up (general)','punjabi','kashmiri','punjabi',
    'south indian','south_indian','tamil','south_indian','kerala','south_indian',
    'karnataka','south_indian','andhra','south_indian','telangana','south_indian',
    'chettinad','south_indian','malabar','south_indian','udupi','south_indian',
    'hyderabadi','south_indian','mangalorean','south_indian','coorg (kodava)','south_indian',
    'gujarati','gujarati','kutchi','gujarati',
    'maharashtrian','maharashtrian','kolhapuri','maharashtrian','malvani','maharashtrian',
    'vidarbha','maharashtrian','konkani','maharashtrian','goan','maharashtrian',
    'bengali','bengali','odia','bengali','assamese','bengali',
    'rajasthani','rajasthani','indori','rajasthani','madhya pradesh','rajasthani'
  );

  rec record;
  pattern_row text[];
  matched_key text;
  slug_list text;
  slug_arr text[];
  cuisine_name_lc text;
  cuisine_key text;
  diet text;
  inserted_rows integer;
  dishes_linked integer := 0;
  dishes_skipped integer := 0;
  insert_count integer := 0;
  via_pattern integer := 0;
  via_cuisine integer := 0;
  via_none integer := 0;
BEGIN
  FOR rec IN
    SELECT d.id, lower(d.name) AS name_lc, d.diet_type, c.name AS cuisine
    FROM dishes d
    LEFT JOIN cuisines c ON c.id = d.cuisine_id
    WHERE d.is_active = true
      AND NOT EXISTS (SELECT 1 FROM meal_ingredients mi WHERE mi.dish_id = d.id)
    ORDER BY d.id
  LOOP
    matched_key := NULL;
    slug_list := NULL;

    FOREACH pattern_row SLICE 1 IN ARRAY patterns LOOP
      IF rec.name_lc LIKE '%' || pattern_row[1] || '%' THEN
        matched_key := pattern_row[1];
        slug_list := pattern_row[2];
        EXIT;
      END IF;
    END LOOP;

    IF slug_list IS NULL AND rec.cuisine IS NOT NULL THEN
      cuisine_name_lc := lower(rec.cuisine);
      cuisine_key := cuisine_name_map ->> cuisine_name_lc;
      IF cuisine_key IS NOT NULL THEN
        slug_list := cuisine_defaults ->> cuisine_key;
        matched_key := 'cuisine:' || cuisine_key;
        via_cuisine := via_cuisine + 1;
      END IF;
    ELSIF slug_list IS NOT NULL THEN
      via_pattern := via_pattern + 1;
    END IF;

    IF slug_list IS NULL THEN
      dishes_skipped := dishes_skipped + 1;
      via_none := via_none + 1;
      CONTINUE;
    END IF;

    slug_arr := string_to_array(slug_list, ',');

    diet := rec.diet_type;
    IF diet = 'non_veg' THEN
      IF rec.name_lc LIKE '%chicken%' AND NOT ('chicken' = ANY(slug_arr)) THEN
        slug_arr := slug_arr || ARRAY['chicken'];
      ELSIF rec.name_lc LIKE '%mutton%' AND NOT ('mutton' = ANY(slug_arr)) THEN
        slug_arr := slug_arr || ARRAY['mutton'];
      ELSIF (rec.name_lc LIKE '%fish%' OR rec.name_lc LIKE '%machli%' OR rec.name_lc LIKE '%macher%')
        AND NOT ('fish' = ANY(slug_arr)) THEN
        slug_arr := slug_arr || ARRAY['fish'];
      ELSIF (rec.name_lc LIKE '%prawn%' OR rec.name_lc LIKE '%shrimp%')
        AND NOT ('prawns' = ANY(slug_arr)) THEN
        slug_arr := slug_arr || ARRAY['prawns'];
      END IF;
    ELSIF diet = 'egg' AND NOT ('eggs' = ANY(slug_arr)) THEN
      slug_arr := slug_arr || ARRAY['eggs'];
    END IF;

    WITH ins AS (
      INSERT INTO meal_ingredients (dish_id, ingredient_id, display_order)
      SELECT rec.id, i.id, t.ord
      FROM unnest(slug_arr) WITH ORDINALITY AS t(slug, ord)
      JOIN ingredients i ON i.slug = t.slug
      ON CONFLICT (dish_id, ingredient_id) DO NOTHING
      RETURNING 1
    )
    SELECT count(*) INTO inserted_rows FROM ins;

    IF inserted_rows > 0 THEN
      dishes_linked := dishes_linked + 1;
      insert_count := insert_count + inserted_rows;
    END IF;
  END LOOP;

  UPDATE dishes d
  SET ingredient_ids = COALESCE(sub.arr, '{}'::integer[])
  FROM (
    SELECT dish_id, array_agg(DISTINCT ingredient_id ORDER BY ingredient_id) AS arr
    FROM meal_ingredients
    GROUP BY dish_id
  ) sub
  WHERE d.id = sub.dish_id;

  RETURN jsonb_build_object(
    'dishes_linked', dishes_linked,
    'dishes_skipped_no_match', dishes_skipped,
    'meal_ingredient_rows_inserted', insert_count,
    'via_pattern', via_pattern,
    'via_cuisine_default', via_cuisine,
    'no_match', via_none
  );
END;
$function$;

-- ──────────────────────────────────────────────────────────────────
-- Part B — auto-tag dishes from columns already on dishes.
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_tag_dishes()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
DECLARE
  ins_spice integer; ins_diff integer; ins_meal integer;
  ins_role integer; ins_heavy integer;
BEGIN
  WITH ins AS (
    INSERT INTO dish_tags (dish_id, tag_id, confidence)
    SELECT d.id, t.id, 1.0
    FROM dishes d
    JOIN tags t ON t.category = 'spice_level' AND t.value =
      CASE d.spice_level WHEN 1 THEN 'mild' WHEN 2 THEN 'medium'
                         WHEN 3 THEN 'spicy' WHEN 4 THEN 'very_spicy' END
    WHERE d.is_active = true AND d.spice_level BETWEEN 1 AND 4
    ON CONFLICT (dish_id, tag_id) DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO ins_spice FROM ins;

  WITH ins AS (
    INSERT INTO dish_tags (dish_id, tag_id, confidence)
    SELECT d.id, t.id, 1.0
    FROM dishes d
    JOIN tags t ON t.category = 'difficulty' AND t.value = d.difficulty
    WHERE d.is_active = true AND d.difficulty IS NOT NULL
    ON CONFLICT (dish_id, tag_id) DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO ins_diff FROM ins;

  WITH ins AS (
    INSERT INTO dish_tags (dish_id, tag_id, confidence)
    SELECT DISTINCT d.id, t.id, 1.0
    FROM dishes d
    CROSS JOIN LATERAL unnest(d.meal_types) AS mt
    JOIN tags t ON t.category = 'meal_type' AND t.value = mt
    WHERE d.is_active = true
    ON CONFLICT (dish_id, tag_id) DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO ins_meal FROM ins;

  WITH ins AS (
    INSERT INTO dish_tags (dish_id, tag_id, confidence)
    SELECT d.id, t.id, 1.0
    FROM dishes d
    JOIN tags t ON t.category = 'dish_role' AND t.value =
      CASE d.dish_role WHEN 'drink' THEN 'beverage' ELSE d.dish_role END
    WHERE d.is_active = true AND d.dish_role IS NOT NULL
    ON CONFLICT (dish_id, tag_id) DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO ins_role FROM ins;

  WITH ins AS (
    INSERT INTO dish_tags (dish_id, tag_id, confidence)
    SELECT d.id, t.id, 0.8
    FROM dishes d
    JOIN tags t ON t.category = 'heaviness' AND t.value =
      CASE WHEN d.calories < 250 THEN 'light'
           WHEN d.calories BETWEEN 250 AND 500 THEN 'medium'
           WHEN d.calories > 500 THEN 'heavy' END
    WHERE d.is_active = true AND d.calories IS NOT NULL
    ON CONFLICT (dish_id, tag_id) DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO ins_heavy FROM ins;

  RETURN jsonb_build_object(
    'inserted_spice_level', ins_spice,
    'inserted_difficulty',  ins_diff,
    'inserted_meal_type',   ins_meal,
    'inserted_dish_role',   ins_role,
    'inserted_heaviness',   ins_heavy,
    'total_inserted',       ins_spice + ins_diff + ins_meal + ins_role + ins_heavy
  );
END;
$function$;

-- ──────────────────────────────────────────────────────────────────
-- Part C — slug-based derive_dish_attributes (replaces ingredients_master
-- version from 20260522000001). Fail-closed if no ingredients.
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.derive_dish_attributes(p_dish_id integer)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_allergen_ids INTEGER[];
  v_ingredient_ids INTEGER[];
  v_is_jain BOOLEAN;
  v_has_meat BOOLEAN;
  v_has_egg BOOLEAN;
  v_has_dairy BOOLEAN;
  v_has_onion_garlic_radish BOOLEAN;
  v_current_diet TEXT;
  v_inferred_diet TEXT;
  v_has_any_ingredient BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM meal_ingredients WHERE dish_id = p_dish_id)
    INTO v_has_any_ingredient;
  IF NOT v_has_any_ingredient THEN
    RETURN;
  END IF;

  SELECT diet_type INTO v_current_diet FROM dishes WHERE id = p_dish_id;

  SELECT
    array_agg(DISTINCT i.id ORDER BY i.id) FILTER (
      WHERE i.is_gluten OR i.is_dairy OR i.is_nut OR i.is_egg OR i.is_shellfish
    ),
    array_agg(DISTINCT i.id ORDER BY i.id),
    bool_or(i.category IN ('meat','seafood')),
    bool_or(i.category = 'egg'),
    bool_or(i.category = 'dairy'),
    bool_or(i.slug IN ('onion','garlic','radish'))
  INTO v_allergen_ids, v_ingredient_ids, v_has_meat, v_has_egg, v_has_dairy, v_has_onion_garlic_radish
  FROM meal_ingredients mi
  JOIN ingredients i ON i.id = mi.ingredient_id
  WHERE mi.dish_id = p_dish_id;

  v_is_jain := COALESCE(NOT v_has_onion_garlic_radish, false)
               AND v_current_diet NOT IN ('non_veg', 'egg');

  v_inferred_diet := CASE
    WHEN v_has_meat THEN 'non_veg'
    WHEN v_has_egg THEN 'egg'
    ELSE 'veg'
  END;

  IF (v_current_diet = 'veg' AND v_has_meat)
     OR (v_current_diet = 'veg' AND v_has_egg)
     OR (v_current_diet = 'non_veg' AND NOT v_has_meat AND NOT v_has_egg)
     OR (v_current_diet = 'egg' AND NOT v_has_egg AND NOT v_has_meat)
  THEN
    INSERT INTO etl_jobs (job_name, status, metadata, started_at, completed_at, created_at)
    VALUES (
      'derive_dish_attributes_conflict',
      'completed',
      jsonb_build_object(
        'dish_id', p_dish_id,
        'declared_diet_type', v_current_diet,
        'inferred_diet_type', v_inferred_diet,
        'has_meat', v_has_meat,
        'has_egg', v_has_egg,
        'has_dairy', v_has_dairy,
        'severity', 'conflict_needs_review'
      ),
      now(), now(), now()
    );
  END IF;

  UPDATE dishes
  SET allergen_ids = COALESCE(v_allergen_ids, '{}'::integer[]),
      ingredient_ids = COALESCE(v_ingredient_ids, '{}'::integer[]),
      is_jain = v_is_jain,
      derived_at = now()
  WHERE id = p_dish_id;
END;
$function$;

-- ──────────────────────────────────────────────────────────────────
-- Data-correction: 4 fish dishes were mislabeled diet_type='veg'.
-- Surfaced by derive_dish_attributes conflict detection.
-- ──────────────────────────────────────────────────────────────────
UPDATE public.dishes
SET diet_type = 'non_veg'
WHERE id IN (690, 785, 796, 884) AND diet_type = 'veg';

-- ──────────────────────────────────────────────────────────────────
-- Run the backfill + tagging + derivation in order.
-- Idempotent: re-runnable.
-- ──────────────────────────────────────────────────────────────────
SELECT public.backfill_ingredients_v1();
SELECT public.auto_tag_dishes();

DO $$
DECLARE rec record;
BEGIN
  FOR rec IN
    SELECT d.id FROM dishes d
    WHERE d.is_active = true
      AND EXISTS (SELECT 1 FROM meal_ingredients mi WHERE mi.dish_id = d.id)
    ORDER BY d.id
  LOOP
    PERFORM derive_dish_attributes(rec.id);
  END LOOP;
END $$;
