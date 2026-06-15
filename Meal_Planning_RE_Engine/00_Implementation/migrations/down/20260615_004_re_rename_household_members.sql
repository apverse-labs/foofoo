-- Down: Revert re_household_members → household_members (SCHEMA-RE-014)

DROP POLICY IF EXISTS re_hm_all_own ON public.re_household_members;
CREATE POLICY hm_all_own ON public.re_household_members
  FOR ALL USING (auth.uid() = profile_id);

ALTER INDEX IF EXISTS idx_re_household_members_profile
  RENAME TO idx_household_members_profile;

ALTER TABLE public.re_household_members
  RENAME TO household_members;
