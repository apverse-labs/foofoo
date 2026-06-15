-- Down: Remove UNIQUE constraint from re_household_addon_plans (SCHEMA-RE-016)

ALTER TABLE public.re_household_addon_plans
  DROP CONSTRAINT IF EXISTS re_hap_unique_addon_row;
