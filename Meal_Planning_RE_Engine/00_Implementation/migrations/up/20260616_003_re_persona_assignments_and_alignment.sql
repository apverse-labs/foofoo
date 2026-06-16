-- SCHEMA-RE-019: re_user_persona_assignments table (Seq 16, DOC-22 Runtime_Entities)
-- SCHEMA-RE-020: Column alignment additions (Seq 17, DOC-22 Column_Spec)
--   Adds diet_mode, member_segments, cook_capability alias to re_user_household_profiles.
--   All additive — no renames, no destructive changes.

-- ── Seq 16: Persona assignments audit table ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.re_user_persona_assignments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id          TEXT        NOT NULL REFERENCES public.re_personas(persona_id),
  confidence          FLOAT       NOT NULL DEFAULT 0,
  assigned_by         TEXT        NOT NULL DEFAULT 'onboarding', -- 'onboarding' | 'system' | 'admin'
  overlay_persona_ids TEXT[]      NOT NULL DEFAULT '{}',
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_re_upa_profile ON public.re_user_persona_assignments(profile_id);
CREATE INDEX IF NOT EXISTS idx_re_upa_active  ON public.re_user_persona_assignments(profile_id, is_active) WHERE is_active = TRUE;

ALTER TABLE public.re_user_persona_assignments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='re_user_persona_assignments' AND policyname='upa_own') THEN
    CREATE POLICY upa_own ON public.re_user_persona_assignments FOR ALL USING (auth.uid() = profile_id);
  END IF;
END $$;

COMMENT ON TABLE public.re_user_persona_assignments IS
  'Audit log of persona assignments. One active row per user (is_active=true). Superseded rows are kept for history.';
COMMENT ON COLUMN public.re_user_persona_assignments.confidence IS
  'Onboarding confidence score at time of assignment (0..1, DOC-20).';
COMMENT ON COLUMN public.re_user_persona_assignments.assigned_by IS
  'Source of assignment: onboarding (user answered), system (recalculated), admin (manual override).';

-- ── Seq 17: Column alignment additions ───────────────────────────────────────

-- diet_mode: DOC-22 canonical field (derived from food_pref + nonveg_mode)
-- Nullable TEXT — populated at onboarding completion via application layer.
ALTER TABLE public.re_user_household_profiles
  ADD COLUMN IF NOT EXISTS diet_mode TEXT;

-- member_segments: DOC-22 JSON array — mirrors household_members rows as a denormalized cache
ALTER TABLE public.re_user_household_profiles
  ADD COLUMN IF NOT EXISTS member_segments JSONB NOT NULL DEFAULT '[]';

-- cook_capability: DOC-22 canonical name for cook_dependency
-- Kept as a generated view column to avoid renaming the existing column.
-- Application code should write to cook_dependency; read either field.
ALTER TABLE public.re_user_household_profiles
  ADD COLUMN IF NOT EXISTS cook_capability TEXT
    GENERATED ALWAYS AS (cook_dependency) STORED;

COMMENT ON COLUMN public.re_user_household_profiles.diet_mode IS
  'DOC-22 canonical diet mode string (e.g. veg, jain, egg_only, occasional_nonveg, regular_nonveg). Derived from food_pref + nonveg_meals_per_week.';
COMMENT ON COLUMN public.re_user_household_profiles.member_segments IS
  'DOC-22 member_segments: denormalized JSON array of {member_segment, age_band} from household_members.';
COMMENT ON COLUMN public.re_user_household_profiles.cook_capability IS
  'DOC-22 alias for cook_dependency (generated column). Read-only; write to cook_dependency.';
