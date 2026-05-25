
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year int,
  color text,
  vin text,
  plate_number text,
  nickname text,
  cover_url text,
  is_public boolean NOT NULL DEFAULT false,
  passport_slug text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicles_owner ON public.vehicles(owner_user_id);
CREATE UNIQUE INDEX idx_vehicles_vin_owner ON public.vehicles(owner_user_id, lower(vin)) WHERE vin IS NOT NULL;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own vehicles" ON public.vehicles
  FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Public vehicles readable" ON public.vehicles
  FOR SELECT USING (is_public = true);
CREATE POLICY "Admins manage vehicles" ON public.vehicles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER tg_vehicles_updated BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_vehicles_set_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.passport_slug IS NULL THEN
    NEW.passport_slug := encode(extensions.gen_random_bytes(8), 'hex');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_vehicles_slug BEFORE INSERT ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.tg_vehicles_set_slug();

CREATE TYPE public.service_record_type AS ENUM (
  'oil_change','tire_change','brake_service','battery','tune_up',
  'transmission','inspection','registration','insurance','accident_repair','other'
);

CREATE TABLE public.vehicle_service_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  performed_at date NOT NULL,
  mileage_km int,
  service_type public.service_record_type NOT NULL DEFAULT 'other',
  title text NOT NULL,
  shop_name text,
  cost_php numeric,
  notes text,
  receipt_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_records_vehicle ON public.vehicle_service_records(vehicle_id, performed_at DESC);

ALTER TABLE public.vehicle_service_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own service records" ON public.vehicle_service_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.owner_user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.owner_user_id = auth.uid())
    AND created_by = auth.uid()
  );
CREATE POLICY "Public records readable" ON public.vehicle_service_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.is_public = true)
  );
CREATE POLICY "Admins manage service records" ON public.vehicle_service_records
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.listings ADD COLUMN vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;
CREATE INDEX idx_listings_vehicle ON public.listings(vehicle_id) WHERE vehicle_id IS NOT NULL;

CREATE TABLE public.affiliate_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  make text,
  model text,
  year_min int,
  year_max int,
  image_url text,
  target_url text NOT NULL,
  price_php numeric,
  network_slug text REFERENCES public.affiliate_networks(slug) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_parts_match ON public.affiliate_parts(lower(make), lower(model), category) WHERE active = true;
CREATE INDEX idx_parts_category ON public.affiliate_parts(category) WHERE active = true;

ALTER TABLE public.affiliate_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active parts public read" ON public.affiliate_parts
  FOR SELECT USING (active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage parts" ON public.affiliate_parts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER tg_affiliate_parts_updated BEFORE UPDATE ON public.affiliate_parts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.vehicle_part_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.affiliate_parts(id) ON DELETE CASCADE,
  listing_id uuid,
  vehicle_id uuid,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_part_clicks_part ON public.vehicle_part_clicks(part_id, created_at DESC);

ALTER TABLE public.vehicle_part_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record part clicks" ON public.vehicle_part_clicks
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view part clicks" ON public.vehicle_part_clicks
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.affiliate_parts (title, category, make, target_url, price_php, sort_order, active, description)
VALUES
  ('Premium synthetic engine oil 5W-30 (4L)', 'oil', NULL, 'https://example.com/oil-5w30', 1850, 1, true, 'Universal fit — meets API SN standards.'),
  ('All-terrain tire 265/65 R17', 'tires', NULL, 'https://example.com/tire-at-265', 7990, 2, true, 'Popular SUV/pickup size.'),
  ('Ceramic brake pad set (front)', 'brakes', NULL, 'https://example.com/brake-ceramic', 2490, 3, true, 'Low-dust, quiet daily-driver pads.'),
  ('Maintenance-free car battery 12V 60Ah', 'battery', NULL, 'https://example.com/battery-60ah', 5990, 4, true, 'Sealed, 18-month warranty.'),
  ('HD dash cam 1440p with parking mode', 'electronics', NULL, 'https://example.com/dashcam-hd', 4490, 5, true, 'Loop recording + G-sensor.');
