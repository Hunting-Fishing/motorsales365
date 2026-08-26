
-- ============================================================================
-- SOURCE MIGRATION: 20260616051838_15d109db-c2ae-477f-a7d4-6f1b8ad10740.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260616052943_f30fe80d-b361-4bd7-9f15-ba34f9d58b35.sql
-- ============================================================================

CREATE TABLE public.service_suggestion_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES public.service_catalog_suggestions(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('approved','rejected','merged')),
  catalog_id uuid REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.service_suggestion_audit_log TO authenticated;
GRANT ALL ON public.service_suggestion_audit_log TO service_role;

ALTER TABLE public.service_suggestion_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read service suggestion audit"
  ON public.service_suggestion_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ssal_suggestion ON public.service_suggestion_audit_log(suggestion_id, created_at DESC);
CREATE INDEX idx_ssal_actor ON public.service_suggestion_audit_log(actor_id, created_at DESC);
CREATE INDEX idx_ssal_created ON public.service_suggestion_audit_log(created_at DESC);


-- ============================================================================
-- SOURCE MIGRATION: 20260616053812_7785b594-fe6e-4d48-a742-c85ad046bb3e.sql
-- ============================================================================
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_source_external_id_key;


-- ============================================================================
-- SOURCE MIGRATION: 20260616054838_f911f5dd-0431-4f0c-9a94-59bc9852eb4c.sql
-- ============================================================================
DROP INDEX IF EXISTS public.businesses_source_external_id_key;


-- ============================================================================
-- SOURCE MIGRATION: 20260616065656_7793cf87-1c3b-4fec-8151-38cd3ab67b18.sql
-- ============================================================================

-- Lock down contact_value columns from broad role-level SELECT.
REVOKE SELECT (contact_value) ON public.wanted_posts FROM anon, authenticated, PUBLIC;
REVOKE SELECT (contact_value) ON public.wanted_post_responses FROM anon, authenticated, PUBLIC;

-- Re-grant all other columns explicitly to authenticated/anon so existing queries continue to work.
-- (Default table-level SELECT grants remain for all other columns; we only revoked the single column.)

-- Provide a controlled accessor for owners / responders who legitimately need the contact value.
CREATE OR REPLACE FUNCTION public.get_wanted_post_contact(_post_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wp.contact_value
  FROM public.wanted_posts wp
  WHERE wp.id = _post_id
    AND wp.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_wanted_post_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wanted_post_contact(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_wanted_response_contact(_response_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.contact_value
  FROM public.wanted_post_responses r
  LEFT JOIN public.wanted_posts wp ON wp.id = r.wanted_post_id
  WHERE r.id = _response_id
    AND (r.user_id = auth.uid() OR wp.user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.get_wanted_response_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wanted_response_contact(uuid) TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260617031640_9b47f042-edcc-447e-836a-8c19fd712ae9.sql
-- ============================================================================

-- Seed service catalog entries for business types that previously had none,
-- and round out a few existing types.
INSERT INTO public.service_catalog (business_type_slug, key, title, description, default_unit, sort_order, active) VALUES
-- Accessories / customization
('accessories','acc_dashcam_install','Dashcam Installation','Front or front+rear dashcam install with hardwire.','service',10,true),
('accessories','acc_alarm_install','Car Alarm / Immobilizer Install',NULL,'service',20,true),
('accessories','acc_led_upgrade','LED Headlight / Foglight Upgrade',NULL,'service',30,true),
('accessories','acc_remote_start','Remote Start Install',NULL,'service',40,true),
('accessories','acc_roof_rack','Roof Rack / Cargo Carrier Install',NULL,'service',50,true),
('accessories','acc_seat_cover','Custom Seat Cover Fitting',NULL,'set',60,true),
('accessories','acc_floor_mats','Custom Floor Mats',NULL,'set',70,true),
-- Audio & tint
('audio_tint','at_window_tint','Window Tinting (full vehicle)',NULL,'vehicle',10,true),
('audio_tint','at_windshield_tint','Windshield Tinting',NULL,'service',20,true),
('audio_tint','at_speaker_install','Speaker Replacement',NULL,'set',30,true),
('audio_tint','at_head_unit_install','Head Unit / Stereo Install',NULL,'service',40,true),
('audio_tint','at_amp_sub_install','Amp & Subwoofer Install',NULL,'service',50,true),
('audio_tint','at_sound_deadening','Sound Deadening',NULL,'vehicle',60,true),
-- Body & paint
('body_paint','bp_full_repaint','Full Vehicle Repaint',NULL,'vehicle',10,true),
('body_paint','bp_panel_repaint','Single Panel Repaint',NULL,'service',20,true),
('body_paint','bp_dent_repair','Dent Repair (PDR)',NULL,'service',30,true),
('body_paint','bp_bumper_repair','Bumper Repair',NULL,'service',40,true),
('body_paint','bp_scratch_buff','Scratch Removal / Buffing',NULL,'service',50,true),
('body_paint','bp_collision_estimate','Collision Repair Estimate',NULL,'service',60,true),
('body_paint','bp_insurance_claim','Insurance Claim Assistance',NULL,'service',70,true),
-- Corporate / fleet
('corporate','cf_fleet_lease','Fleet Lease (long-term)',NULL,'vehicle',10,true),
('corporate','cf_fleet_maintenance','Fleet Maintenance Contract',NULL,'vehicle',20,true),
('corporate','cf_driver_supply','Driver Supply',NULL,'day',30,true),
('corporate','cf_chauffeur','Chauffeur Service',NULL,'hr',40,true),
-- Dealerships (new cars)
('dealership','dl_new_car_sale','New Vehicle Sale',NULL,'vehicle',10,true),
('dealership','dl_test_drive','Test Drive Booking',NULL,'service',20,true),
('dealership','dl_trade_in','Trade-in Appraisal',NULL,'service',30,true),
('dealership','dl_financing','In-house Financing',NULL,'service',40,true),
('dealership','dl_warranty','Warranty Registration',NULL,'service',50,true),
('dealership','dl_pms','Preventive Maintenance Service (PMS)',NULL,'service',60,true),
-- Used car dealer
('used_dealership','ud_used_sale','Used Vehicle Sale',NULL,'vehicle',10,true),
('used_dealership','ud_buy_your_car','We Buy Your Car',NULL,'vehicle',20,true),
('used_dealership','ud_trade_in','Trade-in Appraisal',NULL,'service',30,true),
('used_dealership','ud_consign','Consignment',NULL,'service',40,true),
('used_dealership','ud_financing_assist','Financing Assistance',NULL,'service',50,true),
('used_dealership','ud_recon','Reconditioning / Detailing',NULL,'vehicle',60,true),
-- Driving school
('driving_school','ds_basic_course','Basic Driving Course (manual)',NULL,'session',10,true),
('driving_school','ds_basic_at','Basic Driving Course (automatic)',NULL,'session',20,true),
('driving_school','ds_refresher','Refresher Course',NULL,'session',30,true),
('driving_school','ds_tdc','Theoretical Driving Course (TDC)',NULL,'session',40,true),
('driving_school','ds_pdc','Practical Driving Course (PDC)',NULL,'session',50,true),
('driving_school','ds_motor_course','Motorcycle Riding Course',NULL,'session',60,true),
-- Financing / loans
('financing','fn_auto_loan','Auto Loan Application',NULL,'service',10,true),
('financing','fn_motor_loan','Motorcycle Loan',NULL,'service',20,true),
('financing','fn_refinance','Auto Refinancing',NULL,'service',30,true),
('financing','fn_truck_loan','Commercial / Truck Loan',NULL,'service',40,true),
('financing','fn_loan_calc','Loan Pre-qualification',NULL,'service',50,true),
-- Inspection / emissions
('inspection','ip_pms_inspection','PMS / Multi-point Inspection',NULL,'vehicle',10,true),
('inspection','ip_pre_purchase','Pre-purchase Inspection',NULL,'vehicle',20,true),
('inspection','ip_emission_test','Emission Testing',NULL,'vehicle',30,true),
('inspection','ip_pmvic','PMVIC Roadworthiness Inspection',NULL,'vehicle',40,true),
('inspection','ip_obd_scan','OBD-II Diagnostic Scan',NULL,'service',50,true),
-- Insurance
('insurance','ins_ctpl','CTPL (mandatory liability)',NULL,'service',10,true),
('insurance','ins_comprehensive','Comprehensive Insurance',NULL,'service',20,true),
('insurance','ins_acts_of_nature','Acts of Nature Coverage',NULL,'service',30,true),
('insurance','ins_renewal','Policy Renewal',NULL,'service',40,true),
('insurance','ins_claim_assist','Claims Assistance',NULL,'service',50,true),
('insurance','ins_quote','Insurance Quotation',NULL,'service',60,true),
-- LTO services
('lto_services','lto_registration','LTO Vehicle Registration',NULL,'vehicle',10,true),
('lto_services','lto_renewal','LTO Registration Renewal',NULL,'vehicle',20,true),
('lto_services','lto_transfer','Transfer of Ownership',NULL,'service',30,true),
('lto_services','lto_change_color','Change of Color / Body',NULL,'service',40,true),
('lto_services','lto_plates','Plates / Sticker Release',NULL,'service',50,true),
('lto_services','lto_drivers_license','Driver''s License Application / Renewal',NULL,'service',60,true),
-- Motorcycle shop
('motorcycle_shop','mc_oil_change','Motorcycle Oil Change',NULL,'service',10,true),
('motorcycle_shop','mc_tire_change','Motorcycle Tire Change',NULL,'service',20,true),
('motorcycle_shop','mc_brake_service','Brake Service',NULL,'service',30,true),
('motorcycle_shop','mc_chain_sprocket','Chain & Sprocket Replacement','set','set',40,true),
('motorcycle_shop','mc_tune_up','Tune-up',NULL,'service',50,true),
('motorcycle_shop','mc_battery','Battery Replacement',NULL,'service',60,true),
('motorcycle_shop','mc_carb_clean','Carburetor Cleaning',NULL,'service',70,true),
('motorcycle_shop','mc_clutch','Clutch Service',NULL,'service',80,true),
-- Parts supplier / shop
('parts_accessories','pa_oem_parts','OEM Parts',NULL,'item',10,true),
('parts_accessories','pa_aftermarket','Aftermarket Parts',NULL,'item',20,true),
('parts_accessories','pa_brake_pads','Brake Pads',NULL,'set',30,true),
('parts_accessories','pa_filters','Filters (oil / air / fuel)',NULL,'item',40,true),
('parts_accessories','pa_battery','Battery',NULL,'item',50,true),
('parts_accessories','pa_belts_hoses','Belts & Hoses',NULL,'item',60,true),
('parts_accessories','pa_lubricants','Engine Oil / Lubricants',NULL,'L',70,true),
('parts_accessories','pa_tires','Tires',NULL,'item',80,true),
('parts_accessories','pa_special_order','Special Order / Sourcing',NULL,'service',90,true),
-- Vehicle rental
('rental','rt_self_drive','Self-drive Rental',NULL,'day',10,true),
('rental','rt_with_driver','Rental With Driver',NULL,'day',20,true),
('rental','rt_airport_transfer','Airport Transfer',NULL,'trip',30,true),
('rental','rt_hourly','Hourly Rental',NULL,'hr',40,true),
('rental','rt_long_term','Long-term Rental (monthly)',NULL,'month',50,true),
('rental','rt_van_rental','Van Rental',NULL,'day',60,true),
('rental','rt_truck_rental','Truck / Pickup Rental',NULL,'day',70,true),
-- Salvage / pick-a-part
('salvage','sv_used_part','Used Part (per item)',NULL,'item',10,true),
('salvage','sv_engine_assembly','Used Engine Assembly',NULL,'item',20,true),
('salvage','sv_transmission','Used Transmission',NULL,'item',30,true),
('salvage','sv_body_panel','Used Body Panel',NULL,'item',40,true),
('salvage','sv_buy_junk','We Buy Junk / Wrecked Cars',NULL,'vehicle',50,true),
('salvage','sv_dismantling','Vehicle Dismantling',NULL,'vehicle',60,true),
-- Transport / logistics
('transport','tl_lipat_bahay','Lipat-bahay (house move)',NULL,'trip',10,true),
('transport','tl_furniture_delivery','Furniture / Appliance Delivery',NULL,'trip',20,true),
('transport','tl_cargo_van','Cargo Van Hire',NULL,'trip',30,true),
('transport','tl_truck_hire','Truck Hire (6-wheeler+)',NULL,'trip',40,true),
('transport','tl_courier','Courier / Parcel Delivery',NULL,'delivery',50,true),
('transport','tl_intercity','Inter-city Freight',NULL,'trip',60,true),
('transport','tl_warehouse','Warehousing',NULL,'month',70,true),
-- "Other" — generic fallback
('other','oth_consultation','Consultation',NULL,'hr',10,true),
('other','oth_service_call','Service Call',NULL,'visit',20,true),
('other','oth_estimate','Estimate / Quotation',NULL,'service',30,true),
-- Round out existing types
('repair_shop','rs_battery_replace','Battery Replacement',NULL,'service',90,true),
('repair_shop','rs_clutch_service','Clutch Service',NULL,'service',100,true),
('repair_shop','rs_suspension','Suspension Repair',NULL,'service',110,true),
('repair_shop','rs_radiator_flush','Radiator Flush',NULL,'service',120,true),
('repair_shop','rs_transmission_service','Transmission Service',NULL,'service',130,true),
('repair_shop','rs_electrical','Electrical Diagnosis & Repair',NULL,'hr',140,true),
('tire_shop','ts_new_tire','New Tire (per tire)',NULL,'item',60,true),
('tire_shop','ts_used_tire','Used Tire (per tire)',NULL,'item',70,true),
('tire_shop','ts_tire_repair_patch','Tire Repair (patch / plug)',NULL,'service',80,true),
('tire_shop','ts_road_hazard','Road Hazard Warranty',NULL,'item',90,true),
('battery_shop','bs_new_battery','New Battery (with old trade-in)',NULL,'item',50,true),
('battery_shop','bs_alternator_test','Alternator / Charging System Test',NULL,'service',60,true),
('battery_shop','bs_battery_recharge','Battery Recharging',NULL,'service',70,true),
('carwash','cw_interior_detail','Interior Detail / Shampoo',NULL,'service',70,true),
('carwash','cw_paint_correction','Paint Correction',NULL,'service',80,true),
('carwash','cw_headlight_restore','Headlight Restoration',NULL,'service',90,true),
('fuel_station','fs_kerosene','Kerosene',NULL,'L',90,true),
('fuel_station','fs_lubricants','Engine Oil / Lubricants',NULL,'L',100,true),
('fuel_station','fs_air_water','Air & Water','Free or paid','service',110,true),
('fuel_station','fs_atm','ATM',NULL,'service',120,true),
('fuel_station','fs_convenience','Convenience Store',NULL,'service',130,true)
ON CONFLICT (business_type_slug, key) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260617043532_9769227e-2fd2-4920-83f6-88222ae485cf.sql
-- ============================================================================

ALTER TABLE public.business_services
  ADD COLUMN IF NOT EXISTS max_price_php numeric,
  ADD COLUMN IF NOT EXISTS region_scope text,
  ADD COLUMN IF NOT EXISTS service_radius_km int,
  ADD COLUMN IF NOT EXISTS eta_minutes int,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_24_7 boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.validate_business_service_row()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.region_scope IS NOT NULL AND NEW.region_scope NOT IN
    ('on_site','barangay','city','province','region','nationwide') THEN
    RAISE EXCEPTION 'invalid region_scope: %', NEW.region_scope;
  END IF;
  IF NEW.max_price_php IS NOT NULL AND NEW.price_php IS NOT NULL
     AND NEW.max_price_php < NEW.price_php THEN
    RAISE EXCEPTION 'max_price_php must be >= price_php';
  END IF;
  IF NEW.service_radius_km IS NOT NULL AND NEW.service_radius_km < 0 THEN
    RAISE EXCEPTION 'service_radius_km must be >= 0';
  END IF;
  IF NEW.eta_minutes IS NOT NULL AND NEW.eta_minutes < 0 THEN
    RAISE EXCEPTION 'eta_minutes must be >= 0';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_business_service_row ON public.business_services;
CREATE TRIGGER trg_validate_business_service_row
  BEFORE INSERT OR UPDATE ON public.business_services
  FOR EACH ROW EXECUTE FUNCTION public.validate_business_service_row();

CREATE INDEX IF NOT EXISTS idx_bs_active_price ON public.business_services (active, price_php);
CREATE INDEX IF NOT EXISTS idx_bs_catalog_active ON public.business_services (catalog_id, active);
CREATE INDEX IF NOT EXISTS idx_bs_tags_gin ON public.business_services USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_bs_region_scope ON public.business_services (region_scope) WHERE region_scope IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bs_eta ON public.business_services (eta_minutes) WHERE eta_minutes IS NOT NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260617064310_c8bfaceb-3ed9-4fd0-b668-0ecd1f17a548.sql
-- ============================================================================

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

CREATE TABLE IF NOT EXISTS public.business_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, slug)
);

GRANT SELECT ON public.business_brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_brands TO authenticated;
GRANT ALL ON public.business_brands TO service_role;

ALTER TABLE public.business_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business brands"
  ON public.business_brands FOR SELECT
  USING (true);

CREATE POLICY "Owners can insert brands"
  ON public.business_brands FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_brands.business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can update brands"
  ON public.business_brands FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_brands.business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can delete brands"
  ON public.business_brands FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_brands.business_id AND b.owner_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_business_brands_business_sort
  ON public.business_brands (business_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_business_brands_slug
  ON public.business_brands (slug);


-- ============================================================================
-- SOURCE MIGRATION: 20260617092418_a50d4b21-3863-4d9a-b7ce-20866f5b7ca1.sql
-- ============================================================================
-- Add assigned staff member to bookings
ALTER TABLE public.business_bookings
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_business_assigned
  ON public.business_bookings(business_id, assigned_user_id);

-- Allow the assigned staff member to view bookings assigned to them
DROP POLICY IF EXISTS "Assigned staff view bookings" ON public.business_bookings;
CREATE POLICY "Assigned staff view bookings" ON public.business_bookings
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND assigned_user_id = auth.uid());

-- Allow the assigned staff member to update status on their bookings
DROP POLICY IF EXISTS "Assigned staff update bookings" ON public.business_bookings;
CREATE POLICY "Assigned staff update bookings" ON public.business_bookings
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND assigned_user_id = auth.uid());


-- ============================================================================
-- SOURCE MIGRATION: 20260618143033_d72ee2aa-d994-47fd-941d-2407c084e60e.sql
-- ============================================================================

CREATE TABLE public.advertisement_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL CHECK (source IN ('advertisement','ad_inquiry','promotion')),
  source_id uuid,
  action text NOT NULL CHECK (action IN ('created','updated','deleted')),
  snapshot jsonb NOT NULL,
  previous jsonb,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  note text
);

CREATE INDEX advertisement_history_source_idx ON public.advertisement_history (source, changed_at DESC);
CREATE INDEX advertisement_history_source_id_idx ON public.advertisement_history (source_id);
CREATE INDEX advertisement_history_changed_at_idx ON public.advertisement_history (changed_at DESC);

GRANT SELECT ON public.advertisement_history TO authenticated;
GRANT ALL ON public.advertisement_history TO service_role;

ALTER TABLE public.advertisement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read advertisement history"
  ON public.advertisement_history
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
-- No INSERT/UPDATE/DELETE policies: writes happen via SECURITY DEFINER trigger; table is effectively append-only from app code.

CREATE OR REPLACE FUNCTION public.log_advertisement_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source text;
  v_action text;
  v_id uuid;
  v_actor uuid;
BEGIN
  IF TG_TABLE_NAME = 'advertisements' THEN v_source := 'advertisement';
  ELSIF TG_TABLE_NAME = 'ad_inquiries' THEN v_source := 'ad_inquiry';
  ELSIF TG_TABLE_NAME = 'promotions' THEN v_source := 'promotion';
  ELSE v_source := TG_TABLE_NAME;
  END IF;

  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_id := (to_jsonb(NEW) ->> 'id')::uuid;
    INSERT INTO public.advertisement_history (source, source_id, action, snapshot, previous, changed_by)
    VALUES (v_source, v_id, v_action, to_jsonb(NEW), NULL, v_actor);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_id := (to_jsonb(NEW) ->> 'id')::uuid;
    INSERT INTO public.advertisement_history (source, source_id, action, snapshot, previous, changed_by)
    VALUES (v_source, v_id, v_action, to_jsonb(NEW), to_jsonb(OLD), v_actor);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_id := (to_jsonb(OLD) ->> 'id')::uuid;
    INSERT INTO public.advertisement_history (source, source_id, action, snapshot, previous, changed_by)
    VALUES (v_source, v_id, v_action, to_jsonb(OLD), NULL, v_actor);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER advertisements_history_trg
