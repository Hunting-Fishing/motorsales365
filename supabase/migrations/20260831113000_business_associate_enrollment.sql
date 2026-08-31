-- Business-linked enrollment for the 365 Associate Network.
-- Additive: existing supplier applications, businesses, inventory and Shop Manager remain intact.

CREATE TABLE IF NOT EXISTS public.business_associate_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  applicant_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  track text NOT NULL CHECK (track IN ('parts_supplier','repair_shop','both')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewing','approved','rejected','suspended','withdrawn')),
  terms_version text NOT NULL DEFAULT 'associate-v1',
  terms_accepted_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_note text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_associate_status_idx
  ON public.business_associate_applications(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS business_associate_applicant_idx
  ON public.business_associate_applications(applicant_user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS business_associate_reviewer_idx
  ON public.business_associate_applications(reviewed_by) WHERE reviewed_by IS NOT NULL;

ALTER TABLE public.business_associate_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_associate_applications FROM anon, authenticated;
GRANT SELECT ON public.business_associate_applications TO authenticated;
GRANT ALL ON public.business_associate_applications TO service_role;

CREATE POLICY "associate applications: business members read"
  ON public.business_associate_applications FOR SELECT TO authenticated
  USING (public.is_business_member((select auth.uid()), business_id));

CREATE OR REPLACE FUNCTION public.apply_business_associate(
  _business_id uuid,
  _track text,
  _terms_version text DEFAULT 'associate-v1'
) RETURNS public.business_associate_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.business_associate_applications%ROWTYPE;
  v_result public.business_associate_applications%ROWTYPE;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _track NOT IN ('parts_supplier','repair_shop','both') THEN RAISE EXCEPTION 'Invalid Associate track'; END IF;
  IF NOT public.has_business_role((select auth.uid()), _business_id, 'manager'::public.business_staff_role) THEN
    RAISE EXCEPTION 'Business owner or manager access required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = _business_id AND b.status = 'active') THEN
    RAISE EXCEPTION 'The business must be active before applying';
  END IF;

  SELECT * INTO v_existing FROM public.business_associate_applications
  WHERE business_id = _business_id FOR UPDATE;
  IF FOUND AND v_existing.status IN ('approved','suspended') THEN
    RAISE EXCEPTION 'This business already has an approved or suspended Associate record';
  END IF;

  INSERT INTO public.business_associate_applications (
    business_id, applicant_user_id, track, status, terms_version,
    terms_accepted_at, submitted_at, reviewed_at, reviewed_by, review_note
  ) VALUES (
    _business_id, (select auth.uid()), _track, 'pending',
    COALESCE(NULLIF(trim(_terms_version), ''), 'associate-v1'),
    now(), now(), NULL, NULL, NULL
  )
  ON CONFLICT (business_id) DO UPDATE SET
    applicant_user_id = EXCLUDED.applicant_user_id,
    track = EXCLUDED.track,
    status = 'pending',
    terms_version = EXCLUDED.terms_version,
    terms_accepted_at = now(),
    submitted_at = now(),
    reviewed_at = NULL,
    reviewed_by = NULL,
    review_note = NULL,
    updated_at = now()
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_business_associate(uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_business_associate(uuid,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_business_associate(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_business_associate_application(
  _application_id uuid,
  _status text,
  _review_note text DEFAULT NULL
) RETURNS public.business_associate_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_result public.business_associate_applications%ROWTYPE;
BEGIN
  IF (select auth.uid()) IS NULL OR NOT public.has_role((select auth.uid()), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF _status NOT IN ('reviewing','approved','rejected','suspended') THEN
    RAISE EXCEPTION 'Invalid review status';
  END IF;
  UPDATE public.business_associate_applications SET
    status = _status,
    reviewed_at = now(),
    reviewed_by = (select auth.uid()),
    review_note = NULLIF(trim(_review_note), ''),
    approved_at = CASE WHEN _status = 'approved' THEN COALESCE(approved_at, now()) ELSE approved_at END,
    updated_at = now()
  WHERE id = _application_id
  RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Associate application not found'; END IF;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.review_business_associate_application(uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_business_associate_application(uuid,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_business_associate_application(uuid,text,text) TO authenticated;

CREATE OR REPLACE VIEW public.associate_businesses_public
WITH (security_invoker = true)
AS
SELECT business_id, track, approved_at
FROM public.business_associate_applications
WHERE status = 'approved';

CREATE POLICY "associate applications: approved public read"
  ON public.business_associate_applications FOR SELECT TO anon
  USING (status = 'approved');
GRANT SELECT ON public.associate_businesses_public TO anon, authenticated;
