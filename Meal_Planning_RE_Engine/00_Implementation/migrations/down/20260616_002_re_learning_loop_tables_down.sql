-- SCHEMA-RE-018 rollback: remove all P2 learning loop tables/columns

ALTER TABLE public.re_user_class_affinity
  DROP COLUMN IF EXISTS high_complexity_accepts,
  DROP COLUMN IF EXISTS high_complexity_rejects;

DROP TABLE IF EXISTS public.re_user_class_family_affinity;

ALTER TABLE public.re_user_dish_affinity
  DROP COLUMN IF EXISTS repeat_preferred;

DROP TABLE IF EXISTS public.re_user_food_dna_vector;