AFTER INSERT OR UPDATE OR DELETE ON public.advertisements
FOR EACH ROW EXECUTE FUNCTION public.log_advertisement_history();

CREATE TRIGGER ad_inquiries_history_trg
AFTER INSERT OR UPDATE OR DELETE ON public.ad_inquiries
FOR EACH ROW EXECUTE FUNCTION public.log_advertisement_history();

CREATE TRIGGER promotions_history_trg
AFTER INSERT OR UPDATE OR DELETE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.log_advertisement_history();


-- ============================================================================
-- SOURCE MIGRATION: 20260618143923_eb7a3021-7236-4dc9-8cbb-cf030cc4c9af.sql
-- ============================================================================

CREATE TABLE public.share_kit_custom_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  image_url text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  qr_cx numeric NOT NULL DEFAULT 0.85,
  qr_cy numeric NOT NULL DEFAULT 0.85,
  qr_size numeric NOT NULL DEFAULT 0.18,
  share_text text NOT NULL DEFAULT 'Scan or tap to shop with my 365 Motor Sales link: {link}',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.share_kit_custom_templates TO authenticated;
GRANT ALL ON public.share_kit_custom_templates TO service_role;

ALTER TABLE public.share_kit_custom_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read active templates"
  ON public.share_kit_custom_templates FOR SELECT
  TO authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage templates"
  ON public.share_kit_custom_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_share_kit_templates()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER share_kit_custom_templates_touch
BEFORE UPDATE ON public.share_kit_custom_templates
FOR EACH ROW EXECUTE FUNCTION public.touch_share_kit_templates();

CREATE TABLE public.share_kit_hidden_builtins (
  template_id text NOT NULL PRIMARY KEY,
  hidden_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  hidden_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.share_kit_hidden_builtins TO authenticated;
GRANT ALL ON public.share_kit_hidden_builtins TO service_role;

ALTER TABLE public.share_kit_hidden_builtins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read hidden builtins"
  ON public.share_kit_hidden_builtins FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage hidden builtins"
  ON public.share_kit_hidden_builtins FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260618144012_6a199a95-2beb-4279-950d-af8fb30472a7.sql
-- ============================================================================

CREATE POLICY "Auth read share-kit-templates"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'share-kit-templates');

CREATE POLICY "Admins insert share-kit-templates"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'share-kit-templates' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update share-kit-templates"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'share-kit-templates' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete share-kit-templates"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'share-kit-templates' AND public.has_role(auth.uid(), 'admin'::app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260618193735_da239fa8-bd86-4306-bbcf-ce8f3ca641e8.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_referrer_contact(_code text)
RETURNS TABLE(full_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sr.full_name, sr.email
  FROM public.staff_referrals sr
  WHERE sr.referral_code = _code
    AND sr.active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_referrer_contact(text) TO anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260619131835_99305083-0d8e-4bb8-b95a-3918e1a14f19.sql
-- ============================================================================

ALTER TABLE public.share_kit_custom_templates
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS subcategory text;

CREATE TABLE IF NOT EXISTS public.share_kit_builtin_categories (
  template_id text PRIMARY KEY,
  category text,
  subcategory text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.share_kit_builtin_categories TO authenticated;
GRANT ALL ON public.share_kit_builtin_categories TO service_role;

ALTER TABLE public.share_kit_builtin_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read builtin categories" ON public.share_kit_builtin_categories;
CREATE POLICY "Authenticated can read builtin categories"
  ON public.share_kit_builtin_categories
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage builtin categories" ON public.share_kit_builtin_categories;
CREATE POLICY "Admins manage builtin categories"
  ON public.share_kit_builtin_categories
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260619134200_f7db1956-9a8e-4e69-871c-e6d9caaadcf3.sql
-- ============================================================================

ALTER TABLE IF EXISTS public.share_kit_custom_templates RENAME TO qr_ad_templates;
ALTER TABLE IF EXISTS public.share_kit_builtin_categories RENAME TO qr_ad_builtin_categories;
ALTER TABLE IF EXISTS public.share_kit_hidden_builtins RENAME TO qr_ad_hidden_builtins;
ALTER TABLE IF EXISTS public.share_kit_layouts RENAME TO qr_ad_layouts;

-- Remap top-level categories on both tables
UPDATE public.qr_ad_templates SET category = CASE category
  WHEN 'service-repair' THEN 'repair-service'
  WHEN 'sales-service' THEN 'sales-marketplace'
  WHEN 'insurance-finance' THEN 'insurance-finance'
  WHEN 'advertising-365' THEN 'brand-format'
  WHEN 'other' THEN 'other'
  ELSE category
END WHERE category IS NOT NULL;

UPDATE public.qr_ad_builtin_categories SET category = CASE category
  WHEN 'service-repair' THEN 'repair-service'
  WHEN 'sales-service' THEN 'sales-marketplace'
  WHEN 'insurance-finance' THEN 'insurance-finance'
  WHEN 'advertising-365' THEN 'brand-format'
  WHEN 'other' THEN 'other'
  ELSE category
END WHERE category IS NOT NULL;

-- Remap subcategories
UPDATE public.qr_ad_templates SET subcategory = CASE subcategory
  WHEN 'tow-roadside' THEN 'tow-247'
  WHEN 'vehicles-for-sale' THEN 'cars-for-sale'
  WHEN 'detailing-carwash' THEN 'detailing-carwash'
  WHEN 'upholstery-interior' THEN 'upholstery-interior'
  WHEN 'inspection-testing' THEN 'inspection-testing'
  WHEN 'tire-wheel' THEN 'tire-wheel'
  WHEN 'mechanic' THEN 'mechanic'
  WHEN 'parts-accessories' THEN 'parts-accessories'
  WHEN 'fuel-lubricants' THEN 'fuel-lubricants'
  WHEN 'insurance' THEN 'insurance'
  WHEN 'financing' THEN 'financing'
  WHEN 'social-posts' THEN 'social-posts'
  WHEN 'stories-reels' THEN 'stories-reels'
  WHEN 'print-wearables' THEN 'print-wearables'
  WHEN 'other' THEN 'other'
  ELSE subcategory
END WHERE subcategory IS NOT NULL;

UPDATE public.qr_ad_builtin_categories SET subcategory = CASE subcategory
  WHEN 'tow-roadside' THEN 'tow-247'
  WHEN 'vehicles-for-sale' THEN 'cars-for-sale'
  WHEN 'detailing-carwash' THEN 'detailing-carwash'
  WHEN 'upholstery-interior' THEN 'upholstery-interior'
  WHEN 'inspection-testing' THEN 'inspection-testing'
  WHEN 'tire-wheel' THEN 'tire-wheel'
  WHEN 'mechanic' THEN 'mechanic'
  WHEN 'parts-accessories' THEN 'parts-accessories'
  WHEN 'fuel-lubricants' THEN 'fuel-lubricants'
  WHEN 'insurance' THEN 'insurance'
  WHEN 'financing' THEN 'financing'
  WHEN 'social-posts' THEN 'social-posts'
  WHEN 'stories-reels' THEN 'stories-reels'
  WHEN 'print-wearables' THEN 'print-wearables'
  WHEN 'other' THEN 'other'
  ELSE subcategory
END WHERE subcategory IS NOT NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260619140054_e2a2e838-4507-4c8e-b21c-b2b690bb385b.sql
-- ============================================================================

-- Bulk-categorize the 57 QR ad templates based on their label keywords.
-- Anything that doesn't match falls back to (other, other).

UPDATE public.qr_ad_templates SET category = sub.category, subcategory = sub.subcategory
FROM (
  SELECT id,
    CASE
      WHEN label ILIKE '%inspection%' OR label ILIKE '%emission%' THEN 'repair-service'
      WHEN label ILIKE '%aircon%' OR label ILIKE '%battery%' OR label ILIKE '%electrical%' OR label ILIKE '%caraudio%' OR label ILIKE '%alarm%' OR label ILIKE '%gps%' OR label ILIKE '%locksmith%' OR label ILIKE '%keyprogram%' THEN 'repair-service'
      WHEN label ILIKE '%body paint%' OR label ILIKE '%body shop%' OR label ILIKE '%bodywork%' OR label ILIKE '%fabrication%' OR label ILIKE '%wrap%' OR label ILIKE '%signage%' OR label ILIKE '%autotint%' OR label ILIKE '%tint%' THEN 'repair-service'
      WHEN label ILIKE '%detail%' OR label ILIKE '%ceramic%' OR label ILIKE '%car wash%' OR label ILIKE '%carwash%' THEN 'repair-service'
      WHEN label ILIKE '%upholstery%' OR label ILIKE '%seatcover%' OR label ILIKE '%seat cover%' THEN 'repair-service'
      WHEN label ILIKE '%tire%' OR label ILIKE '%wheel%' OR label ILIKE '%alignment%' OR label ILIKE '%vulcaniz%' OR label ILIKE '%underchassis%' THEN 'repair-service'
      WHEN label ILIKE '%glass%' OR label ILIKE '%windshield%' THEN 'repair-service'
      WHEN label ILIKE '%diesel%' OR label ILIKE '%injection%' OR label ILIKE '%farm%' OR label ILIKE '%tractor%' OR label ILIKE '%heavy duty%' THEN 'repair-service'
      WHEN label ILIKE '%motorcycle repair%' OR label ILIKE '%motorcycle service%' THEN 'repair-service'
      WHEN label ILIKE '%jeepney%' OR label ILIKE '%brake%' OR label ILIKE '%clutch%' OR label ILIKE '%muffler%' OR label ILIKE '%exhaust%' OR label ILIKE '%radiator%' OR label ILIKE '%cooling%' OR label ILIKE '%4x4%' OR label ILIKE '%liftkit%' OR label ILIKE '%tuning%' OR label ILIKE '%performance%' OR label ILIKE '%engine%shop%' OR label ILIKE '%machine shop%' OR label ILIKE '%mobile mechanic%' OR label ILIKE '%fleet maintenance%' THEN 'repair-service'
      WHEN label ILIKE '%tow%' THEN 'towing-roadside'
      WHEN label ILIKE '%rental%' OR label ILIKE '%dealer%' OR label ILIKE '%dealership%' OR label ILIKE '%cars nationwide%' OR label ILIKE '%find next car%' OR label ILIKE '%advertisement find%' THEN 'sales-marketplace'
      WHEN label ILIKE '%heavy equipment%' OR label ILIKE '%main machine%' OR label ILIKE '%generator%' THEN 'sales-marketplace'
      WHEN label ILIKE '%marine%' OR label ILIKE '%outboard%' OR label ILIKE '%boat%' THEN 'sales-marketplace'
      WHEN label ILIKE '%trike%' OR label ILIKE '%sidecar%' OR label ILIKE '%main motorcycle%' THEN 'sales-marketplace'
      WHEN label ILIKE '%parts%' OR label ILIKE '%salvage%' OR label ILIKE '%transmission%' OR label ILIKE '%motorcycle parts%' THEN 'sales-marketplace'
      WHEN label ILIKE '%insurance%' THEN 'insurance-finance'
      WHEN label ILIKE '%financ%' OR label ILIKE '%loan%' THEN 'insurance-finance'
      WHEN label ILIKE '%lto%' OR label ILIKE '%registration%' OR label ILIKE '%warranty%' THEN 'insurance-finance'
      WHEN label ILIKE '%driving school%' OR label ILIKE '%course%' OR label ILIKE '%workshop%' OR label ILIKE '%training%' THEN 'training-certification'
      WHEN label ILIKE '%advertisement%' OR label ILIKE '%main 1%' OR label ILIKE '%main 2%' THEN 'brand-format'
      ELSE 'other'
    END AS category,
    CASE
      WHEN label ILIKE '%inspection%' OR label ILIKE '%emission%' THEN 'inspection-testing'
      WHEN label ILIKE '%aircon%' OR label ILIKE '%battery%' OR label ILIKE '%electrical%' OR label ILIKE '%caraudio%' OR label ILIKE '%alarm%' OR label ILIKE '%gps%' OR label ILIKE '%locksmith%' OR label ILIKE '%keyprogram%' THEN 'ac-electrical'
      WHEN label ILIKE '%wrap%' OR label ILIKE '%signage%' OR label ILIKE '%body paint%' OR label ILIKE '%body shop%' OR label ILIKE '%bodywork%' OR label ILIKE '%fabrication%' OR label ILIKE '%autotint%' OR label ILIKE '%tint%' THEN 'body-paint'
      WHEN label ILIKE '%detail%' OR label ILIKE '%ceramic%' OR label ILIKE '%car wash%' OR label ILIKE '%carwash%' THEN 'detailing-carwash'
      WHEN label ILIKE '%upholstery%' OR label ILIKE '%seatcover%' OR label ILIKE '%seat cover%' THEN 'upholstery-interior'
      WHEN label ILIKE '%tire%' OR label ILIKE '%wheel%' OR label ILIKE '%alignment%' OR label ILIKE '%vulcaniz%' OR label ILIKE '%underchassis%' THEN 'tire-wheel'
      WHEN label ILIKE '%glass%' OR label ILIKE '%windshield%' THEN 'glass-windshield'
      WHEN label ILIKE '%diesel%' OR label ILIKE '%injection%' OR label ILIKE '%farm%' OR label ILIKE '%tractor%' OR label ILIKE '%heavy duty%' THEN 'diesel-heavy-duty'
      WHEN label ILIKE '%motorcycle repair%' OR label ILIKE '%motorcycle service%' THEN 'motorcycle-service'
      WHEN label ILIKE '%jeepney%' OR label ILIKE '%brake%' OR label ILIKE '%clutch%' OR label ILIKE '%muffler%' OR label ILIKE '%exhaust%' OR label ILIKE '%radiator%' OR label ILIKE '%cooling%' OR label ILIKE '%4x4%' OR label ILIKE '%liftkit%' OR label ILIKE '%tuning%' OR label ILIKE '%performance%' OR label ILIKE '%engine%shop%' OR label ILIKE '%machine shop%' OR label ILIKE '%mobile mechanic%' OR label ILIKE '%fleet maintenance%' THEN 'mechanic'
      WHEN label ILIKE '%tow%' THEN 'tow-247'
      WHEN label ILIKE '%rental%' THEN 'cars-for-sale'
      WHEN label ILIKE '%dealer%' OR label ILIKE '%dealership%' OR label ILIKE '%cars nationwide%' OR label ILIKE '%find next car%' OR label ILIKE '%advertisement find%' THEN 'cars-for-sale'
      WHEN label ILIKE '%heavy equipment%' OR label ILIKE '%main machine%' OR label ILIKE '%generator%' THEN 'heavy-equipment'
      WHEN label ILIKE '%marine%' OR label ILIKE '%outboard%' OR label ILIKE '%boat%' THEN 'boats-marine'
      WHEN label ILIKE '%trike%' OR label ILIKE '%sidecar%' OR label ILIKE '%main motorcycle%' THEN 'motorcycles-for-sale'
      WHEN label ILIKE '%parts%' OR label ILIKE '%salvage%' OR label ILIKE '%transmission%' OR label ILIKE '%motorcycle parts%' THEN 'parts-accessories'
      WHEN label ILIKE '%insurance%' THEN 'insurance'
      WHEN label ILIKE '%financ%' OR label ILIKE '%loan%' THEN 'financing'
      WHEN label ILIKE '%lto%' OR label ILIKE '%registration%' OR label ILIKE '%warranty%' THEN 'warranty-protection'
      WHEN label ILIKE '%driving school%' OR label ILIKE '%course%' THEN 'courses'
      WHEN label ILIKE '%workshop%' OR label ILIKE '%training%' THEN 'workshops-events'
      WHEN label ILIKE '%advertisement%' OR label ILIKE '%main 1%' OR label ILIKE '%main 2%' THEN 'social-posts'
      ELSE 'other'
    END AS subcategory
  FROM public.qr_ad_templates
  WHERE category IS NULL OR subcategory IS NULL
) AS sub
WHERE public.qr_ad_templates.id = sub.id;


-- ============================================================================
-- SOURCE MIGRATION: 20260619170000_24d6c3e0-b8bc-4039-b714-7c9b7de1380f.sql
-- ============================================================================
ALTER TYPE public.business_status ADD VALUE IF NOT EXISTS 'archived';


-- ============================================================================
-- SOURCE MIGRATION: 20260619174416_890280d2-2b87-48e6-ac17-839a5b02fe50.sql
-- ============================================================================
-- 1. role_permissions table
CREATE TABLE public.role_permissions (
  role public.app_role NOT NULL,
  permission_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (role, permission_key)
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read role permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert role permissions"
  ON public.role_permissions FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update role permissions"
  ON public.role_permissions FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete role permissions"
  ON public.role_permissions FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_role_permissions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_role_permissions_updated_at();

-- 2. has_permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp
        ON rp.role = ur.role AND rp.permission_key = _key
      WHERE ur.user_id = _user_id AND rp.enabled = true
    );
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, anon, service_role;

-- 3. Seed nav permissions from current ADMIN_NAV roles (per non-admin role)
INSERT INTO public.role_permissions (role, permission_key, enabled) VALUES
  -- sales
  ('sales','nav.overview',true),
  ('sales','nav.sales',true),
  ('sales','nav.accounts',true),
  ('sales','nav.analytics',true),
  ('sales','nav.advertisements',true),
  ('sales','nav.shop',true),
  ('sales','nav.referrals',true),
  ('sales','nav.qr-ads',true),
  ('sales','nav.reports',true),
  -- moderator
  ('moderator','nav.overview',true),
  ('moderator','nav.businesses',true),
  ('moderator','nav.discover-businesses',true),
  ('moderator','nav.claims',true),
  ('moderator','nav.verifications',true),
  ('moderator','nav.listings',true),
  ('moderator','nav.reports',true),
  ('moderator','nav.location-corrections',true),
  ('moderator','nav.education',true),
  ('moderator','nav.qr-ads',true),
  -- support
  ('support','nav.overview',true),
  ('support','nav.sales',true),
  ('support','nav.accounts',true),
  ('support','nav.analytics',true),
  ('support','nav.listings',true),
  ('support','nav.reports',true),
  ('support','nav.dispatch',true),
  ('support','nav.qr-ads',true),
  -- advertising
  ('advertising','nav.overview',true),
  ('advertising','nav.sales',true),
  ('advertising','nav.advertisements',true),
  ('advertising','nav.shop',true),
  ('advertising','nav.qr-ads',true)
ON CONFLICT DO NOTHING;

-- 4. Widen admin_audit_log
ALTER TABLE public.admin_audit_log
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE public.admin_audit_log ALTER COLUMN target_user_id DROP NOT NULL;
ALTER TABLE public.admin_audit_log ALTER COLUMN field DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON public.admin_audit_log (entity_type, entity_id, created_at DESC);


-- ============================================================================
-- SOURCE MIGRATION: 20260619180927_a58c4f00-1cfa-4714-b52d-272bade66b23.sql
-- ============================================================================

-- 1) business_type_suggestions: exclude sales from reading submitter PII
DROP POLICY IF EXISTS "Support read type suggestions" ON public.business_type_suggestions;
CREATE POLICY "Support read type suggestions"
ON public.business_type_suggestions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'support'::app_role)
);

-- 2) staff_referrals: remove broad sales read of PII; admins + own-row read remain
DROP POLICY IF EXISTS "Sales read staff_referrals" ON public.staff_referrals;


-- ============================================================================
-- SOURCE MIGRATION: 20260619183617_2046c7a7-22a3-4202-8ed4-7b17a9e24871.sql
-- ============================================================================

ALTER TABLE public.business_claim_requests
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'claim';

DO $$ BEGIN
  ALTER TABLE public.business_claim_requests
    ADD CONSTRAINT business_claim_requests_kind_check CHECK (kind IN ('claim','transfer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_bcr_kind_status
  ON public.business_claim_requests (kind, status);

DROP POLICY IF EXISTS "Users submit own claim" ON public.business_claim_requests;

CREATE POLICY "Users submit own claim" ON public.business_claim_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    claimant_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_claim_requests.business_id
        AND (
          (business_claim_requests.kind = 'claim'
            AND b.claim_state IN ('unclaimed','claim_pending')
            AND b.owner_id IS NULL)
          OR
          (business_claim_requests.kind = 'transfer'
            AND b.owner_id IS NOT NULL
            AND b.owner_id <> auth.uid())
        )
    )
  );


