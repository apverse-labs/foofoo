-- Phase 2: populate normalized tables from the existing Excel-shaped tables.
-- Read-only against source tables; only INSERTs into the new tables.

INSERT INTO re_persona_slot_plan
  (persona_id, day_of_week, slot_group, day_type, primary_class, secondary_class, tertiary_class)

SELECT DISTINCT ON (persona_id, day_of_week)
  persona_id, day_of_week, 'Breakfast', weekday_weekend,
  breakfast_primary_class, breakfast_secondary_class, breakfast_tertiary_class
FROM re_weekly_class_plans
WHERE breakfast_primary_class IS NOT NULL AND persona_id IS NOT NULL
ORDER BY persona_id, day_of_week

UNION ALL

SELECT DISTINCT ON (persona_id, day_of_week)
  persona_id, day_of_week, 'Lunch', weekday_weekend,
  lunch_primary_class, lunch_secondary_class, lunch_tertiary_class
FROM re_weekly_class_plans
WHERE lunch_primary_class IS NOT NULL AND persona_id IS NOT NULL
ORDER BY persona_id, day_of_week

UNION ALL

SELECT DISTINCT ON (persona_id, day_of_week)
  persona_id, day_of_week, 'Snack', weekday_weekend,
  snack_primary_class, snack_secondary_class, snack_tertiary_class
FROM re_weekly_class_plans
WHERE snack_primary_class IS NOT NULL AND persona_id IS NOT NULL
ORDER BY persona_id, day_of_week

UNION ALL

SELECT DISTINCT ON (persona_id, day_of_week)
  persona_id, day_of_week, 'Dinner', weekday_weekend,
  dinner_primary_class, dinner_secondary_class, dinner_tertiary_class
FROM re_weekly_class_plans
WHERE dinner_primary_class IS NOT NULL AND persona_id IS NOT NULL
ORDER BY persona_id, day_of_week

ON CONFLICT (persona_id, day_of_week, slot_group) DO NOTHING;

INSERT INTO re_segment_addon_rule (member_segment, slot_group, addon_class_code)
SELECT DISTINCT target_member_segment, meal_slot, addon_class_code
FROM re_household_addon_plans
WHERE target_member_segment IS NOT NULL
  AND meal_slot IS NOT NULL
  AND addon_class_code IS NOT NULL
ON CONFLICT (member_segment, slot_group, addon_class_code) DO NOTHING;

INSERT INTO re_state_class_affinity (state_id, slot_group, day_type, meal_class_code, priority_rank)
SELECT
  s.state_id,
  'Breakfast' as slot_group,
  'Both' as day_type,
  TRIM(class_code) as meal_class_code,
  ROW_NUMBER() OVER (PARTITION BY s.state_id ORDER BY ordinality) as priority_rank
FROM re_states s,
  UNNEST(string_to_array(s.breakfast_class_pool, '|')) WITH ORDINALITY AS t(class_code, ordinality)
WHERE s.breakfast_class_pool IS NOT NULL
  AND TRIM(class_code) != ''
  AND EXISTS (SELECT 1 FROM re_meal_classes mc WHERE mc.meal_class_code = TRIM(class_code))

UNION ALL

SELECT s.state_id, 'Lunch', 'Weekday', TRIM(class_code),
  ROW_NUMBER() OVER (PARTITION BY s.state_id ORDER BY ordinality)
FROM re_states s,
  UNNEST(string_to_array(s.weekday_lunch_class_pool, '|')) WITH ORDINALITY AS t(class_code, ordinality)
WHERE s.weekday_lunch_class_pool IS NOT NULL AND TRIM(class_code) != ''
  AND EXISTS (SELECT 1 FROM re_meal_classes mc WHERE mc.meal_class_code = TRIM(class_code))

UNION ALL

SELECT s.state_id, 'Dinner', 'Weekday', TRIM(class_code),
  ROW_NUMBER() OVER (PARTITION BY s.state_id ORDER BY ordinality)
FROM re_states s,
  UNNEST(string_to_array(s.weekday_dinner_class_pool, '|')) WITH ORDINALITY AS t(class_code, ordinality)
WHERE s.weekday_dinner_class_pool IS NOT NULL AND TRIM(class_code) != ''
  AND EXISTS (SELECT 1 FROM re_meal_classes mc WHERE mc.meal_class_code = TRIM(class_code))

UNION ALL

SELECT s.state_id, 'Lunch', 'Weekend', TRIM(class_code),
  ROW_NUMBER() OVER (PARTITION BY s.state_id ORDER BY ordinality)
FROM re_states s,
  UNNEST(string_to_array(s.weekend_special_class_pool, '|')) WITH ORDINALITY AS t(class_code, ordinality)
WHERE s.weekend_special_class_pool IS NOT NULL AND TRIM(class_code) != ''
  AND EXISTS (SELECT 1 FROM re_meal_classes mc WHERE mc.meal_class_code = TRIM(class_code))

UNION ALL

SELECT s.state_id, 'Snack', 'Both', TRIM(class_code),
  ROW_NUMBER() OVER (PARTITION BY s.state_id ORDER BY ordinality)
FROM re_states s,
  UNNEST(string_to_array(s.snack_class_pool, '|')) WITH ORDINALITY AS t(class_code, ordinality)
WHERE s.snack_class_pool IS NOT NULL AND TRIM(class_code) != ''
  AND EXISTS (SELECT 1 FROM re_meal_classes mc WHERE mc.meal_class_code = TRIM(class_code))

ON CONFLICT (state_id, slot_group, day_type, meal_class_code) DO NOTHING;
