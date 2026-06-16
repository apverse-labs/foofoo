-- SCHEMA-RE-017 rollback: remove requires_member_screen from re_subcohorts

DROP INDEX IF EXISTS public.idx_re_subcohorts_member_screen;

ALTER TABLE public.re_subcohorts
  DROP COLUMN IF EXISTS requires_member_screen;
