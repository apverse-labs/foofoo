-- ============================================================
-- Migration 8: Seed region_food_affinity
-- Doc 10 §7: Home state boost adds +0.1 to RE scoring for
-- dishes matching user's home state cuisine.
-- Covers 18 Indian states + 1 national entry.
-- Cuisine codes match cuisines_master.code column.
-- ============================================================

-- region_food_affinity schema (from Doc 11A):
--   state_code TEXT, cuisine_id INT, affinity_score NUMERIC(3,2),
--   is_primary BOOLEAN

-- ============================================================
-- INSERT using subquery on cuisines_master.code
-- so IDs aren't hardcoded and order doesn't matter.
-- ============================================================

INSERT INTO public.region_food_affinity (state_code, cuisine_id, affinity_score, is_primary)
SELECT v.state_code, c.id, v.affinity_score, v.is_primary
FROM (VALUES

  -- MAHARASHTRA (MH)
  ('MH', 'maharashtrian',    1.00, TRUE),
  ('MH', 'south_indian',     0.60, FALSE),
  ('MH', 'north_indian',     0.55, FALSE),
  ('MH', 'gujarati',         0.50, FALSE),
  ('MH', 'street_food',      0.75, FALSE),

  -- GUJARAT (GJ)
  ('GJ', 'gujarati',         1.00, TRUE),
  ('GJ', 'rajasthani',       0.65, FALSE),
  ('GJ', 'maharashtrian',    0.50, FALSE),
  ('GJ', 'jain',             0.80, FALSE),

  -- PUNJAB (PB)
  ('PB', 'north_indian',     1.00, TRUE),
  ('PB', 'punjabi',          1.00, TRUE),
  ('PB', 'mughal',           0.70, FALSE),
  ('PB', 'street_food',      0.65, FALSE),

  -- DELHI (DL)
  ('DL', 'north_indian',     0.90, TRUE),
  ('DL', 'punjabi',          0.85, FALSE),
  ('DL', 'mughal',           0.80, FALSE),
  ('DL', 'street_food',      0.85, FALSE),
  ('DL', 'chinese_indian',   0.55, FALSE),

  -- TAMIL NADU (TN)
  ('TN', 'south_indian',     1.00, TRUE),
  ('TN', 'tamil',            1.00, TRUE),
  ('TN', 'chettinad',        0.85, FALSE),
  ('TN', 'kerala',           0.55, FALSE),

  -- KARNATAKA (KA)
  ('KA', 'south_indian',     1.00, TRUE),
  ('KA', 'udupi',            0.90, FALSE),
  ('KA', 'chettinad',        0.55, FALSE),
  ('KA', 'tamil',            0.50, FALSE),

  -- KERALA (KL)
  ('KL', 'kerala',           1.00, TRUE),
  ('KL', 'south_indian',     0.85, FALSE),
  ('KL', 'malabar',          0.90, FALSE),
  ('KL', 'seafood',          0.80, FALSE),

  -- WEST BENGAL (WB)
  ('WB', 'bengali',          1.00, TRUE),
  ('WB', 'seafood',          0.75, FALSE),
  ('WB', 'east_indian',      0.85, FALSE),
  ('WB', 'street_food',      0.65, FALSE),

  -- RAJASTHAN (RJ)
  ('RJ', 'rajasthani',       1.00, TRUE),
  ('RJ', 'gujarati',         0.65, FALSE),
  ('RJ', 'north_indian',     0.60, FALSE),
  ('RJ', 'jain',             0.70, FALSE),

  -- UTTAR PRADESH (UP)
  ('UP', 'north_indian',     0.95, TRUE),
  ('UP', 'mughal',           0.90, FALSE),
  ('UP', 'awadhi',           1.00, TRUE),
  ('UP', 'street_food',      0.70, FALSE),

  -- TELANGANA (TG)
  ('TG', 'south_indian',     0.90, TRUE),
  ('TG', 'hyderabadi',       1.00, TRUE),
  ('TG', 'mughal',           0.70, FALSE),
  ('TG', 'andhra',           0.85, FALSE),

  -- ANDHRA PRADESH (AP)
  ('AP', 'south_indian',     0.90, TRUE),
  ('AP', 'andhra',           1.00, TRUE),
  ('AP', 'hyderabadi',       0.75, FALSE),
  ('AP', 'seafood',          0.65, FALSE),

  -- ODISHA (OD)
  ('OD', 'east_indian',      0.90, TRUE),
  ('OD', 'bengali',          0.65, FALSE),
  ('OD', 'seafood',          0.70, FALSE),
  ('OD', 'south_indian',     0.45, FALSE),

  -- JAMMU & KASHMIR (JK)
  ('JK', 'kashmiri',         1.00, TRUE),
  ('JK', 'north_indian',     0.70, FALSE),
  ('JK', 'mughal',           0.75, FALSE),

  -- GOA (GA)
  ('GA', 'goan',             1.00, TRUE),
  ('GA', 'seafood',          0.90, FALSE),
  ('GA', 'maharashtrian',    0.55, FALSE),
  ('GA', 'konkan',           0.85, FALSE),

  -- HARYANA (HR)
  ('HR', 'north_indian',     0.90, TRUE),
  ('HR', 'punjabi',          0.85, FALSE),
  ('HR', 'mughal',           0.55, FALSE),

  -- MADHYA PRADESH (MP)
  ('MP', 'north_indian',     0.85, TRUE),
  ('MP', 'rajasthani',       0.55, FALSE),
  ('MP', 'malwi',            1.00, TRUE),
  ('MP', 'street_food',      0.60, FALSE),

  -- HIMACHAL PRADESH (HP)
  ('HP', 'north_indian',     0.85, TRUE),
  ('HP', 'himachali',        1.00, TRUE),
  ('HP', 'punjabi',          0.70, FALSE)

) AS v(state_code, cuisine_code, affinity_score, is_primary)
JOIN public.cuisines_master c ON c.code = v.cuisine_code
ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFY
--   SELECT state_code, COUNT(*) as cuisine_count
--   FROM public.region_food_affinity
--   GROUP BY state_code ORDER BY state_code;
--   -- expect 18 states, each with 3-5 rows
--
--   SELECT r.state_code, c.name, r.affinity_score, r.is_primary
--   FROM public.region_food_affinity r
--   JOIN public.cuisines_master c ON c.id = r.cuisine_id
--   WHERE r.state_code = 'MH'
--   ORDER BY r.affinity_score DESC;
--   -- expect Maharashtrian 1.00, Street Food 0.75, South Indian 0.60...
-- ============================================================
