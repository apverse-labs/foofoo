-- =============================================================
-- Fix 1: Add missing food_pref column to user_diet_rules
-- (CREATE TABLE IF NOT EXISTS silently skipped it on existing table)
-- =============================================================
ALTER TABLE public.user_diet_rules
  ADD COLUMN IF NOT EXISTS food_pref TEXT
    CHECK (food_pref IN ('veg','non_veg','egg','vegan','jain'));

-- =============================================================
-- Fix 2: Harden handle_new_user trigger so profile creation
-- never silently fails (RLS blocks auth.uid() = NULL in trigger)
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but never abort the auth.users insert
  RAISE WARNING '[handle_new_user] profile creation failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate trigger in case it was dropped or misconfigured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- Fix 3: Back-fill missing profile rows for any auth users
-- who signed up before the trigger was hardened
-- =============================================================
INSERT INTO public.profiles (id, name)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', '')
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;
