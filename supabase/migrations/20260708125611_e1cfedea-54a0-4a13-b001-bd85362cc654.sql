
-- 1. profiles: add missing capture columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS barangay text;

-- 2. qr_lead_captures: add user_id link
ALTER TABLE public.qr_lead_captures
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS qr_lead_captures_user_id_idx
  ON public.qr_lead_captures(user_id) WHERE user_id IS NOT NULL;

-- 3. qr_scans: add user_id link
ALTER TABLE public.qr_scans
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS qr_scans_user_id_idx
  ON public.qr_scans(user_id) WHERE user_id IS NOT NULL;

-- 4. referral_visits: promote to attribution table
ALTER TABLE public.referral_visits
  ADD COLUMN IF NOT EXISTS linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS qr_lead_capture_id uuid REFERENCES public.qr_lead_captures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signup_source text;
CREATE INDEX IF NOT EXISTS referral_visits_linked_user_id_idx
  ON public.referral_visits(linked_user_id) WHERE linked_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS referral_visits_qr_lead_capture_id_idx
  ON public.referral_visits(qr_lead_capture_id) WHERE qr_lead_capture_id IS NOT NULL;

-- 5. link_signup_attribution — back-fill visitor → user link everywhere in one call
CREATE OR REPLACE FUNCTION public.link_signup_attribution(
  _visitor_id uuid,
  _user_id uuid,
  _referral_code text DEFAULT NULL,
  _signup_source text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.referral_visits%ROWTYPE;
  scans_linked int := 0;
  leads_linked int := 0;
  visit_updated boolean := false;
  referral_upserted boolean := false;
  effective_code text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_user_id');
  END IF;

  -- Look up the visitor's existing attribution row (if any)
  IF _visitor_id IS NOT NULL THEN
    SELECT * INTO v FROM public.referral_visits WHERE visitor_id = _visitor_id;

    IF FOUND THEN
      UPDATE public.referral_visits
         SET linked_user_id = COALESCE(linked_user_id, _user_id),
             linked_at = COALESCE(linked_at, now()),
             signup_source = COALESCE(_signup_source, signup_source)
       WHERE visitor_id = _visitor_id;
      visit_updated := true;
    END IF;

    -- Back-fill qr_scans for this visitor
    UPDATE public.qr_scans
       SET user_id = _user_id
     WHERE visitor_id = _visitor_id
       AND user_id IS NULL;
    GET DIAGNOSTICS scans_linked = ROW_COUNT;

    -- Back-fill qr_lead_captures for this visitor (visitor_id is text there)
    UPDATE public.qr_lead_captures
       SET user_id = _user_id
     WHERE visitor_id = _visitor_id::text
       AND user_id IS NULL;
    GET DIAGNOSTICS leads_linked = ROW_COUNT;
  END IF;

  -- Determine effective referral code: explicit arg > credited > last > first
  effective_code := COALESCE(
    NULLIF(_referral_code, ''),
    v.credited_referral_code,
    v.last_referral_code,
    v.first_referral_code
  );

  -- Insert or update user_referrals if we have any referral context
  IF effective_code IS NOT NULL THEN
    INSERT INTO public.user_referrals(user_id, first_referral_code, last_referral_code, credited_referral_code)
    VALUES (_user_id, COALESCE(v.first_referral_code, effective_code), COALESCE(v.last_referral_code, effective_code), COALESCE(v.credited_referral_code, effective_code))
    ON CONFLICT (user_id) DO UPDATE
      SET last_referral_code = EXCLUDED.last_referral_code,
          credited_referral_code = COALESCE(public.user_referrals.credited_referral_code, EXCLUDED.credited_referral_code);
    referral_upserted := true;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'visit_updated', visit_updated,
    'scans_linked', scans_linked,
    'leads_linked', leads_linked,
    'referral_upserted', referral_upserted,
    'effective_code', effective_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_signup_attribution(uuid, uuid, text, text) TO authenticated, service_role;

-- 6. Owner read policies so users can see their own linked rows
DROP POLICY IF EXISTS "Users can view their own linked scans" ON public.qr_scans;
CREATE POLICY "Users can view their own linked scans"
  ON public.qr_scans FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own linked lead captures" ON public.qr_lead_captures;
CREATE POLICY "Users can view their own linked lead captures"
  ON public.qr_lead_captures FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own linked referral visits" ON public.referral_visits;
CREATE POLICY "Users can view their own linked referral visits"
  ON public.referral_visits FOR SELECT TO authenticated
  USING (linked_user_id = auth.uid());
