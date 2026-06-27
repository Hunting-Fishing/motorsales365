
-- Activate Amazon & eBay now that affiliate IDs are configured
UPDATE public.affiliate_links SET is_active = true WHERE supplier_slug IN ('amazon','ebay-motors');

-- AliExpress PH via Involve Asia
INSERT INTO public.affiliate_links
  (supplier_slug, label, region, url_template, affiliate_id_env, network, commission_note, is_active, priority)
VALUES
  ('aliexpress-ph','AliExpress','PH','https://www.aliexpress.com/wholesale?SearchText={QUERY}','INVOLVE_ASIA','involve_asia','Via Involve Asia',true,25)
ON CONFLICT (supplier_slug) DO NOTHING;

-- B2B supplier onboarding applications
CREATE TABLE IF NOT EXISTS public.parts_supplier_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  country text NOT NULL DEFAULT 'PH',
  business_kind text NOT NULL,
  partnership_type text NOT NULL,
  monthly_volume text,
  brands_carried text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_notes text,
  source_ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT psa_status_chk CHECK (status IN ('pending','reviewing','approved','rejected')),
  CONSTRAINT psa_partnership_chk CHECK (partnership_type IN ('affiliate','api','wholesale','dropship','sponsored','other'))
);

GRANT INSERT ON public.parts_supplier_applications TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.parts_supplier_applications TO authenticated;
GRANT ALL ON public.parts_supplier_applications TO service_role;

ALTER TABLE public.parts_supplier_applications ENABLE ROW LEVEL SECURITY;

-- Public submit: anyone can insert an application
CREATE POLICY "Anyone can submit a supplier application"
  ON public.parts_supplier_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins manage the queue
CREATE POLICY "Admins can view applications"
  ON public.parts_supplier_applications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update applications"
  ON public.parts_supplier_applications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete applications"
  ON public.parts_supplier_applications FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS psa_status_idx ON public.parts_supplier_applications(status, created_at DESC);

CREATE TRIGGER psa_updated_at
  BEFORE UPDATE ON public.parts_supplier_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
