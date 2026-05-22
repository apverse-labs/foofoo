-- Sprint 5 post-QA fix: atomic replace of planner_carousel rows for a single slot.
--
-- Before: regenerate-slot Edge Function used two separate client calls — first
-- DELETE then INSERT — so two concurrent requests could observe a partially
-- empty carousel.
--
-- After: a SECURITY DEFINER function runs the delete + insert inside the same
-- transaction. The Edge Function should swap its client-side delete+insert pair
-- for `supabase.rpc('replace_planner_carousel_slot', { p_planner_id, p_meal_slot, p_rows })`.
CREATE OR REPLACE FUNCTION public.replace_planner_carousel_slot(
  p_planner_id uuid,
  p_meal_slot text,
  p_rows jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  DELETE FROM planner_carousel
  WHERE planner_id = p_planner_id AND meal_slot = p_meal_slot;

  INSERT INTO planner_carousel (planner_id, meal_slot, ref_type, ref_id, position, re_score)
  SELECT
    (r->>'planner_id')::uuid,
    r->>'meal_slot',
    r->>'ref_type',
    (r->>'ref_id')::int,
    (r->>'position')::int,
    NULLIF(r->>'re_score','')::numeric
  FROM jsonb_array_elements(p_rows) AS r;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_planner_carousel_slot(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_planner_carousel_slot(uuid, text, jsonb) TO service_role, authenticated;