-- ============================================================================
-- SOURCE MIGRATION: 20260619183732_375472c8-9c6b-4392-85c3-021a02d51140.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_business_claim(_claim_id uuid, _auto boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_bid uuid; v_uid uuid; v_kind text; v_prev uuid;
BEGIN
  SELECT business_id, claimant_user_id, kind INTO v_bid, v_uid, v_kind
    FROM public.business_claim_requests WHERE id = _claim_id;
  IF v_bid IS NULL THEN RAISE EXCEPTION 'Claim not found'; END IF;

  SELECT owner_id INTO v_prev FROM public.businesses WHERE id = v_bid;

  IF v_kind = 'transfer' THEN
    UPDATE public.businesses
       SET owner_id = v_uid,
           claim_state = 'owned',
           updated_at = now()
     WHERE id = v_bid;
  ELSE
    UPDATE public.businesses
       SET owner_id = v_uid,
           claim_state = 'owned',
           updated_at = now()
     WHERE id = v_bid AND owner_id IS NULL;
  END IF;

  UPDATE public.business_claim_requests
     SET status = CASE WHEN _auto THEN 'auto_approved' ELSE 'approved' END,
         decided_at = now()
   WHERE id = _claim_id;

  -- Record transfer in audit log
  IF v_kind = 'transfer' THEN
    INSERT INTO public.business_claim_audit (claim_id, actor_user_id, action, notes, details)
    VALUES (_claim_id, NULL, 'approved', 'Ownership transfer approved',
            jsonb_build_object('previous_owner_id', v_prev, 'new_owner_id', v_uid));
  END IF;

  -- Reject sibling pending claims for the same business
  UPDATE public.business_claim_requests
     SET status = 'rejected',
         reviewer_notes = COALESCE(reviewer_notes,'') || E'\nAuto-rejected: another claim approved.',
         decided_at = now()
   WHERE business_id = v_bid AND id <> _claim_id AND status = 'pending';
END $function$;


-- ============================================================================
-- SOURCE MIGRATION: 20260619191109_b6c5a81a-a8ea-4168-b767-e1e21a1b67c9.sql
-- ============================================================================

-- 1. Helper: assignment check for sales reps (scoped to users)
CREATE OR REPLACE FUNCTION public.is_sales_assigned_user(_rep uuid, _target_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sales_rep_assignments
    WHERE rep_user_id = _rep
      AND active = true
      AND subject_type = 'user'
      AND subject_id = _target_user
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_sales_assigned_user(uuid, uuid) TO authenticated;

-- 2. profiles: replace blanket Sales policy with scoped policy
DROP POLICY IF EXISTS "Sales view all profiles" ON public.profiles;
CREATE POLICY "Sales view assigned profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND public.is_sales_assigned_user(auth.uid(), id)
  );

-- 3. payments: replace blanket Sales policy with scoped policy
DROP POLICY IF EXISTS "Sales view payments" ON public.payments;
CREATE POLICY "Sales view assigned payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND public.is_sales_assigned_user(auth.uid(), user_id)
  );

-- 4. subscriptions: replace blanket Sales policy with scoped policy
DROP POLICY IF EXISTS "Sales view subscriptions" ON public.subscriptions;
CREATE POLICY "Sales view assigned subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND public.is_sales_assigned_user(auth.uid(), user_id)
  );

-- 5. ad_inquiries: remove email-based identity, keep submitter_user_id only
DROP POLICY IF EXISTS "Submitter reads own inquiry" ON public.ad_inquiries;
CREATE POLICY "Submitter reads own inquiry"
  ON public.ad_inquiries FOR SELECT
  TO authenticated
  USING (submitter_user_id IS NOT NULL AND submitter_user_id = auth.uid());

-- 6. ad_inquiry_messages
DROP POLICY IF EXISTS "Submitter reads own thread" ON public.ad_inquiry_messages;
CREATE POLICY "Submitter reads own thread"
  ON public.ad_inquiry_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_inquiries i
      WHERE i.id = ad_inquiry_messages.inquiry_id
        AND i.submitter_user_id = auth.uid()
    )
  );

-- 7. ad_inquiry_audit
DROP POLICY IF EXISTS "Submitter reads own audit" ON public.ad_inquiry_audit;
CREATE POLICY "Submitter reads own audit"
  ON public.ad_inquiry_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_inquiries i
      WHERE i.id = ad_inquiry_audit.inquiry_id
        AND i.submitter_user_id = auth.uid()
    )
  );

-- 8. service_inquiries
DROP POLICY IF EXISTS "Submitter reads own inquiry" ON public.service_inquiries;
CREATE POLICY "Submitter reads own inquiry"
  ON public.service_inquiries FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- 9. organization_invites: helper that checks current user's email from auth.users
-- and guards against recycled emails by requiring the invite to be newer than the
-- current user's account creation.
CREATE OR REPLACE FUNCTION public.can_read_org_invite(_invite_email text, _invite_created_at timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(u.email) = lower(_invite_email)
      AND u.email_confirmed_at IS NOT NULL
      AND _invite_created_at >= u.created_at
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_read_org_invite(text, timestamptz) TO authenticated;

DROP POLICY IF EXISTS "Invitee reads own invite" ON public.organization_invites;
CREATE POLICY "Invitee reads own invite"
  ON public.organization_invites FOR SELECT
  TO authenticated
  USING (public.can_read_org_invite(email, created_at));

-- 10. is_365_staff: remove email-domain shortcut, rely on user_roles only
CREATE OR REPLACE FUNCTION public.is_365_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','moderator')
  );
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260620053106_0be4b0c6-faf9-47f0-ba36-efa6ca189515.sql
-- ============================================================================

CREATE TABLE public.qr_lead_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  contact text NOT NULL CHECK (char_length(contact) BETWEEN 3 AND 200),
  interest_type text NOT NULL CHECK (interest_type IN ('buying_vehicle','selling_vehicle','business_listing','parts','services','other')),
  interest_detail text CHECK (interest_detail IS NULL OR char_length(interest_detail) <= 2000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','closed','archived')),
  notes text,
  visitor_id text,
  user_agent text,
  landing_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qr_lead_captures_created_at ON public.qr_lead_captures (created_at DESC);
CREATE INDEX idx_qr_lead_captures_status ON public.qr_lead_captures (status);
CREATE INDEX idx_qr_lead_captures_referral_code ON public.qr_lead_captures (referral_code);

GRANT INSERT ON public.qr_lead_captures TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.qr_lead_captures TO authenticated;
GRANT ALL ON public.qr_lead_captures TO service_role;

ALTER TABLE public.qr_lead_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a QR lead"
  ON public.qr_lead_captures
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view QR leads"
  ON public.qr_lead_captures
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update QR leads"
  ON public.qr_lead_captures
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete QR leads"
  ON public.qr_lead_captures
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_qr_lead_captures_updated_at
  BEFORE UPDATE ON public.qr_lead_captures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
-- SOURCE MIGRATION: 20260620173020_b2bd6551-8f88-4050-bf57-10a0e7be4da2.sql
-- ============================================================================

-- =========================================================================
-- ENUMS
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE public.ad_order_status AS ENUM (
    'pending_payment','paid','submitted','in_review',
    'approved','rejected','live','expired','refunded','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_creative_kind AS ENUM ('advertiser','placeholder');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_creative_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_order_event_type AS ENUM (
    'submitted','payment_verified','package_verified','image_verified',
    'approved','rejected','paused','resumed','expired','refunded','note'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- Shared updated_at trigger fn (idempotent)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================================
-- 1. AD PACKAGES
-- =========================================================================
CREATE TABLE public.ad_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  placement public.ad_placement NOT NULL,
  duration_days int NOT NULL CHECK (duration_days > 0),
  price_cents int NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'PHP',
  max_impressions int,
  priority_weight int NOT NULL DEFAULT 0,
  min_width int NOT NULL DEFAULT 800,
  min_height int NOT NULL DEFAULT 400,
  aspect_ratio text,
  max_bytes int NOT NULL DEFAULT 5242880,
  allowed_mime text[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','image/webp'],
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_packages TO authenticated;
GRANT ALL ON public.ad_packages TO service_role;
ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active packages"
  ON public.ad_packages FOR SELECT TO anon, authenticated
  USING (active = true OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Admins manage packages"
  ON public.ad_packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE TRIGGER trg_ad_packages_updated BEFORE UPDATE ON public.ad_packages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 2. AD ORDERS
-- =========================================================================
CREATE TABLE public.ad_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.ad_packages(id) ON DELETE RESTRICT,
  placement public.ad_placement NOT NULL,
  category_slug text,
  status public.ad_order_status NOT NULL DEFAULT 'pending_payment',
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  amount_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PHP',
  requested_start timestamptz,
  requested_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  rejection_reason text,
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_orders_advertiser ON public.ad_orders(advertiser_id);
CREATE INDEX idx_ad_orders_status ON public.ad_orders(status);
CREATE INDEX idx_ad_orders_placement ON public.ad_orders(placement);

GRANT SELECT, INSERT, UPDATE ON public.ad_orders TO authenticated;
GRANT ALL ON public.ad_orders TO service_role;
ALTER TABLE public.ad_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers read own orders"
  ON public.ad_orders FOR SELECT TO authenticated
  USING (advertiser_id = auth.uid()
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Advertisers create own orders"
  ON public.ad_orders FOR INSERT TO authenticated
  WITH CHECK (advertiser_id = auth.uid());

CREATE POLICY "Advertisers update own draft orders"
  ON public.ad_orders FOR UPDATE TO authenticated
  USING (advertiser_id = auth.uid() AND status IN ('pending_payment','paid','submitted'))
  WITH CHECK (advertiser_id = auth.uid());

CREATE POLICY "Admins manage orders"
  ON public.ad_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE TRIGGER trg_ad_orders_updated BEFORE UPDATE ON public.ad_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 3. AD CREATIVES (advertiser uploads + admin placeholders)
-- =========================================================================
CREATE TABLE public.ad_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.ad_orders(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  kind public.ad_creative_kind NOT NULL DEFAULT 'advertiser',
  storage_path text NOT NULL,
  image_url text NOT NULL,
  image_width int,
  image_height int,
  file_size_bytes int,
  mime_type text,
  headline text,
  caption text,
  alt_text text,
  target_url text,
  spec_ok boolean NOT NULL DEFAULT false,
  spec_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.ad_creative_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind = 'placeholder' OR order_id IS NOT NULL)
);
CREATE INDEX idx_ad_creatives_order ON public.ad_creatives(order_id);
CREATE INDEX idx_ad_creatives_kind ON public.ad_creatives(kind);
CREATE INDEX idx_ad_creatives_status ON public.ad_creatives(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_creatives TO authenticated;
GRANT ALL ON public.ad_creatives TO service_role;
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own creatives; staff read all"
  ON public.ad_creatives FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid()
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Owners insert own creatives"
  ON public.ad_creatives FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid()
           OR public.has_role(auth.uid(),'admin')
           OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Owners update own pending creatives"
  ON public.ad_creatives FOR UPDATE TO authenticated
  USING ((uploaded_by = auth.uid() AND status = 'pending')
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'advertising'))
  WITH CHECK (uploaded_by = auth.uid()
           OR public.has_role(auth.uid(),'admin')
           OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Owners delete own pending creatives"
  ON public.ad_creatives FOR DELETE TO authenticated
  USING ((uploaded_by = auth.uid() AND status = 'pending')
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'advertising'));

CREATE TRIGGER trg_ad_creatives_updated BEFORE UPDATE ON public.ad_creatives
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 4. AD SLOTS (visible positions on the site)
-- =========================================================================
CREATE TABLE public.ad_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key text NOT NULL UNIQUE,
  placement public.ad_placement NOT NULL,
  category_slug text,
  label text NOT NULL,
  description text,
  min_width int NOT NULL DEFAULT 800,
  min_height int NOT NULL DEFAULT 200,
  aspect_ratio text,
  max_bytes int NOT NULL DEFAULT 5242880,
  allowed_mime text[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','image/webp'],
  position int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_slots_placement ON public.ad_slots(placement);

GRANT SELECT ON public.ad_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_slots TO authenticated;
GRANT ALL ON public.ad_slots TO service_role;
ALTER TABLE public.ad_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active slots"
  ON public.ad_slots FOR SELECT TO anon, authenticated
  USING (active = true OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Admins manage slots"
  ON public.ad_slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE TRIGGER trg_ad_slots_updated BEFORE UPDATE ON public.ad_slots
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 5. AD SLOT ASSIGNMENTS
-- =========================================================================
CREATE TABLE public.ad_slot_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.ad_slots(id) ON DELETE CASCADE,
  creative_id uuid NOT NULL REFERENCES public.ad_creatives(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.ad_orders(id) ON DELETE SET NULL,
  position int NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_slot_assign_slot ON public.ad_slot_assignments(slot_id);
CREATE INDEX idx_ad_slot_assign_creative ON public.ad_slot_assignments(creative_id);
CREATE INDEX idx_ad_slot_assign_active ON public.ad_slot_assignments(slot_id, position) WHERE active;

GRANT SELECT ON public.ad_slot_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_slot_assignments TO authenticated;
GRANT ALL ON public.ad_slot_assignments TO service_role;
ALTER TABLE public.ad_slot_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active assignments"
  ON public.ad_slot_assignments FOR SELECT TO anon, authenticated
  USING (active = true
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Admins manage assignments"
  ON public.ad_slot_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE TRIGGER trg_ad_slot_assignments_updated BEFORE UPDATE ON public.ad_slot_assignments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 6. AD ORDER EVENTS (audit)
-- =========================================================================
CREATE TABLE public.ad_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.ad_orders(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type public.ad_order_event_type NOT NULL,
  notes text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_order_events_order ON public.ad_order_events(order_id);

GRANT SELECT, INSERT ON public.ad_order_events TO authenticated;
GRANT ALL ON public.ad_order_events TO service_role;
ALTER TABLE public.ad_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner+staff read order events"
  ON public.ad_order_events FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.ad_orders o WHERE o.id = order_id AND o.advertiser_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'advertising')
  );

CREATE POLICY "Staff write order events"
  ON public.ad_order_events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'advertising')
    OR EXISTS (SELECT 1 FROM public.ad_orders o WHERE o.id = order_id AND o.advertiser_id = auth.uid())
  );

-- =========================================================================
-- 7. STORAGE policies for `advertisements` bucket
-- Path convention: {advertiser_id}/{order_id}/{filename}
-- =========================================================================
CREATE POLICY "Advertisers upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'advertisements'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'advertising'))
  );

CREATE POLICY "Advertisers read own folder; staff read all"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'advertisements'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'advertising'))
  );

CREATE POLICY "Advertisers update/delete own folder; staff all"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'advertisements'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'advertising'))
  );

CREATE POLICY "Advertisers delete own folder; staff all"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'advertisements'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'advertising'))
  );

-- =========================================================================
-- 8. SEED SLOTS that match today's placement-preview.tsx layout
-- =========================================================================
INSERT INTO public.ad_slots (slot_key, placement, category_slug, label, description, min_width, min_height, aspect_ratio, position) VALUES
  ('marketplace_home_hero_1','home_carousel',NULL,'Marketplace Home — Hero 1','Top of marketplace homepage, slot 1 of 3.',1600,600,'8:3',0),
  ('marketplace_home_hero_2','home_carousel',NULL,'Marketplace Home — Hero 2','Top of marketplace homepage, slot 2 of 3.',1600,600,'8:3',1),
  ('marketplace_home_hero_3','home_carousel',NULL,'Marketplace Home — Hero 3','Top of marketplace homepage, slot 3 of 3.',1600,600,'8:3',2),
  ('marketplace_category_banner','category_banner',NULL,'Category Page — Wide Banner','Top of any category page (Cars, Motorcycles, Parts, etc).',1920,384,'5:1',0),
  ('browse_top_banner','browse_top',NULL,'Browse Results — Top Banner','Top of browse/search results page.',1600,300,'16:3',0),
  ('rides_top_banner','rides_top',NULL,'Rides Feed — Top Banner','Top of rides feed.',1200,300,'4:1',0),
  ('export_top_banner','export_top',NULL,'Export — Top Banner','Top of export brokerage section.',1600,400,'4:1',0),
  ('listing_sidebar_1','listing_sidebar',NULL,'Listing — Sidebar 1','Sidebar of listing detail page.',400,500,'4:5',0),
  ('shop_top_banner','shop_top',NULL,'Shop — Top Banner','Top of shop section.',1200,300,'4:1',0),
  ('shop_sidebar_1','shop_sidebar',NULL,'Shop — Sidebar 1','Shop sidebar slot 1.',400,400,'1:1',0),
  ('shop_sidebar_2','shop_sidebar',NULL,'Shop — Sidebar 2','Shop sidebar slot 2.',400,400,'1:1',1),
  ('newsletter_main','newsletter',NULL,'Newsletter — Main Slot','Featured slot in the weekly newsletter.',1200,400,'3:1',0)
ON CONFLICT (slot_key) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260620174155_8a20bc24-209e-4a9f-bdb5-c15947568c88.sql
-- ============================================================================

-- Allow advertising staff and admins to upload, update, and delete files anywhere in the advertisements bucket
-- (existing policy only lets advertisers manage files under their own {user_id}/ folder)
CREATE POLICY "Ad staff manage all advertisements files INSERT"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'advertisements'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advertising'::app_role))
);

CREATE POLICY "Ad staff manage all advertisements files UPDATE"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'advertisements'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advertising'::app_role))
);

CREATE POLICY "Ad staff manage all advertisements files DELETE"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'advertisements'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advertising'::app_role))
);

CREATE POLICY "Ad staff read all advertisements files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'advertisements'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advertising'::app_role))
);


-- ============================================================================
-- SOURCE MIGRATION: 20260620175446_5053a902-248b-4600-bef6-8a9c84c28cd8.sql
-- ============================================================================

-- 1. Audit log for every approve/reject (and future revoke/resubmit) action on ad creatives
CREATE TABLE public.ad_creative_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id uuid NOT NULL REFERENCES public.ad_creatives(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.ad_orders(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('approved','rejected','revoked','resubmitted')),
  previous_status public.ad_creative_status,
  new_status public.ad_creative_status,
  reason text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_creative_audit_creative ON public.ad_creative_audit_log(creative_id, created_at DESC);
CREATE INDEX idx_ad_creative_audit_actor ON public.ad_creative_audit_log(actor_id, created_at DESC);

GRANT SELECT, INSERT ON public.ad_creative_audit_log TO authenticated;
GRANT ALL ON public.ad_creative_audit_log TO service_role;

ALTER TABLE public.ad_creative_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and ads role can read audit log"
  ON public.ad_creative_audit_log FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'advertising'::app_role)
  );

CREATE POLICY "Uploaders can read audit for their own creatives"
  ON public.ad_creative_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_creatives c
      WHERE c.id = ad_creative_audit_log.creative_id
        AND c.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Admins and ads role can insert audit"
  ON public.ad_creative_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'advertising'::app_role)
  );


-- 2. Generic per-user in-app notifications inbox
CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  body text,
  link_url text,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_notifications_user ON public.user_notifications(user_id, read_at, created_at DESC);
CREATE INDEX idx_user_notifications_entity ON public.user_notifications(entity_type, entity_id);

GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
  ON public.user_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Owner may only flip read_at; block mutating other columns from the client.
CREATE OR REPLACE FUNCTION public.user_notifications_lock_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.link_url IS DISTINCT FROM OLD.link_url
     OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
     OR NEW.entity_id IS DISTINCT FROM OLD.entity_id
     OR NEW.metadata IS DISTINCT FROM OLD.metadata
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only read_at may be updated by users';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_notifications_lock_columns
  BEFORE UPDATE ON public.user_notifications
  FOR EACH ROW
  WHEN (current_setting('role', true) <> 'service_role')
  EXECUTE FUNCTION public.user_notifications_lock_columns();

CREATE POLICY "Users can update their own notifications read state"
  ON public.user_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ============================================================================
-- SOURCE MIGRATION: 20260621050736_a2046304-e3c7-4094-8d9c-f4974e0c65b9.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_support(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin','moderator','support')
  )
$function$;

DROP POLICY IF EXISTS "Sales view audit log" ON public.account_audit_log;
CREATE POLICY "Sales view assigned audit log"
ON public.account_audit_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND target_user_id IS NOT NULL
  AND public.is_sales_assigned_user(auth.uid(), target_user_id)
);

