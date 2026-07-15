ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS custom_domain_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS custom_domain_verify_token text,
  ADD COLUMN IF NOT EXISTS custom_domain_verified_at timestamptz;

CREATE OR REPLACE FUNCTION public.normalize_business_domain(v text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(
    regexp_replace(
      regexp_replace(lower(trim(coalesce(v,''))), '^https?://', ''),
      '^www\.', ''
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_business_custom_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE norm text;
BEGIN
  norm := public.normalize_business_domain(NEW.custom_domain);
  IF norm IS NOT NULL AND norm !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$' THEN
    RAISE EXCEPTION 'Invalid custom domain: %', NEW.custom_domain;
  END IF;
  NEW.custom_domain := norm;
  IF norm IS NULL THEN
    NEW.custom_domain_status := 'none';
    NEW.custom_domain_verify_token := NULL;
    NEW.custom_domain_verified_at := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_business_custom_domain ON public.businesses;
CREATE TRIGGER trg_enforce_business_custom_domain
  BEFORE INSERT OR UPDATE OF custom_domain, custom_domain_status ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_business_custom_domain();

CREATE UNIQUE INDEX IF NOT EXISTS uniq_business_custom_domain
  ON public.businesses (custom_domain)
  WHERE custom_domain IS NOT NULL;

DROP POLICY IF EXISTS "Public can resolve verified custom domains" ON public.businesses;
CREATE POLICY "Public can resolve verified custom domains"
  ON public.businesses
  FOR SELECT
  TO anon, authenticated
  USING (
    custom_domain IS NOT NULL
    AND custom_domain_status = 'verified'
  );