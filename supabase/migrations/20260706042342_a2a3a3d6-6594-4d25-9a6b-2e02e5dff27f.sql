
-- Gate referral crediting on Partner Program accreditation.
-- Codes only credit when an active partner_program_partners row exists.

CREATE OR REPLACE FUNCTION public.attach_signup_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb;
  code text;
  s public.staff_referrals%ROWTYPE;
  is_accredited boolean;
BEGIN
  SELECT raw_user_meta_data INTO meta FROM auth.users WHERE id = NEW.id;
  code := NULLIF(meta->>'referral_code','');
  IF code IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO s FROM public.staff_referrals WHERE referral_code = code AND active = true;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Accreditation gate: only credit if an active Partner Program partner
  -- record exists for this code. Non-accredited referrers get no credit.
  SELECT EXISTS (
    SELECT 1 FROM public.partner_program_partners
     WHERE referral_code = code AND active = true
  ) INTO is_accredited;

  INSERT INTO public.user_referrals(user_id, referred_by_staff_id, first_referral_code, last_referral_code, credited_referral_code)
    VALUES (
      NEW.id, s.id, code, code,
      CASE WHEN is_accredited THEN code ELSE NULL END
    )
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.record_qr_scan(_code text, _visitor_id uuid, _user_agent text DEFAULT NULL::text, _landing text DEFAULT NULL::text, _device text DEFAULT NULL::text, _browser text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s public.staff_referrals%ROWTYPE;
  v public.referral_visits%ROWTYPE;
  is_active boolean;
  is_accredited boolean;
  can_credit boolean;
  inserted_scan boolean := false;
  new_scan_id uuid;
BEGIN
  SELECT * INTO s FROM public.staff_referrals WHERE referral_code = _code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_code');
  END IF;
  is_active := s.active;

  SELECT EXISTS (
    SELECT 1 FROM public.partner_program_partners
     WHERE referral_code = _code AND active = true
  ) INTO is_accredited;

  can_credit := is_active AND is_accredited;

  INSERT INTO public.qr_scans(referral_code, visitor_id, device_type, browser)
    VALUES (_code, _visitor_id, _device, _browser)
    ON CONFLICT (referral_code, visitor_id) WHERE visitor_id IS NOT NULL
    DO NOTHING
    RETURNING id INTO new_scan_id;
  inserted_scan := new_scan_id IS NOT NULL;

  SELECT * INTO v FROM public.referral_visits WHERE visitor_id = _visitor_id;
  IF NOT FOUND THEN
    INSERT INTO public.referral_visits(visitor_id, first_referral_code, last_referral_code, credited_referral_code, landing_page, user_agent)
      VALUES (_visitor_id, _code, _code, CASE WHEN can_credit THEN _code ELSE NULL END, _landing, _user_agent);
  ELSE
    UPDATE public.referral_visits
       SET last_referral_code = _code,
           last_seen_at = now(),
           credited_referral_code = COALESCE(credited_referral_code, CASE WHEN can_credit THEN _code ELSE NULL END),
           first_referral_code = COALESCE(first_referral_code, _code)
     WHERE visitor_id = _visitor_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'active', is_active,
    'accredited', is_accredited,
    'credited', can_credit,
    'inserted_scan', inserted_scan
  );
END $function$;
