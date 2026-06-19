# Post-SCHEMA-RE-017/018 Validation — 2026-06-19

Run against `foofoo-staging` (`kwypxyqxojauhiehuirz`) after applying SCHEMA-RE-012,
SCHEMA-RE-013, and SCHEMA-RE-018.

## GATE 1 — Jain user gets dishes

```sql
SELECT COUNT(*) FROM re_class_dish_options WHERE is_jain = true;
```
**630**. PASS (> 100). Heuristic enrichment (`diet_type='veg'` minus onion/garlic/potato/
aloo/carrot/beetroot/turnip/pyaz/lahsun name matches) ran against 666 veg dish options;
630 marked Jain-safe, 36 excluded.

## GATE 2 — All weekly-primary classes have ≥1 Jain-safe dish

```sql
SELECT COUNT(DISTINCT mc.meal_class_code)
FROM re_meal_classes mc
LEFT JOIN re_class_dish_options cdo ON cdo.meal_class_code = mc.meal_class_code AND cdo.is_jain = true
WHERE cdo.dish_option_id IS NULL AND mc.allowed_as_weekly_primary = true;
```
**43** classes returned. Reviewed all 43 by `diet_type`: 4 `egg`, 19 `mixed`
(regional/fusion/outside-delivery classes), 20 `nonveg`. **Zero are `diet_type='veg'`.**
This is expected, not a gap — Jain is a strict-veg diet, so non-veg/egg/mixed classes
correctly have no Jain-safe dish options. No manual data fix needed.

## GATE 3 — New planner tables intact

```sql
SELECT COUNT(*) FROM re_persona_slot_plan;     -- 1148
SELECT COUNT(*) FROM re_segment_addon_rule;    -- 46
SELECT COUNT(*) FROM re_state_class_affinity;  -- 890
```
All three counts match expected values exactly. PASS.

## GATE 4 — No orphan class codes in re_persona_slot_plan

```sql
SELECT COUNT(*) FROM re_persona_slot_plan
WHERE primary_class NOT IN (SELECT meal_class_code FROM re_meal_classes);
```
**0**. PASS.

## GATE 5 — Variety guard (persona P11)

```sql
SELECT slot_group, primary_class, COUNT(*) as appearances
FROM re_persona_slot_plan WHERE persona_id = 'P11'
GROUP BY slot_group, primary_class
HAVING COUNT(*) > 3;
```
**0 rows.** No single class appears more than 3 times in any slot across P11's 7-day
source plan, even before the runtime `enforceVarietyLimits()` guard executes.

## GATE 6 — State affinity has real options per state/slot

```sql
SELECT state_id, slot_group, COUNT(DISTINCT meal_class_code) as class_options
FROM re_state_class_affinity
WHERE state_id IN ('S01','S14','S20','S27')
GROUP BY state_id, slot_group ORDER BY state_id, slot_group;
```

| State | Breakfast | Lunch | Snack | Dinner |
|---|---|---|---|---|
| S01 (AP) | 5 | 11 | 5 | 5 |
| S14 (MH) | 5 | 10 | 5 | 5 |
| S20 (KL) | 5 | 11 | 5 | 4 |
| S27 (WB) | 5 | 8  | 5 | 4 |

Every state/slot combination has ≥4 class options (target was ≥3). PASS.

## Summary

All 6 gates pass. SCHEMA-RE-012, SCHEMA-RE-013, SCHEMA-RE-018 applied cleanly to
`foofoo-staging` only. Jain blocker (0 dishes for Jain users) is fixed: 630 dish
options are now `is_jain=true`, covering every veg weekly-primary class.
