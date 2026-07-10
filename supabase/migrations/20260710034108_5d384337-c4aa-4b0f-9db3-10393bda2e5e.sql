CREATE TYPE public.lto_doc_type AS ENUM ('cr','or');
CREATE TYPE public.listing_verification_status AS ENUM ('unverified','pending','lto_verified','mismatch','expired');

CREATE TABLE public.listing_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type public.lto_doc_type NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  file_size integer NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, doc_type)
);
CREATE INDEX idx_listing_documents_listing ON public.listing_documents(listing_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_documents TO authenticated;
GRANT ALL ON public.listing_documents TO service_role;
ALTER TABLE public.listing_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their own listing documents"
  ON public.listing_documents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all listing documents"
  ON public.listing_documents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.listing_verifications (
  listing_id uuid NOT NULL PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.listing_verification_status NOT NULL DEFAULT 'unverified',
  extracted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  mismatches_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at timestamptz,
  verified_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_verifications TO authenticated;
GRANT ALL ON public.listing_verifications TO service_role;
GRANT SELECT ON public.listing_verifications TO anon;
ALTER TABLE public.listing_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own verification"
  ON public.listing_verifications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all verifications"
  ON public.listing_verifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public reads verification status for active listings"
  ON public.listing_verifications FOR SELECT TO anon
  USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.status = 'active')
  );

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS verification_status public.listing_verification_status NOT NULL DEFAULT 'unverified';

CREATE OR REPLACE FUNCTION public.sync_listing_verification_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.listings SET verification_status = 'unverified' WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
  UPDATE public.listings SET verification_status = NEW.status WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_listing_verification_status
AFTER INSERT OR UPDATE OR DELETE ON public.listing_verifications
FOR EACH ROW EXECUTE FUNCTION public.sync_listing_verification_status();

CREATE TRIGGER trg_listing_verifications_updated_at
BEFORE UPDATE ON public.listing_verifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();