DROP POLICY IF EXISTS "Sales view line items" ON public.payment_line_items;
CREATE POLICY "Sales view assigned line items"
ON public.payment_line_items
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.id = payment_line_items.payment_id
      AND p.user_id IS NOT NULL
      AND public.is_sales_assigned_user(auth.uid(), p.user_id)
  )
);


-- ============================================================================
-- SOURCE MIGRATION: 20260621083913_8e4914ee-cb1a-4741-b9f1-4973de81061e.sql
-- ============================================================================
GRANT SELECT ON public.payment_method_config TO anon, authenticated;
GRANT ALL ON public.payment_method_config TO service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260622025943_8776ca6a-ff43-4a58-b1cd-d40e0cfe9b25.sql
-- ============================================================================

-- =============== flashcard_content ===============
CREATE TABLE public.flashcard_content (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  taxonomy JSONB NOT NULL DEFAULT '{}'::jsonb,
  card_images JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 0,
  source_repo TEXT NOT NULL DEFAULT 'Hunting-Fishing/365_flashcards',
  source_ref TEXT NOT NULL DEFAULT 'main',
  source_commit TEXT,
  card_count INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ,
  synced_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.flashcard_content TO anon;
GRANT SELECT ON public.flashcard_content TO authenticated;
GRANT ALL ON public.flashcard_content TO service_role;

ALTER TABLE public.flashcard_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read flashcard content"
  ON public.flashcard_content
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policy by design — only the admin sync server fn
-- (which uses the service-role client after a can_moderate check) may write.

-- Seed the singleton row.
INSERT INTO public.flashcard_content (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- =============== flashcard_progress ===============
CREATE TABLE public.flashcard_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  confidence TEXT,                 -- 'again' | 'good' | 'easy' | NULL
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  seen_count INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id)
);

CREATE INDEX flashcard_progress_user_id_idx ON public.flashcard_progress (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_progress TO authenticated;
GRANT ALL ON public.flashcard_progress TO service_role;

ALTER TABLE public.flashcard_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own flashcard progress"
  ON public.flashcard_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============== updated_at triggers ===============
-- Reuse existing public.update_updated_at_column() if present; fall back to creating it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column'
  ) THEN
    CREATE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SET search_path = public
    AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END $$;

CREATE TRIGGER flashcard_content_updated_at
  BEFORE UPDATE ON public.flashcard_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER flashcard_progress_updated_at
  BEFORE UPDATE ON public.flashcard_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- SOURCE MIGRATION: 20260622112108_d27d3a70-473b-4684-9848-65d229bd14f2.sql
-- ============================================================================

ALTER TABLE public.flashcard_content
  ADD COLUMN IF NOT EXISTS auto_sync_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_sync_interval text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS auto_sync_last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_sync_last_status text,
  ADD COLUMN IF NOT EXISTS auto_sync_last_error text;

ALTER TABLE public.flashcard_content
  DROP CONSTRAINT IF EXISTS flashcard_content_auto_sync_interval_check;

ALTER TABLE public.flashcard_content
  ADD CONSTRAINT flashcard_content_auto_sync_interval_check
  CHECK (auto_sync_interval IN ('daily','weekly','biweekly','monthly'));


-- ============================================================================
-- SOURCE MIGRATION: 20260622114921_4dadf808-eeb3-4ec3-93e2-5177e1444cce.sql
-- ============================================================================
ALTER TABLE public.flashcard_content ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;


-- ============================================================================
-- SOURCE MIGRATION: 20260624041237_7afcf9e7-6760-4dbb-88d0-196db8ff8a3c.sql
-- ============================================================================

CREATE TABLE public.oem_parts_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  vin text NULL,
  make text NULL,
  model text NULL,
  year int NULL,
  trim text NULL,
  engine text NULL,
  parts_description text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','quoted','closed_won','closed_lost')),
  admin_notes text NULL,
  source text NOT NULL DEFAULT 'parts_page',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.oem_parts_interest TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.oem_parts_interest TO authenticated;
GRANT ALL ON public.oem_parts_interest TO service_role;

ALTER TABLE public.oem_parts_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit OEM parts interest"
  ON public.oem_parts_interest FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can view OEM parts interest"
  ON public.oem_parts_interest FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Staff can update OEM parts interest"
  ON public.oem_parts_interest FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can delete OEM parts interest"
  ON public.oem_parts_interest FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_oem_parts_interest_updated_at
  BEFORE UPDATE ON public.oem_parts_interest
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX oem_parts_interest_status_created_at_idx
  ON public.oem_parts_interest (status, created_at DESC);


-- ============================================================================
-- SOURCE MIGRATION: 20260624042039_d0201104-a2e4-4674-b4ba-f6fffe8e8ab5.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260626024308_decef16d-1374-49bf-8c2a-7257ad419b47.sql
-- ============================================================================
CREATE TABLE public.jdm_chassis_codes (
  code TEXT PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year_min INTEGER,
  year_max INTEGER,
  engine TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.jdm_chassis_codes TO anon, authenticated;
GRANT ALL ON public.jdm_chassis_codes TO service_role;

ALTER TABLE public.jdm_chassis_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jdm_chassis_codes public read"
  ON public.jdm_chassis_codes
  FOR SELECT
  USING (true);

CREATE TRIGGER jdm_chassis_codes_set_updated_at
  BEFORE UPDATE ON public.jdm_chassis_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- SOURCE MIGRATION: 20260626025547_fd987b1e-420b-4682-a7f0-21cc28a6eb9b.sql
-- ============================================================================
CREATE POLICY "Staff read own QR leads" ON public.qr_lead_captures FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.staff_referrals s WHERE s.referral_code = qr_lead_captures.referral_code AND s.staff_user_id = auth.uid()));

CREATE POLICY "Advertising read all QR leads" ON public.qr_lead_captures FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'advertising'::app_role));

CREATE POLICY "Advertising read qr_scans" ON public.qr_scans FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'advertising'::app_role));

CREATE POLICY "Advertising read user_referrals" ON public.user_referrals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'advertising'::app_role));

CREATE POLICY "Advertising read referral_redemptions" ON public.referral_redemptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'advertising'::app_role));

CREATE POLICY "Advertising read staff_referrals" ON public.staff_referrals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'advertising'::app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260626051831_65f37d9e-5d7f-4ee7-a9fe-3e5ea97f2aae.sql
-- ============================================================================

-- 1) lead_offers: drop broad buyer SELECT policy (reads go through server functions)
DROP POLICY IF EXISTS "Buyers read their unlocked offers" ON public.lead_offers;

-- 2) payment_method_config: restrict public read to authenticated users only
DROP POLICY IF EXISTS "Public can read enabled methods" ON public.payment_method_config;
CREATE POLICY "Authenticated can read enabled methods"
  ON public.payment_method_config
  FOR SELECT
  TO authenticated
  USING (enabled = true OR has_role(auth.uid(), 'admin'::app_role));

-- 3) staff_referrals: remove advertising full-row read; provide safe directory view
DROP POLICY IF EXISTS "Advertising read staff_referrals" ON public.staff_referrals;

CREATE OR REPLACE VIEW public.staff_referrals_directory
WITH (security_invoker = false) AS
SELECT
  id,
  staff_user_id,
  referral_code,
  full_name,
  active,
  created_at
FROM public.staff_referrals
WHERE
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'advertising'::app_role)
  OR has_role(auth.uid(), 'sales'::app_role)
  OR auth.uid() = staff_user_id;

GRANT SELECT ON public.staff_referrals_directory TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260626070030_62255aec-1325-404a-a557-670626029309.sql
-- ============================================================================

CREATE TABLE public.parts_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  website TEXT,
  signup_url TEXT,
  api_docs_url TEXT,
  region TEXT NOT NULL DEFAULT 'global',
  category TEXT NOT NULL DEFAULT 'aftermarket',
  brands TEXT[] NOT NULL DEFAULT '{}',
  supports_api BOOLEAN NOT NULL DEFAULT false,
  supports_dropship BOOLEAN NOT NULL DEFAULT false,
  supports_wholesale BOOLEAN NOT NULL DEFAULT false,
  vin_lookup BOOLEAN NOT NULL DEFAULT false,
  signup_status TEXT NOT NULL DEFAULT 'not_started',
  api_status TEXT NOT NULL DEFAULT 'none',
  priority INTEGER NOT NULL DEFAULT 100,
  account_email TEXT,
  account_ref TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  commission_notes TEXT,
  notes TEXT,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_suppliers TO authenticated;
GRANT ALL ON public.parts_suppliers TO service_role;

ALTER TABLE public.parts_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage parts suppliers"
  ON public.parts_suppliers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_parts_suppliers_updated
BEFORE UPDATE ON public.parts_suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with curated supplier directory (PH, SEA, JDM, EU, US, global aftermarket + OEM)
INSERT INTO public.parts_suppliers
  (name, slug, website, signup_url, api_docs_url, region, category, brands, supports_api, supports_dropship, supports_wholesale, vin_lookup, priority, is_recommended, notes)
VALUES
  -- Philippines
  ('Autohub Group', 'autohub-ph', 'https://autohubgroup.com', 'https://autohubgroup.com/contact', NULL, 'PH', 'oem_dealer', ARRAY['Honda','Mini','BMW','Volvo','Lotus'], false, false, true, false, 10, true, 'Major PH dealer network — wholesale OEM relationship.'),
  ('Toyota Motor Philippines', 'toyota-ph', 'https://toyota.com.ph', 'https://toyota.com.ph/contact-us', NULL, 'PH', 'oem_dealer', ARRAY['Toyota','Lexus'], false, false, true, true, 10, true, 'OEM parts dept per dealer; pursue national parts manager contact.'),
  ('Honda Cars Philippines', 'honda-ph', 'https://hondaphil.com', 'https://hondaphil.com/contact', NULL, 'PH', 'oem_dealer', ARRAY['Honda'], false, false, true, true, 15, true, 'OEM parts via authorized dealers.'),
  ('Mitsubishi Motors Philippines', 'mmpc-ph', 'https://mitsubishi-motors.com.ph', 'https://mitsubishi-motors.com.ph/contact', NULL, 'PH', 'oem_dealer', ARRAY['Mitsubishi'], false, false, true, true, 15, false, NULL),
  ('Nissan Philippines', 'nissan-ph', 'https://nissan.ph', 'https://nissan.ph/contact-us', NULL, 'PH', 'oem_dealer', ARRAY['Nissan'], false, false, true, true, 20, false, NULL),
  ('Ford Philippines', 'ford-ph', 'https://ford.com.ph', 'https://ford.com.ph/contact', NULL, 'PH', 'oem_dealer', ARRAY['Ford'], false, false, true, true, 20, false, NULL),
  ('Isuzu Philippines', 'isuzu-ph', 'https://isuzuphil.com', 'https://isuzuphil.com/contact-us', NULL, 'PH', 'oem_dealer', ARRAY['Isuzu'], false, false, true, true, 25, false, NULL),
  ('Hyundai Asia Resources', 'hyundai-ph', 'https://hyundai.ph', 'https://hyundai.ph/contact', NULL, 'PH', 'oem_dealer', ARRAY['Hyundai'], false, false, true, true, 25, false, NULL),
  ('Suzuki Philippines', 'suzuki-ph', 'https://suzuki.com.ph', 'https://suzuki.com.ph/contact-us', NULL, 'PH', 'oem_dealer', ARRAY['Suzuki'], false, false, true, true, 25, false, NULL),
  ('Banawe Parts District', 'banawe-ph', NULL, NULL, NULL, 'PH', 'parts_shop', ARRAY['Toyota','Honda','Mitsubishi','Nissan','Isuzu','Mazda','Ford'], false, false, true, false, 5, true, 'Aggregator: dozens of independent PH shops. Build relationships in person.'),
  ('Tabangao / Bangkal surplus row', 'bangkal-ph', NULL, NULL, NULL, 'PH', 'junkyard', ARRAY['Toyota','Honda','Nissan','Mitsubishi'], false, false, true, false, 5, true, 'Used JDM/PH surplus body parts and engines.'),
  ('Carmudi Philippines Parts', 'carmudi-ph', 'https://www.carmudi.com.ph', 'https://www.carmudi.com.ph', NULL, 'PH', 'online', ARRAY[]::text[], false, false, false, false, 60, false, NULL),
  ('Lazada PH (auto sellers)', 'lazada-ph', 'https://www.lazada.com.ph', 'https://open.lazada.com', 'https://open.lazada.com/doc/doc.htm', 'PH', 'online', ARRAY[]::text[], true, true, true, false, 30, true, 'Open Platform API for affiliate/dropship.'),
  ('Shopee PH (auto sellers)', 'shopee-ph', 'https://shopee.ph', 'https://open.shopee.com', 'https://open.shopee.com/documents', 'PH', 'online', ARRAY[]::text[], true, true, true, false, 30, true, 'Open Platform API; large PH parts seller base.'),

  -- JDM / Japan
  ('Amayama Trading', 'amayama', 'https://www.amayama.com', 'https://www.amayama.com/en/contacts', NULL, 'JP', 'oem_distributor', ARRAY['Toyota','Honda','Nissan','Mitsubishi','Subaru','Mazda','Lexus','Suzuki','Daihatsu','Hino'], false, true, true, true, 10, true, 'Genuine JDM OEM with worldwide shipping. No public API; ask for partner feed.'),
  ('Nengun Performance', 'nengun', 'https://www.nengun.com', 'https://www.nengun.com/contact', NULL, 'JP', 'aftermarket', ARRAY['HKS','TRD','Nismo','Mugen','Tomei','Cusco','Spoon'], false, true, true, false, 20, true, 'JDM performance / tuning parts.'),
  ('Megazip', 'megazip', 'https://www.megazip.net', 'https://www.megazip.net', NULL, 'JP', 'oem_distributor', ARRAY['Toyota','Honda','Nissan','Subaru','Mitsubishi','Mazda','Daihatsu','Suzuki','Isuzu','Hino'], false, true, false, true, 25, true, 'OEM catalog by VIN — Japan and US/EU brands.'),
  ('PartSouq', 'partsouq', 'https://partsouq.com', 'https://partsouq.com/en/auth/signin', NULL, 'AE', 'oem_distributor', ARRAY['Toyota','Lexus','Honda','Nissan','Mitsubishi','Mazda','Subaru','Hyundai','Kia','BMW','Mercedes','Audi','VW','Ford','GM'], false, true, true, true, 5, true, 'Reference catalog UX we want to match. No public API; partner inquiry.'),
  ('Impex Japan', 'impex-jp', 'https://www.impex-japan.com', 'https://www.impex-japan.com/contact', NULL, 'JP', 'oem_distributor', ARRAY['Toyota','Honda','Nissan','Mitsubishi','Subaru','Mazda'], false, true, true, true, 30, false, 'JDM OEM with export.'),

  -- US
  ('RockAuto', 'rockauto', 'https://www.rockauto.com', 'https://www.rockauto.com', NULL, 'US', 'aftermarket', ARRAY[]::text[], false, true, true, false, 25, true, 'Massive aftermarket catalog. No public API; affiliate/wholesale via inquiry.'),
  ('Parts Authority', 'parts-authority', 'https://www.partsauthority.com', 'https://www.partsauthority.com/wholesale', 'https://www.partsauthority.com/api', 'US', 'aftermarket', ARRAY[]::text[], true, true, true, true, 20, true, 'Wholesale + API for resellers.'),
  ('WORLDPAC', 'worldpac', 'https://www.worldpac.com', 'https://www.worldpac.com/contact', NULL, 'US', 'oem_distributor', ARRAY['BMW','Mercedes','Audi','VW','Volvo','Lexus','Toyota','Honda'], true, true, true, true, 15, true, 'OEM/import parts — speedDIAL API for wholesale partners.'),
  ('Turn 14 Distribution', 'turn14', 'https://www.turn14.com', 'https://www.turn14.com/dealer/apply', 'https://www.turn14.com/api', 'US', 'aftermarket', ARRAY[]::text[], true, true, true, false, 20, true, 'Performance/aftermarket; dealer API.'),
  ('Keystone Automotive', 'keystone', 'https://www.ekeystone.com', 'https://www.ekeystone.com/become-customer', NULL, 'US', 'aftermarket', ARRAY[]::text[], true, true, true, false, 25, false, 'eKeystone API for jobbers.'),
  ('PartsTech', 'partstech', 'https://www.partstech.com', 'https://www.partstech.com/sign-up', 'https://developer.partstech.com', 'US', 'aggregator', ARRAY[]::text[], true, true, true, true, 15, true, 'Aggregator API across many US suppliers — single integration covers many.'),
  ('Nexpart (WHI)', 'nexpart', 'https://www.nexpart.com', 'https://www.nexpart.com', NULL, 'US', 'aggregator', ARRAY[]::text[], true, true, true, true, 25, false, 'WHI/Snap-on B2B catalog.'),
  ('eBay Motors', 'ebay-motors', 'https://www.ebay.com/motors', 'https://developer.ebay.com', 'https://developer.ebay.com/api-docs/static/finding-overview.html', 'US', 'online', ARRAY[]::text[], true, true, false, true, 30, true, 'Finding/Browse API — global supply with VIN/fitment filters.'),
  ('Amazon PA-API', 'amazon-paapi', 'https://www.amazon.com', 'https://affiliate-program.amazon.com', 'https://webservices.amazon.com/paapi5/documentation/', 'US', 'online', ARRAY[]::text[], true, false, false, false, 35, true, 'Affiliate API for parts listings.'),

  -- EU
  ('Tecdoc / TecAlliance', 'tecdoc', 'https://www.tecalliance.net', 'https://www.tecalliance.net/en/contact/', 'https://webservice.tecalliance.services', 'EU', 'aggregator', ARRAY[]::text[], true, true, true, true, 10, true, 'Industry-standard parts catalog data — license required.'),
  ('Autodoc PRO', 'autodoc', 'https://www.autodoc.co.uk', 'https://www.autodoc-pro.com', NULL, 'EU', 'aftermarket', ARRAY[]::text[], false, true, true, true, 25, false, 'EU aftermarket; PRO program for wholesale.'),
  ('GSF Car Parts', 'gsf', 'https://www.gsfcarparts.com', 'https://www.gsfcarparts.com/trade', NULL, 'EU', 'aftermarket', ARRAY[]::text[], false, true, true, true, 40, false, NULL),

  -- SEA / regional
  ('Boodmo (IN, expanding SEA)', 'boodmo', 'https://boodmo.com', 'https://boodmo.com', NULL, 'IN', 'aftermarket', ARRAY[]::text[], false, true, false, true, 35, false, 'India OEM/aftermarket marketplace.'),
  ('Carousell PH', 'carousell-ph', 'https://www.carousell.ph', 'https://api.carousell.com', NULL, 'PH', 'online', ARRAY[]::text[], false, false, false, false, 45, false, 'Used parts listings.'),

  -- Global / China
  ('AliExpress / Cainiao', 'aliexpress', 'https://www.aliexpress.com', 'https://portals.aliexpress.com', 'https://developers.aliexpress.com', 'CN', 'aftermarket', ARRAY[]::text[], true, true, true, false, 30, true, 'Affiliate API + dropship; large aftermarket pool.'),
  ('1688 (Alibaba domestic)', '1688', 'https://www.1688.com', 'https://open.1688.com', 'https://open.1688.com/doc', 'CN', 'wholesale', ARRAY[]::text[], true, false, true, false, 40, false, 'Wholesale sourcing — Mandarin-only.'),
  ('Replicate / Pakistani aftermarket aggregators', 'pk-aftermarket', NULL, NULL, NULL, 'PK', 'aftermarket', ARRAY['Toyota','Honda','Suzuki'], false, true, true, false, 70, false, 'Body panel / trim suppliers worth scouting.');


-- ============================================================================
-- SOURCE MIGRATION: 20260627025907_55545abc-08e6-4995-b0d1-6f98737bb935.sql
-- ============================================================================

-- AFFILIATE LINKS (admin-managed deep-link templates per supplier)
CREATE TABLE public.affiliate_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'PH',
  logo_url TEXT,
  url_template TEXT NOT NULL,
  affiliate_id_env TEXT,
  network TEXT,
  commission_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  priority INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.affiliate_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.affiliate_links TO authenticated;
GRANT ALL ON public.affiliate_links TO service_role;

ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read active links"
  ON public.affiliate_links FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage links"
  ON public.affiliate_links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_affiliate_links_updated_at
  BEFORE UPDATE ON public.affiliate_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AFFILIATE CLICKS (per-click log)
