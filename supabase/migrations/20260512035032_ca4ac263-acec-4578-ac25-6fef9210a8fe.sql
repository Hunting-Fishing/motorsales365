-- Deduplicate existing rows, keeping the earliest scan per (referral_code, visitor_id)
DELETE FROM public.qr_scans a
USING public.qr_scans b
WHERE a.referral_code = b.referral_code
  AND a.visitor_id IS NOT NULL
  AND b.visitor_id IS NOT NULL
  AND a.visitor_id = b.visitor_id
  AND a.scanned_at > b.scanned_at;

-- Unique constraint: one credited scan per visitor per referral code
CREATE UNIQUE INDEX IF NOT EXISTS qr_scans_code_visitor_unique
  ON public.qr_scans(referral_code, visitor_id)
  WHERE visitor_id IS NOT NULL;

-- Update RPC to dedupe inserts and signal whether the scan was newly counted
CREATE OR REPLACE FUNCTION public.record_qr_scan(
  _code text,
  _visitor_id uuid,
  _user_agent text DEFAULT NULL::text,
  _landing text DEFAULT NULL::text,
  _device text DEFAULT NULL::text,
  _browser text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s public.staff_referrals%ROWTYPE;
  v public.referral_visits%ROWTYPE;
  is_active boolean;
  inserted_scan boolean := false;
  new_scan_id uuid;
BEGIN
  SELECT * INTO s FROM public.staff_referrals WHERE referral_code = _code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_code');
  END IF;
  is_active := s.active;

  -- Dedupe: only first scan per (referral_code, visitor_id) is recorded
  INSERT INTO public.qr_scans(referral_code, visitor_id, device_type, browser)
    VALUES (_code, _visitor_id, _device, _browser)
    ON CONFLICT (referral_code, visitor_id) WHERE visitor_id IS NOT NULL
    DO NOTHING
    RETURNING id INTO new_scan_id;
  inserted_scan := new_scan_id IS NOT NULL;

  -- Upsert visitor record (first-touch attribution preserved)
  SELECT * INTO v FROM public.referral_visits WHERE visitor_id = _visitor_id;
  IF NOT FOUND THEN
    INSERT INTO public.referral_visits(visitor_id, first_referral_code, last_referral_code, credited_referral_code, landing_page, user_agent)
      VALUES (_visitor_id, _code, _code, CASE WHEN is_active THEN _code ELSE NULL END, _landing, _user_agent);
  ELSE
    UPDATE public.referral_visits
      SET last_referral_code = _code,
          last_seen_at = now(),
          credited_referral_code = COALESCE(credited_referral_code, CASE WHEN is_active THEN _code ELSE NULL END),
          first_referral_code = COALESCE(first_referral_code, _code)
      WHERE visitor_id = _visitor_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'active', is_active,
    'staff_name', s.full_name,
    'first_name', split_part(s.full_name, ' ', 1),
    'code', _code,
    'counted', inserted_scan
  );
END $function$;