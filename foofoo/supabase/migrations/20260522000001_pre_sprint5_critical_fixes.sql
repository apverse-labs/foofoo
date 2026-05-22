-- Pre-Sprint 5 Critical Fixes
-- See logs/pre_sprint_reports/pre_sprint5_20260522.txt for the audit that
-- produced these fixes.
--
-- Three CRITICAL issues addressed (in priority order):
--   #1 Diet violations: 18 active planner rows for one Jain user contain
--      non-jain dishes. We clear those plans so the RE regenerates them
--      with the (now-corrected) filter on next session.
--   #2 is_jain mismarking: 199 non_veg + 56 egg dishes are flagged
--      is_jain=true. Patch derive_dish_attributes() to fail-closed and
--      bulk-correct existing data.
--   #3 Duplicate dish: "Parotta (Kerala/Tamil)" appears twice. Deactivate
--      the duplicate (id=569 — newer hyphenated slug). The original
--      (id=282, slug=parotta-keralatamil) stays canonical.

BEGIN;

-- ──────────────────────────────────────────────────────────────────
-- #2a  Patch derive_dish_attributes() — jain safety must fail-closed.
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.derive_dish_attributes(p_dish_id integer)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_allergen_ids INTEGER[];
  v_is_jain BOOLEAN;
  v_inferred_diet TEXT;
  v_current_diet TEXT;
  v_has_non_veg BOOLEAN;
  v_has_egg BOOLEAN;
  v_has_any_ingredient BOOLEAN;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT im.id ORDER BY im.id), ARRAY[]::INTEGER[])
  INTO v_allergen_ids
  FROM public.meal_ingredients mi
  JOIN public.ingredients_master im ON im.id = mi.ingredient_id
  WHERE mi.dish_id = p_dish_id
    AND im.is_allergen = TRUE;

  SELECT EXISTS (
    SELECT 1 FROM public.meal_ingredients WHERE dish_id = p_dish_id
  ) INTO v_has_any_ingredient;

  SELECT diet_type INTO v_current_diet FROM public.dishes WHERE id = p_dish_id;

  -- Jain safety rule:
  --   1. non_veg / egg dishes can NEVER be jain (covers 255 mismarked rows).
  --   2. dishes with no ingredient data default to NOT jain (fail-closed —
  --      do not claim jain-safety without evidence).
  --   3. otherwise jain iff no linked ingredient is is_jain_excluded.
  IF v_current_diet IN ('non_veg', 'egg') THEN
    v_is_jain := FALSE;
  ELSIF NOT v_has_any_ingredient THEN
    v_is_jain := FALSE;
  ELSE
    SELECT NOT EXISTS (
      SELECT 1
      FROM public.meal_ingredients mi
      JOIN public.ingredients_master im ON im.id = mi.ingredient_id
      WHERE mi.dish_id = p_dish_id AND im.is_jain_excluded = TRUE
    ) INTO v_is_jain;
  END IF;

  SELECT
    bool_or(im.diet_flag = 'non_veg'),
    bool_or(im.diet_flag = 'egg')
  INTO v_has_non_veg, v_has_egg
  FROM public.meal_ingredients mi
  JOIN public.ingredients_master im ON im.id = mi.ingredient_id
  WHERE mi.dish_id = p_dish_id;

  v_inferred_diet := CASE
    WHEN v_has_non_veg THEN 'non_veg'
    WHEN v_has_egg THEN 'egg'
    ELSE 'veg'
  END;

  UPDATE public.dishes
  SET allergen_ids = v_allergen_ids,
      is_jain = v_is_jain
  WHERE id = p_dish_id;

  IF v_current_diet = 'veg' AND v_inferred_diet IN ('non_veg', 'egg') THEN
    INSERT INTO public.audit_log (user_id, action, created_at)
    VALUES (
      NULL,
      jsonb_build_object(
        'event', 'diet_type_inference_mismatch',
        'dish_id', p_dish_id,
        'declared_diet_type', v_current_diet,
        'inferred_diet_type', v_inferred_diet
      )::text,
      NOW()
    );
  END IF;
END;
$function$;

-- ──────────────────────────────────────────────────────────────────
-- #2b  Bulk-correct existing data: non_veg / egg dishes cannot be jain.
--      Affects 255 rows (199 non_veg + 56 egg).
--      Veg dishes with is_jain=true are LEFT ALONE — their accuracy
--      depends on ingredient linking which is at 2.4% coverage. That
--      backfill is the Sprint 5 Day-0 task; once meal_ingredients is
--      populated, re-run derive_dish_attributes() for every dish.
-- ──────────────────────────────────────────────────────────────────
UPDATE public.dishes
SET is_jain = false
WHERE is_jain = true AND diet_type IN ('non_veg','egg');

-- ──────────────────────────────────────────────────────────────────
-- #3  Deactivate duplicate dish: "Parotta (Kerala/Tamil)" id=569.
--     The canonical entry is id=282 (slug='parotta-keralatamil').
--     id=569 has slug='parotta-kerala-tamil' (newer hyphenated form,
--     created during a later import). Keep the older id stable to
--     avoid orphaning any planner / suggestion_log references.
-- ──────────────────────────────────────────────────────────────────
UPDATE public.dishes
SET is_active = false
WHERE id = 569 AND name = 'Parotta (Kerala/Tamil)';

-- ──────────────────────────────────────────────────────────────────
-- #1  Clear the 7 planner days for the affected Jain user. The RE
--     will regenerate them on next /home visit, this time applying
--     the food_pref='jain' AND d.is_jain=true filter against the
--     now-correct is_jain column. planner_carousel cascades.
--
--     CAUTION: only the one known-affected user. If another jain user
--     appears before this migration is applied, broaden the WHERE.
-- ──────────────────────────────────────────────────────────────────
DELETE FROM public.planner
WHERE user_id = '7b53646c-1fd4-423a-96fe-ef2bf70c46af';

COMMIT;