CREATE TABLE public.affiliate_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_slug TEXT NOT NULL,
  query TEXT,
  listing_id UUID,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliate_clicks_supplier ON public.affiliate_clicks(supplier_slug, created_at DESC);
CREATE INDEX idx_affiliate_clicks_listing ON public.affiliate_clicks(listing_id) WHERE listing_id IS NOT NULL;

GRANT INSERT ON public.affiliate_clicks TO anon, authenticated;
GRANT SELECT ON public.affiliate_clicks TO authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can log a click"
  ON public.affiliate_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "admins read all clicks"
  ON public.affiliate_clicks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed starter templates (all inactive until you add affiliate IDs)
INSERT INTO public.affiliate_links (supplier_slug, label, region, url_template, affiliate_id_env, network, commission_note, priority) VALUES
  ('shopee-ph', 'Shopee PH', 'PH', 'https://shopee.ph/search?keyword={QUERY}', 'SHOPEE_AFFILIATE_ID', 'Involve Asia', 'PH affiliate via Involve Asia. ~3-8% varies by category.', 10),
  ('lazada-ph', 'Lazada PH', 'PH', 'https://www.lazada.com.ph/catalog/?q={QUERY}', 'LAZADA_AFFILIATE_ID', 'Involve Asia', 'PH affiliate via Involve Asia or direct.', 20),
  ('ebay-motors', 'eBay Motors', 'GLOBAL', 'https://www.ebay.com/sch/i.html?_nkw={QUERY}&_sacat=6000', 'EBAY_PARTNER_ID', 'eBay Partner Network', 'Generous commissions on car parts category.', 30),
  ('amazon', 'Amazon', 'GLOBAL', 'https://www.amazon.com/s?k={QUERY}&i=automotive', 'AMAZON_ASSOCIATE_TAG', 'Amazon Associates', 'Requires 3 sales in 180 days to keep account.', 40),
  ('rockauto', 'RockAuto', 'GLOBAL', 'https://www.rockauto.com/en/catalog/{QUERY}', NULL, 'Direct', 'Apply via RockAuto Customer Service for affiliate.', 50),
  ('amayama', 'Amayama (JDM OEM)', 'GLOBAL', 'https://www.amayama.com/en/search?q={QUERY}', NULL, 'Direct', 'Email partnerships@amayama.com for affiliate terms.', 60),
  ('partsouq', 'PartSouq (OEM by VIN)', 'GLOBAL', 'https://partsouq.com/en/search/all?q={QUERY}', NULL, 'Direct', 'Currently no public affiliate program; lead-gen only.', 70),
  ('megazip', 'Megazip (JDM OEM)', 'GLOBAL', 'https://www.megazip.net/search?q={QUERY}', NULL, 'Direct', 'Direct partnership required.', 80);


-- ============================================================================
-- SOURCE MIGRATION: 20260627034903_28b06ca4-999d-446e-96f6-385b12704814.sql
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personal_email text;
CREATE INDEX IF NOT EXISTS profiles_personal_email_idx ON public.profiles ((lower(personal_email)));


-- ============================================================================
-- SOURCE MIGRATION: 20260627064717_e3493d02-195d-4e15-bbca-e55115084ae2.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260627073311_09ed7204-70a9-4715-b90e-306cbd292ba3.sql
-- ============================================================================

ALTER TABLE public.parts_supplier_applications
  ADD COLUMN IF NOT EXISTS storefront_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS storefront_published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS storefront_blurb TEXT,
  ADD COLUMN IF NOT EXISTS storefront_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS storefront_categories TEXT[];

-- Public read of published partner storefronts only
DROP POLICY IF EXISTS "public read published storefronts" ON public.parts_supplier_applications;
CREATE POLICY "public read published storefronts"
  ON public.parts_supplier_applications
  FOR SELECT
  TO anon, authenticated
  USING (storefront_published = true AND storefront_slug IS NOT NULL);

GRANT SELECT ON public.parts_supplier_applications TO anon;


-- ============================================================================
-- SOURCE MIGRATION: 20260627102129_aa019b19-2de8-42ec-b3eb-0dfacac9c83d.sql
-- ============================================================================

-- Commission rules per merchant
CREATE TABLE public.affiliate_commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_slug text NOT NULL UNIQUE,
  rate_bps integer NOT NULL DEFAULT 0,            -- basis points of order_amount (500 = 5.00%)
  flat_fee_cents integer NOT NULL DEFAULT 0,      -- per-conversion flat fee we earn
  per_listing_fee_cents integer NOT NULL DEFAULT 0, -- bonus when conversion attributed to a listing
  boost_multiplier_bps integer NOT NULL DEFAULT 10000, -- 10000 = 1.00x; e.g. 12000 = 1.2x for boosted
  currency text NOT NULL DEFAULT 'PHP',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_commission_rules TO authenticated;
GRANT ALL ON public.affiliate_commission_rules TO service_role;
ALTER TABLE public.affiliate_commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage commission rules" ON public.affiliate_commission_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Conversions posted from merchant networks
CREATE TABLE public.affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_slug text NOT NULL,
  network text,                       -- 'involve_asia' | 'amazon' | 'ebay' | 'partner' | custom
  external_id text,                   -- merchant order id (unique per network)
  click_id uuid REFERENCES public.affiliate_clicks(id) ON DELETE SET NULL,
  listing_id uuid,
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  order_amount_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PHP',
  reported_commission_cents bigint,   -- what the network said they'll pay us (optional)
  computed_commission_cents bigint NOT NULL DEFAULT 0, -- derived from rules
  was_boosted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending', -- pending|confirmed|reversed|paid
  occurred_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (network, external_id)
);
CREATE INDEX affiliate_conversions_supplier_idx ON public.affiliate_conversions (supplier_slug, occurred_at DESC);
CREATE INDEX affiliate_conversions_listing_idx ON public.affiliate_conversions (listing_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_conversions TO authenticated;
GRANT ALL ON public.affiliate_conversions TO service_role;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read conversions" ON public.affiliate_conversions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin write conversions" ON public.affiliate_conversions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Per-network postback secrets (HMAC shared key)
CREATE TABLE public.affiliate_postback_secrets (
  network text PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_postback_secrets TO authenticated;
GRANT ALL ON public.affiliate_postback_secrets TO service_role;
ALTER TABLE public.affiliate_postback_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage postback secrets" ON public.affiliate_postback_secrets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_affiliate_commission_rules_updated
  BEFORE UPDATE ON public.affiliate_commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_affiliate_conversions_updated
  BEFORE UPDATE ON public.affiliate_conversions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_affiliate_postback_secrets_updated
  BEFORE UPDATE ON public.affiliate_postback_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default rules for existing active suppliers (5% rate, idempotent)
INSERT INTO public.affiliate_commission_rules (supplier_slug, rate_bps, currency, notes)
SELECT supplier_slug, 500, 'PHP', 'Auto-seeded default 5%'
FROM public.affiliate_links
WHERE is_active = true
ON CONFLICT (supplier_slug) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260627112833_1ec2290c-82f7-4ce8-9c26-b00513855013.sql
-- ============================================================================

-- 1) affiliate_links: hide affiliate_id_env from public/authenticated reads
REVOKE SELECT (affiliate_id_env) ON public.affiliate_links FROM anon, authenticated;

-- 3) profiles: scope sales UPDATE to assigned users only
DROP POLICY IF EXISTS "Sales update account status" ON public.profiles;
CREATE POLICY "Sales update account status"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'sales'::app_role) AND is_sales_assigned_user(auth.uid(), id))
  WITH CHECK (has_role(auth.uid(), 'sales'::app_role) AND is_sales_assigned_user(auth.uid(), id));

-- 4) referral_visits: scope sales reads to their own referral codes
DROP POLICY IF EXISTS "Sales read referral_visits" ON public.referral_visits;
CREATE POLICY "Sales read referral_visits"
  ON public.referral_visits
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND credited_referral_code IN (
      SELECT sr.referral_code
      FROM public.staff_referrals sr
      WHERE sr.staff_user_id = auth.uid()
    )
  );

-- 5) user_roles: scope sales reads to assigned users only
DROP POLICY IF EXISTS "Sales view user_roles" ON public.user_roles;
CREATE POLICY "Sales view user_roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND is_sales_assigned_user(auth.uid(), user_roles.user_id)
  );


-- ============================================================================
-- SOURCE MIGRATION: 20260627114738_c46dc744-e570-41a8-b80d-536ecbe7a5cd.sql
-- ============================================================================

-- Add supplier onboarding fields for auto parts stores
ALTER TABLE public.parts_supplier_applications
  ADD COLUMN IF NOT EXISTS legal_business_name TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS province_state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
  ADD COLUMN IF NOT EXISTS warehouse_locations TEXT,
  ADD COLUMN IF NOT EXISTS ships_nationwide BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS catalog_feed_url TEXT,
  ADD COLUMN IF NOT EXISTS catalog_feed_format TEXT,
  ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS agreed_terms BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreed_terms_at TIMESTAMPTZ;


-- ============================================================================
-- SOURCE MIGRATION: 20260627114834_89899757-a064-4f38-8146-4d4c41a5c70b.sql
-- ============================================================================

-- Public upload (applicants submit docs without account), admin-only read/delete
CREATE POLICY "Anyone can upload supplier docs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'supplier-docs');

CREATE POLICY "Admins can read supplier docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'supplier-docs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete supplier docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'supplier-docs' AND public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- SOURCE MIGRATION: 20260627150439_5c3d6dc8-8f14-45b1-9eb3-dc261579364b.sql
-- ============================================================================

-- =========================================================
-- Phase 1: Parts Supplier Outreach / CRM layer
-- =========================================================

-- Extend parts_suppliers with operational columns
ALTER TABLE public.parts_suppliers
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lead_score INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lost_reason TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
  ADD COLUMN IF NOT EXISTS business_hours TEXT;

CREATE INDEX IF NOT EXISTS parts_suppliers_pipeline_stage_idx
  ON public.parts_suppliers(pipeline_stage);
CREATE INDEX IF NOT EXISTS parts_suppliers_next_action_at_idx
  ON public.parts_suppliers(next_action_at);
CREATE INDEX IF NOT EXISTS parts_suppliers_owner_user_id_idx
  ON public.parts_suppliers(owner_user_id);

-- updated_at helper (reuse if it exists)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------
-- parts_supplier_contacts
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parts_supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.parts_suppliers(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  viber TEXT,
  whatsapp TEXT,
  messenger TEXT,
  preferred_channel TEXT,
  preferred_time TEXT,
  language TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  do_not_contact BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_supplier_contacts TO authenticated;
GRANT ALL ON public.parts_supplier_contacts TO service_role;

ALTER TABLE public.parts_supplier_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and sales can read supplier contacts"
  ON public.parts_supplier_contacts FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE POLICY "Admins and sales can write supplier contacts"
  ON public.parts_supplier_contacts FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE INDEX IF NOT EXISTS psc_supplier_idx ON public.parts_supplier_contacts(supplier_id);
CREATE INDEX IF NOT EXISTS psc_primary_idx ON public.parts_supplier_contacts(supplier_id) WHERE is_primary;

CREATE TRIGGER psc_set_updated_at
  BEFORE UPDATE ON public.parts_supplier_contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------------------------------------------------------
-- parts_supplier_outreach
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parts_supplier_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.parts_suppliers(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.parts_supplier_contacts(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.parts_supplier_applications(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'call',
  direction TEXT NOT NULL DEFAULT 'outbound',
  outcome TEXT NOT NULL DEFAULT 'spoke',
  duration_sec INT,
  summary TEXT,
  next_action TEXT,
  next_action_at TIMESTAMPTZ,
  owner_user_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_supplier_outreach TO authenticated;
GRANT ALL ON public.parts_supplier_outreach TO service_role;

ALTER TABLE public.parts_supplier_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and sales can read outreach"
  ON public.parts_supplier_outreach FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE POLICY "Admins and sales can write outreach"
  ON public.parts_supplier_outreach FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE INDEX IF NOT EXISTS pso_supplier_idx ON public.parts_supplier_outreach(supplier_id);
CREATE INDEX IF NOT EXISTS pso_owner_idx ON public.parts_supplier_outreach(owner_user_id);
CREATE INDEX IF NOT EXISTS pso_occurred_idx ON public.parts_supplier_outreach(occurred_at DESC);
CREATE INDEX IF NOT EXISTS pso_next_action_idx ON public.parts_supplier_outreach(next_action_at);

CREATE TRIGGER pso_set_updated_at
  BEFORE UPDATE ON public.parts_supplier_outreach
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- When an outreach row is created, roll the supplier's last_contacted_at /
-- next_action_at forward so the "Today" queue stays accurate.
CREATE OR REPLACE FUNCTION public.tg_outreach_roll_supplier()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.parts_suppliers s
     SET last_contacted_at = GREATEST(COALESCE(s.last_contacted_at, NEW.occurred_at), NEW.occurred_at),
         next_action_at    = COALESCE(NEW.next_action_at, s.next_action_at),
         owner_user_id     = COALESCE(NEW.owner_user_id, s.owner_user_id),
         updated_at        = now()
   WHERE s.id = NEW.supplier_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pso_roll_supplier
  AFTER INSERT ON public.parts_supplier_outreach
  FOR EACH ROW EXECUTE FUNCTION public.tg_outreach_roll_supplier();

-- ---------------------------------------------------------
-- parts_supplier_tasks
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parts_supplier_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.parts_suppliers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  due_at TIMESTAMPTZ,
  owner_user_id UUID,
  status TEXT NOT NULL DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_supplier_tasks TO authenticated;
GRANT ALL ON public.parts_supplier_tasks TO service_role;

ALTER TABLE public.parts_supplier_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and sales can read supplier tasks"
  ON public.parts_supplier_tasks FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE POLICY "Admins and sales can write supplier tasks"
  ON public.parts_supplier_tasks FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE INDEX IF NOT EXISTS pst_supplier_idx ON public.parts_supplier_tasks(supplier_id);
CREATE INDEX IF NOT EXISTS pst_due_idx ON public.parts_supplier_tasks(due_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS pst_owner_idx ON public.parts_supplier_tasks(owner_user_id);

CREATE TRIGGER pst_set_updated_at
  BEFORE UPDATE ON public.parts_supplier_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


-- ============================================================================
-- SOURCE MIGRATION: 20260627155108_133816c5-a182-43a6-9159-d8d6d6da0491.sql
-- ============================================================================

-- Phase A: region filtering on affiliate_links
ALTER TABLE public.affiliate_links
  ADD COLUMN IF NOT EXISTS allowed_countries text[];

UPDATE public.affiliate_links SET allowed_countries = ARRAY['PH'] WHERE supplier_slug IN ('shopee-ph','lazada-ph');
UPDATE public.affiliate_links SET allowed_countries = ARRAY['PH','SG','MY','TH','ID','VN'] WHERE supplier_slug = 'aliexpress-ph';
UPDATE public.affiliate_links SET allowed_countries = ARRAY['US','CA','AU','GB'] WHERE supplier_slug = 'ebay-motors';
UPDATE public.affiliate_links SET allowed_countries = ARRAY['US','CA','GB'] WHERE supplier_slug = 'amazon';
UPDATE public.affiliate_links SET allowed_countries = ARRAY['US','CA'] WHERE supplier_slug = 'rockauto';
-- Amayama, PartSouq, Megazip stay NULL = available everywhere

-- Phase B: partner_product_feeds
CREATE TABLE IF NOT EXISTS public.partner_product_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL,
  merchant_slug text NOT NULL,
  merchant_label text NOT NULL,
  country text NOT NULL DEFAULT 'PH',
  is_enabled boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  last_status text,
  last_error text,
  item_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (network, merchant_slug)
);

GRANT SELECT ON public.partner_product_feeds TO authenticated;
GRANT ALL ON public.partner_product_feeds TO service_role;

ALTER TABLE public.partner_product_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage feeds" ON public.partner_product_feeds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Phase B: partner_products
CREATE TABLE IF NOT EXISTS public.partner_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL,
  merchant_slug text NOT NULL,
  sku text NOT NULL,
  title text NOT NULL,
  brand text,
  category_path text,
  price numeric(12,2),
  currency text DEFAULT 'PHP',
  image_url text,
  deeplink text NOT NULL,
  country text NOT NULL DEFAULT 'PH',
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (network, sku)
);

GRANT SELECT ON public.partner_products TO anon, authenticated;
GRANT ALL ON public.partner_products TO service_role;

ALTER TABLE public.partner_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read partner products" ON public.partner_products
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage partner products" ON public.partner_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS partner_products_country_idx ON public.partner_products (country);
CREATE INDEX IF NOT EXISTS partner_products_network_idx ON public.partner_products (network);
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS partner_products_title_trgm ON public.partner_products USING gin (title gin_trgm_ops);

-- updated_at triggers
CREATE TRIGGER partner_product_feeds_set_updated_at
  BEFORE UPDATE ON public.partner_product_feeds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER partner_products_set_updated_at
  BEFORE UPDATE ON public.partner_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed feed entries for the three Involve Asia merchants we're starting with
INSERT INTO public.partner_product_feeds (network, merchant_slug, merchant_label, country)
VALUES
  ('involve_asia', 'lazada-ph', 'Lazada Philippines', 'PH'),
  ('involve_asia', 'shopee-ph', 'Shopee Philippines', 'PH'),
  ('involve_asia', 'aliexpress', 'AliExpress', 'PH')
ON CONFLICT (network, merchant_slug) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260628013733_5fde4486-0240-40cb-a419-67c7220089a2.sql
-- ============================================================================

-- Filter selection events from /parts wizard
CREATE TABLE public.parts_filter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  make TEXT,
  model TEXT,
  year INTEGER,
  country TEXT,
  session_id TEXT,
  user_id UUID,
  referrer TEXT,
  user_agent TEXT
);
CREATE INDEX parts_filter_events_created_at_idx ON public.parts_filter_events (created_at DESC);
CREATE INDEX parts_filter_events_make_model_idx ON public.parts_filter_events (make, model);

GRANT INSERT ON public.parts_filter_events TO anon, authenticated;
GRANT ALL ON public.parts_filter_events TO service_role;

ALTER TABLE public.parts_filter_events ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon visitors) can log a filter event; no reads from public.
CREATE POLICY "anyone can log filter events"
  ON public.parts_filter_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admins can read filter events"
  ON public.parts_filter_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add product attribution to affiliate_clicks so we know which ingested tile was clicked.
ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS partner_sku TEXT,
  ADD COLUMN IF NOT EXISTS product_title TEXT;


-- ============================================================================
-- SOURCE MIGRATION: 20260701070732_03c8b90e-546c-4419-856a-3892535f6c88.sql
-- ============================================================================

-- 1) parts_outlets: remove public SELECT (all client reads go through server functions using service role)
DROP POLICY IF EXISTS "Anyone can read active outlets" ON public.parts_outlets;

-- 2) parts_supplier_applications: remove broad public row SELECT, expose safe view instead
DROP POLICY IF EXISTS "public read published storefronts" ON public.parts_supplier_applications;

CREATE OR REPLACE VIEW public.partner_storefronts_public AS
SELECT
  storefront_slug,
  company_name,
  country,
  business_kind,
  website,
  storefront_blurb,
  storefront_logo_url,
  storefront_categories
FROM public.parts_supplier_applications
WHERE storefront_published = true
  AND storefront_slug IS NOT NULL;

GRANT SELECT ON public.partner_storefronts_public TO anon, authenticated;

-- 3) wanted_post_responses: hide contact_value from the public; keep it visible to responder & post owner
DROP POLICY IF EXISTS "Anyone can view responses to open posts" ON public.wanted_post_responses;

CREATE POLICY "Responder or post owner can view responses"
ON public.wanted_post_responses
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.wanted_posts wp
    WHERE wp.id = wanted_post_responses.wanted_post_id
      AND wp.user_id = auth.uid()
  )
);

CREATE OR REPLACE VIEW public.wanted_post_responses_public AS
SELECT
  wpr.id,
  wpr.wanted_post_id,
  wpr.user_id,
  wpr.message,
  wpr.listing_id,
  wpr.business_id,
  wpr.created_at,
  wpr.updated_at
FROM public.wanted_post_responses wpr
JOIN public.wanted_posts wp ON wp.id = wpr.wanted_post_id
WHERE wp.status = 'open';

