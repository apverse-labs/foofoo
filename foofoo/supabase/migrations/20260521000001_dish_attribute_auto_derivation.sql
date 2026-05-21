-- Auto-derive dish.allergen_ids and dish.is_jain from meal_ingredients + ingredients_master.
--
-- Why:
--   Doc 11A §4 mandates auto-derivation so allergens, jain status, and diet flags
--   stay consistent with the ingredient list. Until this is in place the RE allergen
--   hard filter is a no-op (dishes.allergen_ids was empty for all 819 dishes).
--
-- What:
--   1. derive_dish_attributes(dish_id) — pure SQL function, idempotent
--   2. trigger on meal_ingredients (INSERT/UPDATE/DELETE) → re-derive affected dish
--   3. trigger on ingredients_master (UPDATE of flag columns) → re-derive every dish
--      that contains the changed ingredient (rare op, but keeps data coherent)
--   4. One-shot backfill of all existing dishes
--
-- diet_type is NOT auto-corrected — only flagged into audit_log if it disagrees
-- with the ingredient mix. v1 keeps the manually-set value to avoid blowing up
-- existing data; v2 can promote the audit to an automatic update.

BEGIN;

CREATE OR REPLACE FUNCTION public.derive_dish_attributes(p_dish_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_allergen_ids INTEGER[];
  v_is_jain BOOLEAN;
  v_inferred_diet TEXT;
  v_current_diet TEXT;
  v_has_non_veg BOOLEAN;
  v_has_egg BOOLEAN;
BEGIN
  -- Allergen IDs: every linked ingredient flagged is_allergen=TRUE
  SELECT COALESCE(array_agg(DISTINCT im.id ORDER BY im.id), ARRAY[]::INTEGER[])
  INTO v_allergen_ids
  FROM public.meal_ingredients mi
  JOIN public.ingredients_master im ON im.id = mi.ingredient_id
  WHERE mi.dish_id = p_dish_id
    AND im.is_allergen = TRUE;

  -- is_jain: TRUE iff no jain-excluded ingredient is present
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.meal_ingredients mi
    JOIN public.ingredients_master im ON im.id = mi.ingredient_id
    WHERE mi.dish_id = p_dish_id AND im.is_jain_excluded = TRUE
  )
  INTO v_is_jain;

  -- Inferred diet_type (advisory only — not auto-applied in v1)
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
    ELSE 'veg'  -- default; vegan/jain need ingredient-level negative checks not done here
  END;

  -- Apply derivations
  UPDATE public.dishes
  SET allergen_ids = v_allergen_ids,
      is_jain = v_is_jain
  WHERE id = p_dish_id;

  -- Audit if the manually-set diet_type contradicts the inferred one (only on
  -- the "more restrictive → less restrictive" direction; e.g. dish marked veg
  -- but contains chicken). We do not auto-correct in v1.
  SELECT diet_type INTO v_current_diet FROM public.dishes WHERE id = p_dish_id;

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
$$;

COMMENT ON FUNCTION public.derive_dish_attributes(INTEGER) IS
  'Recompute dish.allergen_ids and dish.is_jain from meal_ingredients. Doc 11A §4.';

-- Trigger function: re-derive affected dish on meal_ingredients change
CREATE OR REPLACE FUNCTION public._trg_meal_ingredients_derive()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.derive_dish_attributes(OLD.dish_id);
    RETURN OLD;
  ELSE
    PERFORM public.derive_dish_attributes(NEW.dish_id);
    IF TG_OP = 'UPDATE' AND OLD.dish_id <> NEW.dish_id THEN
      PERFORM public.derive_dish_attributes(OLD.dish_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_meal_ingredients_derive ON public.meal_ingredients;
CREATE TRIGGER trg_meal_ingredients_derive
AFTER INSERT OR UPDATE OR DELETE ON public.meal_ingredients
FOR EACH ROW EXECUTE FUNCTION public._trg_meal_ingredients_derive();

-- Trigger function: re-derive every affected dish when ingredient flags change
CREATE OR REPLACE FUNCTION public._trg_ingredients_master_derive()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only react to flag column changes; ignore renames / cosmetic edits
  IF NEW.is_allergen IS DISTINCT FROM OLD.is_allergen
     OR NEW.is_jain_excluded IS DISTINCT FROM OLD.is_jain_excluded
     OR NEW.diet_flag IS DISTINCT FROM OLD.diet_flag THEN
    PERFORM public.derive_dish_attributes(mi.dish_id)
    FROM public.meal_ingredients mi
    WHERE mi.ingredient_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ingredients_master_derive ON public.ingredients_master;
CREATE TRIGGER trg_ingredients_master_derive
AFTER UPDATE ON public.ingredients_master
FOR EACH ROW EXECUTE FUNCTION public._trg_ingredients_master_derive();

-- One-shot backfill: re-derive every dish currently in the table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.dishes ORDER BY id LOOP
    PERFORM public.derive_dish_attributes(r.id);
  END LOOP;
END;
$$;

COMMIT;
