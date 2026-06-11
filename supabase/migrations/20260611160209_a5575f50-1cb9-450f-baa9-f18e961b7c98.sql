
-- parts_catalog: in-house SKUs we can sell
CREATE TABLE public.parts_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  base_price_php numeric(12,2),
  photo_url text,
  compatible_makes text[] NOT NULL DEFAULT '{}',
  compatible_models text[] NOT NULL DEFAULT '{}',
  year_min integer,
  year_max integer,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.parts_catalog TO anon, authenticated;
GRANT ALL ON public.parts_catalog TO service_role;
ALTER TABLE public.parts_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parts_catalog public read active" ON public.parts_catalog
  FOR SELECT USING (active = true);
CREATE POLICY "parts_catalog admin all" ON public.parts_catalog
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- vehicle_tire_specs: factory tire-size lookup
CREATE TABLE public.vehicle_tire_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text NOT NULL,
  model text NOT NULL,
  year_min integer,
  year_max integer,
  front_size text,
  rear_size text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicle_tire_specs_make_model_idx ON public.vehicle_tire_specs (lower(make), lower(model));
GRANT SELECT ON public.vehicle_tire_specs TO anon, authenticated;
GRANT ALL ON public.vehicle_tire_specs TO service_role;
ALTER TABLE public.vehicle_tire_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_tire_specs public read" ON public.vehicle_tire_specs
  FOR SELECT USING (true);
CREATE POLICY "vehicle_tire_specs admin all" ON public.vehicle_tire_specs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- part_quote_requests: buyer quote requests
CREATE TABLE public.part_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  ride_id uuid REFERENCES public.rides(id) ON DELETE SET NULL,
  requester_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  contact_phone text,
  contact_email text,
  delivery_method text NOT NULL DEFAULT 'pickup',
  notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new',
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX part_quote_requests_status_idx ON public.part_quote_requests (status, created_at DESC);
CREATE INDEX part_quote_requests_requester_idx ON public.part_quote_requests (requester_user_id);
GRANT SELECT, INSERT, UPDATE ON public.part_quote_requests TO authenticated;
GRANT INSERT ON public.part_quote_requests TO anon;
GRANT ALL ON public.part_quote_requests TO service_role;
ALTER TABLE public.part_quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "part_quote_requests anyone insert" ON public.part_quote_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "part_quote_requests requester read own" ON public.part_quote_requests
  FOR SELECT TO authenticated
  USING (requester_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "part_quote_requests admin update" ON public.part_quote_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers (reuse existing helper if present)
CREATE OR REPLACE FUNCTION public.parts_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER parts_catalog_updated_at BEFORE UPDATE ON public.parts_catalog
  FOR EACH ROW EXECUTE FUNCTION public.parts_set_updated_at();
CREATE TRIGGER vehicle_tire_specs_updated_at BEFORE UPDATE ON public.vehicle_tire_specs
  FOR EACH ROW EXECUTE FUNCTION public.parts_set_updated_at();
CREATE TRIGGER part_quote_requests_updated_at BEFORE UPDATE ON public.part_quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.parts_set_updated_at();

-- Seed a small starter catalog and a few tire specs
INSERT INTO public.parts_catalog (slug, title, description, category, base_price_php, compatible_makes, sort_order) VALUES
  ('brake-pads-front-generic', 'Front brake pads (OEM-equiv)', 'Premium ceramic pads. Specify exact fitment when requesting quote.', 'brakes', 2400, '{}', 10),
  ('brake-pads-rear-generic',  'Rear brake pads (OEM-equiv)',  'Premium ceramic pads.', 'brakes', 2200, '{}', 11),
  ('brake-rotor-front-pair',   'Front brake rotor pair',       'Vented rotors. Fitment by model.', 'brakes', 5800, '{}', 12),
  ('brake-rotor-rear-pair',    'Rear brake rotor pair',        'Solid/vented depending on model.', 'brakes', 5200, '{}', 13),
  ('brake-caliper-set',        'Brake caliper rebuild kit',    'Seals, pistons, hardware.', 'brakes', 3500, '{}', 14),
  ('tire-fitment-quote',       'Tires — request fitment quote','We''ll quote a matching set in your factory size or upgrade.', 'tires', NULL, '{}', 20),
  ('battery-maintenance-free', 'Maintenance-free battery',     'Sealed lead-acid. Sized to vehicle.', 'electrical', 4800, '{}', 30),
  ('engine-oil-change-pack',   'Engine oil + filter pack',     '4-5L synthetic + OEM-equiv filter.', 'fluids', 2500, '{}', 40),
  ('timing-belt-kit',          'Timing belt kit',              'Belt, tensioner, idler. Major service.', 'engine', 6900, '{}', 50),
  ('shock-absorber-pair',      'Shock absorber pair',          'OEM-equiv gas shocks. Front or rear.', 'suspension', 6500, '{}', 60);

INSERT INTO public.vehicle_tire_specs (make, model, year_min, year_max, front_size, rear_size, notes) VALUES
  ('Toyota',    'Vios',    2013, 2022, '185/60R15', '185/60R15', 'Base trim factory size'),
  ('Toyota',    'Vios',    2023, 2030, '185/65R15', '185/65R15', 'Latest generation base'),
  ('Toyota',    'Hilux',   2016, 2030, '265/60R18', '265/60R18', 'Conquest/G trim'),
  ('Toyota',    'Fortuner',2016, 2030, '265/60R18', '265/60R18', '2.4 V trim'),
  ('Honda',     'Civic',   2016, 2021, '215/50R17', '215/50R17', 'RS Turbo'),
  ('Honda',     'City',    2014, 2020, '185/55R16', '185/55R16', 'VX trim'),
  ('Mitsubishi','Mirage',  2013, 2022, '175/55R15', '175/55R15', 'GLS'),
  ('Mitsubishi','Montero Sport', 2016, 2030, '265/60R18', '265/60R18', 'GLS/GT'),
  ('Nissan',    'Almera',  2014, 2022, '185/65R15', '185/65R15', NULL),
  ('Ford',      'Ranger',  2016, 2022, '265/60R18', '265/60R18', 'Wildtrak'),
  ('Isuzu',     'D-Max',   2016, 2030, '265/60R18', '265/60R18', 'LS-A');
