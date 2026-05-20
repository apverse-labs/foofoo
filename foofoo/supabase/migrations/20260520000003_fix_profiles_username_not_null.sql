-- ============================================================
-- Critical fix: the live profiles table has username and email
-- as NOT NULL (leftover from an earlier schema version), causing
-- the handle_new_user trigger to fail silently on every signup.
-- Effect: no profile row was ever created → every onboarding
-- UPDATE was a silent no-op → zero data saved.
-- ============================================================

-- 1. Relax all user-supplied columns so the trigger can insert without them.
--    The live DB has NOT NULL on columns that are set progressively through onboarding.
ALTER TABLE public.profiles
  ALTER COLUMN username   DROP NOT NULL,
  ALTER COLUMN email      DROP NOT NULL,
  ALTER COLUMN food_pref  DROP NOT NULL,
  ALTER COLUMN home_state DROP NOT NULL,
  ALTER COLUMN current_city DROP NOT NULL,
  ALTER COLUMN role       DROP NOT NULL;

-- 2. Fix the trigger to include email so it is set on every new signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[handle_new_user] profile creation failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Back-fill profile rows for every auth user that has none
--    (all existing users hit this bug).
INSERT INTO public.profiles (id, email, name)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', '')
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- 4. Verify:
--    SELECT COUNT(*) FROM auth.users;     -- total signups
--    SELECT COUNT(*) FROM public.profiles; -- must match
-- ============================================================
