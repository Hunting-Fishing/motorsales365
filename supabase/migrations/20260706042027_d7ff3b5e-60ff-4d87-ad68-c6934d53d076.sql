
-- Auto-accredit @365motorsales.com staff (with a staff_referrals row) as
-- approved Partner Program partners, sharing the same referral_code.

CREATE OR REPLACE FUNCTION public.accredit_staff_partner(_staff_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_sr RECORD;
  v_full_name text;
  v_app_id uuid;
BEGIN
  IF _staff_user_id IS NULL THEN RETURN; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = _staff_user_id;
  IF v_email IS NULL OR lower(v_email) NOT LIKE '%@365motorsales.com' THEN
    RETURN;
  END IF;

  SELECT * INTO v_sr FROM public.staff_referrals
   WHERE staff_user_id = _staff_user_id AND active = true
   ORDER BY updated_at DESC LIMIT 1;
  IF v_sr.id IS NULL THEN RETURN; END IF;

  -- Skip if partner already exists for this code or user.
  IF EXISTS (
    SELECT 1 FROM public.partner_program_partners
     WHERE referral_code = v_sr.referral_code OR user_id = _staff_user_id
  ) THEN
    -- Ensure it's active.
    UPDATE public.partner_program_partners
       SET active = true, updated_at = now()
     WHERE (referral_code = v_sr.referral_code OR user_id = _staff_user_id)
       AND active = false;
    RETURN;
  END IF;

  SELECT COALESCE(full_name, v_sr.full_name, v_email)
    INTO v_full_name FROM public.profiles WHERE id = _staff_user_id;
  IF v_full_name IS NULL THEN v_full_name := COALESCE(v_sr.full_name, v_email); END IF;

  -- Find or create approved application.
  SELECT id INTO v_app_id FROM public.partner_program_applications
   WHERE user_id = _staff_user_id AND channel_type = 'internal_staff'
   LIMIT 1;

  IF v_app_id IS NULL THEN
    INSERT INTO public.partner_program_applications (
      user_id, full_name, email, phone, channel_type, platforms,
      status, agreed_terms, agreed_terms_at, reviewed_at, admin_notes
    ) VALUES (
      _staff_user_id, v_full_name, v_email, v_sr.phone, 'internal_staff', ARRAY['internal']::text[],
      'approved', true, now(), now(),
      'Auto-accredited: 365 Motorsales internal staff'
    )
    RETURNING id INTO v_app_id;
  ELSE
    UPDATE public.partner_program_applications
       SET status = 'approved', agreed_terms = true,
           agreed_terms_at = COALESCE(agreed_terms_at, now()),
           reviewed_at = COALESCE(reviewed_at, now()),
           admin_notes = COALESCE(admin_notes, 'Auto-accredited: 365 Motorsales internal staff')
     WHERE id = v_app_id;
  END IF;

  INSERT INTO public.partner_program_partners (
    user_id, application_id, referral_code, display_name, active,
    agreed_terms_at, agreed_terms_version
  ) VALUES (
    _staff_user_id, v_app_id, v_sr.referral_code, v_full_name, true,
    now(), 'internal-staff-v1'
  )
  ON CONFLICT (referral_code) DO NOTHING;
END;
$$;

-- Trigger on staff_referrals insert/update
CREATE OR REPLACE FUNCTION public.tg_staff_referrals_accredit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.staff_user_id IS NOT NULL AND NEW.active = true THEN
    PERFORM public.accredit_staff_partner(NEW.staff_user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_referrals_accredit ON public.staff_referrals;
CREATE TRIGGER staff_referrals_accredit
AFTER INSERT OR UPDATE OF staff_user_id, referral_code, active
ON public.staff_referrals
FOR EACH ROW EXECUTE FUNCTION public.tg_staff_referrals_accredit();

-- Trigger on auth.users email confirmation for staff domain
CREATE OR REPLACE FUNCTION public.tg_auth_user_staff_accredit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND lower(NEW.email) LIKE '%@365motorsales.com'
     AND NEW.email_confirmed_at IS NOT NULL THEN
    PERFORM public.accredit_staff_partner(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed_accredit_staff ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_accredit_staff
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.tg_auth_user_staff_accredit();

-- Backfill existing staff.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT sr.staff_user_id
      FROM public.staff_referrals sr
      JOIN auth.users u ON u.id = sr.staff_user_id
     WHERE sr.active = true
       AND lower(u.email) LIKE '%@365motorsales.com'
  LOOP
    PERFORM public.accredit_staff_partner(r.staff_user_id);
  END LOOP;
END $$;
