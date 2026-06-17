-- Phase 1: additive normalized planner tables.
-- Replaces Excel-shaped cohort-keyed lookups (re_weekly_class_plans,
-- re_household_addon_plans) with persona-keyed / segment-keyed tables.
-- No existing table is dropped, renamed, or altered.

CREATE TABLE IF NOT EXISTS re_persona_slot_plan (
  id              SERIAL PRIMARY KEY,
  persona_id      TEXT NOT NULL REFERENCES re_personas(persona_id),
  day_of_week     TEXT NOT NULL CHECK (day_of_week IN ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  day_type        TEXT NOT NULL CHECK (day_type IN ('Weekday','Weekend')),
  slot_group      TEXT NOT NULL CHECK (slot_group IN ('Breakfast','Lunch','Snack','Dinner')),
  primary_class   TEXT REFERENCES re_meal_classes(meal_class_code),
  secondary_class TEXT REFERENCES re_meal_classes(meal_class_code),
  tertiary_class  TEXT REFERENCES re_meal_classes(meal_class_code),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (persona_id, day_of_week, slot_group)
);
CREATE INDEX IF NOT EXISTS idx_re_persona_slot_plan_persona ON re_persona_slot_plan(persona_id);

CREATE TABLE IF NOT EXISTS re_segment_addon_rule (
  id                    SERIAL PRIMARY KEY,
  member_segment        TEXT NOT NULL,
  slot_group            TEXT NOT NULL CHECK (slot_group IN ('Breakfast','Lunch','Snack','Dinner')),
  addon_class_code      TEXT NOT NULL REFERENCES re_addon_classes(addon_class_code),
  applies_always        BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE (member_segment, slot_group, addon_class_code)
);

CREATE TABLE IF NOT EXISTS re_state_class_affinity (
  id              SERIAL PRIMARY KEY,
  state_id        TEXT NOT NULL REFERENCES re_states(state_id),
  slot_group      TEXT NOT NULL CHECK (slot_group IN ('Breakfast','Lunch','Snack','Dinner')),
  day_type        TEXT NOT NULL CHECK (day_type IN ('Weekday','Weekend','Both')),
  meal_class_code TEXT NOT NULL REFERENCES re_meal_classes(meal_class_code),
  priority_rank   INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (state_id, slot_group, day_type, meal_class_code)
);
CREATE INDEX IF NOT EXISTS idx_re_state_class_affinity_state ON re_state_class_affinity(state_id, slot_group, day_type);
