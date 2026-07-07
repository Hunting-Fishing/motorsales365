
-- 1. Add manager_user_id column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS manager_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_manager_user_id ON public.profiles(manager_user_id);

-- 2. Helper: canonical 365 admin user id
CREATE OR REPLACE FUNCTION public.canonical_365_admin_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'cd233efe-5023-44dd-abfd-a76601436e97'::uuid;
$$;

-- 3. Backfill: every internal-staff profile (except admin themselves) reports to admin
UPDATE public.profiles
SET manager_user_id = public.canonical_365_admin_id()
WHERE is_staff_account = true
  AND id <> public.canonical_365_admin_id()
  AND manager_user_id IS NULL;

-- 4. Patch handle_new_user: after profile is inserted for an internal-staff signup,
--    ensure manager_user_id defaults to admin (or to raw_user_meta_data.manager_user_id
--    when provided by an admin-driven admin API call).
CREATE OR REPLACE FUNCTION public.set_internal_staff_manager()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := public.canonical_365_admin_id();
  v_meta_mgr uuid;
  v_email text;
BEGIN
  IF NEW.is_staff_account IS NOT TRUE THEN RETURN NEW; END IF;
  IF NEW.id = v_admin THEN RETURN NEW; END IF;
  IF NEW.manager_user_id IS NOT NULL THEN RETURN NEW; END IF;

  BEGIN
    SELECT (raw_user_meta_data->>'manager_user_id')::uuid, email
      INTO v_meta_mgr, v_email
    FROM auth.users WHERE id = NEW.id;
  EXCEPTION WHEN others THEN
    v_meta_mgr := NULL;
  END;

  NEW.manager_user_id := COALESCE(v_meta_mgr, v_admin);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_internal_staff_manager ON public.profiles;
CREATE TRIGGER trg_set_internal_staff_manager
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_internal_staff_manager();
