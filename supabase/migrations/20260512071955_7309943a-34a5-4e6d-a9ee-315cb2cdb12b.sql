
-- Helper to generate a unique referral code from a name
CREATE OR REPLACE FUNCTION public.gen_referral_code(_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  i int := 0;
BEGIN
  base := lower(regexp_replace(COALESCE(_name, 'staff'), '[^a-zA-Z0-9]+', '', 'g'));
  IF base = '' THEN base := 'staff'; END IF;
  base := substr(base, 1, 12);
  LOOP
    candidate := base || lpad((100 + floor(random() * 900))::int::text, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.staff_referrals WHERE referral_code = candidate);
    i := i + 1;
    IF i > 20 THEN
      candidate := base || extract(epoch from now())::bigint::text;
      EXIT;
    END IF;
  END LOOP;
  RETURN candidate;
END $$;

-- Sync all staff (anyone with a role other than 'user') into staff_referrals
CREATE OR REPLACE FUNCTION public.sync_staff_referrals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  inserted int := 0;
  uname text;
  uemail text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR r IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role::text <> 'user'
      AND NOT EXISTS (
        SELECT 1 FROM public.staff_referrals s WHERE s.staff_user_id = ur.user_id
      )
  LOOP
    SELECT au.email INTO uemail FROM auth.users au WHERE au.id = r.user_id;
    SELECT COALESCE(NULLIF(p.full_name,''), uemail) INTO uname FROM public.profiles p WHERE p.id = r.user_id;
    IF uemail IS NULL THEN CONTINUE; END IF;
    -- skip if email already used
    IF EXISTS (SELECT 1 FROM public.staff_referrals WHERE lower(email) = lower(uemail)) THEN
      UPDATE public.staff_referrals SET staff_user_id = r.user_id WHERE lower(email) = lower(uemail) AND staff_user_id IS NULL;
      CONTINUE;
    END IF;
    INSERT INTO public.staff_referrals(staff_user_id, email, full_name, referral_code, active)
    VALUES (r.user_id, lower(uemail), COALESCE(uname, uemail), public.gen_referral_code(uname), true);
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END $$;

-- Trigger: when a staff role is granted, create a referral row
CREATE OR REPLACE FUNCTION public.tg_create_staff_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uemail text;
  uname text;
BEGIN
  IF NEW.role::text = 'user' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.staff_referrals WHERE staff_user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  SELECT email INTO uemail FROM auth.users WHERE id = NEW.user_id;
  SELECT COALESCE(NULLIF(full_name,''), uemail) INTO uname FROM public.profiles WHERE id = NEW.user_id;
  IF uemail IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.staff_referrals WHERE lower(email) = lower(uemail)) THEN
    UPDATE public.staff_referrals SET staff_user_id = NEW.user_id WHERE lower(email) = lower(uemail) AND staff_user_id IS NULL;
    RETURN NEW;
  END IF;
  INSERT INTO public.staff_referrals(staff_user_id, email, full_name, referral_code, active)
  VALUES (NEW.user_id, lower(uemail), COALESCE(uname, uemail), public.gen_referral_code(uname), true);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_create_staff_referral ON public.user_roles;
CREATE TRIGGER trg_create_staff_referral
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.tg_create_staff_referral();

-- Backfill existing staff/admins
DO $$
DECLARE
  r record;
  uemail text;
  uname text;
BEGIN
  FOR r IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role::text <> 'user'
      AND NOT EXISTS (SELECT 1 FROM public.staff_referrals s WHERE s.staff_user_id = ur.user_id)
  LOOP
    SELECT email INTO uemail FROM auth.users WHERE id = r.user_id;
    SELECT COALESCE(NULLIF(full_name,''), uemail) INTO uname FROM public.profiles WHERE id = r.user_id;
    IF uemail IS NULL THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM public.staff_referrals WHERE lower(email) = lower(uemail)) THEN
      UPDATE public.staff_referrals SET staff_user_id = r.user_id WHERE lower(email) = lower(uemail) AND staff_user_id IS NULL;
      CONTINUE;
    END IF;
    INSERT INTO public.staff_referrals(staff_user_id, email, full_name, referral_code, active)
    VALUES (r.user_id, lower(uemail), COALESCE(uname, uemail), public.gen_referral_code(uname), true);
  END LOOP;
END $$;
