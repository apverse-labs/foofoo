-- Sprint 5 Section 2 — dish_similar population + auto-derive trigger.

CREATE OR REPLACE FUNCTION public.trigger_derive_on_dish_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO etl_jobs (job_name, status, metadata)
  VALUES (
    'derive-dish-attributes',
    'pending',
    jsonb_build_object('dish_id', NEW.id, 'trigger', 'insert')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_dish_inserted ON public.dishes;
CREATE TRIGGER on_dish_inserted
  AFTER INSERT ON public.dishes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_derive_on_dish_insert();

CREATE OR REPLACE FUNCTION public.populate_dish_similar()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  inserted_count integer := 0;
  total_rows integer := 0;
  dishes_with_sim integer := 0;
BEGIN
  WITH scored AS (
    SELECT
      d1.id AS dish_id,
      d2.id AS similar_dish_id,
      (
        (CASE WHEN d1.diet_type = d2.diet_type THEN 0.3 ELSE 0.0 END) +
        (CASE WHEN d1.cuisine_id = d2.cuisine_id THEN 0.3 ELSE 0.0 END) +
        (CASE WHEN ABS(COALESCE(d1.calories,300) - COALESCE(d2.calories,300)) < 100 THEN 0.2 ELSE 0.0 END) +
        (CASE WHEN d1.spice_level = d2.spice_level THEN 0.1 ELSE 0.0 END) +
        (CASE WHEN d1.dish_role = d2.dish_role THEN 0.1 ELSE 0.0 END)
      )::numeric AS score
    FROM dishes d1
    JOIN dishes d2
      ON d1.id <> d2.id
     AND d1.is_active = true
     AND d2.is_active = true
     AND d1.diet_type = d2.diet_type
     AND d1.meal_types && d2.meal_types
  ),
  filtered AS (
    SELECT dish_id, similar_dish_id, score FROM scored WHERE score >= 0.5
  ),
  ranked AS (
    SELECT dish_id, similar_dish_id, score,
           ROW_NUMBER() OVER (PARTITION BY dish_id ORDER BY score DESC, similar_dish_id) AS rn
    FROM filtered
  ),
  wiped AS (
    DELETE FROM dish_similar RETURNING 1
  )
  INSERT INTO dish_similar (dish_id, similar_dish_id, similarity_score)
  SELECT dish_id, similar_dish_id, score
  FROM ranked
  WHERE rn <= 6;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  SELECT count(*) INTO total_rows FROM dish_similar;
  SELECT count(DISTINCT dish_id) INTO dishes_with_sim FROM dish_similar;

  RETURN jsonb_build_object(
    'pairs_created', inserted_count,
    'total_rows', total_rows,
    'dishes_with_similar', dishes_with_sim,
    'status', 'complete'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.populate_dish_similar() FROM public;
REVOKE EXECUTE ON FUNCTION public.populate_dish_similar() FROM anon;
REVOKE EXECUTE ON FUNCTION public.populate_dish_similar() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.populate_dish_similar() TO service_role;