GRANT SELECT ON public.wanted_post_responses_public TO anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260701070829_7ed9e1a7-9b04-41aa-bac6-8fe8404bd771.sql
-- ============================================================================

ALTER VIEW public.partner_storefronts_public SET (security_invoker = true);
ALTER VIEW public.wanted_post_responses_public SET (security_invoker = true);


-- ============================================================================
-- SOURCE MIGRATION: 20260701070901_f008c70a-e732-4f58-a816-1618aefed792.sql
-- ============================================================================

ALTER VIEW public.partner_storefronts_public SET (security_invoker = false);
ALTER VIEW public.wanted_post_responses_public SET (security_invoker = false);


-- ============================================================================
-- SOURCE MIGRATION: 20260701072731_9871982b-7cfc-4c7c-b27a-a88cfce0a6f5.sql
-- ============================================================================

-- Applications
CREATE TABLE public.partner_program_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  region text,
  channel_type text NOT NULL,
  platforms text[] NOT NULL DEFAULT '{}',
  audience_band text,
  pitch text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes text,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  agreed_terms boolean NOT NULL DEFAULT false,
  agreed_terms_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.partner_program_applications TO authenticated;
GRANT INSERT ON public.partner_program_applications TO anon;
GRANT ALL ON public.partner_program_applications TO service_role;
ALTER TABLE public.partner_program_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_apps" ON public.partner_program_applications
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth_insert_apps" ON public.partner_program_applications
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "self_read_apps" ON public.partner_program_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_apps" ON public.partner_program_applications
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Partners
CREATE TABLE public.partner_program_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.partner_program_applications(id) ON DELETE SET NULL,
  referral_code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  agreed_terms_at timestamptz,
  agreed_terms_version text,
  payout_method text,
  payout_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_program_partners TO authenticated;
GRANT ALL ON public.partner_program_partners TO service_role;
ALTER TABLE public.partner_program_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self_or_admin_read_partners" ON public.partner_program_partners
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_write_partners" ON public.partner_program_partners
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Commission events
CREATE TABLE public.partner_program_commission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_program_partners(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('seller_sub','boost','verified_business','advertiser_purchase','shop_purchase','other')),
  amount_php numeric(12,2) NOT NULL DEFAULT 0,
  commission_php numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','clawed_back','paid')),
  source_ref text,
  event_at timestamptz NOT NULL DEFAULT now(),
  cleared_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_program_commission_events TO authenticated;
GRANT ALL ON public.partner_program_commission_events TO service_role;
ALTER TABLE public.partner_program_commission_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_or_admin_read_events" ON public.partner_program_commission_events
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    partner_id IN (SELECT id FROM public.partner_program_partners WHERE user_id = auth.uid())
  );
CREATE POLICY "admin_write_events" ON public.partner_program_commission_events
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER pp_apps_updated BEFORE UPDATE ON public.partner_program_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pp_partners_updated BEFORE UPDATE ON public.partner_program_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX pp_apps_status_idx ON public.partner_program_applications(status, created_at DESC);
CREATE INDEX pp_partners_user_idx ON public.partner_program_partners(user_id);
CREATE INDEX pp_events_partner_idx ON public.partner_program_commission_events(partner_id, event_at DESC);


-- ============================================================================
-- SOURCE MIGRATION: 20260701073345_120230cf-82bf-44f2-9a3f-845373a6c87c.sql
-- ============================================================================

-- Payout batches
CREATE TABLE public.partner_program_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_program_partners(id) ON DELETE CASCADE,
  amount_php numeric(12,2) NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'manual',
  reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','cancelled')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_program_payouts TO authenticated;
GRANT ALL ON public.partner_program_payouts TO service_role;
ALTER TABLE public.partner_program_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_or_admin_read_payouts" ON public.partner_program_payouts
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    partner_id IN (SELECT id FROM public.partner_program_partners WHERE user_id = auth.uid())
  );
CREATE POLICY "admin_write_payouts" ON public.partner_program_payouts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pp_payouts_updated BEFORE UPDATE ON public.partner_program_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link commission events to payouts + audit fields
ALTER TABLE public.partner_program_commission_events
  ADD COLUMN payout_id uuid REFERENCES public.partner_program_payouts(id) ON DELETE SET NULL,
  ADD COLUMN approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN paid_at timestamptz,
  ADD COLUMN clawed_back_reason text,
  ADD COLUMN clawed_back_at timestamptz,
  ADD COLUMN clawed_back_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX pp_events_payout_idx ON public.partner_program_commission_events(payout_id);
CREATE INDEX pp_payouts_partner_idx ON public.partner_program_payouts(partner_id, created_at DESC);

-- Recompute payout total from linked approved events
CREATE OR REPLACE FUNCTION public.pp_recompute_payout_total(_payout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.partner_program_payouts
     SET amount_php = COALESCE((
       SELECT SUM(commission_php)
         FROM public.partner_program_commission_events
        WHERE payout_id = _payout_id
     ), 0)
   WHERE id = _payout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.pp_recompute_payout_total(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pp_recompute_payout_total(uuid) TO authenticated, service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260702133312_b82ffba0-6e87-4f60-a422-87b37cfb994f.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  now_ts timestamptz := now();
  day_start timestamptz := date_trunc('day', now_ts);
  d7 timestamptz := now_ts - interval '7 days';
  d30 timestamptz := now_ts - interval '30 days';
  h24 timestamptz := now_ts - interval '24 hours';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'users', jsonb_build_object(
      'total', (SELECT count(*) FROM public.profiles),
      'signups', jsonb_build_object(
        'today', (SELECT count(*) FROM public.profiles WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.profiles WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.profiles WHERE created_at >= d30)
      ),
      'verifiedSellers', (SELECT count(*) FROM public.profiles WHERE verification_status = 'verified'),
      'activeAccounts',  (SELECT count(*) FROM public.profiles WHERE coalesce(account_status,'active') = 'active'),
      'foundingMembers', (SELECT count(*) FROM public.profiles WHERE is_founding_member = true)
    ),
    'scans', jsonb_build_object(
      'total', jsonb_build_object(
        'today', (SELECT count(*) FROM public.qr_scans WHERE scanned_at >= day_start),
        'd7',    (SELECT count(*) FROM public.qr_scans WHERE scanned_at >= d7),
        'd30',   (SELECT count(*) FROM public.qr_scans WHERE scanned_at >= d30)
      ),
      'partnerSignups7d', (
        SELECT count(*) FROM public.referral_redemptions r
        WHERE r.created_at >= d7 AND coalesce(r.kind,'signup') = 'signup'
      ),
      'topStaff', (
        SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
          SELECT s.referral_code AS code,
                 coalesce(nullif(s.full_name,''), s.referral_code) AS name,
                 count(q.id)::int AS scans,
                 (SELECT count(*)::int FROM public.referral_redemptions rr
                    WHERE rr.referral_code = s.referral_code
                      AND rr.created_at >= d30) AS signups
          FROM public.staff_referrals s
          LEFT JOIN public.qr_scans q
            ON q.referral_code = s.referral_code AND q.scanned_at >= d30
          WHERE coalesce(s.active, true)
          GROUP BY s.referral_code, s.full_name
          ORDER BY count(q.id) DESC NULLS LAST
          LIMIT 5
        ) t
      ),
      'topPartners', (
        SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
          SELECT p.referral_code AS code,
                 coalesce(nullif(p.display_name,''), p.referral_code) AS name,
                 count(q.id)::int AS scans,
                 (SELECT count(*)::int FROM public.referral_redemptions rr
                    WHERE rr.referral_code = p.referral_code
                      AND rr.created_at >= d30) AS signups
          FROM public.partner_program_partners p
          LEFT JOIN public.qr_scans q
            ON q.referral_code = p.referral_code AND q.scanned_at >= d30
          WHERE coalesce(p.active, true)
          GROUP BY p.referral_code, p.display_name
          ORDER BY count(q.id) DESC NULLS LAST
          LIMIT 5
        ) t
      )
    ),
    'productivity', jsonb_build_object(
      'listingsCreated', jsonb_build_object(
        'today', (SELECT count(*) FROM public.listings WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.listings WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.listings WHERE created_at >= d30)
      ),
      'activeListings',  (SELECT count(*) FROM public.listings WHERE status::text = 'active'),
      'pendingPayment',  (SELECT count(*) FROM public.listings WHERE status::text = 'pending_payment'),
      'boostsSold', jsonb_build_object(
        'today', (SELECT count(*) FROM public.listing_boosts WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.listing_boosts WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.listing_boosts WHERE created_at >= d30)
      ),
      'messagesSent', jsonb_build_object(
        'today', (SELECT count(*) FROM public.messages WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.messages WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.messages WHERE created_at >= d30)
      ),
      'revenue', jsonb_build_object(
        'today', coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid' AND coalesce(paid_at, created_at) >= day_start), 0),
        'd7',    coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid' AND coalesce(paid_at, created_at) >= d7), 0),
        'd30',   coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid' AND coalesce(paid_at, created_at) >= d30), 0)
      ),
      'revenueTotal', coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid'), 0)
    ),
    'health', jsonb_build_object(
      'pendingVerifications', (SELECT count(*) FROM public.verification_requests WHERE status = 'pending'),
      'pendingPayments',      (SELECT count(*) FROM public.payments WHERE status = 'pending'),
      'failedPayments24h',    (SELECT count(*) FROM public.payments WHERE status IN ('failed','rejected') AND created_at >= h24),
      'openReports',          (SELECT count(*) FROM public.reports WHERE status IN ('open','pending','submitted','under_review')),
      'unacknowledgedAlerts', (SELECT count(*) FROM public.ops_alerts WHERE coalesce(acknowledged, false) = false),
      'pendingClaimReviews',  (SELECT count(*) FROM public.business_claim_requests WHERE status = 'pending')
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_overview() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260702134016_fa6a61dc-4391-4a0c-8b36-ba5c9d4ddd02.sql
-- ============================================================================
create table if not exists public.promoter_analytics_events (
  id uuid primary key default gen_random_uuid(),
  surface text not null,
  event   text not null,
  cta_id  text,
  variant text,
  partner_code text,
  user_id uuid,
  session_hash text,
  path text,
  referrer text,
  meta jsonb,
  created_at timestamptz not null default now()
);

grant select, insert on public.promoter_analytics_events to anon, authenticated;
grant all on public.promoter_analytics_events to service_role;

alter table public.promoter_analytics_events enable row level security;

create policy "promoter_analytics_events_insert_any"
  on public.promoter_analytics_events
  for insert
  to anon, authenticated
  with check (true);

create policy "promoter_analytics_events_select_admin"
  on public.promoter_analytics_events
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create index if not exists promoter_analytics_events_created_at_idx
  on public.promoter_analytics_events (created_at desc);
create index if not exists promoter_analytics_events_surface_event_idx
  on public.promoter_analytics_events (surface, event, created_at desc);
create index if not exists promoter_analytics_events_partner_idx
  on public.promoter_analytics_events (partner_code, created_at desc);


-- ============================================================================
-- SOURCE MIGRATION: 20260702135859_cd21d4f3-c323-473c-8b80-8960437e500a.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_overview_trends(days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  n int := greatest(1, least(coalesce(days, 30), 90));
  day_start timestamptz := date_trunc('day', now());
  start_day timestamptz := day_start - make_interval(days => n - 1);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  WITH days AS (
    SELECT generate_series(start_day, day_start, interval '1 day')::date AS d
  ),
  signups AS (
    SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS c
    FROM public.profiles WHERE created_at >= start_day GROUP BY 1
  ),
  scans AS (
    SELECT date_trunc('day', scanned_at)::date AS d, count(*)::int AS c
    FROM public.qr_scans WHERE scanned_at >= start_day GROUP BY 1
  ),
  listings AS (
    SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS c
    FROM public.listings WHERE created_at >= start_day GROUP BY 1
  ),
  boosts AS (
    SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS c
    FROM public.listing_boosts WHERE created_at >= start_day GROUP BY 1
  ),
  msgs AS (
    SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS c
    FROM public.messages WHERE created_at >= start_day GROUP BY 1
  ),
  pays AS (
    SELECT date_trunc('day', coalesce(paid_at, created_at))::date AS d,
           count(*)::int AS c,
           coalesce(sum(amount_php), 0)::numeric AS amt
    FROM public.payments
    WHERE status = 'paid' AND coalesce(paid_at, created_at) >= start_day
    GROUP BY 1
  ),
  series AS (
    SELECT to_char(days.d, 'YYYY-MM-DD') AS day,
           coalesce(signups.c, 0)  AS signups,
           coalesce(scans.c, 0)    AS scans,
           coalesce(listings.c, 0) AS listings,
           coalesce(boosts.c, 0)   AS boosts,
           coalesce(msgs.c, 0)     AS messages,
           coalesce(pays.c, 0)     AS payments,
           coalesce(pays.amt, 0)   AS revenue
    FROM days
    LEFT JOIN signups  ON signups.d  = days.d
    LEFT JOIN scans    ON scans.d    = days.d
    LEFT JOIN listings ON listings.d = days.d
    LEFT JOIN boosts   ON boosts.d   = days.d
    LEFT JOIN msgs     ON msgs.d     = days.d
    LEFT JOIN pays     ON pays.d     = days.d
    ORDER BY days.d
  )
  SELECT jsonb_build_object(
    'days', n,
    'series', coalesce(jsonb_agg(row_to_json(series)), '[]'::jsonb)
  ) INTO result FROM series;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_overview_trends(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_overview_trends(int) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_overview_trends(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview_trends(int) TO service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260703001045_a60e1893-fdf9-4317-b0d1-11606fea2118.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  now_ts timestamptz := now();
  day_start timestamptz := date_trunc('day', now_ts);
  d7 timestamptz := now_ts - interval '7 days';
  d30 timestamptz := now_ts - interval '30 days';
  h24 timestamptz := now_ts - interval '24 hours';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'users', jsonb_build_object(
      'total', (SELECT count(*) FROM public.profiles),
      'signups', jsonb_build_object(
        'today', (SELECT count(*) FROM public.profiles WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.profiles WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.profiles WHERE created_at >= d30)
      ),
      'verifiedSellers', (SELECT count(*) FROM public.profiles WHERE verification_status = 'verified'),
      'activeAccounts',  (SELECT count(*) FROM public.profiles WHERE coalesce(account_status,'active') = 'active'),
      'foundingMembers', (SELECT count(*) FROM public.profiles WHERE is_founding_member = true)
    ),
    'scans', jsonb_build_object(
      'total', jsonb_build_object(
        'today', (SELECT count(*) FROM public.qr_scans WHERE scanned_at >= day_start),
        'd7',    (SELECT count(*) FROM public.qr_scans WHERE scanned_at >= d7),
        'd30',   (SELECT count(*) FROM public.qr_scans WHERE scanned_at >= d30)
      ),
      'partnerSignups7d', (
        SELECT count(*) FROM public.referral_redemptions r
        WHERE r.created_at >= d7 AND coalesce(r.kind,'signup') = 'signup'
      ),
      'topStaff', (
        SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
          SELECT s.referral_code AS code,
                 coalesce(nullif(s.full_name,''), s.referral_code) AS name,
                 count(q.id)::int AS scans,
                 (SELECT count(*)::int FROM public.referral_redemptions rr
                    WHERE rr.referral_code = s.referral_code
                      AND rr.created_at >= d30) AS signups
          FROM public.staff_referrals s
          LEFT JOIN public.qr_scans q
            ON q.referral_code = s.referral_code AND q.scanned_at >= d30
          WHERE coalesce(s.active, true)
          GROUP BY s.referral_code, s.full_name
          ORDER BY count(q.id) DESC NULLS LAST
          LIMIT 5
        ) t
      ),
      'topPartners', (
        SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
          SELECT p.referral_code AS code,
                 coalesce(nullif(p.display_name,''), p.referral_code) AS name,
                 count(q.id)::int AS scans,
                 (SELECT count(*)::int FROM public.referral_redemptions rr
                    WHERE rr.referral_code = p.referral_code
                      AND rr.created_at >= d30) AS signups
          FROM public.partner_program_partners p
          LEFT JOIN public.qr_scans q
            ON q.referral_code = p.referral_code AND q.scanned_at >= d30
          WHERE coalesce(p.active, true)
          GROUP BY p.referral_code, p.display_name
          ORDER BY count(q.id) DESC NULLS LAST
          LIMIT 5
        ) t
      )
    ),
    'productivity', jsonb_build_object(
      'listingsCreated', jsonb_build_object(
        'today', (SELECT count(*) FROM public.listings WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.listings WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.listings WHERE created_at >= d30)
      ),
      'activeListings',  (SELECT count(*) FROM public.listings WHERE status::text = 'active'),
      'pendingPayment',  (SELECT count(*) FROM public.listings WHERE status::text = 'pending_payment'),
      'boostsSold', jsonb_build_object(
        'today', (SELECT count(*) FROM public.listing_boosts WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.listing_boosts WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.listing_boosts WHERE created_at >= d30)
      ),
      'messagesSent', jsonb_build_object(
        'today', (SELECT count(*) FROM public.messages WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.messages WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.messages WHERE created_at >= d30)
      ),
      'revenue', jsonb_build_object(
        'today', coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid' AND coalesce(paid_at, created_at) >= day_start), 0),
        'd7',    coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid' AND coalesce(paid_at, created_at) >= d7), 0),
        'd30',   coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid' AND coalesce(paid_at, created_at) >= d30), 0)
      ),
      'revenueTotal', coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid'), 0)
    ),
    'health', jsonb_build_object(
      'pendingVerifications', (SELECT count(*) FROM public.verification_requests WHERE status = 'pending'),
      'pendingPayments',      (SELECT count(*) FROM public.payments WHERE status = 'pending'),
      'failedPayments24h',    (SELECT count(*) FROM public.payments WHERE status = 'failed' AND created_at >= h24),
      'openReports',          (SELECT count(*) FROM public.reports WHERE status IN ('open','pending','submitted','under_review')),
      'unacknowledgedAlerts', (SELECT count(*) FROM public.ops_alerts WHERE coalesce(acknowledged, false) = false),
      'pendingClaimReviews',  (SELECT count(*) FROM public.business_claim_requests WHERE status = 'pending')
    )
  ) INTO result;

  RETURN result;
END;
$function$;


-- ============================================================================
-- SOURCE MIGRATION: 20260703041725_735e3af3-b71d-420f-a48c-9f9418f9fd03.sql
-- ============================================================================

DROP POLICY IF EXISTS "Sales view listings" ON public.listings;
CREATE POLICY "Sales view listings"
ON public.listings FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND public.is_sales_assigned_user(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Sales read referral_redemptions" ON public.referral_redemptions;
CREATE POLICY "Sales read referral_redemptions"
ON public.referral_redemptions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = referral_redemptions.staff_referral_id
      AND s.staff_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Sales read user_referrals" ON public.user_referrals;
CREATE POLICY "Sales read user_referrals"
ON public.user_referrals FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = user_referrals.referred_by_staff_id
      AND s.staff_user_id = auth.uid()
  )
);


-- ============================================================================
-- SOURCE MIGRATION: 20260703133351_ae2ded6d-03e2-4c5a-bda9-8ab011454540.sql
-- ============================================================================

-- ENUMS
CREATE TYPE public.club_type AS ENUM ('motorcycle_riding','car_club','off_road','truck_club','brand_owners','general_motoring','other');
CREATE TYPE public.club_status AS ENUM ('pending','active','rejected','suspended');
CREATE TYPE public.club_member_role AS ENUM ('owner','admin','member');
CREATE TYPE public.club_member_status AS ENUM ('pending','active','banned');
CREATE TYPE public.club_document_kind AS ENUM ('lto_accreditation','sec_incorporation','dti_business_permit','other');
CREATE TYPE public.club_event_status AS ENUM ('scheduled','cancelled','completed');
CREATE TYPE public.club_rsvp_response AS ENUM ('going','maybe','no');

-- CLUBS
CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  type public.club_type NOT NULL DEFAULT 'general_motoring',
  description text,
  region text,
  city text,
  logo_url text,
  cover_url text,
  contact_email text,
  contact_phone text,
  website_url text,
  status public.club_status NOT NULL DEFAULT 'pending',
  verified boolean NOT NULL DEFAULT false,
  member_count integer NOT NULL DEFAULT 1,
  review_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clubs_status ON public.clubs(status);
CREATE INDEX idx_clubs_type ON public.clubs(type);
CREATE INDEX idx_clubs_owner ON public.clubs(owner_id);

