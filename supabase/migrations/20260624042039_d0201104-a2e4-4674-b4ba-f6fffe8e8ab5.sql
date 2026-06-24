
-- Phase 1: Parts catalog groundwork — country scope + outlet directory
CREATE TABLE public.parts_countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  launched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.parts_countries TO anon, authenticated;
GRANT ALL ON public.parts_countries TO service_role;

ALTER TABLE public.parts_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active countries"
ON public.parts_countries FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins manage countries"
ON public.parts_countries FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.parts_countries (code, name, currency_code, is_active, sort_order) VALUES
  ('PH', 'Philippines', 'PHP', true, 1),
  ('VN', 'Vietnam', 'VND', false, 2),
  ('TH', 'Thailand', 'THB', false, 3),
  ('ID', 'Indonesia', 'IDR', false, 4),
  ('MY', 'Malaysia', 'MYR', false, 5),
  ('SG', 'Singapore', 'SGD', false, 6);

-- Parts outlets directory (OEM dealers, parts shops, junkyards, online sellers)
CREATE TABLE public.parts_outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.parts_countries(code),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  outlet_type TEXT NOT NULL,
  brands TEXT[] NOT NULL DEFAULT '{}',
  region TEXT,
  city TEXT,
  address TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  phone TEXT,
  email TEXT,
  website TEXT,
  contact_name TEXT,
  contact_role TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_d2c_enabled BOOLEAN NOT NULL DEFAULT false,
  commission_pct NUMERIC(5,2),
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, slug),
  CHECK (outlet_type IN ('oem_dealer','parts_shop','junkyard','online','distributor'))
);

CREATE INDEX idx_parts_outlets_country_active ON public.parts_outlets (country_code, is_active);
CREATE INDEX idx_parts_outlets_brands ON public.parts_outlets USING GIN (brands);

GRANT SELECT ON public.parts_outlets TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.parts_outlets TO authenticated;
GRANT ALL ON public.parts_outlets TO service_role;

ALTER TABLE public.parts_outlets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active outlets"
ON public.parts_outlets FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins manage outlets"
ON public.parts_outlets FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER trg_parts_countries_updated_at
  BEFORE UPDATE ON public.parts_countries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_parts_outlets_updated_at
  BEFORE UPDATE ON public.parts_outlets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link OEM interest leads to a country so we know where demand is concentrated
ALTER TABLE public.oem_parts_interest
  ADD COLUMN IF NOT EXISTS country_code TEXT REFERENCES public.parts_countries(code) DEFAULT 'PH';
