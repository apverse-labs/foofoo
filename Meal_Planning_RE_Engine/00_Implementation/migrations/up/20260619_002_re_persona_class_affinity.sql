-- SCHEMA-RE-019: re_persona_class_affinity — normalizes re_personas'
-- pipe-delimited bf/ld/sn/dn_boost_classes TEXT columns into rows.
-- Additive: new table only, source columns on re_personas untouched.

CREATE TABLE IF NOT EXISTS re_persona_class_affinity (
  id              SERIAL PRIMARY KEY,
  persona_id      TEXT NOT NULL,
  slot_group      TEXT NOT NULL CHECK (slot_group IN ('Breakfast','Lunch','Snack','Dinner')),
  meal_class_code TEXT NOT NULL,
  affinity_weight NUMERIC(4,3) NOT NULL DEFAULT 0.800,
  source_column   TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (persona_id, slot_group, meal_class_code),
  FOREIGN KEY (persona_id) REFERENCES re_personas(persona_id),
  FOREIGN KEY (meal_class_code) REFERENCES re_meal_classes(meal_class_code)
);

CREATE INDEX IF NOT EXISTS idx_re_pca_persona
  ON re_persona_class_affinity(persona_id, slot_group);