GRANT SELECT ON public.clubs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clubs TO authenticated;
GRANT ALL ON public.clubs TO service_role;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- CLUB DOCUMENTS
CREATE TABLE public.club_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  kind public.club_document_kind NOT NULL,
  storage_path text NOT NULL,
  original_filename text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_club_documents_club ON public.club_documents(club_id);

GRANT SELECT, INSERT, DELETE ON public.club_documents TO authenticated;
GRANT ALL ON public.club_documents TO service_role;
ALTER TABLE public.club_documents ENABLE ROW LEVEL SECURITY;

-- CLUB MEMBERS
CREATE TABLE public.club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.club_member_role NOT NULL DEFAULT 'member',
  status public.club_member_status NOT NULL DEFAULT 'pending',
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);
CREATE INDEX idx_club_members_club ON public.club_members(club_id);
CREATE INDEX idx_club_members_user ON public.club_members(user_id);

GRANT SELECT ON public.club_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_members TO authenticated;
GRANT ALL ON public.club_members TO service_role;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- CLUB EVENTS
CREATE TABLE public.club_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  meetup_location text,
  meetup_lat double precision,
  meetup_lng double precision,
  cover_url text,
  status public.club_event_status NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_club_events_club ON public.club_events(club_id);
CREATE INDEX idx_club_events_starts_at ON public.club_events(starts_at);

GRANT SELECT ON public.club_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_events TO authenticated;
GRANT ALL ON public.club_events TO service_role;
ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;

-- EVENT RSVPs
CREATE TABLE public.club_event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response public.club_rsvp_response NOT NULL DEFAULT 'going',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
CREATE INDEX idx_club_event_rsvps_event ON public.club_event_rsvps(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_event_rsvps TO authenticated;
GRANT ALL ON public.club_event_rsvps TO service_role;
ALTER TABLE public.club_event_rsvps ENABLE ROW LEVEL SECURITY;

-- CLUB RIDES
CREATE TABLE public.club_rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, ride_id)
);
CREATE INDEX idx_club_rides_club ON public.club_rides(club_id);

GRANT SELECT ON public.club_rides TO anon;
GRANT SELECT, INSERT, DELETE ON public.club_rides TO authenticated;
GRANT ALL ON public.club_rides TO service_role;
ALTER TABLE public.club_rides ENABLE ROW LEVEL SECURITY;

-- CLUB POSTS
CREATE TABLE public.club_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_club_posts_club ON public.club_posts(club_id);

GRANT SELECT ON public.club_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_posts TO authenticated;
GRANT ALL ON public.club_posts TO service_role;
ALTER TABLE public.club_posts ENABLE ROW LEVEL SECURITY;

-- HELPER: is_club_admin (owner or club admin role, active)
CREATE OR REPLACE FUNCTION public.is_club_admin(_user uuid, _club uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs c WHERE c.id = _club AND c.owner_id = _user
  ) OR EXISTS (
    SELECT 1 FROM public.club_members m
    WHERE m.club_id = _club AND m.user_id = _user
      AND m.status = 'active' AND m.role IN ('owner','admin')
  );
$$;

-- HELPER: is_club_member (active member)
CREATE OR REPLACE FUNCTION public.is_club_member(_user uuid, _club uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs c WHERE c.id = _club AND c.owner_id = _user
  ) OR EXISTS (
    SELECT 1 FROM public.club_members m
    WHERE m.club_id = _club AND m.user_id = _user AND m.status = 'active'
  );
$$;

-- POLICIES: clubs
CREATE POLICY "Public can read active clubs" ON public.clubs
  FOR SELECT TO anon, authenticated
  USING (status = 'active');
CREATE POLICY "Owner and admins read own club" ON public.clubs
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_club_admin(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can apply to create a club" ON public.clubs
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND status = 'pending');
CREATE POLICY "Owner and admins update club" ON public.clubs
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_club_admin(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.is_club_admin(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner deletes club" ON public.clubs
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- POLICIES: club_documents (private)
CREATE POLICY "Club admins read own docs" ON public.club_documents
  FOR SELECT TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Club admins insert docs" ON public.club_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (public.is_club_admin(auth.uid(), club_id) OR EXISTS (
      SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.owner_id = auth.uid()
    ))
  );
CREATE POLICY "Club admins delete docs" ON public.club_documents
  FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));

-- POLICIES: club_members
CREATE POLICY "Public reads members of active clubs" ON public.club_members
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.status = 'active'));
CREATE POLICY "Users see own memberships" ON public.club_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "User requests to join" ON public.club_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'member' AND status = 'pending');
CREATE POLICY "Club admins manage members" ON public.club_members
  FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "User leaves or admin removes" ON public.club_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));

-- POLICIES: club_events
CREATE POLICY "Public reads events for active clubs" ON public.club_events
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.status = 'active'));
CREATE POLICY "Club admins manage events" ON public.club_events
  FOR ALL TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));

-- POLICIES: club_event_rsvps
CREATE POLICY "Members read event rsvps" ON public.club_event_rsvps
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.club_events e
      WHERE e.id = event_id AND public.is_club_member(auth.uid(), e.club_id)
    )
  );
CREATE POLICY "User manages own rsvp" ON public.club_event_rsvps
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "User updates own rsvp" ON public.club_event_rsvps
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "User deletes own rsvp" ON public.club_event_rsvps
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- POLICIES: club_rides
CREATE POLICY "Public reads rides on active clubs" ON public.club_rides
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.status = 'active'));
CREATE POLICY "Member attaches own ride" ON public.club_rides
  FOR INSERT TO authenticated
  WITH CHECK (
    added_by = auth.uid()
    AND public.is_club_member(auth.uid(), club_id)
    AND EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Member detaches own or admin removes" ON public.club_rides
  FOR DELETE TO authenticated
  USING (
    added_by = auth.uid()
    OR public.is_club_admin(auth.uid(), club_id)
    OR public.has_role(auth.uid(), 'admin')
  );

-- POLICIES: club_posts
CREATE POLICY "Public reads posts of active clubs" ON public.club_posts
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.status = 'active'));
CREATE POLICY "Club admins write posts" ON public.club_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'))
  );
CREATE POLICY "Club admins update posts" ON public.club_posts
  FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Club admins delete posts" ON public.club_posts
  FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));

-- UPDATED_AT TRIGGERS
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_club_events_updated_at BEFORE UPDATE ON public.club_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MEMBER COUNT TRIGGER
CREATE OR REPLACE FUNCTION public.update_club_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE public.clubs SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.club_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'active' AND OLD.status <> 'active' THEN
      UPDATE public.clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
    ELSIF OLD.status = 'active' AND NEW.status <> 'active' THEN
      UPDATE public.clubs SET member_count = GREATEST(0, member_count - 1) WHERE id = NEW.club_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_club_members_count
  AFTER INSERT OR UPDATE OR DELETE ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.update_club_member_count();

-- AUTO OWNER MEMBERSHIP on club insert
CREATE OR REPLACE FUNCTION public.create_club_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.club_members (club_id, user_id, role, status, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active', now())
  ON CONFLICT (club_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_clubs_owner_membership
  AFTER INSERT ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.create_club_owner_membership();


-- ============================================================================
-- SOURCE MIGRATION: 20260703133635_5cc0adde-634a-4f1e-9fde-f821eca32075.sql
-- ============================================================================

-- Storage RLS: club-docs (private)
CREATE POLICY "Club admins read own club docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-docs'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.clubs c
        WHERE c.id::text = split_part(name, '/', 1)
          AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
      )
    )
  );

CREATE POLICY "Club admins upload club docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-docs'
    AND EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id::text = split_part(name, '/', 1)
        AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
    )
  );

CREATE POLICY "Club admins delete club docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-docs'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.clubs c
        WHERE c.id::text = split_part(name, '/', 1)
          AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
      )
    )
  );

-- Storage RLS: business-media, path prefix clubs/{club_id}/...
CREATE POLICY "Club admins upload club media in business-media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-media'
    AND split_part(name, '/', 1) = 'clubs'
    AND EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id::text = split_part(name, '/', 2)
        AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
    )
  );

CREATE POLICY "Club admins update club media in business-media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-media'
    AND split_part(name, '/', 1) = 'clubs'
    AND EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id::text = split_part(name, '/', 2)
        AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
    )
  );

CREATE POLICY "Club admins delete club media in business-media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-media'
    AND split_part(name, '/', 1) = 'clubs'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.clubs c
        WHERE c.id::text = split_part(name, '/', 2)
          AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
      )
    )
  );


-- ============================================================================
-- SOURCE MIGRATION: 20260703135517_be64835f-9a09-4cbc-84d7-739d9c05be1a.sql
-- ============================================================================

-- Helper: is the user an active member of a verified, active club?
CREATE OR REPLACE FUNCTION public.user_has_verified_club(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_members cm
    JOIN public.clubs c ON c.id = cm.club_id
    WHERE cm.user_id = _user_id
      AND cm.status = 'active'
      AND c.status = 'active'
      AND c.verified = true
  );
$$;

-- Audit table for each applied club-member discount
CREATE TABLE public.club_member_discount_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  scope text NOT NULL, -- e.g. 'ad_order', 'boost', 'bundle', 'subscription', 'passport_premium', 'promotion'
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  line_item_id uuid REFERENCES public.payment_line_items(id) ON DELETE SET NULL,
  original_amount_php numeric NOT NULL,
  discount_amount_php numeric NOT NULL,
  discount_pct numeric NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.club_member_discount_grants TO authenticated;
GRANT ALL ON public.club_member_discount_grants TO service_role;

ALTER TABLE public.club_member_discount_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own club discount grants"
  ON public.club_member_discount_grants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_club_discount_grants_user ON public.club_member_discount_grants(user_id);
CREATE INDEX idx_club_discount_grants_payment ON public.club_member_discount_grants(payment_id);

-- Config rows in pricing_settings
INSERT INTO public.pricing_settings (key, value, label, description)
VALUES
  ('club_member_discount_pct', 5, 'Club member discount %',
   'Percent discount applied to internal 365 purchases (ads, boosts, bundles, plans, passport premium) for active members of verified clubs.'),
  ('club_member_discount_enabled', 1, 'Club member discount enabled',
   'Set to 1 to enable the club member discount, 0 to disable globally.')
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260703141331_e3dda1ee-6d75-488f-8143-538acfa08b50.sql
-- ============================================================================
INSERT INTO public.pricing_settings (key, value, label, description) VALUES
  ('club_member_discount_coupon_duration', 0, 'Club coupon duration',
   'Stripe coupon duration for the club-member discount. 0 = auto (once for one-time payments, forever for subscriptions), 1 = once (single invoice only), 2 = forever (applies to every renewal).'),
  ('club_member_discount_require_verified', 1, 'Require verified club',
   'When 1, only members of clubs marked verified=true qualify. When 0, any active club counts.'),
  ('club_member_discount_include_pending_clubs', 0, 'Include pending clubs',
   'When 1, members of clubs in status=pending also qualify. Default 0 (active clubs only).'),
  ('club_member_discount_include_pending_members', 0, 'Include pending members',
   'When 1, memberships in status=pending also qualify. Default 0 (active members only).')
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260704042432_7e9aeeea-3d2f-4253-8cee-e1e25c93ca1a.sql
-- ============================================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS club_discount JSONB;

COMMENT ON COLUMN public.payments.club_discount IS
  'Immutable snapshot of the club-member discount applied to this payment. Shape: { club_id, club_name, club_slug, scope, discount_pct, discount_amount_php, original_amount_php, final_amount_php, applied_at, eligibility_reason, grant_id }. Written server-side when the discount is granted; do not mutate after checkout.';

CREATE INDEX IF NOT EXISTS payments_club_discount_club_id_idx
  ON public.payments ((club_discount->>'club_id'))
  WHERE club_discount IS NOT NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260704080518_4e24ea68-0ef0-4482-862a-e3dd6e601dd8.sql
-- ============================================================================

-- Extend subject enum to support supplier assignments
ALTER TYPE public.sales_rep_subject ADD VALUE IF NOT EXISTS 'supplier';


-- ============================================================================
-- SOURCE MIGRATION: 20260704080604_32cb4318-076d-4e4f-9469-17276834652d.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_sales_assigned_supplier(_rep uuid, _supplier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sales_rep_assignments
    WHERE rep_user_id = _rep
      AND active = true
      AND subject_type = 'supplier'
      AND subject_id = _supplier_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_sales_assigned_supplier(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_sales_assigned_supplier(uuid, uuid) TO authenticated;

-- parts_supplier_contacts
DROP POLICY IF EXISTS "Admins and sales can read supplier contacts" ON public.parts_supplier_contacts;
DROP POLICY IF EXISTS "Admins and sales can write supplier contacts" ON public.parts_supplier_contacts;

CREATE POLICY "Admins and assigned sales can read supplier contacts"
ON public.parts_supplier_contacts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND public.is_sales_assigned_supplier(auth.uid(), supplier_id))
);

CREATE POLICY "Admins and assigned sales can write supplier contacts"
ON public.parts_supplier_contacts FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND public.is_sales_assigned_supplier(auth.uid(), supplier_id))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND public.is_sales_assigned_supplier(auth.uid(), supplier_id))
);

-- parts_supplier_outreach
DROP POLICY IF EXISTS "Admins and sales can read outreach" ON public.parts_supplier_outreach;
DROP POLICY IF EXISTS "Admins and sales can write outreach" ON public.parts_supplier_outreach;

CREATE POLICY "Admins and scoped sales can read outreach"
ON public.parts_supplier_outreach FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
);

CREATE POLICY "Admins and scoped sales can write outreach"
ON public.parts_supplier_outreach FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
);

-- parts_supplier_tasks
DROP POLICY IF EXISTS "Admins and sales can read supplier tasks" ON public.parts_supplier_tasks;
DROP POLICY IF EXISTS "Admins and sales can write supplier tasks" ON public.parts_supplier_tasks;

CREATE POLICY "Admins and scoped sales can read supplier tasks"
ON public.parts_supplier_tasks FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
);

CREATE POLICY "Admins and scoped sales can write supplier tasks"
ON public.parts_supplier_tasks FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
);


-- ============================================================================
-- SOURCE MIGRATION: 20260704084341_d710463c-2b79-4a46-a696-1d1639e2939d.sql
-- ============================================================================

CREATE TABLE public.club_discount_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  headline text NOT NULL,
  description text NOT NULL,
  percent numeric(5,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  audiences text[] NOT NULL DEFAULT '{}',
  applies_to text[] NOT NULL DEFAULT '{}',
  excludes text[] NOT NULL DEFAULT '{}',
  stacking_rules text NOT NULL DEFAULT '',
  eligibility_notes text NOT NULL DEFAULT '',
  how_it_applies text NOT NULL DEFAULT '',
  footer_note text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.club_discount_promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_discount_promotions TO authenticated;
GRANT ALL ON public.club_discount_promotions TO service_role;

ALTER TABLE public.club_discount_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active promotions"
  ON public.club_discount_promotions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can read all promotions"
  ON public.club_discount_promotions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert promotions"
  ON public.club_discount_promotions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update promotions"
  ON public.club_discount_promotions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete promotions"
  ON public.club_discount_promotions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_club_discount_promotions_updated_at
  BEFORE UPDATE ON public.club_discount_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.club_discount_promotions
  (name, headline, description, percent, is_active, audiences, applies_to, excludes,
   stacking_rules, eligibility_notes, how_it_applies, footer_note, sort_order)
VALUES (
  'Club Member 5%',
  '5% Club Member Discount',
  'Active members of a verified club on 365 MotorSales automatically get 5% off internal 365 purchases at checkout — no coupon code needed. Eligibility is re-checked on every purchase and recorded on your receipt.',
  5,
  true,
  ARRAY['Verified club members'],
  ARRAY['Ads & ad orders','Listing boosts','Listing bundles','Subscription plans','Passport Premium'],
  ARRAY['Third-party partner parts','Insurance quotes','Tow provider fees','External shops & marketplaces','Items sold between members'],
  'Doesn''t stack with other percentage discounts or promo coupons on the same purchase — the larger discount wins.',
  'Signed-in members of a verified club with active membership. If you leave the club or the club loses verified status, the discount stops on future purchases.',
  'Automatically at checkout on eligible purchases. You''ll see a "Club member 5% off applied" note and the eligibility reason is stored on your receipt.',
  'More perks (insurance rates, parts discounts, event access) are on the roadmap. The 5% Club Member Discount is the only live perk today.',
  0
);


-- ============================================================================
-- SOURCE MIGRATION: 20260705075701_7b5fec29-9760-4f5c-9f2a-d6dbc691a76b.sql
-- ============================================================================
CREATE TABLE public.signup_failure_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  intent text,
  phone_iso text,
  reason text NOT NULL,
  missing_fields text[] NOT NULL DEFAULT '{}',
  status_code int NOT NULL,
  ip_hash text,
  user_agent text
);

GRANT SELECT ON public.signup_failure_events TO authenticated;
GRANT ALL ON public.signup_failure_events TO service_role;

ALTER TABLE public.signup_failure_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read signup failures"
  ON public.signup_failure_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_signup_failure_created ON public.signup_failure_events (created_at DESC);
CREATE INDEX idx_signup_failure_reason ON public.signup_failure_events (reason, created_at DESC);


-- ============================================================================
-- SOURCE MIGRATION: 20260705080402_b51586e0-228a-4936-bccc-4c170e4283a6.sql
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.can_manage_shop(uuid) TO anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260705145013_215852c9-9200-4048-9941-804a66f1c867.sql
-- ============================================================================
ALTER TABLE public.listings
  ADD CONSTRAINT listings_user_id_profiles_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- SOURCE MIGRATION: 20260706042027_d7ff3b5e-60ff-4d87-ad68-c6934d53d076.sql
-- ============================================================================

-- Auto-accredit @365motorsales.com staff (with a staff_referrals row) as
-- approved Partner Program partners, sharing the same referral_code.

