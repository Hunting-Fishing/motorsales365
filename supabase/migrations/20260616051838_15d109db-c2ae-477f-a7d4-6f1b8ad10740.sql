
-- 1) service_catalog
CREATE TABLE public.service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type_slug TEXT NOT NULL REFERENCES public.business_types(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  default_unit TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_type_slug, key)
);
CREATE INDEX idx_service_catalog_type ON public.service_catalog(business_type_slug, sort_order) WHERE active;

GRANT SELECT ON public.service_catalog TO anon, authenticated;
GRANT ALL ON public.service_catalog TO service_role;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalog readable by anyone"
  ON public.service_catalog FOR SELECT
  USING (active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage catalog"
  ON public.service_catalog FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_service_catalog_updated
  BEFORE UPDATE ON public.service_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) service_catalog_suggestions
CREATE TABLE public.service_catalog_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type_slug TEXT NOT NULL REFERENCES public.business_types(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  proposed_title TEXT NOT NULL,
  proposed_unit TEXT,
  proposed_description TEXT,
  sample_price_php NUMERIC(12,2),
  submitter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','merged')),
  admin_note TEXT,
  merged_into_catalog_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_svc_suggestions_status ON public.service_catalog_suggestions(status, created_at DESC);
CREATE INDEX idx_svc_suggestions_submitter ON public.service_catalog_suggestions(submitter_id);

GRANT SELECT, INSERT ON public.service_catalog_suggestions TO authenticated;
GRANT ALL ON public.service_catalog_suggestions TO service_role;
ALTER TABLE public.service_catalog_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submitters see their own suggestions"
  ON public.service_catalog_suggestions FOR SELECT
  TO authenticated
  USING (submitter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can submit suggestions"
  ON public.service_catalog_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (submitter_id = auth.uid());

CREATE POLICY "Admins manage suggestions"
  ON public.service_catalog_suggestions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_svc_suggestions_updated
  BEFORE UPDATE ON public.service_catalog_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notify admins on new suggestion
CREATE OR REPLACE FUNCTION public.notify_admin_service_suggestion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ops_alerts (event, severity, source, details)
  VALUES (
    'service_catalog.suggestion_submitted',
    'warning',
    'service-suggestion',
    jsonb_build_object(
      'suggestion_id', NEW.id,
      'business_type_slug', NEW.business_type_slug,
      'proposed_title', NEW.proposed_title,
      'submitter_id', NEW.submitter_id,
      'submitter_business_id', NEW.submitter_business_id
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_svc_suggestion_notify
  AFTER INSERT ON public.service_catalog_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_service_suggestion();

-- 3) extend business_services
ALTER TABLE public.business_services
  ADD COLUMN catalog_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  ADD COLUMN pending_suggestion_id UUID REFERENCES public.service_catalog_suggestions(id) ON DELETE SET NULL;
CREATE INDEX idx_business_services_catalog_id ON public.business_services(catalog_id) WHERE catalog_id IS NOT NULL;

-- 4) Seed catalog
INSERT INTO public.service_catalog (business_type_slug, key, title, description, default_unit, sort_order) VALUES
-- towing & roadside
('towing','tow_flatbed','Flatbed Tow','Standard flatbed tow within service area.','km',10),
('towing','tow_wheel_lift','Wheel-lift Tow','Quick wheel-lift tow for short distances.','km',20),
('towing','battery_jump_start','Battery Jump Start','On-site jump start service.','service',30),
('towing','fuel_delivery','Fuel Delivery','Roadside fuel delivery (price = service fee, fuel billed separately at pump price).','service',40),
('towing','flat_tire_change','Flat Tire Change','On-site spare tire installation.','service',50),
('towing','lockout_service','Lockout / Key Service','Vehicle lockout assistance.','service',60),
('towing','winching','Winching / Recovery','Stuck-vehicle winching and recovery.','service',70),
('towing','motorcycle_tow','Motorcycle Tow','Specialized motorcycle towing.','service',80),
-- repair_shop
('repair_shop','oil_change','Oil Change (gas)','Standard engine oil + filter change (gas).','service',10),
('repair_shop','oil_change_diesel','Oil Change (diesel)','Diesel engine oil + filter change.','service',20),
('repair_shop','brake_pad_replace','Brake Pad Replacement (per axle)','Front or rear brake pad replacement.','service',30),
('repair_shop','engine_tune_up','Engine Tune-up','Spark plugs, air filter, throttle clean.','service',40),
('repair_shop','aircon_service','Aircon Service','AC clean, freon top-up, leak check.','service',50),
('repair_shop','wheel_alignment','Wheel Alignment','4-wheel alignment service.','service',60),
('repair_shop','diagnostic_scan','Computer Diagnostic Scan','OBD-II scan and report.','service',70),
('repair_shop','timing_belt','Timing Belt Replacement','Timing belt + tensioner replacement.','service',80),
-- carwash
('carwash','basic_wash','Basic Wash','Exterior soap, rinse, dry.','service',10),
('carwash','wash_and_vacuum','Wash & Vacuum','Exterior wash + interior vacuum.','service',20),
('carwash','full_detail','Full Detail','Exterior + interior detailing.','service',30),
('carwash','engine_wash','Engine Wash','Engine bay degrease + rinse.','service',40),
('carwash','waxing','Hand Wax','Hand-applied carnauba wax.','service',50),
('carwash','ceramic_coating','Ceramic Coating','Pro ceramic coating application.','service',60),
-- tire_shop
('tire_shop','tire_mount_balance','Tire Mount & Balance (per tire)','Mount tire on rim + spin balance.','service',10),
('tire_shop','tire_rotation','Tire Rotation (4)','Rotate all 4 tires.','service',20),
('tire_shop','flat_repair','Flat Tire Repair','Plug or patch a single tire.','service',30),
('tire_shop','nitrogen_fill','Nitrogen Fill (per tire)','Nitrogen inflation.','service',40),
('tire_shop','wheel_alignment','Wheel Alignment','4-wheel alignment.','service',50),
-- battery_shop
('battery_shop','battery_test','Battery Test','Load test + charging system check.','service',10),
('battery_shop','battery_install','Battery Installation','Remove old + install new battery.','service',20),
('battery_shop','battery_jump_start','Battery Jump Start','On-site jump start.','service',30),
('battery_shop','battery_delivery','Battery Delivery','Deliver and install at location.','service',40),
-- fuel_station (subset - already covered by FUEL_STATION_CATALOG, keep keys aligned)
('fuel_station','gas_91','Regular 91 RON','Standard unleaded.','L',10),
('fuel_station','gas_95','Premium 95 RON','Mid-grade unleaded.','L',20),
('fuel_station','gas_97','Premium Plus 97 RON','High-octane.','L',30),
('fuel_station','diesel','Diesel','Standard diesel.','L',40),
('fuel_station','diesel_premium','Premium Diesel','Premium / additive diesel.','L',50),
('fuel_station','lpg_auto','Auto LPG','Auto-LPG refuel.','L',60),
('fuel_station','tire_inflate','Tire Inflation','Free or paid tire inflation.','service',70),
('fuel_station','carwash','Car Wash','On-site car wash.','service',80);
