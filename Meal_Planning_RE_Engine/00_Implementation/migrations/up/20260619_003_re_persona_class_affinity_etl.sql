-- ETL for SCHEMA-RE-019: parse re_personas boost columns into
-- re_persona_class_affinity. Source columns are PIPE-delimited ('|'),
-- not comma-delimited -- confirmed via sample query against foofoo-staging
-- (see NORMALIZATION_GAP_REGISTER.md GAP-01..04).

-- Breakfast boost classes
INSERT INTO re_persona_class_affinity (persona_id, slot_group, meal_class_code, affinity_weight, source_column)
SELECT
  p.persona_id,
  'Breakfast' AS slot_group,
  TRIM(class_code) AS meal_class_code,
  0.800 AS affinity_weight,
  'bf_boost_classes' AS source_column
FROM re_personas p,
  UNNEST(string_to_array(p.bf_boost_classes, '|')) AS class_code
WHERE p.bf_boost_classes IS NOT NULL
  AND TRIM(class_code) != ''
  AND EXISTS (
    SELECT 1 FROM re_meal_classes mc
    WHERE mc.meal_class_code = TRIM(class_code)
  )
ON CONFLICT (persona_id, slot_group, meal_class_code) DO NOTHING;

-- Lunch boost classes
INSERT INTO re_persona_class_affinity (persona_id, slot_group, meal_class_code, affinity_weight, source_column)
SELECT
  p.persona_id,
  'Lunch' AS slot_group,
  TRIM(class_code) AS meal_class_code,
  0.800 AS affinity_weight,
  'ld_boost_classes' AS source_column
FROM re_personas p,
  UNNEST(string_to_array(p.ld_boost_classes, '|')) AS class_code
WHERE p.ld_boost_classes IS NOT NULL
  AND TRIM(class_code) != ''
  AND EXISTS (
    SELECT 1 FROM re_meal_classes mc
    WHERE mc.meal_class_code = TRIM(class_code)
  )
ON CONFLICT (persona_id, slot_group, meal_class_code) DO NOTHING;

-- Snack boost classes
INSERT INTO re_persona_class_affinity (persona_id, slot_group, meal_class_code, affinity_weight, source_column)
SELECT
  p.persona_id,
  'Snack' AS slot_group,
  TRIM(class_code) AS meal_class_code,
  0.800 AS affinity_weight,
  'sn_boost_classes' AS source_column
FROM re_personas p,
  UNNEST(string_to_array(p.sn_boost_classes, '|')) AS class_code
WHERE p.sn_boost_classes IS NOT NULL
  AND TRIM(class_code) != ''
  AND EXISTS (
    SELECT 1 FROM re_meal_classes mc
    WHERE mc.meal_class_code = TRIM(class_code)
  )
ON CONFLICT (persona_id, slot_group, meal_class_code) DO NOTHING;

-- Dinner boost classes
INSERT INTO re_persona_class_affinity (persona_id, slot_group, meal_class_code, affinity_weight, source_column)
SELECT
  p.persona_id,
  'Dinner' AS slot_group,
  TRIM(class_code) AS meal_class_code,
  0.800 AS affinity_weight,
  'dn_boost_classes' AS source_column
FROM re_personas p,
  UNNEST(string_to_array(p.dn_boost_classes, '|')) AS class_code
WHERE p.dn_boost_classes IS NOT NULL
  AND TRIM(class_code) != ''
  AND EXISTS (
    SELECT 1 FROM re_meal_classes mc
    WHERE mc.meal_class_code = TRIM(class_code)
  )
ON CONFLICT (persona_id, slot_group, meal_class_code) DO NOTHING;
