
-- Enum for verification status
DO $$ BEGIN
  CREATE TYPE public.passport_verification_status AS ENUM ('pending','more_info','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.vehicle_passport_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL,
  status public.passport_verification_status NOT NULL DEFAULT 'pending',
  or_number text,
  cr_number text,
  chassis_number text,
  engine_number text,
  plate_number text,
  inspection_date date,
  inspection_provider text,
  inspection_notes text,
  accident_disclosure boolean NOT NULL DEFAULT false,
  flood_disclosure boolean NOT NULL DEFAULT false,
  document_urls text[] NOT NULL DEFAULT '{}',
  reviewer_id uuid,
  review_notes text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_verification_per_vehicle UNIQUE (vehicle_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_passport_verifications TO authenticated;
GRANT ALL ON public.vehicle_passport_verifications TO service_role;

ALTER TABLE public.vehicle_passport_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own verification"
  ON public.vehicle_passport_verifications FOR SELECT TO authenticated
  USING (
    submitted_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE POLICY "Owners create own verification"
  ON public.vehicle_passport_verifications FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.owner_user_id = auth.uid())
  );

CREATE POLICY "Owners update pending verification"
  ON public.vehicle_passport_verifications FOR UPDATE TO authenticated
  USING (
    (submitted_by = auth.uid() AND status IN ('pending','more_info'))
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
  WITH CHECK (
    submitted_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE POLICY "Owners delete pending verification"
  ON public.vehicle_passport_verifications FOR DELETE TO authenticated
  USING (
    (submitted_by = auth.uid() AND status IN ('pending','more_info'))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_vpv_set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS vpv_set_updated_at ON public.vehicle_passport_verifications;
CREATE TRIGGER vpv_set_updated_at BEFORE UPDATE ON public.vehicle_passport_verifications
  FOR EACH ROW EXECUTE FUNCTION public.tg_vpv_set_updated_at();

-- On approve/reject/more_info, set decided_at; mirror disclosures into vehicles on approve
CREATE OR REPLACE FUNCTION public.tg_vpv_on_decision() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected','more_info') THEN
    NEW.decided_at := now();
  END IF;
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    UPDATE public.vehicles
      SET disclosures = COALESCE(disclosures,'{}'::jsonb)
        || jsonb_build_object(
          'accident', NEW.accident_disclosure,
          'flood', NEW.flood_disclosure,
          'verified_at', to_jsonb(now())
        )
      WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS vpv_on_decision ON public.vehicle_passport_verifications;
CREATE TRIGGER vpv_on_decision BEFORE UPDATE ON public.vehicle_passport_verifications
  FOR EACH ROW EXECUTE FUNCTION public.tg_vpv_on_decision();

-- Public-safe view function (masks PII)
CREATE OR REPLACE FUNCTION public.get_public_passport_verification(_slug text)
RETURNS TABLE (
  status public.passport_verification_status,
  inspection_date date,
  inspection_provider text,
  accident_disclosure boolean,
  flood_disclosure boolean,
  chassis_last4 text,
  plate_masked text,
  decided_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    vpv.status,
    vpv.inspection_date,
    vpv.inspection_provider,
    vpv.accident_disclosure,
    vpv.flood_disclosure,
    CASE WHEN vpv.chassis_number IS NOT NULL AND length(vpv.chassis_number) >= 4
         THEN right(vpv.chassis_number, 4) END,
    CASE WHEN vpv.plate_number IS NOT NULL AND length(vpv.plate_number) >= 3
         THEN repeat('*', greatest(length(vpv.plate_number) - 3, 1)) || right(vpv.plate_number, 3) END,
    vpv.decided_at
  FROM public.vehicle_passport_verifications vpv
  JOIN public.vehicles v ON v.id = vpv.vehicle_id
  WHERE v.passport_slug = _slug AND v.is_public = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_passport_verification(text) TO anon, authenticated;

-- Storage bucket policies (bucket created via storage tool separately)
CREATE POLICY "Passport docs: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-passport-docs'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Passport docs: owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'vehicle-passport-docs'
    AND ((storage.foldername(name))[1] = (auth.uid())::text
         OR public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'moderator'::app_role))
  );

CREATE POLICY "Passport docs: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'vehicle-passport-docs'
    AND ((storage.foldername(name))[1] = (auth.uid())::text
         OR public.has_role(auth.uid(), 'admin'::app_role))
  );
