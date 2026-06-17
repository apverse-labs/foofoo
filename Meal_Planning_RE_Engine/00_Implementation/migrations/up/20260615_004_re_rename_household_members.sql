-- SCHEMA-RE-014 (W5): Rename household_members → re_household_members
-- Aligns the table with the re_ prefix convention used by all other RE tables.
-- Updates the RLS policy name and index to match.

-- 1. Rename the table
ALTER TABLE public.household_members
  RENAME TO re_household_members;

-- 2. Rename the index
ALTER INDEX IF EXISTS idx_household_members_profile
  RENAME TO idx_re_household_members_profile;

-- 3. Drop the old RLS policy (name is baked into pg_policies) and recreate
DROP POLICY IF EXISTS hm_all_own ON public.re_household_members;
CREATE POLICY re_hm_all_own ON public.re_household_members
  FOR ALL USING (auth.uid() = profile_id);