CREATE OR REPLACE FUNCTION public.accredit_staff_partner(_staff_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_sr RECORD;
  v_full_name text;
  v_app_id uuid;
BEGIN
  IF _staff_user_id IS NULL THEN RETURN; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = _staff_user_id;
  IF v_email IS NULL OR lower(v_email) NOT LIKE '%@365motorsales.com' THEN
    RETURN;
  END IF;

  SELECT * INTO v_sr FROM public.staff_referrals
   WHERE staff_user_id = _staff_user_id AND active = true
   ORDER BY updated_at DESC LIMIT 1;
  IF v_sr.id IS NULL THEN RETURN; END IF;

  -- Skip if partner already exists for this code or user.
  IF EXISTS (
    SELECT 1 FROM public.partner_program_partners
     WHERE referral_code = v_sr.referral_code OR user_id = _staff_user_id
  ) THEN
    -- Ensure it's active.
    UPDATE public.partner_program_partners
       SET active = true, updated_at = now()
     WHERE (referral_code = v_sr.referral_code OR user_id = _staff_user_id)
       AND active = false;
    RETURN;
  END IF;

  SELECT COALESCE(full_name, v_sr.full_name, v_email)
    INTO v_full_name FROM public.profiles WHERE id = _staff_user_id;
  IF v_full_name IS NULL THEN v_full_name := COALESCE(v_sr.full_name, v_email); END IF;

  -- Find or create approved application.
  SELECT id INTO v_app_id FROM public.partner_program_applications
   WHERE user_id = _staff_user_id AND channel_type = 'internal_staff'
   LIMIT 1;

  IF v_app_id IS NULL THEN
    INSERT INTO public.partner_program_applications (
      user_id, full_name, email, phone, channel_type, platforms,
      status, agreed_terms, agreed_terms_at, reviewed_at, admin_notes
    ) VALUES (
      _staff_user_id, v_full_name, v_email, v_sr.phone, 'internal_staff', ARRAY['internal']::text[],
      'approved', true, now(), now(),
      'Auto-accredited: 365 Motorsales internal staff'
    )
    RETURNING id INTO v_app_id;
  ELSE
    UPDATE public.partner_program_applications
       SET status = 'approved', agreed_terms = true,
           agreed_terms_at = COALESCE(agreed_terms_at, now()),
           reviewed_at = COALESCE(reviewed_at, now()),
           admin_notes = COALESCE(admin_notes, 'Auto-accredited: 365 Motorsales internal staff')
     WHERE id = v_app_id;
  END IF;

  INSERT INTO public.partner_program_partners (
    user_id, application_id, referral_code, display_name, active,
    agreed_terms_at, agreed_terms_version
  ) VALUES (
    _staff_user_id, v_app_id, v_sr.referral_code, v_full_name, true,
    now(), 'internal-staff-v1'
  )
  ON CONFLICT (referral_code) DO NOTHING;
END;
$$;

-- Trigger on staff_referrals insert/update
CREATE OR REPLACE FUNCTION public.tg_staff_referrals_accredit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.staff_user_id IS NOT NULL AND NEW.active = true THEN
    PERFORM public.accredit_staff_partner(NEW.staff_user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_referrals_accredit ON public.staff_referrals;
CREATE TRIGGER staff_referrals_accredit
AFTER INSERT OR UPDATE OF staff_user_id, referral_code, active
ON public.staff_referrals
FOR EACH ROW EXECUTE FUNCTION public.tg_staff_referrals_accredit();

-- Trigger on auth.users email confirmation for staff domain
CREATE OR REPLACE FUNCTION public.tg_auth_user_staff_accredit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND lower(NEW.email) LIKE '%@365motorsales.com'
     AND NEW.email_confirmed_at IS NOT NULL THEN
    PERFORM public.accredit_staff_partner(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed_accredit_staff ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_accredit_staff
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.tg_auth_user_staff_accredit();

-- Backfill existing staff.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT sr.staff_user_id
      FROM public.staff_referrals sr
      JOIN auth.users u ON u.id = sr.staff_user_id
     WHERE sr.active = true
       AND lower(u.email) LIKE '%@365motorsales.com'
  LOOP
    PERFORM public.accredit_staff_partner(r.staff_user_id);
  END LOOP;
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260706042342_a2a3a3d6-6594-4d25-9a6b-2e02e5dff27f.sql
-- ============================================================================

-- Gate referral crediting on Partner Program accreditation.
-- Codes only credit when an active partner_program_partners row exists.

CREATE OR REPLACE FUNCTION public.attach_signup_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb;
  code text;
  s public.staff_referrals%ROWTYPE;
  is_accredited boolean;
BEGIN
  SELECT raw_user_meta_data INTO meta FROM auth.users WHERE id = NEW.id;
  code := NULLIF(meta->>'referral_code','');
  IF code IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO s FROM public.staff_referrals WHERE referral_code = code AND active = true;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Accreditation gate: only credit if an active Partner Program partner
  -- record exists for this code. Non-accredited referrers get no credit.
  SELECT EXISTS (
    SELECT 1 FROM public.partner_program_partners
     WHERE referral_code = code AND active = true
  ) INTO is_accredited;

  INSERT INTO public.user_referrals(user_id, referred_by_staff_id, first_referral_code, last_referral_code, credited_referral_code)
    VALUES (
      NEW.id, s.id, code, code,
      CASE WHEN is_accredited THEN code ELSE NULL END
    )
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.record_qr_scan(_code text, _visitor_id uuid, _user_agent text DEFAULT NULL::text, _landing text DEFAULT NULL::text, _device text DEFAULT NULL::text, _browser text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s public.staff_referrals%ROWTYPE;
  v public.referral_visits%ROWTYPE;
  is_active boolean;
  is_accredited boolean;
  can_credit boolean;
  inserted_scan boolean := false;
  new_scan_id uuid;
BEGIN
  SELECT * INTO s FROM public.staff_referrals WHERE referral_code = _code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_code');
  END IF;
  is_active := s.active;

  SELECT EXISTS (
    SELECT 1 FROM public.partner_program_partners
     WHERE referral_code = _code AND active = true
  ) INTO is_accredited;

  can_credit := is_active AND is_accredited;

  INSERT INTO public.qr_scans(referral_code, visitor_id, device_type, browser)
    VALUES (_code, _visitor_id, _device, _browser)
    ON CONFLICT (referral_code, visitor_id) WHERE visitor_id IS NOT NULL
    DO NOTHING
    RETURNING id INTO new_scan_id;
  inserted_scan := new_scan_id IS NOT NULL;

  SELECT * INTO v FROM public.referral_visits WHERE visitor_id = _visitor_id;
  IF NOT FOUND THEN
    INSERT INTO public.referral_visits(visitor_id, first_referral_code, last_referral_code, credited_referral_code, landing_page, user_agent)
      VALUES (_visitor_id, _code, _code, CASE WHEN can_credit THEN _code ELSE NULL END, _landing, _user_agent);
  ELSE
    UPDATE public.referral_visits
       SET last_referral_code = _code,
           last_seen_at = now(),
           credited_referral_code = COALESCE(credited_referral_code, CASE WHEN can_credit THEN _code ELSE NULL END),
           first_referral_code = COALESCE(first_referral_code, _code)
     WHERE visitor_id = _visitor_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'active', is_active,
    'accredited', is_accredited,
    'credited', can_credit,
    'inserted_scan', inserted_scan
  );
END $function$;


-- ============================================================================
-- SOURCE MIGRATION: 20260706042631_6543409d-ceed-4d72-bc09-7b9b2564b2d0.sql
-- ============================================================================

-- Referral-source tracking on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_source text
  CHECK (signup_source IN ('qr','link','direct'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_first text := NULLIF(m->>'first_name', '');
  v_last  text := NULLIF(m->>'last_name', '');
  v_full  text := NULLIF(m->>'full_name', '');
  v_intent text := NULLIF(m->>'signup_intent', '');
  v_business_name text := NULLIF(m->>'business_name', '');
  v_business_address text := NULLIF(m->>'business_address', '');
  v_street_address text := NULLIF(m->>'street_address', '');
  v_postal_code text := NULLIF(m->>'postal_code', '');
  v_business_kind_raw text := NULLIF(m->>'business_kind', '');
  v_business_kind business_kind := NULL;
  v_city text := NULLIF(m->>'signup_city', '');
  v_region text := NULLIF(m->>'signup_region', '');
  v_province text := NULLIF(m->>'signup_province', '');
  v_phone text := NULLIF(m->>'phone', '');
  v_phone_e164 text := NULL;
  v_phone_digits text;
  v_is_business boolean := v_intent IN ('business','service_provider');
  v_seller_type seller_type := CASE WHEN v_is_business THEN 'business'::seller_type ELSE 'private'::seller_type END;
  v_ref_code text := NULLIF(m->>'referral_code','');
  v_src_raw text := lower(NULLIF(m->>'signup_source',''));
  v_signup_source text;
BEGIN
  IF v_full IS NULL AND (v_first IS NOT NULL OR v_last IS NOT NULL) THEN
    v_full := trim(concat_ws(' ', v_first, v_last));
  END IF;
  IF v_full IS NULL THEN v_full := NEW.email; END IF;

  IF v_phone IS NOT NULL THEN
    v_phone_digits := regexp_replace(v_phone, '[^0-9+]', '', 'g');
    IF v_phone_digits LIKE '+%' THEN
      v_phone_e164 := v_phone_digits;
    ELSIF v_phone_digits LIKE '09%' AND length(v_phone_digits) = 11 THEN
      v_phone_e164 := '+63' || substring(v_phone_digits from 2);
    ELSIF v_phone_digits LIKE '9%' AND length(v_phone_digits) = 10 THEN
      v_phone_e164 := '+63' || v_phone_digits;
    ELSIF v_phone_digits LIKE '63%' AND length(v_phone_digits) = 12 THEN
      v_phone_e164 := '+' || v_phone_digits;
    END IF;
  END IF;

  IF v_is_business AND v_business_kind_raw IS NOT NULL THEN
    BEGIN
      v_business_kind := v_business_kind_raw::business_kind;
    EXCEPTION WHEN others THEN
      v_business_kind := NULL;
    END;
  END IF;

  -- Normalize signup_source. If client didn't send one, infer from referral_code.
  IF v_src_raw IN ('qr','link','direct') THEN
    v_signup_source := v_src_raw;
  ELSIF v_ref_code IS NOT NULL THEN
    v_signup_source := 'link';
  ELSE
    v_signup_source := 'direct';
  END IF;

  INSERT INTO public.profiles (
    id, full_name, first_name, last_name, phone, phone_e164,
    signup_intent, signup_city, signup_region, signup_province,
    street_address, postal_code,
    business_name, business_address, business_region, business_province, business_city, business_postal_code,
    business_kind, seller_type, signup_source
  ) VALUES (
    NEW.id, v_full, v_first, v_last, v_phone, v_phone_e164,
    v_intent, v_city, v_region, v_province,
    v_street_address, v_postal_code,
    CASE WHEN v_is_business THEN v_business_name END,
    CASE WHEN v_is_business THEN v_business_address END,
    CASE WHEN v_is_business THEN v_region END,
    CASE WHEN v_is_business THEN v_province END,
    CASE WHEN v_is_business THEN v_city END,
    CASE WHEN v_is_business THEN v_postal_code END,
    v_business_kind,
    v_seller_type,
    v_signup_source
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END
$function$;

-- Backfill: mark existing users. If they have a user_referrals row => 'link',
-- otherwise 'direct'. (We can't recover 'qr' historically.)
UPDATE public.profiles p
   SET signup_source = CASE
     WHEN EXISTS (SELECT 1 FROM public.user_referrals ur WHERE ur.user_id = p.id) THEN 'link'
     ELSE 'direct'
   END
 WHERE signup_source IS NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260706044717_364ddd91-48e7-4224-b5cf-a6b500a9bd42.sql
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS intent_evaluated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intent_evaluated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260706045048_1725132d-d311-46a4-8ce9-cffcca83cb5d.sql
-- ============================================================================
-- Deterministic derivation shared by triggers + admin recompute UI.
CREATE OR REPLACE FUNCTION public.derive_signup_intent(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seller_type text;
  _owns_business boolean;
BEGIN
  SELECT seller_type INTO _seller_type FROM public.profiles WHERE id = _user_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = _user_id)
    INTO _owns_business;

  IF lower(coalesce(_seller_type, '')) = 'repair_shop' THEN
    RETURN 'service_provider';
  ELSIF lower(coalesce(_seller_type, '')) IN ('dealer', 'insurance') THEN
    RETURN 'business';
  ELSIF _owns_business THEN
    RETURN 'business';
  ELSE
    RETURN 'buyer';
  END IF;
END;
$$;

-- Writes the derived value only when it actually differs.
CREATE OR REPLACE FUNCTION public.recompute_signup_intent(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next text;
  _prev text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;
  _next := public.derive_signup_intent(_user_id);
  SELECT signup_intent INTO _prev FROM public.profiles WHERE id = _user_id;
  IF _prev IS DISTINCT FROM _next THEN
    UPDATE public.profiles
       SET signup_intent = _next,
           intent_evaluated_at = now(),
           intent_evaluated_by = NULL
     WHERE id = _user_id;
  END IF;
END;
$$;

-- 1) Profile seller_type / seller_type_confirmed_at changes
CREATE OR REPLACE FUNCTION public.trg_profiles_recompute_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.seller_type IS DISTINCT FROM OLD.seller_type) THEN
    PERFORM public.recompute_signup_intent(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_recompute_intent ON public.profiles;
CREATE TRIGGER profiles_recompute_intent
AFTER INSERT OR UPDATE OF seller_type ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_profiles_recompute_intent();

-- 2) Business ownership add/remove/move
CREATE OR REPLACE FUNCTION public.trg_businesses_recompute_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_signup_intent(NEW.owner_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_signup_intent(OLD.owner_id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      PERFORM public.recompute_signup_intent(OLD.owner_id);
      PERFORM public.recompute_signup_intent(NEW.owner_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS businesses_recompute_intent ON public.businesses;
CREATE TRIGGER businesses_recompute_intent
AFTER INSERT OR UPDATE OF owner_id OR DELETE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.trg_businesses_recompute_intent();

-- 3) Partner Program accreditation add/activate/revoke — recompute anyone
--    currently credited to that referral code so intent stays fresh even if
--    future derivation logic ever gates on accreditation.
CREATE OR REPLACE FUNCTION public.trg_partners_recompute_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code text;
  _uid uuid;
BEGIN
  _code := COALESCE(NEW.referral_code, OLD.referral_code);
  IF _code IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  FOR _uid IN
    SELECT user_id FROM public.user_referrals
     WHERE credited_referral_code = _code OR first_referral_code = _code
  LOOP
    PERFORM public.recompute_signup_intent(_uid);
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS partners_recompute_intent ON public.partner_program_partners;
CREATE TRIGGER partners_recompute_intent
AFTER INSERT OR UPDATE OF active, referral_code OR DELETE
ON public.partner_program_partners
FOR EACH ROW EXECUTE FUNCTION public.trg_partners_recompute_intent();

-- Backfill: recompute every profile once so existing badges match the derived value.
DO $$
DECLARE
  _uid uuid;
BEGIN
  FOR _uid IN SELECT id FROM public.profiles LOOP
    PERFORM public.recompute_signup_intent(_uid);
  END LOOP;
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260706045431_7f2e9b7f-0a44-499c-8482-f19f453b658d.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recompute_signup_intent(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _next text;
  _prev text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;
  _next := public.derive_signup_intent(_user_id);
  SELECT signup_intent INTO _prev FROM public.profiles WHERE id = _user_id;
  IF _prev IS DISTINCT FROM _next THEN
    UPDATE public.profiles
       SET signup_intent = _next,
           intent_evaluated_at = now(),
           intent_evaluated_by = NULL
     WHERE id = _user_id;
    BEGIN
      INSERT INTO public.admin_audit_log
        (actor_id, target_user_id, action, field, old_value, new_value, note, metadata)
      VALUES
        (_user_id, _user_id, 'intent_recomputed', 'signup_intent',
         _prev, _next, 'Automatic re-evaluation via database trigger',
         jsonb_build_object('source', 'auto'));
    EXCEPTION WHEN OTHERS THEN
      -- audit failure is non-fatal
      NULL;
    END;
  END IF;
END;
$function$;


-- ============================================================================
-- SOURCE MIGRATION: 20260706045715_97c676ff-485d-46a0-a0e6-cc08a8da583d.sql
-- ============================================================================

-- Extend recompute_signup_intent to accept trigger-source context and record it in the audit metadata.
CREATE OR REPLACE FUNCTION public.recompute_signup_intent(
  _user_id uuid,
  _trigger_source text DEFAULT NULL,
  _trigger_field text DEFAULT NULL,
  _trigger_old text DEFAULT NULL,
  _trigger_new text DEFAULT NULL,
  _trigger_entity_type text DEFAULT NULL,
  _trigger_entity_id text DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _next text;
  _prev text;
  _meta jsonb;
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;
  _next := public.derive_signup_intent(_user_id);
  SELECT signup_intent INTO _prev FROM public.profiles WHERE id = _user_id;
  IF _prev IS DISTINCT FROM _next THEN
    UPDATE public.profiles
       SET signup_intent = _next,
           intent_evaluated_at = now(),
           intent_evaluated_by = NULL
     WHERE id = _user_id;

    _meta := jsonb_build_object('source', 'auto');
    IF _trigger_source IS NOT NULL THEN
      _meta := _meta || jsonb_build_object('trigger', _trigger_source);
    END IF;
    IF _trigger_field IS NOT NULL THEN
      _meta := _meta || jsonb_build_object(
        'changed_field', _trigger_field,
        'changed_old', _trigger_old,
        'changed_new', _trigger_new
      );
    END IF;

    BEGIN
      INSERT INTO public.admin_audit_log
        (actor_id, target_user_id, action, field, old_value, new_value, note,
         entity_type, entity_id, metadata)
      VALUES
        (_user_id, _user_id, 'intent_recomputed', 'signup_intent',
         _prev, _next,
         COALESCE(
           'Automatic re-evaluation via database trigger (' || _trigger_source || ')',
           'Automatic re-evaluation via database trigger'),
         _trigger_entity_type, _trigger_entity_id, _meta);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END;
$function$;

-- Profile seller_type change: capture old/new seller_type.
CREATE OR REPLACE FUNCTION public.trg_profiles_recompute_intent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_signup_intent(
      NEW.id,
      'profile_insert',
      'seller_type', NULL, NEW.seller_type,
      'profile', NEW.id::text
    );
  ELSIF NEW.seller_type IS DISTINCT FROM OLD.seller_type THEN
    PERFORM public.recompute_signup_intent(
      NEW.id,
      'seller_type_changed',
      'seller_type', OLD.seller_type, NEW.seller_type,
      'profile', NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Business ownership changes: capture which business drove it.
CREATE OR REPLACE FUNCTION public.trg_businesses_recompute_intent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_signup_intent(
      NEW.owner_id,
      'business_added',
      'owns_business', 'false', 'true',
      'business', NEW.id::text
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_signup_intent(
      OLD.owner_id,
      'business_removed',
      'owns_business', 'true', 'false',
      'business', OLD.id::text
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      PERFORM public.recompute_signup_intent(
        OLD.owner_id,
        'business_owner_changed',
        'owns_business', 'true', 'false',
        'business', OLD.id::text
      );
      PERFORM public.recompute_signup_intent(
        NEW.owner_id,
        'business_owner_changed',
        'owns_business', 'false', 'true',
        'business', NEW.id::text
      );
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Partner program referral changes: capture the referral code that drove it.
CREATE OR REPLACE FUNCTION public.trg_partners_recompute_intent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _code text;
  _uid uuid;
  _src text;
  _old_code text;
  _new_code text;
BEGIN
  _code := COALESCE(NEW.referral_code, OLD.referral_code);
  IF _code IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    _src := 'partner_added';
    _old_code := NULL;
    _new_code := NEW.referral_code;
  ELSIF TG_OP = 'DELETE' THEN
    _src := 'partner_removed';
    _old_code := OLD.referral_code;
    _new_code := NULL;
  ELSE
    _src := 'partner_updated';
    _old_code := OLD.referral_code;
    _new_code := NEW.referral_code;
  END IF;

  FOR _uid IN
    SELECT user_id FROM public.user_referrals
     WHERE credited_referral_code = _code OR first_referral_code = _code
  LOOP
    PERFORM public.recompute_signup_intent(
      _uid,
      _src,
      'referral_code', _old_code, _new_code,
      'partner_program_partner', COALESCE(NEW.id, OLD.id)::text
    );
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$function$;


-- ============================================================================
-- SOURCE MIGRATION: 20260706053153_e5511901-f040-4b61-b703-264d0911ac16.sql
-- ============================================================================

ALTER TABLE public.sales_rep_profiles
  ADD COLUMN IF NOT EXISTS commission_rate_override numeric NULL
  CHECK (commission_rate_override IS NULL OR (commission_rate_override >= 0 AND commission_rate_override <= 1));

INSERT INTO public.site_settings (key, value, label, description)
VALUES (
  'sales_rep_commission_rate',
  '0.10',
  'Sales rep default commission rate',
  'Default commission rate applied to sales-rep-attributed revenue when no per-rep override is set. Value is a decimal fraction (e.g. 0.10 = 10%).'
)
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260706054357_10431f45-ac66-46e5-a269-94edb188c7ea.sql
-- ============================================================================

-- Helper: auto-populate a rep's territory from their profile signup area.
-- Safe to call any time; no-op if they already have any territory or no signup area.
CREATE OR REPLACE FUNCTION public.auto_setup_sales_rep_territory(_rep_user_id uuid)
RETURNS TABLE(added boolean, region text, province text, city text, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_region text;
  v_city text;
  v_existing int;
BEGIN
  SELECT COUNT(*) INTO v_existing
  FROM public.sales_rep_territories
  WHERE rep_user_id = _rep_user_id;

  IF v_existing > 0 THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, 'already_has_territories'::text;
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(TRIM(signup_region), ''), NULLIF(TRIM(business_region), '')),
         COALESCE(NULLIF(TRIM(signup_city), ''),   NULLIF(TRIM(business_city), ''))
    INTO v_region, v_city
  FROM public.profiles
  WHERE id = _rep_user_id;

  IF v_region IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, 'no_signup_area'::text;
    RETURN;
  END IF;

  INSERT INTO public.sales_rep_territories (rep_user_id, region, province, city, is_primary)
  VALUES (_rep_user_id, v_region, NULL, v_city, true);

  RETURN QUERY SELECT true, v_region, NULL::text, v_city, 'inserted'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_setup_sales_rep_territory(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_setup_sales_rep_territory(uuid) TO authenticated, service_role;

-- Trigger: when a user gains the 'sales' role, auto-setup their territory.
CREATE OR REPLACE FUNCTION public.trg_auto_setup_sales_rep_territory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'sales' THEN
    PERFORM public.auto_setup_sales_rep_territory(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_setup_sales_rep_territory_on_role ON public.user_roles;
CREATE TRIGGER trg_auto_setup_sales_rep_territory_on_role
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_setup_sales_rep_territory();
