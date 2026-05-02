-- Verification status enum
CREATE TYPE public.verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE public.verification_request_status AS ENUM ('pending', 'approved', 'rejected', 'more_info');
CREATE TYPE public.business_kind AS ENUM ('repair_shop', 'insurance', 'dealer', 'other');

-- Profiles columns
ALTER TABLE public.profiles
  ADD COLUMN verification_status public.verification_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN verified_at timestamptz,
  ADD COLUMN business_kind public.business_kind;

-- Verification requests table
CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_kind public.business_kind NOT NULL,
  legal_name text NOT NULL,
  dti_sec_registration text,
  tax_id text,
  contact_phone text,
  contact_email text,
  address text,
  region text,
  city text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.verification_request_status NOT NULL DEFAULT 'pending',
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own verification requests"
  ON public.verification_requests FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own verification requests"
  ON public.verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pending requests"
  ON public.verification_requests FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('pending','more_info'));

CREATE POLICY "Admins manage verification requests"
  ON public.verification_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER tg_verification_requests_updated_at
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Sync trigger: when admin approves/rejects, mirror to profiles
CREATE OR REPLACE FUNCTION public.sync_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles
      SET verification_status = 'verified',
          verified_at = now(),
          business_kind = NEW.business_kind
      WHERE id = NEW.user_id;
  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    UPDATE public.profiles
      SET verification_status = 'rejected'
      WHERE id = NEW.user_id;
  ELSIF NEW.status = 'pending' AND (OLD.status IS DISTINCT FROM 'pending') THEN
    UPDATE public.profiles
      SET verification_status = 'pending'
      WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_sync_profile_verification
  AFTER INSERT OR UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_verification();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('verification-docs', 'verification-docs', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own verification docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Users delete own verification docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins manage verification docs"
  ON storage.objects FOR ALL
  USING (bucket_id = 'verification-docs' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'verification-docs' AND has_role(auth.uid(), 'admin'::app_role));
