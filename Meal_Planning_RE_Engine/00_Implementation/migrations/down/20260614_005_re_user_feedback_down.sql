-- BUILD-07 rollback: drop feedback tables
-- All three tables contain derived/behavioral data and are re-generatable from user actions.

DROP TABLE IF EXISTS public.re_user_class_affinity;
DROP TABLE IF EXISTS public.re_user_dish_affinity;
DROP TABLE IF EXISTS public.re_user_feedback;
