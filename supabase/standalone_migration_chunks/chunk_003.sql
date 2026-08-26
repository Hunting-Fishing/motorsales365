
-- ============================================================================
-- SOURCE MIGRATION: 20260606160435_8e863801-e6fe-4c68-a13d-6b55b72594f8.sql
-- ============================================================================
ALTER TABLE public.business_tags ADD COLUMN IF NOT EXISTS description text;

UPDATE public.business_tags SET description = 'Patching a punctured tire by heat-bonding a rubber patch from the inside.' WHERE slug = 'tire-vulcanizing';
UPDATE public.business_tags SET description = 'Patching a punctured tire by heat-bonding a rubber patch from the inside.' WHERE slug = 'rs-tire-vulcanizing';
UPDATE public.business_tags SET description = 'Sealing punctures and minor tire damage with patches or plugs.' WHERE slug = 'tire-repair-patch';
UPDATE public.business_tags SET description = 'Sealing punctures and minor tire damage with patches or plugs.' WHERE slug = 'rs-tire-repair-patch';
UPDATE public.business_tags SET description = 'Installing tires on rims and balancing them for a smooth, vibration-free ride.' WHERE slug = 'tire-mount-balance-ts';
UPDATE public.business_tags SET description = 'Adjusting wheel angles so tires wear evenly and the vehicle tracks straight.' WHERE slug = 'ts-alignment';
UPDATE public.business_tags SET description = 'Balancing wheel-tire assemblies to eliminate vibrations at speed.' WHERE slug = 'ts-wheel-balancing';
UPDATE public.business_tags SET description = 'Tire Pressure Monitoring System — servicing sensors that warn of low tire pressure.' WHERE slug = 'ts-tpms';
UPDATE public.business_tags SET description = 'Repairing bent, cracked, or scraped alloy / mag wheels.' WHERE slug = 'mag-wheel-repair';
UPDATE public.business_tags SET description = 'Periodic swapping of tire positions to promote even tread wear.' WHERE slug = 'tire-rotation';
UPDATE public.business_tags SET description = 'Inflating tires with nitrogen for more stable pressure and slower leakage.' WHERE slug = 'tire-nitrogen';
UPDATE public.business_tags SET description = 'Converting spoked or tubed wheels to tubeless for easier maintenance.' WHERE slug = 'tire-tubeless-conversion';
UPDATE public.business_tags SET description = 'On-site tire assistance when you get a flat away from the shop.' WHERE slug = 'tire-flat-roadside';
UPDATE public.business_tags SET description = 'Applying new tread to a worn tire casing to extend service life.' WHERE slug = 'tire-recap-retread';
UPDATE public.business_tags SET description = 'New passenger, SUV, truck, and motorcycle tires in stock.' WHERE slug = 'inv-tire-new';
UPDATE public.business_tags SET description = 'Pre-owned tires inspected for safety and remaining tread depth.' WHERE slug = 'inv-tire-used';
UPDATE public.business_tags SET description = 'Alloy and steel rims, including custom-fit options for various vehicles.' WHERE slug = 'inv-tire-mags';
UPDATE public.business_tags SET description = 'Available around the clock for emergency tire repairs and blowouts.' WHERE slug = 'tire-24-7';
UPDATE public.business_tags SET description = 'Tire technician comes to your home, office, or roadside location.' WHERE slug = 'tire-mobile-service';
UPDATE public.business_tags SET description = 'Air-conditioning repair, recharge, and leak detection for vehicles.' WHERE slug = 'aircon';
UPDATE public.business_tags SET description = 'Scheduled engine oil and filter change to keep the motor running clean.' WHERE slug = 'oil-change';
UPDATE public.business_tags SET description = 'Collision repair, dent removal, and respray to restore vehicle appearance.' WHERE slug = 'body-paint';
UPDATE public.business_tags SET description = 'Deep interior and exterior cleaning, polishing, and paint protection.' WHERE slug = 'detailing';
UPDATE public.business_tags SET description = 'Battery, alternator, wiring, and electronic diagnostics and repair.' WHERE slug = 'electrical';
UPDATE public.business_tags SET description = 'Restoring worn brake pads, discs, and hydraulic components for safe stopping.' WHERE slug = 'brakes';
UPDATE public.business_tags SET description = 'Computerized scanning to identify engine, transmission, and system faults.' WHERE slug = 'diagnostics';
UPDATE public.business_tags SET description = 'Transmission, differential, and drive axle service and repair.' WHERE slug = 'drivetrain';
UPDATE public.business_tags SET description = 'Engine overhaul, timing, and cooling system maintenance.' WHERE slug = 'engine';
UPDATE public.business_tags SET description = 'Radiator, coolant, and thermostat repairs to prevent overheating.' WHERE slug = 'cooling';
UPDATE public.business_tags SET description = 'Shocks, struts, and steering linkage inspection and replacement.' WHERE slug = 'suspension';
UPDATE public.business_tags SET description = 'Heater, A/C compressor, and climate control repairs.' WHERE slug = 'climate';
UPDATE public.business_tags SET description = 'Muffler, catalytic converter, and exhaust pipe repair or replacement.' WHERE slug = 'exhaust';
UPDATE public.business_tags SET description = 'Automated or hand car wash services.' WHERE slug = 'wash';
UPDATE public.business_tags SET description = 'Paint correction, ceramic coating, and protective film application.' WHERE slug = 'paint';
UPDATE public.business_tags SET description = 'Dent removal, panel beating, and structural body repair.' WHERE slug = 'body';
UPDATE public.business_tags SET description = 'Windshield and window repair or replacement.' WHERE slug = 'glass';
UPDATE public.business_tags SET description = 'Services delivered at your location rather than at the shop.' WHERE slug = 'mobile';
UPDATE public.business_tags SET description = 'Towing, jump-starts, and emergency assistance when stranded.' WHERE slug = 'roadside';
UPDATE public.business_tags SET description = 'Pre-purchase or annual roadworthiness and safety inspection.' WHERE slug = 'inspection';
UPDATE public.business_tags SET description = 'ECU tuning, turbo, intake, and performance upgrades.' WHERE slug = 'performance';
UPDATE public.business_tags SET description = 'Niche or specialized repairs for classic, luxury, or modified vehicles.' WHERE slug = 'specialty';
UPDATE public.business_tags SET description = 'Original Equipment Manufacturer parts — genuine factory components.' WHERE slug = 'oem-parts';
UPDATE public.business_tags SET description = 'Third-party replacement and upgrade parts at various price points.' WHERE slug = 'aftermarket';
UPDATE public.business_tags SET description = 'Vehicle batteries for cars, SUVs, trucks, and motorcycles.' WHERE slug = 'batteries';
UPDATE public.business_tags SET description = 'Interior and exterior accessories, add-ons, and styling parts.' WHERE slug = 'accessories';
UPDATE public.business_tags SET description = 'Flatbed truck transport for damaged or non-running vehicles.' WHERE slug = 'flatbed';
UPDATE public.business_tags SET description = 'Towing for buses, trucks, and heavy commercial equipment.' WHERE slug = 'heavy-duty';
UPDATE public.business_tags SET description = 'Towing and roadside assistance specifically for motorcycles.' WHERE slug = 'motorcycle-towing';
UPDATE public.business_tags SET description = 'Compulsory Third Party Liability insurance — legally required coverage.' WHERE slug = 'ctpl';
UPDATE public.business_tags SET description = 'Full vehicle insurance covering theft, collision, and Acts of God.' WHERE slug = 'comprehensive';
UPDATE public.business_tags SET description = 'Insurance packages tailored for motorcycles and scooters.' WHERE slug = 'motorcycle-insurance';
UPDATE public.business_tags SET description = 'Open 24 hours a day, 7 days a week.' WHERE slug = '24-7';
UPDATE public.business_tags SET description = 'Technician or service team comes to your location.' WHERE slug = 'home-service';
UPDATE public.business_tags SET description = 'Service or parts backed by a manufacturer or shop warranty.' WHERE slug = 'warranty';
UPDATE public.business_tags SET description = 'Accepts credit cards, debit cards, or digital wallets.' WHERE slug = 'cashless';
UPDATE public.business_tags SET description = 'Pre-owned cars, trucks, SUVs, and vans inspected for resale.' WHERE slug = 'used';
UPDATE public.business_tags SET description = 'Brand-new vehicles straight from the manufacturer or distributor.' WHERE slug = 'new';
UPDATE public.business_tags SET description = 'Standard unleaded gasoline with 91 octane rating.' WHERE slug = 'fuel-gas-91';
UPDATE public.business_tags SET description = 'Premium unleaded gasoline with 95 octane rating.' WHERE slug = 'fuel-gas-95';
UPDATE public.business_tags SET description = 'High-octane unleaded gasoline with 97 rating for performance engines.' WHERE slug = 'fuel-gas-97';
UPDATE public.business_tags SET description = 'Top-tier unleaded gasoline with 100 octane for high-compression engines.' WHERE slug = 'fuel-gas-100';
UPDATE public.business_tags SET description = 'Standard diesel fuel for cars, SUVs, and commercial vehicles.' WHERE slug = 'fuel-diesel';
UPDATE public.business_tags SET description = 'Cleaner-burning premium diesel meeting Euro 5 emission standards.' WHERE slug = 'fuel-diesel-euro5';
UPDATE public.business_tags SET description = 'Diesel blended with 5% biodiesel for reduced emissions.' WHERE slug = 'fuel-biodiesel-b5';
UPDATE public.business_tags SET description = 'Gasoline blended with 10% ethanol — common eco-fuel option.' WHERE slug = 'fuel-e10';
UPDATE public.business_tags SET description = 'Kerosene for heaters, lamps, and certain commercial engines.' WHERE slug = 'fuel-kerosene';
UPDATE public.business_tags SET description = 'Aviation gasoline for light aircraft and aeroclub use.' WHERE slug = 'fuel-avgas';
UPDATE public.business_tags SET description = 'Liquefied Petroleum Gas — alternative fuel for LPG-converted vehicles.' WHERE slug = 'fuel-autogas-lpg';
UPDATE public.business_tags SET description = 'Compressed Natural Gas — cleaner-burning alternative fuel.' WHERE slug = 'fuel-cng';
UPDATE public.business_tags SET description = 'Standard AC charging socket for electric vehicles.' WHERE slug = 'ev-type2-ac';
UPDATE public.business_tags SET description = 'Combined Charging System 2 — fast DC charging for EVs.' WHERE slug = 'ev-ccs2-dc';
UPDATE public.business_tags SET description = 'Japanese-standard fast DC charging socket for EVs.' WHERE slug = 'ev-chademo';
UPDATE public.business_tags SET description = 'Tesla / North American Charging Standard fast DC connector.' WHERE slug = 'ev-tesla-nacs';
UPDATE public.business_tags SET description = '7 kilowatt AC charger — typical home or office wallbox speed.' WHERE slug = 'ev-7kw';
UPDATE public.business_tags SET description = '22 kilowatt AC charger — fast three-phase workplace charging.' WHERE slug = 'ev-22kw';
UPDATE public.business_tags SET description = '50 kilowatt DC fast charger — highway and commercial stop speeds.' WHERE slug = 'ev-50kw';
UPDATE public.business_tags SET description = '150+ kilowatt ultra-fast DC charger — quickest public EV charging.' WHERE slug = 'ev-150kw-plus';
UPDATE public.business_tags SET description = 'EV chargers accessible any time of day or night.' WHERE slug = 'ev-24-7-charging';


-- ============================================================================
-- SOURCE MIGRATION: 20260607011511_9237f748-0bd6-4f28-a805-5d1cbd92e9a4.sql
-- ============================================================================
ALTER TABLE public.shop_product_fitment
  ADD COLUMN IF NOT EXISTS transmission text;

CREATE INDEX IF NOT EXISTS idx_fitment_transmission
  ON public.shop_product_fitment (transmission)
  WHERE transmission IS NOT NULL;

WITH parent AS (SELECT id FROM public.shop_categories WHERE slug = 'hand-tools')
INSERT INTO public.shop_categories (slug, name, description, parent_id, sort_order, active, department_slug)
SELECT v.slug, v.name, v.description, parent.id, v.sort_order, true, 'tools-garage'
FROM parent, (VALUES
  ('hand-tools-general',       'General Hand Tools',           'Wrenches, sockets, screwdrivers, pliers, hammers and everyday mechanic basics.', 10),
  ('hand-tools-engine',        'Engine Tools',                 'Timing tools, valve spring compressors, piston ring tools, cylinder hones, compression testers.', 20),
  ('hand-tools-transmission',  'Transmission Tools',           'Clutch alignment kits, snap-ring pliers, bearing pullers, transmission jacks and gearbox specialty tools.', 30),
  ('hand-tools-drivetrain',    'Drivetrain & Axle Tools',      'CV joint tools, axle-nut sockets, differential tools, U-joint presses.', 40),
  ('hand-tools-hvac',          'Heat & A/C Tools',             'Refrigerant manifold gauges, vacuum pumps, leak detectors, flaring & swaging tools.', 50),
  ('hand-tools-brakes',        'Brake & Suspension Tools',     'Brake bleeders, caliper wind-back tools, ball-joint separators, spring compressors.', 60),
  ('hand-tools-electrical',    'Electrical & Diagnostic Hand Tools', 'Multimeters, test lights, wire strippers, crimpers, soldering.', 70),
  ('hand-tools-body',          'Body & Trim Tools',            'Trim removers, panel pullers, dent pullers, plastic pry tools.', 80),
  ('hand-tools-specialty',     'Specialty / OEM Tools',        'Manufacturer-specific service tools — Toyota SST, Honda, BMW, Ford, etc.', 90)
) AS v(slug, name, description, sort_order)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260607014744_58bd8014-ca74-40d7-b9d9-c61666f826c3.sql
-- ============================================================================
ALTER TABLE public.ops_alerts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ops_alerts;


-- ============================================================================
-- SOURCE MIGRATION: 20260607020200_fae52826-6c9c-4e04-8c63-078b3a5bdda2.sql
-- ============================================================================

CREATE TABLE public.business_location_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  proposed_lat numeric NOT NULL,
  proposed_lng numeric NOT NULL,
  previous_lat numeric,
  previous_lng numeric,
  note text,
  submitter_user_id uuid,
  submitter_ip text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','reverted')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loc_lat_range CHECK (proposed_lat BETWEEN -90 AND 90),
  CONSTRAINT loc_lng_range CHECK (proposed_lng BETWEEN -180 AND 180),
  CONSTRAINT loc_note_len CHECK (note IS NULL OR char_length(note) <= 300)
);

CREATE INDEX idx_blc_status_created ON public.business_location_corrections (status, created_at DESC);
CREATE INDEX idx_blc_business ON public.business_location_corrections (business_id);
CREATE INDEX idx_blc_submitter ON public.business_location_corrections (submitter_user_id);

GRANT SELECT, INSERT ON public.business_location_corrections TO anon;
GRANT SELECT, INSERT ON public.business_location_corrections TO authenticated;
GRANT ALL ON public.business_location_corrections TO service_role;

ALTER TABLE public.business_location_corrections ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) may submit a suggestion
CREATE POLICY "Anyone can submit location corrections"
  ON public.business_location_corrections
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Submitters can see their own suggestions
CREATE POLICY "Submitters read own corrections"
  ON public.business_location_corrections
  FOR SELECT
  TO authenticated
  USING (submitter_user_id = auth.uid());

-- Admins / moderators can see and update everything
CREATE POLICY "Moderators read all corrections"
  ON public.business_location_corrections
  FOR SELECT
  TO authenticated
  USING (public.can_moderate(auth.uid()));

CREATE POLICY "Moderators update corrections"
  ON public.business_location_corrections
  FOR UPDATE
  TO authenticated
  USING (public.can_moderate(auth.uid()))
  WITH CHECK (public.can_moderate(auth.uid()));

CREATE TRIGGER trg_blc_updated_at
  BEFORE UPDATE ON public.business_location_corrections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.business_location_corrections REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_location_corrections;


-- ============================================================================
-- SOURCE MIGRATION: 20260607053342_aace8b5d-2b64-45f3-be02-9fc21d6794d5.sql
-- ============================================================================

-- 1) Allow direct approve/reject from a brand-new inquiry
CREATE OR REPLACE FUNCTION public.enforce_ad_inquiry_status_transitions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean := has_role(uid, 'admin'::app_role);
  old_s text;
  new_s text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF is_admin THEN RETURN NEW; END IF;

  old_s := OLD.status::text;
  new_s := NEW.status::text;

  IF NOT (
    (old_s = 'new'       AND new_s IN ('in_review','spam','won','lost')) OR
    (old_s = 'in_review' AND new_s IN ('quoted','lost','won','spam')) OR
    (old_s = 'quoted'    AND new_s IN ('won','lost'))
  ) THEN
    RAISE EXCEPTION 'Invalid ad inquiry status transition: % -> %', old_s, new_s;
  END IF;
  RETURN NEW;
END $function$;

-- 2) Email the sponsor when a decision is made
CREATE OR REPLACE FUNCTION public.tg_notify_ad_inquiry_decision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tpl text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status::text = 'won' THEN
    tpl := 'ad-inquiry-approved';
  ELSIF NEW.status::text = 'lost' THEN
    tpl := 'ad-inquiry-rejected';
  ELSE
    RETURN NEW;
  END IF;

  IF NEW.email IS NULL OR length(btrim(NEW.email)) = 0 THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', tpl,
    'to', NEW.email,
    'data', jsonb_build_object(
      'contact_name', NEW.contact_name,
      'company', COALESCE(NEW.company, ''),
      'placement', NEW.placement::text,
      'inquiry_id', NEW.id
    )
  ));
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_notify_ad_inquiry_decision ON public.ad_inquiries;
CREATE TRIGGER trg_notify_ad_inquiry_decision
AFTER UPDATE OF status ON public.ad_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.tg_notify_ad_inquiry_decision();


-- ============================================================================
-- SOURCE MIGRATION: 20260607053704_3150cd92-bbb6-44c9-8cbe-be001d44d257.sql
-- ============================================================================

-- Allow lost -> new transition for resubmissions
CREATE OR REPLACE FUNCTION public.enforce_ad_inquiry_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean := has_role(uid, 'admin'::app_role);
  old_s text;
  new_s text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF is_admin THEN RETURN NEW; END IF;

  old_s := OLD.status::text;
  new_s := NEW.status::text;

  IF NOT (
    (old_s = 'new'       AND new_s IN ('in_review','spam','won','lost')) OR
    (old_s = 'in_review' AND new_s IN ('quoted','lost','won','spam')) OR
    (old_s = 'quoted'    AND new_s IN ('won','lost')) OR
    (old_s = 'lost'      AND new_s = 'new')
  ) THEN
    RAISE EXCEPTION 'Invalid ad inquiry status transition: % -> %', old_s, new_s;
  END IF;
  RETURN NEW;
END
$$;

-- Protect admin-only fields when a non-admin submitter edits their inquiry
CREATE OR REPLACE FUNCTION public.protect_ad_inquiry_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN NEW; END IF;
  IF can_manage_ads(uid) OR has_role(uid, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  -- Non-admin submitter: lock down admin/system columns
  NEW.assigned_to := OLD.assigned_to;
  NEW.internal_notes := OLD.internal_notes;
  NEW.submitter_user_id := OLD.submitter_user_id;
  NEW.email := OLD.email;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_protect_ad_inquiry_admin_fields ON public.ad_inquiries;
CREATE TRIGGER trg_protect_ad_inquiry_admin_fields
BEFORE UPDATE ON public.ad_inquiries
FOR EACH ROW EXECUTE FUNCTION public.protect_ad_inquiry_admin_fields();

-- RLS: allow sponsor to update their own rejected inquiry, resetting status to new
CREATE POLICY "Submitter resubmits own rejected inquiry"
ON public.ad_inquiries
FOR UPDATE
TO authenticated
USING (
  submitter_user_id IS NOT NULL
  AND submitter_user_id = auth.uid()
  AND status = 'lost'::ad_inquiry_status
)
WITH CHECK (
  submitter_user_id = auth.uid()
  AND status = 'new'::ad_inquiry_status
);


-- ============================================================================
-- SOURCE MIGRATION: 20260607054023_e316b1f5-445d-4577-b115-5d5ed320508b.sql
-- ============================================================================

-- 1. Schema additions
ALTER TABLE public.ad_inquiries
  ADD COLUMN IF NOT EXISTS last_rejection_reason text;

ALTER TABLE public.ad_inquiry_audit
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Allow sponsors to read their own audit trail
GRANT SELECT ON public.ad_inquiry_audit TO authenticated;

DROP POLICY IF EXISTS "Submitter reads own audit" ON public.ad_inquiry_audit;
CREATE POLICY "Submitter reads own audit"
ON public.ad_inquiry_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ad_inquiries i
    WHERE i.id = ad_inquiry_audit.inquiry_id
      AND (
        i.submitter_user_id = auth.uid()
        OR lower(i.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
  )
);

-- 3. Expanded audit trigger with semantic actions + edited field tracking
CREATE OR REPLACE FUNCTION public.tg_audit_ad_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_name text;
  changed_fields text[] := ARRAY[]::text[];
  meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, to_value)
      VALUES (NEW.id, NEW.submitter_user_id, 'created', NEW.status::text);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      action_name := CASE
        WHEN NEW.status::text = 'won' THEN 'approved'
        WHEN NEW.status::text = 'lost' THEN 'rejected'
        WHEN OLD.status::text = 'lost' AND NEW.status::text = 'new' THEN 'resubmitted'
        ELSE 'status_changed'
      END;
      meta := '{}'::jsonb;
      IF action_name = 'rejected' AND NEW.last_rejection_reason IS NOT NULL THEN
        meta := jsonb_build_object('reason', NEW.last_rejection_reason);
      END IF;
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value, metadata)
        VALUES (NEW.id, auth.uid(), action_name, OLD.status::text, NEW.status::text, meta);
    END IF;

    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value)
        VALUES (NEW.id, auth.uid(), 'assigned',
                COALESCE(OLD.assigned_to::text,''), COALESCE(NEW.assigned_to::text,''));
    END IF;

    IF COALESCE(NEW.internal_notes,'') IS DISTINCT FROM COALESCE(OLD.internal_notes,'') THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action)
        VALUES (NEW.id, auth.uid(), 'notes_updated');
    END IF;

    -- Track sponsor edits to user-visible fields
    IF NEW.contact_name IS DISTINCT FROM OLD.contact_name THEN changed_fields := changed_fields || 'contact_name'; END IF;
    IF COALESCE(NEW.company,'') IS DISTINCT FROM COALESCE(OLD.company,'') THEN changed_fields := changed_fields || 'company'; END IF;
    IF COALESCE(NEW.phone,'') IS DISTINCT FROM COALESCE(OLD.phone,'') THEN changed_fields := changed_fields || 'phone'; END IF;
    IF NEW.placement IS DISTINCT FROM OLD.placement THEN changed_fields := changed_fields || 'placement'; END IF;
    IF COALESCE(NEW.budget_range,'') IS DISTINCT FROM COALESCE(OLD.budget_range,'') THEN changed_fields := changed_fields || 'budget_range'; END IF;
    IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN changed_fields := changed_fields || 'start_date'; END IF;
    IF NEW.message IS DISTINCT FROM OLD.message THEN changed_fields := changed_fields || 'message'; END IF;

    IF array_length(changed_fields, 1) > 0 THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, metadata)
        VALUES (NEW.id, auth.uid(), 'edited',
                jsonb_build_object('fields', to_jsonb(changed_fields)));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Lock down last_rejection_reason from non-admin updates
CREATE OR REPLACE FUNCTION public.protect_ad_inquiry_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN NEW; END IF;
  IF can_manage_ads(uid) OR has_role(uid, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  -- Non-admin submitter: lock down admin/system columns
  NEW.assigned_to := OLD.assigned_to;
  NEW.internal_notes := OLD.internal_notes;
  NEW.submitter_user_id := OLD.submitter_user_id;
  NEW.email := OLD.email;
  NEW.created_at := OLD.created_at;
  NEW.last_rejection_reason := OLD.last_rejection_reason;
  RETURN NEW;
END
$$;

-- 5. Include reason in rejection email payload
CREATE OR REPLACE FUNCTION public.tg_notify_ad_inquiry_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tpl text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status::text = 'won' THEN
    tpl := 'ad-inquiry-approved';
  ELSIF NEW.status::text = 'lost' THEN
    tpl := 'ad-inquiry-rejected';
  ELSE
    RETURN NEW;
  END IF;

  IF NEW.email IS NULL OR length(btrim(NEW.email)) = 0 THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', tpl,
    'to', NEW.email,
    'data', jsonb_build_object(
      'contact_name', NEW.contact_name,
      'company', COALESCE(NEW.company, ''),
      'placement', NEW.placement::text,
      'inquiry_id', NEW.id,
      'reason', COALESCE(NEW.last_rejection_reason, '')
    )
  ));
  RETURN NEW;
END
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260607054410_89bd86ee-7fca-4ea2-8d6c-0e6a906d4030.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tg_audit_ad_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_name text;
  changes jsonb := '{}'::jsonb;
  meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, to_value)
      VALUES (NEW.id, NEW.submitter_user_id, 'created', NEW.status::text);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      action_name := CASE
        WHEN NEW.status::text = 'won' THEN 'approved'
        WHEN NEW.status::text = 'lost' THEN 'rejected'
        WHEN OLD.status::text = 'lost' AND NEW.status::text = 'new' THEN 'resubmitted'
        ELSE 'status_changed'
      END;
      meta := '{}'::jsonb;
      IF action_name = 'rejected' AND NEW.last_rejection_reason IS NOT NULL THEN
        meta := jsonb_build_object('reason', NEW.last_rejection_reason);
      END IF;
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value, metadata)
        VALUES (NEW.id, auth.uid(), action_name, OLD.status::text, NEW.status::text, meta);
    END IF;

    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value)
        VALUES (NEW.id, auth.uid(), 'assigned',
                COALESCE(OLD.assigned_to::text,''), COALESCE(NEW.assigned_to::text,''));
    END IF;

    IF COALESCE(NEW.internal_notes,'') IS DISTINCT FROM COALESCE(OLD.internal_notes,'') THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action)
        VALUES (NEW.id, auth.uid(), 'notes_updated');
    END IF;

    -- Per-field before/after diff for sponsor-visible fields
    IF NEW.contact_name IS DISTINCT FROM OLD.contact_name THEN
      changes := changes || jsonb_build_object('contact_name', jsonb_build_object('from', OLD.contact_name, 'to', NEW.contact_name));
    END IF;
    IF COALESCE(NEW.company,'') IS DISTINCT FROM COALESCE(OLD.company,'') THEN
      changes := changes || jsonb_build_object('company', jsonb_build_object('from', OLD.company, 'to', NEW.company));
    END IF;
    IF COALESCE(NEW.phone,'') IS DISTINCT FROM COALESCE(OLD.phone,'') THEN
      changes := changes || jsonb_build_object('phone', jsonb_build_object('from', OLD.phone, 'to', NEW.phone));
    END IF;
    IF NEW.placement IS DISTINCT FROM OLD.placement THEN
      changes := changes || jsonb_build_object('placement', jsonb_build_object('from', OLD.placement::text, 'to', NEW.placement::text));
    END IF;
    IF COALESCE(NEW.budget_range,'') IS DISTINCT FROM COALESCE(OLD.budget_range,'') THEN
      changes := changes || jsonb_build_object('budget_range', jsonb_build_object('from', OLD.budget_range, 'to', NEW.budget_range));
    END IF;
    IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN
      changes := changes || jsonb_build_object('start_date', jsonb_build_object('from', OLD.start_date::text, 'to', NEW.start_date::text));
    END IF;
    IF NEW.message IS DISTINCT FROM OLD.message THEN
      changes := changes || jsonb_build_object('message', jsonb_build_object('from', OLD.message, 'to', NEW.message));
    END IF;

    IF changes <> '{}'::jsonb THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, metadata)
        VALUES (NEW.id, auth.uid(), 'edited', jsonb_build_object('changes', changes));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260607055051_b92fd447-fac7-450f-ba0a-d924f986fab3.sql
-- ============================================================================
-- Add learn_rail enum value
ALTER TYPE public.ad_placement ADD VALUE IF NOT EXISTS 'learn_rail';

-- Add structured columns to ad_inquiries
ALTER TABLE public.ad_inquiries
  ADD COLUMN IF NOT EXISTS sections text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS formats text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_url text,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS duration_days int,
  ADD COLUMN IF NOT EXISTS creative_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audience_notes text;

-- Backfill: copy placement into sections for old rows
UPDATE public.ad_inquiries
SET sections = ARRAY[placement::text]
WHERE (sections IS NULL OR cardinality(sections) = 0) AND placement IS NOT NULL;

-- Extend the audit trigger to include new fields in the per-field diff
CREATE OR REPLACE FUNCTION public.tg_audit_ad_inquiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_actor uuid := auth.uid();
  v_changes jsonb := '{}'::jsonb;
  v_meta jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ad_inquiry_audit (inquiry_id, actor_id, action, metadata)
    VALUES (NEW.id, v_actor, 'created', jsonb_build_object('status', NEW.status));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Status transitions get semantic actions
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'won' THEN
        v_action := 'approved';
      ELSIF NEW.status = 'lost' THEN
        v_action := 'rejected';
        v_meta := jsonb_build_object('reason', NEW.last_rejection_reason);
      ELSIF OLD.status = 'lost' AND NEW.status = 'new' THEN
        v_action := 'resubmitted';
      ELSE
        v_action := 'status_changed';
        v_meta := jsonb_build_object('from', OLD.status, 'to', NEW.status);
      END IF;

      INSERT INTO public.ad_inquiry_audit (inquiry_id, actor_id, action, metadata)
      VALUES (NEW.id, v_actor, v_action, v_meta);
    END IF;

    -- Per-field edits
    IF NEW.contact_name IS DISTINCT FROM OLD.contact_name THEN
      v_changes := v_changes || jsonb_build_object('contact_name', jsonb_build_object('from', OLD.contact_name, 'to', NEW.contact_name));
    END IF;
    IF NEW.company IS DISTINCT FROM OLD.company THEN
      v_changes := v_changes || jsonb_build_object('company', jsonb_build_object('from', OLD.company, 'to', NEW.company));
    END IF;
    IF NEW.phone IS DISTINCT FROM OLD.phone THEN
      v_changes := v_changes || jsonb_build_object('phone', jsonb_build_object('from', OLD.phone, 'to', NEW.phone));
    END IF;
    IF NEW.placement IS DISTINCT FROM OLD.placement THEN
      v_changes := v_changes || jsonb_build_object('placement', jsonb_build_object('from', OLD.placement, 'to', NEW.placement));
    END IF;
    IF NEW.budget_range IS DISTINCT FROM OLD.budget_range THEN
      v_changes := v_changes || jsonb_build_object('budget_range', jsonb_build_object('from', OLD.budget_range, 'to', NEW.budget_range));
    END IF;
    IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN
      v_changes := v_changes || jsonb_build_object('start_date', jsonb_build_object('from', OLD.start_date, 'to', NEW.start_date));
    END IF;
    IF NEW.end_date IS DISTINCT FROM OLD.end_date THEN
      v_changes := v_changes || jsonb_build_object('end_date', jsonb_build_object('from', OLD.end_date, 'to', NEW.end_date));
    END IF;
    IF NEW.duration_days IS DISTINCT FROM OLD.duration_days THEN
      v_changes := v_changes || jsonb_build_object('duration_days', jsonb_build_object('from', OLD.duration_days, 'to', NEW.duration_days));
    END IF;
    IF NEW.target_url IS DISTINCT FROM OLD.target_url THEN
      v_changes := v_changes || jsonb_build_object('target_url', jsonb_build_object('from', OLD.target_url, 'to', NEW.target_url));
    END IF;
    IF NEW.creative_ready IS DISTINCT FROM OLD.creative_ready THEN
      v_changes := v_changes || jsonb_build_object('creative_ready', jsonb_build_object('from', OLD.creative_ready, 'to', NEW.creative_ready));
    END IF;
    IF NEW.audience_notes IS DISTINCT FROM OLD.audience_notes THEN
      v_changes := v_changes || jsonb_build_object('audience_notes', jsonb_build_object('from', OLD.audience_notes, 'to', NEW.audience_notes));
    END IF;
    IF NEW.sections IS DISTINCT FROM OLD.sections THEN
      v_changes := v_changes || jsonb_build_object('sections', jsonb_build_object('from', to_jsonb(OLD.sections), 'to', to_jsonb(NEW.sections)));
    END IF;
    IF NEW.formats IS DISTINCT FROM OLD.formats THEN
      v_changes := v_changes || jsonb_build_object('formats', jsonb_build_object('from', to_jsonb(OLD.formats), 'to', to_jsonb(NEW.formats)));
    END IF;
    IF NEW.message IS DISTINCT FROM OLD.message THEN
      v_changes := v_changes || jsonb_build_object('message', jsonb_build_object('from', OLD.message, 'to', NEW.message));
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      v_changes := v_changes || jsonb_build_object('assigned_to', jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to));
    END IF;
    IF NEW.internal_notes IS DISTINCT FROM OLD.internal_notes THEN
      v_changes := v_changes || jsonb_build_object('internal_notes', jsonb_build_object('from', OLD.internal_notes, 'to', NEW.internal_notes));
    END IF;

    IF v_changes <> '{}'::jsonb THEN
      INSERT INTO public.ad_inquiry_audit (inquiry_id, actor_id, action, metadata)
      VALUES (NEW.id, v_actor, 'edited', jsonb_build_object('changes', v_changes));
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260608001625_03d95da2-89a5-4b5a-a475-8712ab4c8e83.sql
-- ============================================================================

-- Security fixes from scanner findings

-- 1) advertisements: drop public-read RLS policy. Public reads happen via
--    the active_ads_public view (which excludes advertiser_email/advertiser_name);
--    ad managers continue to read via their own policy.
DROP POLICY IF EXISTS "Public reads active-ad safe columns" ON public.advertisements;

-- 2) storage.objects: fix broken business-gallery upload policy that referenced
--    b.name (businesses.name column) instead of the storage object's name.
DROP POLICY IF EXISTS "Authenticated upload to business gallery" ON storage.objects;
CREATE POLICY "Authenticated upload to business gallery"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-gallery'
    AND EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id::text = (storage.foldername(storage.objects.name))[1]
        AND (
          b.owner_id = auth.uid()
          OR (b.organization_id IS NOT NULL
              AND public.can_manage_org(auth.uid(), b.organization_id))
        )
    )
  );

-- 3) lead_offer_unlocks: remove user-facing INSERT. Unlock rows are only
--    legitimately created by the server function (which uses the service-role
--    admin client and validates payment + capacity). Removing this policy
--    closes the bypass where a buyer could insert a row directly and then
--    read contact details from lead_offers.
DROP POLICY IF EXISTS "Buyers insert their own unlocks" ON public.lead_offer_unlocks;


-- ============================================================================
-- SOURCE MIGRATION: 20260608030747_4c204071-50ca-49c9-8f66-218b1d165e34.sql
-- ============================================================================
-- Add body-repair tag and promote the 7 core repair service categories to "popular"
-- so they surface as quick-filter chips on submit and browse for repair shops.
INSERT INTO public.business_tags (slug, label, type_slug, is_popular, sort_order)
VALUES ('body-repair', 'Body repair', 'repair_shop', true, 55)
ON CONFLICT (slug) DO UPDATE SET is_popular = EXCLUDED.is_popular, sort_order = EXCLUDED.sort_order;

UPDATE public.business_tags
SET is_popular = true
WHERE slug IN (
  'tire-mount-balance',     -- Tires
  'brake-service',          -- Brakes
  'suspension-service',     -- Suspension
  'engine-overhaul',        -- Engine
  'at-mt-repair',           -- Transmission
  'obd-diagnostics',        -- Diagnostics
  'body-repair'             -- Body repair
);


-- ============================================================================
-- SOURCE MIGRATION: 20260608052614_e12f8038-b3ea-4b0e-8077-31dd60729327.sql
-- ============================================================================

INSERT INTO public.businesses (owner_id, slug, name, type_slug, description, phone, region, province, city, status, source, source_external_id, attribution, photos)
VALUES
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-quezon-auto-repair','[Sample] Quezon Auto Repair','repair_shop','Full-service auto repair shop specializing in Toyota, Honda, and Mitsubishi. Engine diagnostics, transmission, brakes, A/C.','+63 917 555 0101','NCR','Metro Manila','Quezon City','active','seed','seed-biz-01','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-makati-fast-towing','[Sample] Makati Fast Towing','towing','24/7 flatbed and wheel-lift towing across Metro Manila. Roadside assistance, jumpstart, tire change.','+63 917 555 0102','NCR','Metro Manila','Makati','active','seed','seed-biz-02','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-banawe-parts-supply','[Sample] Banawe Parts Supply','parts_accessories','OEM and aftermarket parts for Japanese and Korean cars. Walk-in and nationwide shipping.','+63 917 555 0103','NCR','Metro Manila','Quezon City','active','seed','seed-biz-03','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-pasig-tire-center','[Sample] Pasig Tire Center','tire_shop','New and slightly used tires, alignment, balancing, nitrogen fill. Bridgestone, Yokohama, GT Radial.','+63 917 555 0104','NCR','Metro Manila','Pasig','active','seed','seed-biz-04','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-cebu-shine-detailing','[Sample] Cebu Shine Auto Detailing','carwash','Hand car wash, interior detailing, ceramic coating, paint protection film. Pickup available.','+63 917 555 0105','Region VII','Cebu','Cebu City','active','seed','seed-biz-05','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-mandaluyong-moto-works','[Sample] Mandaluyong Moto Works','motorcycle_shop','Motorcycle parts, accessories, and service. Honda Click, Yamaha NMAX, Kawasaki Rouser.','+63 917 555 0106','NCR','Metro Manila','Mandaluyong','active','seed','seed-biz-06','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-davao-used-cars','[Sample] Davao Used Cars','used_dealership','Quality pre-owned vehicles. Financing assistance, trade-ins accepted, OR/CR clean.','+63 917 555 0107','Region XI','Davao del Sur','Davao City','active','seed','seed-biz-07','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-laoag-body-paint','[Sample] Laoag Body & Paint','body_paint','Collision repair, dent removal, full repaint, plastic bumper restoration. Insurance accredited.','+63 917 555 0108','Region I','Ilocos Norte','Laoag','active','seed','seed-biz-08','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-bgc-battery-hub','[Sample] BGC Battery Hub','battery_shop','Motolite, Amaron, Century batteries. Free installation and old-battery trade-in.','+63 917 555 0109','NCR','Metro Manila','Taguig','active','seed','seed-biz-09','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-alabang-audio-tint','[Sample] Alabang Audio & Tint','audio_tint','Car audio upgrades, dash cams, window tint, alarm systems. Pioneer, Kenwood, 3M.','+63 917 555 0110','NCR','Metro Manila','Muntinlupa','active','seed','seed-biz-10','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-iloilo-salvage-yard','[Sample] Iloilo Salvage Yard','salvage','Used engine, transmission, body parts. Toyota, Mitsubishi, Isuzu specialists.','+63 917 555 0111','Region VI','Iloilo','Iloilo City','active','seed','seed-biz-11','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-manila-driving-academy','[Sample] Manila Driving Academy','driving_school','LTO-accredited driver education. Manual, automatic, motorcycle. Student permit assistance.','+63 917 555 0112','NCR','Metro Manila','Manila','active','seed','seed-biz-12','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-ph-auto-insurance','[Sample] PH Auto Insurance Brokers','insurance','CTPL, comprehensive, and fleet insurance. Multiple providers, instant quotes.','+63 917 555 0113','NCR','Metro Manila','Pasay','active','seed','seed-biz-13','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-easy-auto-loans','[Sample] Easy Auto Loans PH','financing','Car and motorcycle financing. New, used, and refinancing. Bank and in-house options.','+63 917 555 0114','NCR','Metro Manila','Quezon City','active','seed','seed-biz-14','Sample listing','[]');


-- ============================================================================
-- SOURCE MIGRATION: 20260608061836_2d3a4896-bee4-424d-ae82-6c19557df804.sql
-- ============================================================================

ALTER TABLE public.reports
  ALTER COLUMN listing_id DROP NOT NULL,
  ALTER COLUMN reporter_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'listing'
    CHECK (target_type IN ('listing','business','seller','other')),
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_url text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS evidence_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reporter_name text,
  ADD COLUMN IF NOT EXISTS reporter_email text,
  ADD COLUMN IF NOT EXISTS reporter_phone text;

CREATE INDEX IF NOT EXISTS reports_business_id_idx ON public.reports(business_id);
CREATE INDEX IF NOT EXISTS reports_target_type_idx ON public.reports(target_type);

DROP POLICY IF EXISTS "Users create reports" ON public.reports;
CREATE POLICY "Anyone can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (
    (reporter_id IS NULL AND auth.uid() IS NULL)
    OR reporter_id = auth.uid()
  );

GRANT INSERT ON public.reports TO anon;

-- Storage policies for report-evidence bucket
CREATE POLICY "Anyone can upload report evidence"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'report-evidence');

CREATE POLICY "Moderators read report evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-evidence' AND public.can_support(auth.uid()));


-- ============================================================================
-- SOURCE MIGRATION: 20260608065742_3fe92331-464d-4bf6-bbd2-63b243db14a0.sql
-- ============================================================================

-- Seed affiliate Shop products for audit item #10
-- Cleanup: DELETE FROM shop_products WHERE '365-seed' = ANY(tags);

INSERT INTO public.shop_products (slug, title, description, brand, category_id, price_php, tags, image_url, active, featured)
SELECT d.slug, d.title, d.description, d.brand, c.id, d.price_php, d.tags, d.image_url, true, false
FROM (VALUES
  ('seed-obd2-scanner-elm327','OBD2 Scanner (ELM327 Bluetooth)','Plug-and-play OBD2 diagnostic scanner. Works with Torque Pro and most modern cars. Reads and clears check-engine codes.','Generic','diagnostics',499::numeric,ARRAY['365-seed','obd2','diagnostics'],'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800'),
  ('seed-ancel-ad310-scanner','Ancel AD310 OBD2 Code Reader','Classic wired OBD2 scanner. No phone needed — reads engine codes on the built-in screen. Reliable starter tool.','Ancel','diagnostics',1490,ARRAY['365-seed','obd2','diagnostics'],'https://images.unsplash.com/photo-1632823471565-1ec56a3a4af1?w=800'),
  ('seed-dashcam-1080p-front','1080p Dash Cam (Front)','Loop-recording dash cam with night mode and G-sensor. Easy windshield mount. Great evidence for accidents and insurance.','Generic','dashcams',1290,ARRAY['365-seed','dashcam'],'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800'),
  ('seed-dashcam-dual-4k','Dual Channel 4K Dash Cam','Front + rear dash cam with parking mode and WiFi app. Captures both directions in case of rear-end collisions.','Generic','dashcams',3490,ARRAY['365-seed','dashcam'],'https://images.unsplash.com/photo-1597007030739-6d2e7172ee6c?w=800'),
  ('seed-motorcycle-helmet-fullface','Full Face Motorcycle Helmet (DOT)','Full-face helmet with anti-fog visor. DOT-certified. Comfortable padding for long rides.','Generic','jacks-stands',1990,ARRAY['365-seed','motorcycle','safety'],'https://images.unsplash.com/photo-1591637333472-cdbf9b9bda1d?w=800'),
  ('seed-motorcycle-rain-gear','Motorcycle Rain Suit (Jacket + Pants)','2-piece waterproof rain suit for riders. Reflective strips and reinforced seams. Packs into a small pouch.','Generic','jacks-stands',790,ARRAY['365-seed','motorcycle','rain'],'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800'),
  ('seed-led-headlight-h4','LED Headlight Bulbs H4 (Pair)','Plug-and-play LED headlight upgrade. 6000K white. Brighter than halogen, lower power draw.','Generic','lighting',890,ARRAY['365-seed','lighting'],'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800'),
  ('seed-led-light-bar-22in','22" LED Light Bar (Off-road)','Combo beam off-road light bar. Includes wiring harness and switch. For trucks, SUVs, and 4x4 builds.','Generic','lighting',1490,ARRAY['365-seed','lighting','truck'],'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800'),
  ('seed-car-cover-sedan','Universal Car Cover (Sedan)','Waterproof, UV-resistant car cover. Elastic hem for snug fit. Fits most sedans.','Generic','organizers',990,ARRAY['365-seed','exterior'],'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800'),
  ('seed-battery-charger-smart','Smart Car Battery Charger 12V','Automatic 12V battery charger / maintainer. Prevents overcharging. Great for cars left parked.','Generic','workshop-equipment',1290,ARRAY['365-seed','battery'],'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=800'),
  ('seed-jump-starter-portable','Portable Jump Starter (12V Lithium)','Pocket-size lithium jump starter. Doubles as power bank with USB. Starts cars and motorcycles up to 6L gas.','Generic','workshop-equipment',2490,ARRAY['365-seed','battery','emergency'],'https://images.unsplash.com/photo-1626668893632-6f3a4466d22f?w=800'),
  ('seed-tire-inflator-cordless','Cordless Tire Inflator','Rechargeable digital tire inflator with auto-stop. Inflates car, motorcycle, and bicycle tires. LED light included.','Generic','workshop-equipment',1690,ARRAY['365-seed','tire','emergency'],'https://images.unsplash.com/photo-1612831661309-ad6a40b91e34?w=800'),
  ('seed-detailing-kit-starter','Car Detailing Kit (Starter)','Wash mitt, microfiber towels, applicators, and brushes. Everything to start hand-washing and detailing at home.','Generic','microfiber',890,ARRAY['365-seed','detailing'],'https://images.unsplash.com/photo-1605618826115-fb9e1cf09110?w=800'),
  ('seed-ceramic-coating-9h','9H Ceramic Coating Kit','DIY 9H ceramic coating with applicator pad and microfiber. Long-lasting hydrophobic gloss.','Generic','waxes-coatings',1290,ARRAY['365-seed','detailing','coating'],'https://images.unsplash.com/photo-1635770342142-cbe92775eb9b?w=800'),
  ('seed-tool-set-mechanic-120pc','120-Piece Mechanic Tool Set','Sockets, ratchets, screwdrivers, and pliers in a hard case. Solid starter toolkit for home garages.','Generic','hand-tools',2990,ARRAY['365-seed','tools'],'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800'),
  ('seed-phone-mount-magnetic','Magnetic Phone Mount (Vent)','Strong magnetic phone holder that clips to AC vent. One-hand mounting. Works with most phones.','Generic','phone-mounts',290,ARRAY['365-seed','phone'],'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800'),
  ('seed-phone-mount-wireless-charge','Wireless Charging Phone Mount','Auto-clamp phone holder with 15W Qi wireless charging. Mounts on dashboard or windshield.','Generic','phone-mounts',990,ARRAY['365-seed','phone','charging'],'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=800'),
  ('seed-truck-bed-liner-spray','Truck Bed Liner Spray','Roll-on / spray-on truck bed protective coating. Resists scratches, rust, and UV. Black finish.','Generic','organizers',1990,ARRAY['365-seed','truck'],'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800'),
  ('seed-sunshade-front-windshield','Foldable Front Windshield Sun Shade','Reflective sun shade that pops open in seconds. Keeps interior cool and protects the dashboard.','Generic','organizers',390,ARRAY['365-seed','exterior','sun'],'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800'),
  ('seed-seat-cover-universal-pair','Universal Front Seat Covers (Pair)','Breathable seat covers that fit most cars. Easy install. Protects against spills, pet hair, and wear.','Generic','seat-covers',790,ARRAY['365-seed','interior'],'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800'),
  ('seed-floor-mat-3d-universal','3D All-Weather Floor Mats','Universal 3D floor mats with raised edges. Traps water and mud. Easy to hose clean.','Generic','floor-mats',990,ARRAY['365-seed','interior'],'https://images.unsplash.com/photo-1604357209793-fca5dca89f97?w=800')
) AS d(slug, title, description, brand, category_slug, price_php, tags, image_url)
JOIN public.shop_categories c ON c.slug = d.category_slug
ON CONFLICT (slug) DO NOTHING;

-- Shopee PH search links for each seeded product
INSERT INTO public.shop_product_links (product_id, network_id, url, in_stock)
SELECT p.id,
       (SELECT id FROM public.affiliate_networks WHERE slug = 'shopee' LIMIT 1),
       'https://shopee.ph/search?keyword=' || replace(d.search_q, ' ', '%20'),
       true
FROM public.shop_products p
JOIN (VALUES
  ('seed-obd2-scanner-elm327','obd2 scanner elm327 bluetooth'),
  ('seed-ancel-ad310-scanner','ancel ad310 obd2'),
  ('seed-dashcam-1080p-front','dash cam 1080p'),
  ('seed-dashcam-dual-4k','dual dash cam 4k front rear'),
  ('seed-motorcycle-helmet-fullface','full face motorcycle helmet'),
  ('seed-motorcycle-rain-gear','motorcycle rain suit'),
  ('seed-led-headlight-h4','led headlight h4 pair'),
  ('seed-led-light-bar-22in','22 inch led light bar offroad'),
  ('seed-car-cover-sedan','car cover sedan waterproof'),
  ('seed-battery-charger-smart','smart battery charger 12v'),
  ('seed-jump-starter-portable','portable jump starter lithium'),
  ('seed-tire-inflator-cordless','cordless tire inflator digital'),
  ('seed-detailing-kit-starter','car detailing kit'),
  ('seed-ceramic-coating-9h','ceramic coating 9h diy'),
  ('seed-tool-set-mechanic-120pc','mechanic tool set 120 piece'),
  ('seed-phone-mount-magnetic','magnetic phone mount car vent'),
  ('seed-phone-mount-wireless-charge','wireless charging car phone mount'),
  ('seed-truck-bed-liner-spray','truck bed liner spray'),
  ('seed-sunshade-front-windshield','foldable sun shade front windshield'),
  ('seed-seat-cover-universal-pair','universal car seat cover pair'),
  ('seed-floor-mat-3d-universal','3d floor mats universal car')
) AS d(slug, search_q) ON d.slug = p.slug
ON CONFLICT (product_id, network_id) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260608092901_ee4416c6-d63a-49e5-a6f8-5bbcc595767e.sql
-- ============================================================================

CREATE TYPE public.wanted_post_status AS ENUM ('open','closed','expired');
CREATE TYPE public.wanted_post_category AS ENUM ('car','motorcycle','truck','equipment','part','service','tow','other');
CREATE TYPE public.wanted_contact_method AS ENUM ('platform','phone','messenger','any');

CREATE TABLE public.wanted_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 4 AND 140),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 4000),
  category public.wanted_post_category NOT NULL DEFAULT 'other',
  budget_min_php numeric(12,2),
  budget_max_php numeric(12,2),
  region text,
  city text,
  contact_method public.wanted_contact_method NOT NULL DEFAULT 'platform',
  contact_value text,
  status public.wanted_post_status NOT NULL DEFAULT 'open',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  response_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wanted_posts_status_idx ON public.wanted_posts(status, created_at DESC);
CREATE INDEX wanted_posts_category_idx ON public.wanted_posts(category, status);
CREATE INDEX wanted_posts_user_idx ON public.wanted_posts(user_id, created_at DESC);

GRANT SELECT ON public.wanted_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wanted_posts TO authenticated;
GRANT ALL ON public.wanted_posts TO service_role;

ALTER TABLE public.wanted_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open wanted posts"
  ON public.wanted_posts FOR SELECT
  USING (status = 'open' OR auth.uid() = user_id);

CREATE POLICY "Users can create their own wanted posts"
  ON public.wanted_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wanted posts"
  ON public.wanted_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wanted posts"
  ON public.wanted_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE public.wanted_post_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wanted_post_id uuid NOT NULL REFERENCES public.wanted_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(message) BETWEEN 5 AND 2000),
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  contact_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wanted_post_responses_post_idx ON public.wanted_post_responses(wanted_post_id, created_at DESC);
CREATE INDEX wanted_post_responses_user_idx ON public.wanted_post_responses(user_id, created_at DESC);

GRANT SELECT ON public.wanted_post_responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wanted_post_responses TO authenticated;
GRANT ALL ON public.wanted_post_responses TO service_role;

ALTER TABLE public.wanted_post_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view responses to open posts"
  ON public.wanted_post_responses FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.wanted_posts wp
      WHERE wp.id = wanted_post_id
        AND (wp.status = 'open' OR wp.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can respond to open wanted posts"
  ON public.wanted_post_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.wanted_posts wp
      WHERE wp.id = wanted_post_id AND wp.status = 'open'
    )
  );

CREATE POLICY "Users can update their own responses"
  ON public.wanted_post_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own responses"
  ON public.wanted_post_responses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- updated_at triggers (reuse existing function if available)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_wanted_posts_updated_at
  BEFORE UPDATE ON public.wanted_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_wanted_post_responses_updated_at
  BEFORE UPDATE ON public.wanted_post_responses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- maintain response_count
CREATE OR REPLACE FUNCTION public.wanted_post_responses_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.wanted_posts SET response_count = response_count + 1 WHERE id = NEW.wanted_post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.wanted_posts SET response_count = GREATEST(response_count - 1, 0) WHERE id = OLD.wanted_post_id;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_wanted_post_responses_count
  AFTER INSERT OR DELETE ON public.wanted_post_responses
  FOR EACH ROW EXECUTE FUNCTION public.wanted_post_responses_count();

-- auto-expire trigger (validation via trigger, not CHECK, since now() is non-immutable)
CREATE OR REPLACE FUNCTION public.wanted_posts_validate()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.expires_at <= now() AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'expires_at must be in the future';
  END IF;
  IF NEW.budget_min_php IS NOT NULL AND NEW.budget_max_php IS NOT NULL
     AND NEW.budget_min_php > NEW.budget_max_php THEN
    RAISE EXCEPTION 'budget_min_php cannot exceed budget_max_php';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_wanted_posts_validate
  BEFORE INSERT OR UPDATE ON public.wanted_posts
  FOR EACH ROW EXECUTE FUNCTION public.wanted_posts_validate();


-- ============================================================================
-- SOURCE MIGRATION: 20260608095644_fb9d08f4-071d-4fd8-b79c-6af03bd600f1.sql
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seller_rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_rating_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_updated_at timestamptz;

CREATE TABLE public.seller_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text CHECK (body IS NULL OR length(body) <= 2000),
  transaction_completed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seller_reviews_no_self CHECK (seller_id <> reviewer_id)
);

CREATE UNIQUE INDEX seller_reviews_unique_per_listing
  ON public.seller_reviews (seller_id, reviewer_id, COALESCE(listing_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX seller_reviews_seller_idx ON public.seller_reviews (seller_id, status, created_at DESC);
CREATE INDEX seller_reviews_reviewer_idx ON public.seller_reviews (reviewer_id);

GRANT SELECT ON public.seller_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_reviews TO authenticated;
GRANT ALL ON public.seller_reviews TO service_role;

ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active reviews public read" ON public.seller_reviews
  FOR SELECT USING (
    status = 'active' OR auth.uid() = reviewer_id OR auth.uid() = seller_id OR public.can_moderate(auth.uid())
  );

CREATE POLICY "Users insert own review" ON public.seller_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id AND auth.uid() <> seller_id);

CREATE POLICY "Users update own review" ON public.seller_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id) WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users delete own review" ON public.seller_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

CREATE POLICY "Moderators manage seller reviews" ON public.seller_reviews
  FOR ALL USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

CREATE TRIGGER trg_seller_reviews_updated_at
  BEFORE UPDATE ON public.seller_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.recompute_seller_rating(_seller uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric(3,2);
  v_count integer;
BEGIN
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)::numeric(3,2),
         COUNT(*)::int
    INTO v_avg, v_count
    FROM public.seller_reviews
   WHERE seller_id = _seller AND status = 'active';

  UPDATE public.profiles
     SET seller_rating_avg = v_avg,
         seller_rating_count = v_count,
         reviews_updated_at = now()
   WHERE id = _seller;
END;
$$;

CREATE OR REPLACE FUNCTION public.seller_reviews_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_seller_rating(OLD.seller_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.seller_id <> NEW.seller_id THEN
    PERFORM public.recompute_seller_rating(OLD.seller_id);
    PERFORM public.recompute_seller_rating(NEW.seller_id);
    RETURN NEW;
  ELSE
    PERFORM public.recompute_seller_rating(NEW.seller_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_seller_reviews_aggregate
  AFTER INSERT OR UPDATE OR DELETE ON public.seller_reviews
  FOR EACH ROW EXECUTE FUNCTION public.seller_reviews_after_change();

DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, full_name, avatar_url, seller_type, business_name, business_logo_url,
       business_address, business_region, business_province, business_city, business_barangay,
       business_lat, business_lng, business_hours, business_kind,
       verification_status, verified_at,
       fb_profile_url, fb_profile_id, fb_verified_at,
       is_founding_member, founding_member_number,
       created_at,
       seller_rating_avg, seller_rating_count, reviews_updated_at
  FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260609094648_2cdf7fd2-dac7-42b1-ab63-49c73c67924a.sql
-- ============================================================================

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS ownership_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS disclosures jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS modifications text,
  ADD COLUMN IF NOT EXISTS transferred_to_listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS passport_premium boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.vehicle_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vehicle_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_photos TO authenticated;
GRANT ALL ON public.vehicle_photos TO service_role;

ALTER TABLE public.vehicle_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public vehicle photos readable"
  ON public.vehicle_photos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = vehicle_photos.vehicle_id AND v.is_public = true
  ));

CREATE POLICY "Owners manage own vehicle photos"
  ON public.vehicle_photos FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Admins manage vehicle photos"
  ON public.vehicle_photos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_vehicle_photos_vehicle ON public.vehicle_photos(vehicle_id, sort_order);


-- ============================================================================
-- SOURCE MIGRATION: 20260609103310_426c088d-266f-41b9-8be0-b6e103c4d1af.sql
-- ============================================================================

-- 1. business_bookings: validate INSERT
DROP POLICY IF EXISTS "Anyone can create a booking" ON public.business_bookings;
CREATE POLICY "Anyone can create a valid booking"
  ON public.business_bookings
  FOR INSERT
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.business_bookable_items i
      WHERE i.id = business_bookings.bookable_item_id
        AND i.business_id = business_bookings.business_id
        AND i.active = true
    )
  );

-- 2. email_routes: role-based admin gating
DROP POLICY IF EXISTS "Super-admin can read email routes" ON public.email_routes;
DROP POLICY IF EXISTS "Super-admin can insert email routes" ON public.email_routes;
DROP POLICY IF EXISTS "Super-admin can update email routes" ON public.email_routes;
DROP POLICY IF EXISTS "Super-admin can delete email routes" ON public.email_routes;

CREATE POLICY "Admins read email routes"
  ON public.email_routes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert email routes"
  ON public.email_routes FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update email routes"
  ON public.email_routes FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete email routes"
  ON public.email_routes FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Storage: restrict report-evidence uploads
DROP POLICY IF EXISTS "Anyone can upload report evidence" ON storage.objects;
CREATE POLICY "Authenticated users upload report evidence to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'report-evidence'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- 4. Wanted posts/responses: hide contact_value from anonymous visitors
REVOKE SELECT (contact_value) ON public.wanted_posts FROM anon;
REVOKE SELECT (contact_value) ON public.wanted_post_responses FROM anon;


-- ============================================================================
-- SOURCE MIGRATION: 20260609110225_077cc862-a837-4d02-bdf2-729169c31be7.sql
-- ============================================================================

CREATE TABLE public.inspection_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price_php_min INTEGER NOT NULL DEFAULT 0,
  price_php_max INTEGER,
  pricing_unit TEXT NOT NULL DEFAULT 'flat',
  currency TEXT NOT NULL DEFAULT 'PHP',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.inspection_services TO anon, authenticated;
GRANT ALL ON public.inspection_services TO service_role;

ALTER TABLE public.inspection_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active inspection services"
ON public.inspection_services FOR SELECT
USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage inspection services"
ON public.inspection_services FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER inspection_services_set_updated_at
  BEFORE UPDATE ON public.inspection_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.inspection_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.inspection_services(id) ON DELETE RESTRICT,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  vehicle_summary TEXT,
  region TEXT,
  preferred_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  provider_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX inspection_orders_buyer_idx ON public.inspection_orders(buyer_id);
CREATE INDEX inspection_orders_service_idx ON public.inspection_orders(service_id);
CREATE INDEX inspection_orders_status_idx ON public.inspection_orders(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_orders TO authenticated;
GRANT ALL ON public.inspection_orders TO service_role;

ALTER TABLE public.inspection_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers create own inspection orders"
ON public.inspection_orders FOR INSERT TO authenticated
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers view own inspection orders"
ON public.inspection_orders FOR SELECT TO authenticated
USING (auth.uid() = buyer_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE POLICY "Buyers update own pending orders"
ON public.inspection_orders FOR UPDATE TO authenticated
USING (auth.uid() = buyer_id AND status IN ('requested','assigned'))
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admins manage inspection orders"
ON public.inspection_orders FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE TRIGGER inspection_orders_set_updated_at
  BEFORE UPDATE ON public.inspection_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.inspection_services (slug, name, description, category, price_php_min, price_php_max, pricing_unit, sort_order) VALUES
  ('or-cr-review',       'OR/CR document review',          'A 365-vetted reviewer checks the seller''s Official Receipt and Certificate of Registration for tampering, expiry, encumbrance flags, and that the registered owner matches.', 'or_cr_review',     199, 499, 'flat',       10),
  ('seller-id-verify',   'Seller ID verification',         'We verify the seller''s government-issued ID against the name on the OR/CR and confirm a live selfie match.',                                                                  'id_verify',         99, 299, 'flat',       20),
  ('pre-purchase-lead',  'Pre-purchase inspection (lead)', 'We route your request to a vetted PH inspection mechanic in your region. You pay the inspector directly; pricing varies by location and vehicle.',                              'prepurchase',      500, 2500, 'flat',       30),
  ('mechanic-booking',   'Mechanic inspection booking',    'Concierge booking for a partner mechanic to perform a hands-on inspection. 365 takes a small commission from the mechanic; the buyer''s booking is free.',                     'prepurchase',        0, NULL, 'commission', 40),
  ('history-report',     'Vehicle history / Passport report', 'PDF report compiled from the vehicle''s 365 Passport timeline plus public LTO/HPG checks where available.',                                                                  'history_report',   199, 999, 'flat',       50),
  ('transaction-assist', 'Transaction assistance',         'Guided document hand-off and payment-release coordination. 365 is not an escrow agent — funds are released through a regulated payment release partner.',                       'transaction_assist', 0, NULL, 'percent',  60);


-- ============================================================================
-- SOURCE MIGRATION: 20260609111324_6c48b235-a3a4-4485-b6d5-9b1503108849.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260609113058_24366c82-0d4b-4d5d-a8a1-e51f56472c95.sql
-- ============================================================================

-- 1. Vehicle premium expiry
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS passport_premium_until timestamptz;

-- 2. Premium product catalog
CREATE TABLE IF NOT EXISTS public.passport_premium_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  price_php numeric(14,2) NOT NULL,
  duration_days integer NOT NULL,
  stripe_lookup_key text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.passport_premium_products TO anon, authenticated;
GRANT ALL ON public.passport_premium_products TO service_role;

ALTER TABLE public.passport_premium_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active premium products public read"
  ON public.passport_premium_products FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage premium products"
  ON public.passport_premium_products FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Purchases ledger
CREATE TABLE IF NOT EXISTS public.passport_premium_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL REFERENCES public.passport_premium_products(slug),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppp_vehicle ON public.passport_premium_purchases(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_ppp_user ON public.passport_premium_purchases(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ppp_session ON public.passport_premium_purchases(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

GRANT SELECT ON public.passport_premium_purchases TO authenticated;
GRANT ALL ON public.passport_premium_purchases TO service_role;

ALTER TABLE public.passport_premium_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own purchases"
  ON public.passport_premium_purchases FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage purchases"
  ON public.passport_premium_purchases FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Seed yearly product
INSERT INTO public.passport_premium_products (slug, label, description, price_php, duration_days, stripe_lookup_key, sort_order)
VALUES (
  'passport_premium_yearly',
  'Passport Premium — 1 year',
  'Featured Verified badge, downloadable PDF history report, branded share card, and extended service-record storage. Valid for 12 months.',
  299.00,
  365,
  'passport_premium_yearly',
  10
)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  price_php = EXCLUDED.price_php,
  duration_days = EXCLUDED.duration_days,
  stripe_lookup_key = EXCLUDED.stripe_lookup_key,
  updated_at = now();


-- ============================================================================
-- SOURCE MIGRATION: 20260609134449_b3e5e3ae-973d-42b6-935f-6503830e5b15.sql
-- ============================================================================
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS sponsor_partner_id uuid REFERENCES public.training_partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sponsored_until timestamptz;
CREATE INDEX IF NOT EXISTS idx_courses_sponsor_partner ON public.courses(sponsor_partner_id);


-- ============================================================================
-- SOURCE MIGRATION: 20260609135634_7449cd6c-adce-4836-a039-4571160c11e4.sql
-- ============================================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS proof_url text,
  ADD COLUMN IF NOT EXISTS proof_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS invoice_number text UNIQUE;

CREATE INDEX IF NOT EXISTS payments_status_method_idx ON public.payments(status, method);

CREATE TABLE IF NOT EXISTS public.payment_method_config (
  method text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  label text NOT NULL,
  instructions_md text,
  account_name text,
  account_number text,
  qr_image_url text,
  sort_order int NOT NULL DEFAULT 100,
  is_manual boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_method_config TO anon, authenticated;
GRANT ALL ON public.payment_method_config TO service_role;

ALTER TABLE public.payment_method_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled methods"
  ON public.payment_method_config FOR SELECT
  USING (enabled = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage payment methods"
  ON public.payment_method_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER pmc_set_updated_at
  BEFORE UPDATE ON public.payment_method_config
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.payment_method_config (method, enabled, label, instructions_md, sort_order, is_manual) VALUES
  ('stripe', true, 'Card / Wallet (Stripe)', 'Pay securely with credit/debit card or supported wallets.', 10, false),
  ('gcash_manual', true, 'GCash (Manual)', 'Send payment to our GCash account, then upload your receipt below. We''ll confirm within 1 business day.', 20, true),
  ('maya_manual', false, 'Maya (Manual)', 'Send payment to our Maya account, then upload your receipt below.', 30, true),
  ('qrph', false, 'QR Ph', 'Scan the QR Ph code with any participating PH bank or wallet, then upload your receipt below.', 40, true),
  ('bank_transfer', false, 'Bank Transfer', 'Transfer to the bank account shown below. Use your invoice number as the reference.', 50, true),
  ('paypal_manual', false, 'PayPal (Manual)', 'Send payment to our PayPal account, then upload your transaction ID and screenshot below.', 60, true)
ON CONFLICT (method) DO NOTHING;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text := 'INV-' || to_char(now(), 'YYYYMM') || '-';
  n int;
BEGIN
  SELECT COUNT(*) + 1 INTO n
    FROM public.payments
    WHERE invoice_number LIKE prefix || '%';
  RETURN prefix || lpad(n::text, 5, '0');
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260609135725_293408c6-2ad8-4b94-9c58-54da4f131c87.sql
-- ============================================================================
DROP POLICY IF EXISTS "Users upload own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users read own payment proofs" ON storage.objects;

CREATE POLICY "Users upload own payment proofs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own payment proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR has_role(auth.uid(), 'admin'::app_role)));


-- ============================================================================
-- SOURCE MIGRATION: 20260609140507_e60a3304-5bfa-4d23-83ad-d98fdc22eaa6.sql
-- ============================================================================

-- 1. Columns on payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS review_state text NOT NULL DEFAULT 'awaiting_review',
  ADD COLUMN IF NOT EXISTS review_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_started_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_review_state_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_review_state_check
  CHECK (review_state IN ('awaiting_review','in_review','approved','rejected','not_applicable'));

-- Backfill existing rows: terminal statuses get review_state set; non-manual payments are n/a.
UPDATE public.payments
   SET review_state = CASE
     WHEN status = 'paid' AND method IS NOT NULL THEN 'approved'
     WHEN status = 'failed' AND method IS NOT NULL THEN 'rejected'
     WHEN method IS NULL THEN 'not_applicable'
     ELSE 'awaiting_review'
   END
 WHERE review_state = 'awaiting_review';

CREATE INDEX IF NOT EXISTS idx_payments_review_state ON public.payments(review_state, created_at DESC);

-- 2. Audit table
CREATE TABLE IF NOT EXISTS public.payment_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id),
  from_state text,
  to_state text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_review_events TO authenticated;
GRANT ALL ON public.payment_review_events TO service_role;

ALTER TABLE public.payment_review_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage payment review events" ON public.payment_review_events;
CREATE POLICY "Admins manage payment review events"
  ON public.payment_review_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Owners view own payment review events" ON public.payment_review_events;
CREATE POLICY "Owners view own payment review events"
  ON public.payment_review_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.id = payment_review_events.payment_id AND p.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_payment_review_events_payment ON public.payment_review_events(payment_id, created_at DESC);

-- 3. Trigger to auto-audit review_state transitions
CREATE OR REPLACE FUNCTION public.tg_payment_review_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.review_state IS DISTINCT FROM OLD.review_state THEN
    INSERT INTO public.payment_review_events(payment_id, actor_id, from_state, to_state, note)
    VALUES (
      NEW.id,
      auth.uid(),
      OLD.review_state,
      NEW.review_state,
      COALESCE(NEW.review_notes, NEW.rejection_reason)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS payments_review_audit ON public.payments;
CREATE TRIGGER payments_review_audit
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_payment_review_audit();


-- ============================================================================
-- SOURCE MIGRATION: 20260609150605_d17e78ae-088c-4f78-b2a9-2c93ddb97b83.sql
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_username text UNIQUE,
  ADD COLUMN IF NOT EXISTS parent_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_staff_account boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_parent_org ON public.profiles(parent_org_id) WHERE parent_org_id IS NOT NULL;

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS max_seats integer;

UPDATE public.subscription_plans SET max_seats = 1 WHERE name = 'Private Seller';
UPDATE public.subscription_plans SET max_seats = 3 WHERE name = 'Verified Seller';
UPDATE public.subscription_plans SET max_seats = 5 WHERE name = 'Dealer Starter';
UPDATE public.subscription_plans SET max_seats = NULL WHERE name IN ('Dealer Pro','Platinum','Enterprise','Business Trial');

CREATE OR REPLACE FUNCTION public.org_seat_count(_org_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.organization_members WHERE organization_id = _org_id
$$;

CREATE OR REPLACE FUNCTION public.org_max_seats(_org_id uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_max int;
  v_found boolean := false;
BEGIN
  SELECT user_id INTO v_owner FROM public.organization_members
    WHERE organization_id = _org_id AND role = 'owner' LIMIT 1;
  IF v_owner IS NULL THEN RETURN 1; END IF;

  SELECT p.max_seats, true INTO v_max, v_found
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
   WHERE s.user_id = v_owner
     AND s.status = 'active'
     AND (s.current_period_end IS NULL OR s.current_period_end > now())
   ORDER BY COALESCE(p.max_seats, 999999) DESC
   LIMIT 1;

  IF NOT v_found THEN RETURN 1; END IF;
  RETURN v_max;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_login_to_email(_input text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.login_username = lower(btrim(_input))
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.resolve_login_to_email(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.org_seat_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_max_seats(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_auto_create_seller_org()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_name text;
  v_org_id uuid;
BEGIN
  IF NEW.is_staff_account THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(NULLIF(NEW.business_name,''), NULLIF(NEW.full_name,''), 'My Account');
  v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
  IF v_slug = '' THEN v_slug := 'seller'; END IF;
  v_slug := substr(v_slug, 1, 50) || '-' || substr(replace(NEW.id::text,'-',''), 1, 6);

  INSERT INTO public.organizations (name, slug, kind, created_by)
  VALUES (v_name, v_slug, 'dealership', NEW.id)
  RETURNING id INTO v_org_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS auto_create_seller_org ON public.profiles;
CREATE TRIGGER auto_create_seller_org
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_auto_create_seller_org();

CREATE OR REPLACE FUNCTION public.tg_set_listing_org_from_staff()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT parent_org_id INTO v_org FROM public.profiles WHERE id = NEW.user_id;
  IF v_org IS NOT NULL THEN
    NEW.organization_id := v_org;
    RETURN NEW;
  END IF;
  SELECT organization_id INTO v_org FROM public.organization_members
    WHERE user_id = NEW.user_id AND role = 'owner' LIMIT 1;
  IF v_org IS NOT NULL THEN
    NEW.organization_id := v_org;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS set_listing_org_from_staff ON public.listings;
CREATE TRIGGER set_listing_org_from_staff
  BEFORE INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_listing_org_from_staff();

DROP POLICY IF EXISTS "Org members read listing messages" ON public.messages;
CREATE POLICY "Org members read listing messages"
ON public.messages FOR SELECT
USING (
  listing_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = messages.listing_id
      AND l.organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), l.organization_id)
  )
);

-- Backfill orgs for existing sellers
DO $$
DECLARE
  r record;
  v_slug text;
  v_name text;
  v_org_id uuid;
BEGIN
  FOR r IN
    SELECT p.id, p.full_name, p.business_name
    FROM public.profiles p
    WHERE NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.user_id = p.id)
      AND COALESCE(p.is_staff_account, false) = false
  LOOP
    v_name := COALESCE(NULLIF(r.business_name,''), NULLIF(r.full_name,''), 'My Account');
    v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
    IF v_slug = '' THEN v_slug := 'seller'; END IF;
    v_slug := substr(v_slug, 1, 50) || '-' || substr(replace(r.id::text,'-',''), 1, 6);

    INSERT INTO public.organizations (name, slug, kind, created_by)
    VALUES (v_name, v_slug, 'dealership', r.id)
    RETURNING id INTO v_org_id;
  END LOOP;
END $$;

UPDATE public.listings l
   SET organization_id = m.organization_id
  FROM public.organization_members m
 WHERE m.user_id = l.user_id
   AND m.role = 'owner'
   AND l.organization_id IS NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260609150719_b8b702f6-20b1-4370-be4d-32ae44284712.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tg_auto_create_seller_org()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_name text;
  v_org_id uuid;
  v_meta jsonb;
BEGIN
  IF NEW.is_staff_account THEN RETURN NEW; END IF;

  -- Inspect auth metadata: skip when staff-creation flow is in progress
  SELECT raw_user_meta_data INTO v_meta FROM auth.users WHERE id = NEW.id;
  IF COALESCE((v_meta->>'is_staff_account')::boolean, false) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(NULLIF(NEW.business_name,''), NULLIF(NEW.full_name,''), 'My Account');
  v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
  IF v_slug = '' THEN v_slug := 'seller'; END IF;
  v_slug := substr(v_slug, 1, 50) || '-' || substr(replace(NEW.id::text,'-',''), 1, 6);

  INSERT INTO public.organizations (name, slug, kind, created_by)
  VALUES (v_name, v_slug, 'dealership', NEW.id)
  RETURNING id INTO v_org_id;
  RETURN NEW;
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260609153726_dbc4c2ec-5457-414b-9fe5-2cc79073a28f.sql
-- ============================================================================
ALTER TABLE public.provider_tow_rates
  ADD COLUMN IF NOT EXISTS dispatch_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispatch_regions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avg_response_sec integer,
  ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2);

ALTER TABLE public.tow_requests
  ADD COLUMN IF NOT EXISTS dispatch_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS dispatch_window_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS requested_provider_id uuid,
  ADD COLUMN IF NOT EXISTS matched_provider_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dispatch_expansions integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tow_requests_dispatch_status ON public.tow_requests(dispatch_status) WHERE dispatch_status IN ('matched','open');
CREATE INDEX IF NOT EXISTS idx_tow_requests_window ON public.tow_requests(dispatch_window_ends_at) WHERE dispatch_status='matched';
CREATE INDEX IF NOT EXISTS idx_tow_requests_matched_gin ON public.tow_requests USING GIN (matched_provider_ids);

CREATE TABLE IF NOT EXISTS public.dispatch_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_slug text NOT NULL,
  status text NOT NULL DEFAULT 'incomplete',
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  current_period_end timestamptz,
  environment text NOT NULL DEFAULT 'sandbox',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dispatch_sub_stripe ON public.dispatch_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dispatch_sub_user ON public.dispatch_subscriptions(user_id, environment);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_subscriptions TO authenticated;
GRANT ALL ON public.dispatch_subscriptions TO service_role;
ALTER TABLE public.dispatch_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own dispatch sub"
  ON public.dispatch_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners update own dispatch sub"
  ON public.dispatch_subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.tg_dispatch_sub_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_dispatch_sub_updated_at ON public.dispatch_subscriptions;
CREATE TRIGGER trg_dispatch_sub_updated_at
  BEFORE UPDATE ON public.dispatch_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_sub_updated_at();

CREATE OR REPLACE FUNCTION public.dispatch_plan_capacity(_plan text)
RETURNS TABLE(max_jobs integer, max_regions integer, priority integer)
LANGUAGE sql IMMUTABLE AS $$
  SELECT t.max_jobs, t.max_regions, t.priority FROM (VALUES
    ('dispatch_starter', 3, 1, 1),
    ('dispatch_pro', 10, 4, 2),
    ('dispatch_fleet', 999999, 99, 3)
  ) AS t(plan, max_jobs, max_regions, priority)
  WHERE t.plan = _plan
$$;

CREATE OR REPLACE FUNCTION public.get_active_dispatch_plan(_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT plan_slug FROM public.dispatch_subscriptions
  WHERE user_id = _user AND status IN ('active','trialing')
    AND (current_period_end IS NULL OR current_period_end > now())
  ORDER BY created_at DESC LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.dispatch_match_providers(_request_id uuid, _take integer DEFAULT 5)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req RECORD; matches uuid[];
BEGIN
  SELECT pickup_region, pickup_province, pickup_city, matched_provider_ids
    INTO req FROM public.tow_requests WHERE id = _request_id;
  IF req IS NULL THEN RETURN '{}'::uuid[]; END IF;

  WITH eligible AS (
    SELECT
      ptr.user_id,
      ap.plan AS plan_slug,
      cap.priority AS tier_priority,
      cap.max_jobs,
      COALESCE(ptr.avg_rating, 0) AS rating,
      COALESCE(ptr.avg_response_sec, 999999) AS resp,
      b.city, b.province, b.region,
      (SELECT count(*) FROM public.tow_requests tr
         WHERE tr.provider_id = ptr.user_id
           AND tr.status IN ('assigned','in_progress','picked_up')) AS active_jobs
    FROM public.provider_tow_rates ptr
    JOIN LATERAL (SELECT public.get_active_dispatch_plan(ptr.user_id) AS plan) ap ON ap.plan IS NOT NULL
    LEFT JOIN LATERAL public.dispatch_plan_capacity(ap.plan) cap ON true
    LEFT JOIN public.businesses b ON b.owner_id = ptr.user_id AND b.type_slug='towing' AND b.status='active'
    WHERE ptr.dispatch_enabled = true
      AND (ap.plan = 'dispatch_fleet'
        OR req.pickup_region = ANY(ptr.dispatch_regions)
        OR (b.region IS NOT NULL AND b.region = req.pickup_region))
  )
  SELECT COALESCE(array_agg(user_id ORDER BY
    tier_priority DESC NULLS LAST,
    CASE WHEN city = req.pickup_city THEN 0
         WHEN province = req.pickup_province THEN 1
         WHEN region = req.pickup_region THEN 2 ELSE 3 END,
    rating DESC, resp ASC
  ), '{}'::uuid[]) INTO matches
  FROM eligible
  WHERE active_jobs < COALESCE(max_jobs, 999999)
    AND NOT (user_id = ANY(req.matched_provider_ids));

  RETURN matches[1:_take];
END $$;

CREATE OR REPLACE FUNCTION public.tg_dispatch_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.requested_provider_id IS NOT NULL THEN
    NEW.dispatch_status := 'direct';
    NEW.matched_provider_ids := ARRAY[NEW.requested_provider_id];
    NEW.dispatch_window_ends_at := now() + INTERVAL '15 minutes';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.tg_dispatch_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE picks uuid[];
BEGIN
  IF NEW.dispatch_status = 'direct' THEN RETURN NEW; END IF;
  picks := public.dispatch_match_providers(NEW.id, 5);
  UPDATE public.tow_requests
    SET matched_provider_ids = picks,
        dispatch_status = CASE WHEN array_length(picks,1) > 0 THEN 'matched' ELSE 'open' END,
        dispatch_window_ends_at = CASE WHEN array_length(picks,1) > 0 THEN now() + INTERVAL '5 minutes' ELSE NULL END
  WHERE id = NEW.id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_before_insert ON public.tow_requests;
CREATE TRIGGER trg_dispatch_before_insert BEFORE INSERT ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_before_insert();
DROP TRIGGER IF EXISTS trg_dispatch_after_insert ON public.tow_requests;
CREATE TRIGGER trg_dispatch_after_insert AFTER INSERT ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_after_insert();

CREATE OR REPLACE FUNCTION public.dispatch_expand_stale()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; picks uuid[]; n integer := 0;
BEGIN
  FOR r IN
    SELECT id, dispatch_expansions FROM public.tow_requests
    WHERE dispatch_status = 'matched' AND dispatch_window_ends_at < now() AND status = 'open'
  LOOP
    IF r.dispatch_expansions >= 3 THEN
      UPDATE public.tow_requests SET dispatch_status = 'expired', dispatch_window_ends_at = NULL WHERE id = r.id;
    ELSE
      picks := public.dispatch_match_providers(r.id, 5);
      UPDATE public.tow_requests
        SET matched_provider_ids = matched_provider_ids || picks,
            dispatch_status = CASE WHEN array_length(picks,1) > 0 THEN 'matched' ELSE 'open' END,
            dispatch_window_ends_at = CASE WHEN array_length(picks,1) > 0 THEN now() + INTERVAL '5 minutes' ELSE NULL END,
            dispatch_expansions = r.dispatch_expansions + 1
        WHERE id = r.id;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

DROP POLICY IF EXISTS "Requesters view own tow requests" ON public.tow_requests;
CREATE POLICY "Tow request visible to participants and matched providers"
  ON public.tow_requests FOR SELECT TO authenticated
  USING (
    auth.uid() = requester_id OR auth.uid() = provider_id
    OR auth.uid() = ANY(matched_provider_ids)
    OR ((provider_id IS NULL) AND (status = 'open') AND is_towing_provider(auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Tow request participants update" ON public.tow_requests;
CREATE POLICY "Tow request participants update"
  ON public.tow_requests FOR UPDATE TO authenticated
  USING (
    auth.uid() = requester_id OR auth.uid() = provider_id
    OR auth.uid() = ANY(matched_provider_ids)
    OR ((provider_id IS NULL) AND (status = 'open') AND is_towing_provider(auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

ALTER TABLE public.tow_requests REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tow_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.subscription_plans (name, price_php, sort_order, active, stripe_lookup_key, features, max_photos_per_listing)
SELECT v.name, v.price_php, v.sort_order, v.active, v.stripe_lookup_key, v.features::jsonb, v.max_photos_per_listing
FROM (VALUES
  ('Dispatch Starter', 499.00::numeric, 10, true, 'dispatch_starter_monthly', '["Home region only","Up to 3 active jobs","Standard placement in dispatch queue"]', 0),
  ('Dispatch Pro', 1499.00::numeric, 11, true, 'dispatch_pro_monthly', '["Up to 4 regions","Up to 10 active jobs","High priority in dispatch queue"]', 0),
  ('Dispatch Fleet', 2999.00::numeric, 12, true, 'dispatch_fleet_monthly', '["Nationwide coverage","Unlimited active jobs","Top priority in dispatch queue","Featured badge"]', 0)
) AS v(name, price_php, sort_order, active, stripe_lookup_key, features, max_photos_per_listing)
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans p WHERE p.stripe_lookup_key = v.stripe_lookup_key);


-- ============================================================================
-- SOURCE MIGRATION: 20260609155038_7a3dc09f-8065-415a-9d37-1e30ab858087.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dispatch_job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.tow_requests(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  event text NOT NULL CHECK (event IN ('matched','accepted','declined','lost','timed_out','completed','cancelled')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.dispatch_job_events TO authenticated;
GRANT ALL ON public.dispatch_job_events TO service_role;

ALTER TABLE public.dispatch_job_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers view own dispatch events"
  ON public.dispatch_job_events FOR SELECT TO authenticated
  USING (auth.uid() = provider_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Providers insert own dispatch events"
  ON public.dispatch_job_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = provider_id);

CREATE INDEX IF NOT EXISTS idx_dispatch_events_provider ON public.dispatch_job_events(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_request ON public.dispatch_job_events(request_id);

-- Trigger: log 'matched' events when matched_provider_ids is populated on insert
CREATE OR REPLACE FUNCTION public.tg_dispatch_log_matched()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  IF NEW.matched_provider_ids IS NOT NULL AND array_length(NEW.matched_provider_ids, 1) > 0 THEN
    FOREACH pid IN ARRAY NEW.matched_provider_ids LOOP
      INSERT INTO public.dispatch_job_events(request_id, provider_id, event, metadata)
      VALUES (NEW.id, pid, 'matched', jsonb_build_object('dispatch_status', NEW.dispatch_status));
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_log_matched ON public.tow_requests;
CREATE TRIGGER trg_dispatch_log_matched
  AFTER INSERT ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_log_matched();

-- Trigger: log 'matched' on UPDATE when new providers are added during expansion
CREATE OR REPLACE FUNCTION public.tg_dispatch_log_expanded()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid; added uuid[];
BEGIN
  IF NEW.matched_provider_ids IS DISTINCT FROM OLD.matched_provider_ids THEN
    SELECT COALESCE(array_agg(p), '{}'::uuid[]) INTO added
      FROM unnest(NEW.matched_provider_ids) p
      WHERE NOT (p = ANY(OLD.matched_provider_ids));
    IF added IS NOT NULL AND array_length(added, 1) > 0 THEN
      FOREACH pid IN ARRAY added LOOP
        INSERT INTO public.dispatch_job_events(request_id, provider_id, event, metadata)
        VALUES (NEW.id, pid, 'matched', jsonb_build_object('dispatch_status', NEW.dispatch_status, 'expansion', true));
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_log_expanded ON public.tow_requests;
CREATE TRIGGER trg_dispatch_log_expanded
  AFTER UPDATE OF matched_provider_ids ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_log_expanded();

-- Trigger: log 'accepted' for winner, 'lost' for others when provider_id transitions to non-null
CREATE OR REPLACE FUNCTION public.tg_dispatch_log_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  IF (OLD.provider_id IS NULL) AND (NEW.provider_id IS NOT NULL) THEN
    INSERT INTO public.dispatch_job_events(request_id, provider_id, event)
    VALUES (NEW.id, NEW.provider_id, 'accepted');
    IF NEW.matched_provider_ids IS NOT NULL THEN
      FOREACH pid IN ARRAY NEW.matched_provider_ids LOOP
        IF pid <> NEW.provider_id THEN
          INSERT INTO public.dispatch_job_events(request_id, provider_id, event)
          VALUES (NEW.id, pid, 'lost');
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_log_accepted ON public.tow_requests;
CREATE TRIGGER trg_dispatch_log_accepted
  AFTER UPDATE OF provider_id ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_log_accepted();

-- Trigger: log 'timed_out' for matched providers when dispatch_status becomes 'expired'
CREATE OR REPLACE FUNCTION public.tg_dispatch_log_expired()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  IF NEW.dispatch_status = 'expired' AND OLD.dispatch_status <> 'expired'
     AND NEW.provider_id IS NULL THEN
    IF NEW.matched_provider_ids IS NOT NULL THEN
      FOREACH pid IN ARRAY NEW.matched_provider_ids LOOP
        INSERT INTO public.dispatch_job_events(request_id, provider_id, event)
        VALUES (NEW.id, pid, 'timed_out');
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_log_expired ON public.tow_requests;
CREATE TRIGGER trg_dispatch_log_expired
  AFTER UPDATE OF dispatch_status ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_log_expired();

-- Trigger: log 'completed' / 'cancelled' for provider on status change
CREATE OR REPLACE FUNCTION public.tg_dispatch_log_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.provider_id IS NOT NULL THEN
    IF NEW.status = 'completed' THEN
      INSERT INTO public.dispatch_job_events(request_id, provider_id, event)
      VALUES (NEW.id, NEW.provider_id, 'completed');
    ELSIF NEW.status = 'cancelled' THEN
      INSERT INTO public.dispatch_job_events(request_id, provider_id, event)
      VALUES (NEW.id, NEW.provider_id, 'cancelled');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_log_status ON public.tow_requests;
CREATE TRIGGER trg_dispatch_log_status
  AFTER UPDATE OF status ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_log_status();


-- ============================================================================
-- SOURCE MIGRATION: 20260609155458_38740412-00c0-47df-9075-a23e9ecde385.sql
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_job_events;


-- ============================================================================
-- SOURCE MIGRATION: 20260610025635_61ed156c-2485-4a25-9f5d-26b6e0a63929.sql
-- ============================================================================
GRANT SELECT ON public.wanted_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wanted_posts TO authenticated;
GRANT ALL ON public.wanted_posts TO service_role;

GRANT SELECT ON public.wanted_post_responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wanted_post_responses TO authenticated;
GRANT ALL ON public.wanted_post_responses TO service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260610033604_355e741d-6864-485f-aa03-ffb99aa086cf.sql
-- ============================================================================
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_user_id),
  CHECK (blocker_id <> blocked_user_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own blocks" ON public.user_blocks
  FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users create their own blocks" ON public.user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users delete their own blocks" ON public.user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);
CREATE INDEX user_blocks_blocker_idx ON public.user_blocks (blocker_id);
CREATE INDEX user_blocks_blocked_idx ON public.user_blocks (blocked_user_id);


-- ============================================================================
-- SOURCE MIGRATION: 20260610042109_248f8495-a4de-4610-82c5-f991a2250e13.sql
-- ============================================================================

-- Add Truck & Equipment department + top-level category (only missing item)
INSERT INTO public.shop_departments (slug, name, sort_order, active)
VALUES ('truck-equipment', 'Truck & Equipment', 90, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.shop_categories (slug, name, description, sort_order, active, department_slug)
VALUES (
  'truck-equipment',
  'Truck & Equipment',
  'Work lights, tow straps, ratchet straps, grease guns and heavy-duty gear for trucks and equipment.',
  90,
  true,
  'truck-equipment'
)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260610043918_06033592-e2d2-4d8d-91e1-3b4c53f30bef.sql
-- ============================================================================

CREATE TABLE public.shop_category_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.shop_categories(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT shop_category_keywords_unique UNIQUE (category_id, keyword),
  CONSTRAINT shop_category_keywords_lowercase CHECK (keyword = lower(keyword)),
  CONSTRAINT shop_category_keywords_nonempty CHECK (length(btrim(keyword)) > 0)
);

CREATE INDEX idx_shop_category_keywords_category ON public.shop_category_keywords(category_id);

GRANT SELECT ON public.shop_category_keywords TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_category_keywords TO authenticated;
GRANT ALL ON public.shop_category_keywords TO service_role;

ALTER TABLE public.shop_category_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kw public read"
  ON public.shop_category_keywords FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.shop_categories c
    WHERE c.id = shop_category_keywords.category_id AND c.active = true
  ));

CREATE POLICY "kw managers write"
  ON public.shop_category_keywords FOR ALL
  TO authenticated
  USING (public.can_manage_shop(auth.uid()))
  WITH CHECK (public.can_manage_shop(auth.uid()));

-- Seed from the prior hardcoded CATEGORY_KEYWORDS map.
WITH seed(slug, kw) AS (
  VALUES
    ('diagnostics','obd2'),('diagnostics','obd-ii'),('diagnostics','obdii'),('diagnostics','obd ii'),
    ('diagnostics','scan tool'),('diagnostics','scanner'),('diagnostics','ancel'),('diagnostics','autel'),
    ('diagnostics','launch x431'),('diagnostics','elm327'),('diagnostics','code reader'),('diagnostics','diagnostic tool'),
    ('car-washing','foam cannon'),('car-washing','snow foam'),('car-washing','pressure washer'),
    ('car-washing','car shampoo'),('car-washing','car wash'),('car-washing','wash mitt'),
    ('waxes-coatings','car wax'),('waxes-coatings','ceramic coat'),('waxes-coatings','ceramic coating'),
    ('waxes-coatings','paint sealant'),('waxes-coatings','sealant'),('waxes-coatings','graphene coat'),
    ('polishing-compounds','polishing compound'),('polishing-compounds','cutting compound'),
    ('polishing-compounds','buffing pad'),('polishing-compounds','polisher'),
    ('microfiber','microfiber'),('microfiber','micro fibre'),('microfiber','drying towel'),('microfiber','applicator pad'),
    ('wheel-tire-care','tire shine'),('wheel-tire-care','tire dressing'),('wheel-tire-care','wheel cleaner'),('wheel-tire-care','rim cleaner'),
    ('interior-care','interior cleaner'),('interior-care','leather conditioner'),('interior-care','dashboard polish'),
    ('interior-care','fabric cleaner'),('interior-care','carpet cleaner'),
    ('jump-starters','jump starter'),('jump-starters','jumpstarter'),('jump-starters','jump pack'),('jump-starters','booster pack'),
    ('tow-straps','tow strap'),('tow-straps','recovery strap'),('tow-straps','tow rope'),('tow-straps','kinetic rope'),('tow-straps','snatch strap'),
    ('first-aid','first aid'),('first-aid','first-aid'),
    ('fire-extinguishers','fire extinguisher'),
    ('safety','warning triangle'),('safety','reflective triangle'),('safety','tire inflator'),
    ('safety','portable air compressor'),('safety','emergency kit'),('safety','road kit'),('safety','safety vest'),
    ('helmets','helmet'),('helmets','full face'),('helmets','half face'),('helmets','modular helmet'),
    ('riding-gear','riding jacket'),('riding-gear','riding pants'),('riding-gear','rain gear'),
    ('riding-gear','rain suit'),('riding-gear','motorcycle gloves'),('riding-gear','riding gloves'),('riding-gear','moto boots'),
    ('moto-luggage','tank bag'),('moto-luggage','saddle bag'),('moto-luggage','tail bag'),('moto-luggage','panniers'),
    ('chain-care','chain lube'),('chain-care','chain cleaner'),('chain-care','chain wax'),
    ('seat-covers','seat cover'),('seat-covers','seat cushion'),
    ('floor-mats','floor mat'),('floor-mats','car mat'),('floor-mats','all-weather mat'),
    ('phone-mounts','phone mount'),('phone-mounts','phone holder'),('phone-mounts','car phone holder'),('phone-mounts','magsafe car'),
    ('organizers','car organizer'),('organizers','trunk organizer'),('organizers','console organizer'),
    ('accessories','sun shade'),('accessories','sunshade'),('accessories','windshield shade'),
    ('accessories','steering wheel cover'),('accessories','armrest'),
    ('dashcams','dash cam'),('dashcams','dashcam'),('dashcams','dvr car camera'),
    ('cameras-sensors','reverse camera'),('cameras-sensors','backup camera'),('cameras-sensors','parking sensor'),('cameras-sensors','blind spot'),
    ('head-units','head unit'),('head-units','car stereo'),('head-units','android auto'),
    ('head-units','carplay head'),('head-units','double din'),('head-units','1din'),
    ('speakers','car speaker'),('speakers','subwoofer'),('speakers','tweeter'),('speakers','amplifier car audio'),
    ('lighting','led headlight'),('lighting','hid kit'),('lighting','fog light'),
    ('lighting','h4 led'),('lighting','h7 led'),('lighting','h11 led'),
    ('hand-tools','socket set'),('hand-tools','wrench set'),('hand-tools','spanner'),('hand-tools','ratchet set'),
    ('hand-tools','screwdriver set'),('hand-tools','plier'),('hand-tools','torque wrench'),('hand-tools','multimeter'),
    ('power-tools','impact wrench'),('power-tools','cordless drill'),('power-tools','angle grinder'),
    ('power-tools','rotary tool'),('power-tools','power drill'),
    ('jacks-stands','floor jack'),('jacks-stands','jack stand'),('jacks-stands','trolley jack'),
    ('jacks-stands','scissor jack'),('jacks-stands','hydraulic jack'),
    ('workshop-equipment','engine hoist'),('workshop-equipment','creeper'),
    ('workshop-equipment','tire changer'),('workshop-equipment','wheel balancer'),
    ('battery-care','battery charger'),('battery-care','trickle charger'),('battery-care','smart charger'),
    ('battery-care','battery maintainer'),('battery-care','battery tender'),
    ('garage-organizers','garage organizer'),('garage-organizers','tool chest'),
    ('garage-organizers','tool cabinet'),('garage-organizers','tool cart'),
    ('shelving','shelving'),('shelving','garage shelf'),('shelving','storage rack'),
    ('car-covers','car cover'),('car-covers','all weather cover'),
    ('truck-equipment','work light'),('truck-equipment','led work light'),('truck-equipment','ratchet strap'),
    ('truck-equipment','tie down'),('truck-equipment','cargo strap'),('truck-equipment','grease gun'),
    ('truck-equipment','truck bed'),('truck-equipment','winch'),
    ('off-road-lights','light bar'),('off-road-lights','off road light'),('off-road-lights','off-road light'),('off-road-lights','4x4 light'),
    ('recovery-boards','recovery board'),('recovery-boards','traction board'),('recovery-boards','sand board'),
    ('roof-racks','roof rack'),('roof-racks','roof basket'),('roof-racks','cross bar'),
    ('snorkels','snorkel kit'),('snorkels','raised intake'),
    ('engine-oil','engine oil'),('engine-oil','motor oil'),('engine-oil','5w-30'),('engine-oil','5w-40'),
    ('engine-oil','0w-20'),('engine-oil','10w-40'),('engine-oil','synthetic oil'),
    ('atf','atf'),('atf','transmission fluid'),('atf','gear oil'),
    ('brake-fluid','brake fluid'),('brake-fluid','dot 3'),('brake-fluid','dot 4'),('brake-fluid','dot 5'),
    ('coolant','coolant'),('coolant','antifreeze'),('coolant','radiator fluid'),
    ('grease','grease cartridge'),('grease','lithium grease'),('grease','wd-40'),('grease','wd40'),('grease','penetrating oil'),
    ('brakes','brake pad'),('brakes','brake disc'),('brakes','brake rotor'),('brakes','brake shoe'),
    ('filters','oil filter'),('filters','air filter'),('filters','cabin filter'),('filters','fuel filter'),
    ('ignition','spark plug'),('ignition','ignition coil'),('ignition','iridium plug'),
    ('belts-hoses','timing belt'),('belts-hoses','serpentine belt'),('belts-hoses','radiator hose'),
    ('cooling','radiator'),('cooling','water pump'),('cooling','thermostat'),
    ('exhaust','exhaust pipe'),('exhaust','muffler'),('exhaust','catalytic converter'),
    ('suspension','shock absorber'),('suspension','strut'),('suspension','control arm'),('suspension','tie rod'),
    ('tires','tyre'),('tires','all terrain tire'),('tires','215/'),('tires','225/'),('tires','235/'),('tires','265/'),
    ('wheels','alloy wheel'),('wheels','mag wheels'),
    ('tpms','tpms'),('tpms','valve stem'),('tpms','tire pressure sensor'),
    ('ev-chargers','ev charger'),('ev-chargers','ev charging'),('ev-chargers','type 2 charger'),('ev-chargers','wallbox'),
    ('ev-adapters','ev adapter'),('ev-adapters','type 2 adapter'),('ev-adapters','chademo')
)
INSERT INTO public.shop_category_keywords (category_id, keyword)
SELECT c.id, s.kw
FROM seed s
JOIN public.shop_categories c ON c.slug = s.slug
ON CONFLICT (category_id, keyword) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260610051655_16f22016-67d6-4de8-9883-f1b157c2c4ed.sql
-- ============================================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.listing_price_kind AS ENUM ('asking','monthly','down_payment','starting_bid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.listing_registration_status AS ENUM ('registered','unregistered','for_transfer','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Columns
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS price_kind public.listing_price_kind NOT NULL DEFAULT 'asking',
  ADD COLUMN IF NOT EXISTS negotiable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_status public.listing_registration_status NOT NULL DEFAULT 'unknown';

-- Validation trigger: reject obvious placeholder prices on vehicle categories.
CREATE OR REPLACE FUNCTION public.listings_price_floor_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_floor numeric;
BEGIN
  -- Skip drafts; sellers may save partial work.
  IF NEW.status = 'draft' THEN RETURN NEW; END IF;

  IF NEW.price_kind IN ('monthly','down_payment') THEN
    v_floor := 1000;
  ELSIF NEW.category_slug = 'car' THEN
    v_floor := 20000;
  ELSIF NEW.category_slug = 'motorcycle' THEN
    v_floor := 5000;
  ELSIF NEW.category_slug IN ('truck','equipment','boat','airplane') THEN
    v_floor := 20000;
  ELSE
    v_floor := 0;
  END IF;

  IF v_floor > 0 AND NEW.price_php < v_floor THEN
    RAISE EXCEPTION 'Listing price ₱% is below the minimum ₱% for this category. Enter the real asking price (mark Negotiable or Monthly instead of using a placeholder).',
      NEW.price_php, v_floor
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_price_floor ON public.listings;
CREATE TRIGGER trg_listings_price_floor
  BEFORE INSERT OR UPDATE OF price_php, price_kind, category_slug, status
  ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.listings_price_floor_check();


-- ============================================================================
-- SOURCE MIGRATION: 20260610052546_143605f8-b90f-4f6c-b6e7-90bc025c8abe.sql
-- ============================================================================

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS monthly_php numeric(14,2),
  ADD COLUMN IF NOT EXISTS down_payment_php numeric(14,2);

CREATE OR REPLACE FUNCTION public.listings_price_floor_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_floor numeric;
BEGIN
  IF NEW.status = 'draft' THEN RETURN NEW; END IF;

  -- Per-category floor on the cash asking price (when > 0).
  IF NEW.price_php IS NOT NULL AND NEW.price_php > 0 THEN
    IF NEW.category_slug = 'motorcycle' THEN
      v_floor := 5000;
    ELSIF NEW.category_slug IN ('car','truck','equipment','boat','airplane') THEN
      v_floor := 20000;
    ELSE
      v_floor := 0;
    END IF;
    IF v_floor > 0 AND NEW.price_php < v_floor THEN
      RAISE EXCEPTION 'Asking price ₱% is below the minimum ₱% for this category.', NEW.price_php, v_floor
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.monthly_php IS NOT NULL AND NEW.monthly_php > 0 AND NEW.monthly_php < 1000 THEN
    RAISE EXCEPTION 'Monthly payment ₱% is below the minimum ₱1,000.', NEW.monthly_php
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.down_payment_php IS NOT NULL AND NEW.down_payment_php > 0 AND NEW.down_payment_php < 5000 THEN
    RAISE EXCEPTION 'Down payment ₱% is below the minimum ₱5,000.', NEW.down_payment_php
      USING ERRCODE = 'check_violation';
  END IF;

  -- Require at least one real price on published listings unless price is hidden.
  IF COALESCE(NEW.price_hidden, false) IS NOT TRUE THEN
    IF COALESCE(NEW.price_php, 0) <= 0
       AND COALESCE(NEW.monthly_php, 0) <= 0
       AND COALESCE(NEW.down_payment_php, 0) <= 0 THEN
      RAISE EXCEPTION 'Set an asking price, monthly payment, or down payment — or check "Hide price".'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_price_floor ON public.listings;
CREATE TRIGGER trg_listings_price_floor
  BEFORE INSERT OR UPDATE OF price_php, monthly_php, down_payment_php, price_hidden, category_slug, status
  ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.listings_price_floor_check();


-- ============================================================================
-- SOURCE MIGRATION: 20260610074241_d2134766-c2a8-42c2-86fc-1db369f9212f.sql
-- ============================================================================

ALTER TABLE public.tow_requests
  ADD COLUMN IF NOT EXISTS urgency text NOT NULL DEFAULT 'emergency',
  ADD COLUMN IF NOT EXISTS situation text,
  ADD COLUMN IF NOT EXISTS vehicle_year integer,
  ADD COLUMN IF NOT EXISTS vehicle_make text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_trim text,
  ADD COLUMN IF NOT EXISTS vehicle_drivetrain text,
  ADD COLUMN IF NOT EXISTS vehicle_transmission text,
  ADD COLUMN IF NOT EXISTS vehicle_photo_url text,
  ADD COLUMN IF NOT EXISTS ride_id uuid REFERENCES public.rides(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS damage_photo_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS can_roll boolean,
  ADD COLUMN IF NOT EXISTS can_steer boolean,
  ADD COLUMN IF NOT EXISTS can_brake boolean,
  ADD COLUMN IF NOT EXISTS pickup_lat double precision,
  ADD COLUMN IF NOT EXISTS pickup_lng double precision,
  ADD COLUMN IF NOT EXISTS dropoff_lat double precision,
  ADD COLUMN IF NOT EXISTS dropoff_lng double precision;

ALTER TABLE public.tow_requests
  DROP CONSTRAINT IF EXISTS tow_requests_urgency_check;
ALTER TABLE public.tow_requests
  ADD CONSTRAINT tow_requests_urgency_check
  CHECK (urgency IN ('emergency','time_sensitive','scheduled'));

ALTER TABLE public.tow_requests
  DROP CONSTRAINT IF EXISTS tow_requests_situation_check;
ALTER TABLE public.tow_requests
  ADD CONSTRAINT tow_requests_situation_check
  CHECK (situation IS NULL OR situation IN ('breakdown','accident','flat_tire','no_start','no_fuel','winch','other'));

ALTER TABLE public.tow_requests
  DROP CONSTRAINT IF EXISTS tow_requests_drivetrain_check;
ALTER TABLE public.tow_requests
  ADD CONSTRAINT tow_requests_drivetrain_check
  CHECK (vehicle_drivetrain IS NULL OR vehicle_drivetrain IN ('FWD','RWD','AWD','4x4','unknown'));


-- ============================================================================
-- SOURCE MIGRATION: 20260610074339_363b9ce5-f62d-4293-a3ac-6892c69318d2.sql
-- ============================================================================

-- Owners manage their own folder under tow-request-photos
CREATE POLICY "Tow photos: owners can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tow-request-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Tow photos: owners can update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'tow-request-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Tow photos: owners can delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tow-request-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Read access: owner, matched providers, assigned provider, admins.
-- Photo URL is stored on tow_requests row; participants of that row can read.
CREATE POLICY "Tow photos: participants can read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tow-request-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.tow_requests tr
      WHERE (
        tr.vehicle_photo_url LIKE '%/' || name
        OR name = ANY (
          SELECT regexp_replace(u, '^.*/tow-request-photos/', '')
          FROM unnest(tr.damage_photo_urls) u
        )
      )
      AND (
        auth.uid() = tr.requester_id
        OR auth.uid() = tr.provider_id
        OR auth.uid() = ANY (tr.matched_provider_ids)
        OR has_role(auth.uid(), 'admin'::app_role)
      )
    )
  )
);


-- ============================================================================
-- SOURCE MIGRATION: 20260610081456_94cf4157-4dc9-46ec-afc0-04830a22541c.sql
-- ============================================================================
ALTER TABLE public.tow_requests DROP CONSTRAINT IF EXISTS tow_requests_situation_check;
ALTER TABLE public.tow_requests ADD CONSTRAINT tow_requests_situation_check CHECK (situation IS NULL OR (situation = ANY (ARRAY['breakdown'::text, 'accident'::text, 'flat_tire'::text, 'no_start'::text, 'no_fuel'::text, 'winch'::text, 'jump_start'::text, 'dead_battery'::text, 'lockout'::text, 'other'::text])));
ALTER TABLE public.tow_requests ADD COLUMN IF NOT EXISTS passenger_count integer;
ALTER TABLE public.tow_requests DROP CONSTRAINT IF EXISTS tow_requests_passenger_count_check;
ALTER TABLE public.tow_requests ADD CONSTRAINT tow_requests_passenger_count_check CHECK (passenger_count IS NULL OR (passenger_count >= 0 AND passenger_count <= 50));


-- ============================================================================
-- SOURCE MIGRATION: 20260611044319_aa6847c4-a282-4892-a40f-6cdf10b8546e.sql
-- ============================================================================

-- Add explicit admin-only SELECT policies to make intent clear and auditable
-- These tables already have RLS enabled with no SELECT policies; service_role bypasses RLS.
-- Adding explicit admin policies prevents accidental exposure if broader policies are added later.

CREATE POLICY "Admins read cron tokens"
ON public.internal_cron_tokens
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read webhook keys"
ON public.internal_webhook_keys
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260611045505_da9fc4b4-aed0-4c3d-8f75-8b7287b67446.sql
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_listings_browse
  ON public.listings (category_slug, status, boost_until DESC NULLS LAST, published_at DESC NULLS LAST);


-- ============================================================================
-- SOURCE MIGRATION: 20260611160209_a5575f50-1cb9-450f-baa9-f18e961b7c98.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260612013755_cfd60716-fd91-4494-9a6f-987d9a3959dc.sql
-- ============================================================================
CREATE TABLE public.listing_fitment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year_min INTEGER,
  year_max INTEGER,
  trim TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.listing_fitment TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_fitment TO authenticated;
GRANT ALL ON public.listing_fitment TO service_role;

ALTER TABLE public.listing_fitment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fitment"
  ON public.listing_fitment FOR SELECT
  USING (true);

CREATE POLICY "Owner can insert fitment"
  ON public.listing_fitment FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

CREATE POLICY "Owner can update fitment"
  ON public.listing_fitment FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

CREATE POLICY "Owner can delete fitment"
  ON public.listing_fitment FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

CREATE INDEX listing_fitment_lookup_idx
  ON public.listing_fitment (lower(make), lower(model), year_min, year_max);

CREATE INDEX listing_fitment_listing_idx
  ON public.listing_fitment (listing_id);


-- ============================================================================
-- SOURCE MIGRATION: 20260612083700_a84d7d79-b5c4-45b0-a897-5d9cc8211d55.sql
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.can_support(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.can_moderate(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.can_manage_org(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.can_manage_ads(uuid) TO anon;


-- ============================================================================
-- SOURCE MIGRATION: 20260612083840_d97f4a0f-e475-415c-b725-117c1d8854fc.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.seller_account_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND account_status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.seller_account_active(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Active listings public read" ON public.listings;
CREATE POLICY "Active listings public read"
ON public.listings
FOR SELECT
USING (
  (status IN ('active'::listing_status, 'pending_sale'::listing_status)
   AND public.seller_account_active(user_id))
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);


-- ============================================================================
-- SOURCE MIGRATION: 20260612095918_23be51e3-0d54-4b89-9256-2ae888bf7934.sql
-- ============================================================================

update public.listing_media set url = '/__l5e/assets-v1/02e59b7a-ca35-4bb9-b6d5-9ff15622acd1/180sx.jpg' where url like '%/180sx.jpg';
update public.listing_media set url = '/__l5e/assets-v1/e2654ed6-5a62-482c-b251-6bd1fe3e7619/ae86.jpg'  where url like '%/ae86.jpg';
update public.listing_media set url = '/__l5e/assets-v1/1ea6ebb5-24b0-46e3-ba59-4995eeb16e0c/celica.jpg' where url like '%/celica.jpg';
update public.listing_media set url = '/__l5e/assets-v1/e55089b7-4211-45e9-8b26-467cb2919158/evo.jpg' where url like '%/evo.jpg';
update public.listing_media set url = '/__l5e/assets-v1/06e53b05-6234-4284-ab5a-21036610061a/r32.jpg' where url like '%/r32.jpg';
update public.listing_media set url = '/__l5e/assets-v1/8b1f7da3-1133-4ce5-b5b9-ebc0644c6123/rx7.jpg' where url like '%/rx7.jpg';
update public.listing_media set url = '/__l5e/assets-v1/8f1c856e-45e6-436d-8e64-4feaf4961559/s13.jpg' where url like '%/s13.jpg';
update public.listing_media set url = '/__l5e/assets-v1/39ec0367-0395-489f-aa8c-26e69d93f405/supra.jpg' where url like '%/supra.jpg';
update public.listing_media set url = '/__l5e/assets-v1/d5cbceee-859a-4014-a121-e06c6edc7558/wrx.jpg' where url like '%/wrx.jpg';
update public.listing_media set url = '/__l5e/assets-v1/0c8c4a23-2ed0-48ef-bd77-7c094617fe5e/z32.jpg' where url like '%/z32.jpg';


-- ============================================================================
-- SOURCE MIGRATION: 20260612101500_207a2c27-ab68-4f15-9c77-df3f81333e51.sql
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid, uuid) TO anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260612105044_94140c07-aee7-4c48-a6d3-beba9a7e0f98.sql
-- ============================================================================
-- Add public-summary fields to reports
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS public_summary text,
  ADD COLUMN IF NOT EXISTS made_public_at timestamptz,
  ADD COLUMN IF NOT EXISTS made_public_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reports_listing_status_idx ON public.reports(listing_id, status);

-- Public per-listing report summary (counts + admin-curated public notes only)
CREATE OR REPLACE FUNCTION public.get_listing_report_summary(_listing_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'listing_id', _listing_id,
    'open_count', COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0),
    'resolved_count', COALESCE(SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END), 0),
    'total', COUNT(*),
    'categories', COALESCE((
      SELECT jsonb_object_agg(cat, c)
      FROM (
        SELECT COALESCE(NULLIF(btrim(category), ''), reason, 'other') AS cat, COUNT(*) AS c
        FROM public.reports
        WHERE listing_id = _listing_id AND target_type = 'listing'
        GROUP BY 1
      ) s
    ), '{}'::jsonb),
    'public_notes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'category', COALESCE(NULLIF(btrim(category), ''), reason),
        'summary', public_summary,
        'made_public_at', made_public_at,
        'status', status
      ) ORDER BY made_public_at DESC)
      FROM public.reports
      WHERE listing_id = _listing_id
        AND target_type = 'listing'
        AND public_summary IS NOT NULL
    ), '[]'::jsonb)
  )
  FROM public.reports
  WHERE listing_id = _listing_id AND target_type = 'listing';
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_report_summary(uuid) TO anon, authenticated;

-- Batch summary for card feeds
CREATE OR REPLACE FUNCTION public.get_listing_report_summaries(_listing_ids uuid[])
RETURNS TABLE(listing_id uuid, open_count bigint, resolved_count bigint, total bigint, has_public_notes boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.listing_id,
    SUM(CASE WHEN r.status = 'open' THEN 1 ELSE 0 END)::bigint AS open_count,
    SUM(CASE WHEN r.status = 'resolved' THEN 1 ELSE 0 END)::bigint AS resolved_count,
    COUNT(*)::bigint AS total,
    BOOL_OR(r.public_summary IS NOT NULL) AS has_public_notes
  FROM public.reports r
  WHERE r.target_type = 'listing'
    AND r.listing_id = ANY(_listing_ids)
  GROUP BY r.listing_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_report_summaries(uuid[]) TO anon, authenticated;

-- Staff-only pending counts across all moderation queues
CREATE OR REPLACE FUNCTION public.admin_pending_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.can_support(uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'reports_open',
      (SELECT COUNT(*) FROM public.reports WHERE status = 'open'),
    'verifications_pending',
      (SELECT COUNT(*) FROM public.verification_requests WHERE status::text = 'pending'),
    'claims_pending',
      (SELECT COUNT(*) FROM public.business_claim_requests WHERE status::text = 'pending'),
    'payments_pending',
      (SELECT COUNT(*) FROM public.payments
        WHERE status::text = 'pending'
           OR review_state::text IN ('pending_review','needs_info','awaiting_review')),
    'ad_inquiries_open',
      (SELECT COUNT(*) FROM public.ad_inquiries WHERE status::text IN ('new','in_review')),
    'service_inquiries_open',
      (SELECT COUNT(*) FROM public.service_inquiries WHERE status::text IN ('new','open')),
    'business_inquiries_open',
      (SELECT COUNT(*) FROM public.business_inquiries WHERE status::text IN ('new','open')),
    'location_corrections_pending',
      (SELECT COUNT(*) FROM public.business_location_corrections WHERE status::text = 'pending'),
    'type_suggestions_pending',
      (SELECT COUNT(*) FROM public.business_type_suggestions WHERE status::text = 'pending'),
    'ad_campaigns_pending',
      (SELECT COUNT(*) FROM public.advertisements WHERE status::text IN ('pending','pending_review','draft')),
    'ops_alerts_unack',
      (SELECT COUNT(*) FROM public.ops_alerts WHERE acknowledged_at IS NULL),
    'support_tickets_open',
      (SELECT COUNT(*) FROM public.support_tickets WHERE status::text IN ('open','new','pending')),
    'discover_queue_pending',
      (SELECT COUNT(*) FROM public.business_discovery_queue WHERE status::text = 'pending'),
    'lead_offers_open',
      (SELECT COUNT(*) FROM public.lead_offers WHERE status::text = 'open')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_pending_counts() TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260613035610_c210e9ab-f101-44b8-9bc3-ad6dd05e0ff9.sql
-- ============================================================================
ALTER TABLE public.listing_price_history
  ADD COLUMN IF NOT EXISTS field text NOT NULL DEFAULT 'asking';

CREATE OR REPLACE FUNCTION public.tg_listing_price_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old numeric;
  v_new numeric;
  v_delta numeric;
  v_pct numeric;
BEGIN
  v_old := COALESCE(OLD.price_php, 0);
  v_new := COALESCE(NEW.price_php, 0);
  IF v_old <> v_new AND v_old > 0 AND v_new > 0 THEN
    v_delta := v_new - v_old;
    v_pct := ROUND((v_delta / v_old) * 100.0, 2);
    INSERT INTO public.listing_price_history (listing_id, old_price_php, new_price_php, delta_php, delta_pct, field)
    VALUES (NEW.id, v_old, v_new, v_delta, v_pct, 'asking');
  END IF;
  v_old := COALESCE(OLD.monthly_php, 0);
  v_new := COALESCE(NEW.monthly_php, 0);
  IF v_old <> v_new AND v_old > 0 AND v_new > 0 THEN
    v_delta := v_new - v_old;
    v_pct := ROUND((v_delta / v_old) * 100.0, 2);
    INSERT INTO public.listing_price_history (listing_id, old_price_php, new_price_php, delta_php, delta_pct, field)
    VALUES (NEW.id, v_old, v_new, v_delta, v_pct, 'monthly');
  END IF;
  v_old := COALESCE(OLD.down_payment_php, 0);
  v_new := COALESCE(NEW.down_payment_php, 0);
  IF v_old <> v_new AND v_old > 0 AND v_new > 0 THEN
    v_delta := v_new - v_old;
    v_pct := ROUND((v_delta / v_old) * 100.0, 2);
    INSERT INTO public.listing_price_history (listing_id, old_price_php, new_price_php, delta_php, delta_pct, field)
    VALUES (NEW.id, v_old, v_new, v_delta, v_pct, 'down_payment');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TABLE IF NOT EXISTS public.listing_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  label text NOT NULL,
  percent_off numeric(5,2),
  amount_off_php numeric(14,2),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_promotions_listing_active
  ON public.listing_promotions(listing_id, ends_at DESC);

GRANT SELECT ON public.listing_promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_promotions TO authenticated;
GRANT ALL ON public.listing_promotions TO service_role;

ALTER TABLE public.listing_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active promos for visible listings"
  ON public.listing_promotions FOR SELECT
  USING (
    ends_at > now() AND starts_at <= now() AND EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_promotions.listing_id
        AND l.status IN ('active','pending_sale')
    )
  );

CREATE POLICY "Owners manage own listing promos"
  ON public.listing_promotions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid()));

CREATE POLICY "Staff manage all listing promos"
  ON public.listing_promotions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sales'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sales'::app_role));

CREATE TRIGGER trg_listing_promotions_updated
  BEFORE UPDATE ON public.listing_promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_listing_price_trend(_listing_id uuid)
RETURNS TABLE(
  field text,
  old_price_php numeric,
  new_price_php numeric,
  delta_php numeric,
  delta_pct numeric,
  direction text,
  changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT h.field, h.old_price_php, h.new_price_php, h.delta_php, h.delta_pct,
    CASE WHEN h.delta_php > 0 THEN 'up' ELSE 'down' END, h.changed_at
  FROM public.listing_price_history h
  JOIN public.listings l ON l.id = h.listing_id
  WHERE h.listing_id = _listing_id
    AND l.status IN ('active','pending_sale')
    AND h.changed_at > now() - interval '30 days'
  ORDER BY h.changed_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_price_trend(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_listing_price_trends(_listing_ids uuid[])
RETURNS TABLE(
  listing_id uuid,
  field text,
  delta_php numeric,
  delta_pct numeric,
  direction text,
  changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (h.listing_id) h.listing_id, h.field, h.delta_php, h.delta_pct,
    CASE WHEN h.delta_php > 0 THEN 'up' ELSE 'down' END, h.changed_at
  FROM public.listing_price_history h
  JOIN public.listings l ON l.id = h.listing_id
  WHERE h.listing_id = ANY(_listing_ids)
    AND l.status IN ('active','pending_sale')
    AND h.changed_at > now() - interval '30 days'
  ORDER BY h.listing_id, h.changed_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_price_trends(uuid[]) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_listing_price_history(_listing_id uuid)
RETURNS TABLE(
  field text,
  old_price_php numeric,
  new_price_php numeric,
  delta_php numeric,
  delta_pct numeric,
  direction text,
  changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT h.field, h.old_price_php, h.new_price_php, h.delta_php, h.delta_pct,
    CASE WHEN h.delta_php > 0 THEN 'up' ELSE 'down' END, h.changed_at
  FROM public.listing_price_history h
  JOIN public.listings l ON l.id = h.listing_id
  WHERE h.listing_id = _listing_id
    AND l.status IN ('active','pending_sale')
  ORDER BY h.changed_at DESC
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_price_history(uuid) TO anon, authenticated, service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260613041354_d7a99bca-9ea5-4580-8838-8e5059e5816e.sql
-- ============================================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.parts_wanted_kind AS ENUM ('part', 'parting_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.parts_wanted_status AS ENUM ('open', 'closed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ parts_wanted ============
CREATE TABLE IF NOT EXISTS public.parts_wanted (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.parts_wanted_kind NOT NULL DEFAULT 'part',
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 4 AND 140),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 4000),
  vehicle_category TEXT,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  engine_code TEXT,
  trim TEXT,
  part_category TEXT,
  part_keywords TEXT[] NOT NULL DEFAULT '{}',
  condition_pref TEXT NOT NULL DEFAULT 'any',
  budget_max_php NUMERIC(12,2),
  region TEXT,
  city TEXT,
  alert_frequency TEXT NOT NULL DEFAULT 'instant' CHECK (alert_frequency IN ('off','instant','daily')),
  last_alerted_at TIMESTAMPTZ,
  status public.parts_wanted_status NOT NULL DEFAULT 'open',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parts_wanted_user_idx ON public.parts_wanted(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_wanted_status_idx ON public.parts_wanted(status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_wanted_lookup_idx ON public.parts_wanted(lower(make), lower(model), year) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS parts_wanted_engine_idx ON public.parts_wanted(lower(engine_code)) WHERE status = 'open' AND engine_code IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_wanted TO authenticated;
GRANT SELECT ON public.parts_wanted TO anon;
GRANT ALL ON public.parts_wanted TO service_role;

ALTER TABLE public.parts_wanted ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open parts_wanted"
  ON public.parts_wanted FOR SELECT
  USING (status = 'open' OR auth.uid() = user_id);

CREATE POLICY "Users insert own parts_wanted"
  ON public.parts_wanted FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own parts_wanted"
  ON public.parts_wanted FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own parts_wanted"
  ON public.parts_wanted FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_parts_wanted_updated_at
  BEFORE UPDATE ON public.parts_wanted
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ parts_wanted_matches ============
CREATE TABLE IF NOT EXISTS public.parts_wanted_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wanted_id UUID NOT NULL REFERENCES public.parts_wanted(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  UNIQUE (wanted_id, listing_id)
);

CREATE INDEX IF NOT EXISTS parts_wanted_matches_wanted_idx ON public.parts_wanted_matches(wanted_id, matched_at DESC);
CREATE INDEX IF NOT EXISTS parts_wanted_matches_unsent_idx ON public.parts_wanted_matches(notified_at) WHERE notified_at IS NULL AND dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS parts_wanted_matches_listing_idx ON public.parts_wanted_matches(listing_id);

GRANT SELECT, UPDATE ON public.parts_wanted_matches TO authenticated;
GRANT ALL ON public.parts_wanted_matches TO service_role;

ALTER TABLE public.parts_wanted_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their matches"
  ON public.parts_wanted_matches FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parts_wanted w WHERE w.id = wanted_id AND w.user_id = auth.uid()));

CREATE POLICY "Owners dismiss their matches"
  ON public.parts_wanted_matches FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parts_wanted w WHERE w.id = wanted_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.parts_wanted w WHERE w.id = wanted_id AND w.user_id = auth.uid()));

-- ============ Match function ============
CREATE OR REPLACE FUNCTION public.match_listing_to_parts_wanted(p_listing_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_fitment_makes TEXT[];
  v_fitment_models TEXT[];
  v_engine_text TEXT;
  v_text_blob TEXT;
  v_inserted INTEGER := 0;
  v_w RECORD;
  v_score NUMERIC;
  v_kw TEXT;
BEGIN
  SELECT id, title, COALESCE(description,''), category_slug, region, attributes, status, user_id
    INTO v_listing
    FROM public.listings WHERE id = p_listing_id;
  IF NOT FOUND OR v_listing.status <> 'published' OR v_listing.category_slug <> 'parts' THEN
    RETURN 0;
  END IF;

  v_text_blob := lower(coalesce(v_listing.title,'') || ' ' || coalesce(v_listing.description::text,'') || ' ' || coalesce(v_listing.attributes::text,''));
  v_engine_text := lower(coalesce(v_listing.attributes->>'engine_code',''));

  FOR v_w IN
    SELECT * FROM public.parts_wanted
    WHERE status = 'open' AND expires_at > now() AND user_id <> v_listing.user_id
  LOOP
    v_score := 0;

    -- Fitment make/model match
    IF EXISTS (
      SELECT 1 FROM public.listing_fitment f
      WHERE f.listing_id = v_listing.id
        AND lower(f.make) = lower(v_w.make)
        AND lower(f.model) = lower(v_w.model)
    ) THEN
      v_score := v_score + 3;
      -- Year in range
      IF v_w.year IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.listing_fitment f
        WHERE f.listing_id = v_listing.id
          AND lower(f.make) = lower(v_w.make)
          AND lower(f.model) = lower(v_w.model)
          AND (f.year_min IS NULL OR v_w.year >= f.year_min)
          AND (f.year_max IS NULL OR v_w.year <= f.year_max)
      ) THEN
        v_score := v_score + 2;
      END IF;
    ELSE
      -- Fallback: title/description contains make and model words
      IF position(lower(v_w.make) IN v_text_blob) > 0 AND position(lower(v_w.model) IN v_text_blob) > 0 THEN
        v_score := v_score + 2;
        IF v_w.year IS NOT NULL AND position(v_w.year::text IN v_text_blob) > 0 THEN
          v_score := v_score + 1;
        END IF;
      END IF;
    END IF;

    -- Engine code match
    IF v_w.engine_code IS NOT NULL AND length(v_w.engine_code) >= 3 THEN
      IF v_engine_text = lower(v_w.engine_code)
         OR position(lower(v_w.engine_code) IN v_text_blob) > 0
         OR position(lower(regexp_replace(v_w.engine_code,'[-_ ]','','g')) IN regexp_replace(v_text_blob,'[-_ ]','','g')) > 0 THEN
        v_score := v_score + 2;
      END IF;
    END IF;

    -- Part keywords
    IF v_w.part_keywords IS NOT NULL THEN
      FOREACH v_kw IN ARRAY v_w.part_keywords LOOP
        IF length(v_kw) >= 2 AND position(lower(v_kw) IN v_text_blob) > 0 THEN
          v_score := v_score + 1;
        END IF;
      END LOOP;
    END IF;

    -- Region bonus
    IF v_w.region IS NOT NULL AND v_listing.region IS NOT NULL
       AND lower(v_w.region) = lower(v_listing.region) THEN
      v_score := v_score + 1;
    END IF;

    IF v_score >= 4 THEN
      INSERT INTO public.parts_wanted_matches (wanted_id, listing_id, score)
      VALUES (v_w.id, v_listing.id, v_score)
      ON CONFLICT (wanted_id, listing_id)
        DO UPDATE SET score = GREATEST(public.parts_wanted_matches.score, EXCLUDED.score);
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  RETURN v_inserted;
END;
$$;

-- ============ Backfill on new wanted ============
CREATE OR REPLACE FUNCTION public.backfill_parts_wanted(p_wanted_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOR v_listing_id IN
    SELECT id FROM public.listings
    WHERE status = 'published'
      AND category_slug = 'parts'
      AND published_at > now() - interval '60 days'
  LOOP
    -- Re-use match function but only for this wanted: simpler to call generic and let unique constraint filter.
    PERFORM public.match_listing_to_parts_wanted(v_listing_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ============ Trigger on listings ============
CREATE OR REPLACE FUNCTION public.tg_listings_match_parts_wanted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category_slug = 'parts' AND NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.match_listing_to_parts_wanted(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_match_parts_wanted ON public.listings;
CREATE TRIGGER trg_listings_match_parts_wanted
  AFTER INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_listings_match_parts_wanted();

-- ============ Public RPC: count wanted matching a listing (badge) ============
CREATE OR REPLACE FUNCTION public.get_listing_wanted_count(p_listing_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT m.wanted_id)::INT
  FROM public.parts_wanted_matches m
  JOIN public.parts_wanted w ON w.id = m.wanted_id
  WHERE m.listing_id = p_listing_id AND w.status = 'open';
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_wanted_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_listing_to_parts_wanted(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.backfill_parts_wanted(UUID) TO service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260613042135_3c1c1370-98c3-4ac6-8cd5-bfe4716ac7e8.sql
-- ============================================================================
-- Fix: Vehicle Passport Premium payments were silently failing to record because
-- "passport_premium" was not a valid payment_kind enum value (webhook.ts
-- activatePassportPremiumFromSession inserts kind: "passport_premium").
ALTER TYPE public.payment_kind ADD VALUE IF NOT EXISTS 'passport_premium';


-- ============================================================================
-- SOURCE MIGRATION: 20260613050000_00d9de2b-0532-432b-85bb-44d0b430cfe3.sql
-- ============================================================================
-- Fix: Business directory and dispatch (towing provider) subscription renewal
-- invoices were never recorded in `payments` because recordPaymentFromInvoice()
-- in webhook.ts only checked the `subscriptions` table for the Stripe
-- subscription id, and "business_subscription" / "dispatch_subscription" were
-- not valid payment_kind enum values. Part of the unified revenue reporting fix.
ALTER TYPE public.payment_kind ADD VALUE IF NOT EXISTS 'business_subscription';
ALTER TYPE public.payment_kind ADD VALUE IF NOT EXISTS 'dispatch_subscription';


-- ============================================================================
-- SOURCE MIGRATION: 20260613050100_58e517f1-dbd6-4dd3-b29a-7dd40fd936c8.sql
-- ============================================================================
-- Backfill: historical Vehicle Passport Premium purchases recorded before the
-- "passport_premium" payment_kind enum value existed have payment_id = NULL,
-- because the payments insert in activatePassportPremiumFromSession() was
-- silently failing (see migration 20260613042135). Create the missing
-- `payments` rows (priced from passport_premium_products) and link them back
-- via payment_id so revenue reporting ("Revenue by product") includes these
-- historical purchases.
WITH inserted AS (
  INSERT INTO public.payments (
    user_id, kind, status, amount_php, gross_amount_php, method, reference, paid_at, created_at
  )
  SELECT
    ppp.user_id,
    'passport_premium'::public.payment_kind,
    'paid'::public.payment_status,
    prod.price_php,
    prod.price_php,
    'stripe',
    COALESCE('stripe_session:' || ppp.stripe_session_id, 'backfill:passport_premium_purchases:' || ppp.id::text),
    ppp.created_at,
    ppp.created_at
  FROM public.passport_premium_purchases ppp
  JOIN public.passport_premium_products prod ON prod.slug = ppp.product_slug
  WHERE ppp.payment_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.payments p2
      WHERE p2.reference = COALESCE('stripe_session:' || ppp.stripe_session_id, 'backfill:passport_premium_purchases:' || ppp.id::text)
    )
  RETURNING id, reference
)
UPDATE public.passport_premium_purchases ppp
SET payment_id = inserted.id
FROM inserted
WHERE ppp.payment_id IS NULL
  AND COALESCE('stripe_session:' || ppp.stripe_session_id, 'backfill:passport_premium_purchases:' || ppp.id::text) = inserted.reference;


-- ============================================================================
-- SOURCE MIGRATION: 20260613171425_1213eb65-8a37-49f4-8c6a-322d6c9cb5b8.sql
-- ============================================================================

INSERT INTO public.subscription_plans (name, price_php, stripe_lookup_key, features, sort_order, max_photos_per_listing)
SELECT 'Shop Manager Solo', 799.00, 'shop_manager_solo_monthly',
  '["1 technician","Unlimited work orders","Customer + vehicle history","Invoicing","Mobile-friendly"]'::jsonb, 100, 5
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE stripe_lookup_key = 'shop_manager_solo_monthly');

INSERT INTO public.subscription_plans (name, price_php, stripe_lookup_key, features, sort_order, max_photos_per_listing)
SELECT 'Shop Manager Pro', 1999.00, 'shop_manager_pro_monthly',
  '["Up to 10 technicians","Inventory + parts tracking","Repair plans + quotes","Photo VINs / inspections","Email + SMS reminders","Priority support"]'::jsonb, 101, 5
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE stripe_lookup_key = 'shop_manager_pro_monthly');

CREATE TABLE IF NOT EXISTS public.shop_manager_provisioning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  external_account_id text,
  external_user_email text,
  tier text,
  sso_provisioned_at timestamptz,
  last_sso_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shop_manager_provisioning TO authenticated;
GRANT ALL    ON public.shop_manager_provisioning TO service_role;

ALTER TABLE public.shop_manager_provisioning ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_manager_provisioning own row read" ON public.shop_manager_provisioning;
CREATE POLICY "shop_manager_provisioning own row read"
  ON public.shop_manager_provisioning FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tg_shop_manager_provisioning_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS shop_manager_provisioning_touch ON public.shop_manager_provisioning;
CREATE TRIGGER shop_manager_provisioning_touch
  BEFORE UPDATE ON public.shop_manager_provisioning
  FOR EACH ROW EXECUTE FUNCTION public.tg_shop_manager_provisioning_touch();


-- ============================================================================
-- SOURCE MIGRATION: 20260614085350_85fe0599-95d4-4737-b909-bebe0a2fd766.sql
-- ============================================================================

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS resolution text CHECK (resolution IN ('accepted','dismissed')),
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS signals jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS reports_reporter_idx ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS reports_resolution_idx ON public.reports(resolution);

ALTER TABLE public.listing_media
  ADD COLUMN IF NOT EXISTS phash text,
  ADD COLUMN IF NOT EXISTS file_sha256 text;

CREATE INDEX IF NOT EXISTS listing_media_phash_idx ON public.listing_media(phash) WHERE phash IS NOT NULL;
CREATE INDEX IF NOT EXISTS listing_media_sha_idx ON public.listing_media(file_sha256) WHERE file_sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS listing_media_storage_path_idx ON public.listing_media(storage_path) WHERE storage_path IS NOT NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260614090848_beea068c-2b7b-4f59-b645-1382f7e6693c.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.form_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id text NOT NULL,
  page_path text,
  message text NOT NULL,
  suggestion_type text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_email text,
  user_agent text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS form_feedback_form_idx ON public.form_feedback(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS form_feedback_status_idx ON public.form_feedback(status, created_at DESC);
GRANT SELECT, INSERT ON public.form_feedback TO authenticated;
GRANT INSERT ON public.form_feedback TO anon;
GRANT ALL ON public.form_feedback TO service_role;
ALTER TABLE public.form_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can submit feedback" ON public.form_feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "users can read own feedback" ON public.form_feedback FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins can read all feedback" ON public.form_feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can update feedback" ON public.form_feedback FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- SOURCE MIGRATION: 20260615022440_4d6fb9e4-c294-4d42-a9f0-401223fa4169.sql
-- ============================================================================

-- Enum for request status
DO $$ BEGIN
  CREATE TYPE public.staff_contact_request_status AS ENUM ('pending','approved','denied','expired','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.staff_contact_audit_action AS ENUM ('created','approved','denied','revoked','expired','accessed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Requests table
CREATE TABLE IF NOT EXISTS public.staff_client_contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id UUID,
  ad_inquiry_id UUID,
  reason TEXT NOT NULL,
  status public.staff_contact_request_status NOT NULL DEFAULT 'pending',
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (requester_id <> owner_id),
  CHECK (client_profile_id IS NOT NULL OR lead_id IS NOT NULL OR ad_inquiry_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_scc_requests_owner_status ON public.staff_client_contact_requests(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_scc_requests_requester_status ON public.staff_client_contact_requests(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_scc_requests_client ON public.staff_client_contact_requests(client_profile_id);

GRANT SELECT, INSERT, UPDATE ON public.staff_client_contact_requests TO authenticated;
GRANT ALL ON public.staff_client_contact_requests TO service_role;

ALTER TABLE public.staff_client_contact_requests ENABLE ROW LEVEL SECURITY;

-- Audit table (append-only)
CREATE TABLE IF NOT EXISTS public.staff_client_contact_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.staff_client_contact_requests(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action public.staff_contact_audit_action NOT NULL,
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scc_audit_request ON public.staff_client_contact_audit(request_id, created_at DESC);

GRANT SELECT, INSERT ON public.staff_client_contact_audit TO authenticated;
GRANT ALL ON public.staff_client_contact_audit TO service_role;

ALTER TABLE public.staff_client_contact_audit ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_scc_requests_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_scc_requests_updated_at ON public.staff_client_contact_requests;
CREATE TRIGGER trg_scc_requests_updated_at
  BEFORE UPDATE ON public.staff_client_contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_scc_requests_set_updated_at();

-- Helper: is_365_staff (admin/moderator OR @365motorsales.com email)
CREATE OR REPLACE FUNCTION public.is_365_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','moderator')
  ) OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id AND lower(email) LIKE '%@365motorsales.com'
  );
$$;

-- Helper: active client access
CREATE OR REPLACE FUNCTION public.has_active_client_access(_requester UUID, _owner UUID, _client UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_client_contact_requests
    WHERE requester_id = _requester
      AND owner_id = _owner
      AND client_profile_id = _client
      AND status = 'approved'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- RLS policies: requests
DROP POLICY IF EXISTS "scc_requests_select" ON public.staff_client_contact_requests;
CREATE POLICY "scc_requests_select" ON public.staff_client_contact_requests
  FOR SELECT TO authenticated
  USING (
    auth.uid() = requester_id
    OR auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "scc_requests_insert" ON public.staff_client_contact_requests;
CREATE POLICY "scc_requests_insert" ON public.staff_client_contact_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND public.is_365_staff(auth.uid())
    AND public.is_365_staff(owner_id)
  );

DROP POLICY IF EXISTS "scc_requests_update" ON public.staff_client_contact_requests;
CREATE POLICY "scc_requests_update" ON public.staff_client_contact_requests
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id
    OR auth.uid() = requester_id
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR auth.uid() = requester_id
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS policies: audit
DROP POLICY IF EXISTS "scc_audit_select" ON public.staff_client_contact_audit;
CREATE POLICY "scc_audit_select" ON public.staff_client_contact_audit
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.staff_client_contact_requests r
      WHERE r.id = request_id
        AND (r.requester_id = auth.uid() OR r.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "scc_audit_insert" ON public.staff_client_contact_audit;
CREATE POLICY "scc_audit_insert" ON public.staff_client_contact_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.staff_client_contact_requests r
      WHERE r.id = request_id
        AND (r.requester_id = auth.uid() OR r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );


-- ============================================================================
-- SOURCE MIGRATION: 20260615031547_8dcbb6a4-32d5-47c7-9ba9-bcfcb23177aa.sql
-- ============================================================================

-- 1. Sequence + column
CREATE SEQUENCE IF NOT EXISTS public.profiles_member_number_seq;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS member_number BIGINT;

-- 2. Backfill in created_at order so older users get lower numbers
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.profiles
  WHERE member_number IS NULL
)
UPDATE public.profiles p
SET member_number = o.rn
FROM ordered o
WHERE p.id = o.id;

-- 3. Advance the sequence past existing max
SELECT setval(
  'public.profiles_member_number_seq',
  GREATEST(COALESCE((SELECT MAX(member_number) FROM public.profiles), 0), 1),
  true
);

-- 4. Default + unique
ALTER TABLE public.profiles
  ALTER COLUMN member_number SET DEFAULT nextval('public.profiles_member_number_seq');

ALTER SEQUENCE public.profiles_member_number_seq OWNED BY public.profiles.member_number;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_member_number_key
  ON public.profiles(member_number);

-- 5. Trigger to assign on insert if NULL was passed
CREATE OR REPLACE FUNCTION public.assign_profile_member_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.member_number IS NULL THEN
    NEW.member_number := nextval('public.profiles_member_number_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_profile_member_number ON public.profiles;
CREATE TRIGGER trg_assign_profile_member_number
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_profile_member_number();


-- ============================================================================
-- SOURCE MIGRATION: 20260615040047_45f630ff-bc04-4acc-abb9-c48a7ebd148d.sql
-- ============================================================================

-- ============================================================
-- report_actions: append-only ledger of every moderation step
-- ============================================================
CREATE TABLE public.report_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN (
    'accept','dismiss','hide_listing','delete_listing','restore_listing',
    'publish_summary','unpublish_summary','reverse','dispute_overturn','dispute_uphold','note'
  )),
  prev_status text,
  new_status text,
  prev_resolution text,
  new_resolution text,
  score_delta int NOT NULL DEFAULT 0,
  listing_effect text NOT NULL DEFAULT 'none' CHECK (listing_effect IN ('none','hidden','deleted','restored')),
  notified_poster boolean NOT NULL DEFAULT false,
  note text,
  reversed_by_action_id uuid REFERENCES public.report_actions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX report_actions_report_idx ON public.report_actions(report_id, created_at DESC);
CREATE INDEX report_actions_actor_idx ON public.report_actions(actor_id);

GRANT SELECT ON public.report_actions TO authenticated;
GRANT ALL ON public.report_actions TO service_role;

ALTER TABLE public.report_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read report_actions" ON public.report_actions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- Posters can read actions on reports targeting their own listings
CREATE POLICY "poster reads own report_actions" ON public.report_actions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reports r
    JOIN public.listings l ON l.id = r.listing_id
    WHERE r.id = report_actions.report_id AND l.user_id = auth.uid()
  ));

-- ============================================================
-- report_disputes
-- ============================================================
CREATE TABLE public.report_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','upheld','overturned','withdrawn')),
  admin_response text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  score_refund int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- One open dispute per report per user
CREATE UNIQUE INDEX report_disputes_one_open_idx
  ON public.report_disputes(report_id, user_id) WHERE status = 'open';
CREATE INDEX report_disputes_user_idx ON public.report_disputes(user_id);
CREATE INDEX report_disputes_status_idx ON public.report_disputes(status);

GRANT SELECT, INSERT, UPDATE ON public.report_disputes TO authenticated;
GRANT ALL ON public.report_disputes TO service_role;

ALTER TABLE public.report_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage disputes" ON public.report_disputes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "poster reads own dispute" ON public.report_disputes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Allow a poster to file a dispute on a report whose listing they own, within 14 days of resolution
CREATE POLICY "poster files dispute" ON public.report_disputes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.reports r
      JOIN public.listings l ON l.id = r.listing_id
      WHERE r.id = report_id
        AND l.user_id = auth.uid()
        AND r.status = 'resolved'
        AND r.resolved_at IS NOT NULL
        AND r.resolved_at > now() - interval '14 days'
    )
  );

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER report_disputes_updated
  BEFORE UPDATE ON public.report_disputes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- trust_score_events
-- ============================================================
CREATE TABLE public.trust_score_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta int NOT NULL,
  reason_code text NOT NULL,
  reason_label text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('report','dispute','review','verification','listing','bonus','tier','manual')),
  source_id uuid,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trust_score_events_user_idx ON public.trust_score_events(user_id, created_at DESC);
CREATE INDEX trust_score_events_source_idx ON public.trust_score_events(source_type, source_id);

GRANT SELECT ON public.trust_score_events TO authenticated;
GRANT ALL ON public.trust_score_events TO service_role;

ALTER TABLE public.trust_score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read trust events" ON public.trust_score_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "user reads own trust events" ON public.trust_score_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Aggregated score view (500 baseline, clamped 0..1000)
CREATE OR REPLACE FUNCTION public.get_trust_score(_user_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(0, LEAST(1000, 500 + COALESCE((
    SELECT SUM(delta)::int FROM public.trust_score_events WHERE user_id = _user_id
  ), 0)));
$$;

-- ============================================================
-- member_tiers (config, seeded)
-- ============================================================
CREATE TABLE public.member_tiers (
  id text PRIMARY KEY, -- 'common'|'uncommon'|'rare'|'epic'|'legendary'
  name text NOT NULL,
  min_score int NOT NULL,
  min_tenure_days int NOT NULL,
  color text NOT NULL,
  rank int NOT NULL UNIQUE,
  quarterly_boost_credits int NOT NULL DEFAULT 0,
  annual_boost_credits int NOT NULL DEFAULT 0,
  annual_badge_months int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.member_tiers TO authenticated, anon;
GRANT ALL ON public.member_tiers TO service_role;
ALTER TABLE public.member_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiers readable" ON public.member_tiers FOR SELECT USING (true);

INSERT INTO public.member_tiers (id,name,min_score,min_tenure_days,color,rank,quarterly_boost_credits,annual_boost_credits,annual_badge_months) VALUES
  ('common','Common',0,0,'slate',1,1,0,0),
  ('uncommon','Uncommon',550,30,'green',2,2,4,0),
  ('rare','Rare',650,90,'blue',3,4,8,3),
  ('epic','Epic',750,180,'purple',4,7,15,6),
  ('legendary','Legendary',875,365,'amber',5,12,30,12);

-- ============================================================
-- member_rewards (issued)
-- ============================================================
CREATE TABLE public.member_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id text REFERENCES public.member_tiers(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('boost_credit','featured_badge','spotlight','custom')),
  amount int NOT NULL DEFAULT 1,
  period text, -- 'q1-2026', '2026' etc
  status text NOT NULL DEFAULT 'granted' CHECK (status IN ('granted','claimed','expired','revoked')),
  expires_at timestamptz,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);
CREATE INDEX member_rewards_user_idx ON public.member_rewards(user_id, status);

GRANT SELECT, UPDATE ON public.member_rewards TO authenticated;
GRANT ALL ON public.member_rewards TO service_role;
ALTER TABLE public.member_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own rewards" ON public.member_rewards
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user claims own reward" ON public.member_rewards
  FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff manage rewards" ON public.member_rewards
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- apply_report_action RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_report_action(
  _report_id uuid,
  _action text,
  _note text DEFAULT NULL,
  _hide_listing boolean DEFAULT false,
  _delete_listing boolean DEFAULT false,
  _notify_poster boolean DEFAULT false,
  _reverses_action_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _report public.reports%ROWTYPE;
  _listing public.listings%ROWTYPE;
  _delta int := 0;
  _listing_effect text := 'none';
  _new_status text;
  _new_resolution text;
  _action_id uuid;
  _reason_code text;
  _reason_label text;
BEGIN
  IF NOT (public.has_role(_actor,'admin') OR public.has_role(_actor,'moderator')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO _report FROM public.reports WHERE id = _report_id FOR UPDATE;
  IF _report.id IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;

  IF _report.listing_id IS NOT NULL THEN
    SELECT * INTO _listing FROM public.listings WHERE id = _report.listing_id;
  END IF;

  -- Reverse only permitted to admins
  IF _action = 'reverse' AND NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'Only admins can reverse decisions';
  END IF;

  -- Compute effects
  IF _action = 'accept' THEN
    _new_status := 'resolved'; _new_resolution := 'accepted';
    _delta := -25; _reason_code := 'report_accepted'; _reason_label := 'Report accepted against you';
  ELSIF _action = 'dismiss' THEN
    _new_status := 'resolved'; _new_resolution := 'dismissed';
    _delta := 0; _reason_code := 'report_dismissed'; _reason_label := 'Report dismissed';
  ELSIF _action = 'reverse' THEN
    _new_status := 'open'; _new_resolution := NULL;
    -- Invert original delta
    IF _reverses_action_id IS NOT NULL THEN
      SELECT -score_delta INTO _delta FROM public.report_actions WHERE id = _reverses_action_id;
      _delta := COALESCE(_delta,0);
    END IF;
    _reason_code := 'decision_reversed'; _reason_label := 'Prior moderation decision reversed';
  ELSE
    -- Non-status-changing actions inherit current status
    _new_status := _report.status; _new_resolution := _report.resolution;
  END IF;

  -- Listing side effects
  IF _hide_listing AND _listing.id IS NOT NULL THEN
    UPDATE public.listings SET status = 'hidden' WHERE id = _listing.id;
    _listing_effect := 'hidden';
    _delta := _delta - 10;
  END IF;
  IF _delete_listing AND _listing.id IS NOT NULL THEN
    DELETE FROM public.listings WHERE id = _listing.id;
    _listing_effect := 'deleted';
    _delta := _delta - 30;
  END IF;
  IF _action = 'restore_listing' AND _listing.id IS NOT NULL THEN
    UPDATE public.listings SET status = 'active' WHERE id = _listing.id;
    _listing_effect := 'restored';
    _delta := _delta + 10;
  END IF;

  -- Update report when status changes
  IF _action IN ('accept','dismiss','reverse') THEN
    UPDATE public.reports SET
      status = _new_status,
      resolution = _new_resolution,
      resolved_by = CASE WHEN _new_status='resolved' THEN _actor ELSE NULL END,
      resolved_at = CASE WHEN _new_status='resolved' THEN now() ELSE NULL END
    WHERE id = _report_id;
  END IF;

  -- Write ledger row
  INSERT INTO public.report_actions(
    report_id, actor_id, action, prev_status, new_status, prev_resolution, new_resolution,
    score_delta, listing_effect, notified_poster, note, reversed_by_action_id
  ) VALUES (
    _report_id, _actor, _action, _report.status, _new_status, _report.resolution, _new_resolution,
    _delta, _listing_effect, _notify_poster, _note, _reverses_action_id
  ) RETURNING id INTO _action_id;

  -- Mark the reversed row
  IF _action = 'reverse' AND _reverses_action_id IS NOT NULL THEN
    UPDATE public.report_actions SET reversed_by_action_id = _action_id WHERE id = _reverses_action_id;
  END IF;

  -- Write trust score event for the poster (when there is one)
  IF _listing.user_id IS NOT NULL AND _delta <> 0 THEN
    INSERT INTO public.trust_score_events(
      user_id, delta, reason_code, reason_label, source_type, source_id, actor_id
    ) VALUES (
      _listing.user_id, _delta, _reason_code, _reason_label, 'report', _report_id, _actor
    );
  END IF;

  RETURN _action_id;
END $$;

REVOKE ALL ON FUNCTION public.apply_report_action(uuid,text,text,boolean,boolean,boolean,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_report_action(uuid,text,text,boolean,boolean,boolean,uuid) TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260615041003_2a252442-7543-45ae-b1b5-dc6302e72f01.sql
-- ============================================================================

-- ============================================================
-- boost_credits wallet (positive = grant, negative = consumption)
-- ============================================================
CREATE TABLE public.boost_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount int NOT NULL CHECK (amount <> 0),
  source text NOT NULL CHECK (source IN ('reward','purchase','manual','consumption')),
  reward_id uuid REFERENCES public.member_rewards(id) ON DELETE SET NULL,
  listing_boost_id uuid REFERENCES public.listing_boosts(id) ON DELETE SET NULL,
  note text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX boost_credits_user_idx ON public.boost_credits(user_id, created_at DESC);

GRANT SELECT ON public.boost_credits TO authenticated;
GRANT ALL ON public.boost_credits TO service_role;

ALTER TABLE public.boost_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own boost_credits" ON public.boost_credits
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "staff read boost_credits" ON public.boost_credits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE OR REPLACE FUNCTION public.get_boost_credit_balance(_user_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(amount),0)::int FROM public.boost_credits WHERE user_id = _user_id;
$$;

-- ============================================================
-- profiles.tier_id cache
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier_id text REFERENCES public.member_tiers(id) ON DELETE SET NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS tier_recomputed_at timestamptz;
CREATE INDEX IF NOT EXISTS profiles_tier_idx ON public.profiles(tier_id);

-- Pure function: compute tier for a user given current score + tenure
CREATE OR REPLACE FUNCTION public.compute_user_tier(_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _score int;
  _tenure_days int;
  _tier text;
BEGIN
  SELECT public.get_trust_score(_user_id) INTO _score;
  SELECT EXTRACT(DAY FROM now() - created_at)::int INTO _tenure_days
    FROM auth.users WHERE id = _user_id;
  IF _tenure_days IS NULL THEN _tenure_days := 0; END IF;

  SELECT id INTO _tier FROM public.member_tiers
   WHERE _score >= min_score AND _tenure_days >= min_tenure_days
   ORDER BY rank DESC LIMIT 1;

  RETURN COALESCE(_tier, 'common');
END $$;

-- ============================================================
-- resolve_report_dispute RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_report_dispute(
  _dispute_id uuid,
  _decision text,           -- 'uphold' | 'overturn'
  _response text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _dispute public.report_disputes%ROWTYPE;
  _orig_action public.report_actions%ROWTYPE;
  _refund int := 0;
  _new_status text;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _decision NOT IN ('uphold','overturn') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;
  IF _response IS NULL OR length(trim(_response)) < 10 THEN
    RAISE EXCEPTION 'Response note required (min 10 chars)';
  END IF;

  SELECT * INTO _dispute FROM public.report_disputes WHERE id = _dispute_id FOR UPDATE;
  IF _dispute.id IS NULL THEN RAISE EXCEPTION 'Dispute not found'; END IF;
  IF _dispute.status <> 'open' THEN RAISE EXCEPTION 'Dispute already resolved'; END IF;

  _new_status := CASE WHEN _decision = 'uphold' THEN 'upheld' ELSE 'overturned' END;

  IF _decision = 'overturn' THEN
    -- Find latest accept action on this report to reverse
    SELECT * INTO _orig_action FROM public.report_actions
      WHERE report_id = _dispute.report_id AND action = 'accept'
        AND reversed_by_action_id IS NULL
      ORDER BY created_at DESC LIMIT 1;

    IF _orig_action.id IS NOT NULL THEN
      -- Use apply_report_action to perform the reversal cleanly
      PERFORM public.apply_report_action(
        _dispute.report_id, 'reverse',
        'Dispute overturned: ' || _response,
        false, false, true, _orig_action.id
      );
      _refund := COALESCE(-_orig_action.score_delta, 0) + 5; -- bonus +5 for wrongful report

      -- Add the +5 bonus event (the reverse already refunded the original delta)
      INSERT INTO public.trust_score_events(user_id, delta, reason_code, reason_label, source_type, source_id, actor_id)
      VALUES (_dispute.user_id, 5, 'dispute_overturned_bonus', 'Wrongly-reported bonus', 'dispute', _dispute.id, _actor);

      -- If the listing is currently hidden because of the original action, restore it
      IF _orig_action.listing_effect = 'hidden' THEN
        UPDATE public.listings SET status='active'
          WHERE id = (SELECT listing_id FROM public.reports WHERE id = _dispute.report_id);
      END IF;
    END IF;
  END IF;

  UPDATE public.report_disputes SET
    status = _new_status,
    admin_response = _response,
    resolved_by = _actor,
    resolved_at = now(),
    score_refund = _refund
  WHERE id = _dispute_id;

  RETURN _dispute_id;
END $$;

REVOKE ALL ON FUNCTION public.resolve_report_dispute(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_report_dispute(uuid,text,text) TO authenticated;

-- ============================================================
-- grant_member_reward RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_member_reward(
  _user_id uuid,
  _kind text,
  _amount int,
  _tier_id text,
  _period text,
  _note text,
  _expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _reward_id uuid;
BEGIN
  IF _actor IS NOT NULL AND NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _kind NOT IN ('boost_credit','featured_badge','spotlight','custom') THEN
    RAISE EXCEPTION 'Invalid kind';
  END IF;

  -- Idempotency: if a granted reward already exists for this user+period+kind, return it
  SELECT id INTO _reward_id FROM public.member_rewards
   WHERE user_id = _user_id AND COALESCE(period,'') = COALESCE(_period,'')
     AND kind = _kind AND status IN ('granted','claimed')
   LIMIT 1;
  IF _reward_id IS NOT NULL THEN RETURN _reward_id; END IF;

  INSERT INTO public.member_rewards(user_id, tier_id, kind, amount, period, note, granted_by, expires_at, status)
  VALUES (_user_id, _tier_id, _kind, _amount, _period, _note, _actor, _expires_at, 'granted')
  RETURNING id INTO _reward_id;

  -- Auto-deposit boost credits into wallet
  IF _kind = 'boost_credit' AND _amount > 0 THEN
    INSERT INTO public.boost_credits(user_id, amount, source, reward_id, note, actor_id)
    VALUES (_user_id, _amount, 'reward', _reward_id, COALESCE(_note, 'Tier bonus'), _actor);
    UPDATE public.member_rewards SET status='claimed', claimed_at=now() WHERE id=_reward_id;
  END IF;

  RETURN _reward_id;
END $$;

REVOKE ALL ON FUNCTION public.grant_member_reward(uuid,text,int,text,text,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_member_reward(uuid,text,int,text,text,text,timestamptz) TO authenticated, service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260615043357_0189690f-14ba-493e-a401-98a94c6c3be8.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tg_notify_report_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user uuid;
  v_rep uuid;
  v_listing_title text;
BEGIN
  -- Resolve target user
  IF NEW.listing_id IS NOT NULL THEN
    SELECT user_id, title INTO v_target_user, v_listing_title
    FROM public.listings WHERE id = NEW.listing_id;
  END IF;

  -- Insert admin ops alert (visible in Admin → Alerts)
  INSERT INTO public.ops_alerts (event, severity, source, details)
  VALUES (
    'report_filed',
    'warning',
    'reports',
    jsonb_build_object(
      'report_id', NEW.id,
      'target_type', NEW.target_type,
      'target_user_id', v_target_user,
      'reporter_id', NEW.reporter_id,
      'category', NEW.category,
      'reason', NEW.reason,
      'listing_id', NEW.listing_id,
      'listing_title', v_listing_title
    )
  );

  -- Notify assigned 365 sales rep (if any) via a follow-up task
  IF v_target_user IS NOT NULL AND (NEW.reporter_id IS NULL OR NEW.reporter_id <> v_target_user) THEN
    SELECT rep_user_id INTO v_rep
    FROM public.sales_rep_assignments
    WHERE active = true
      AND subject_type = 'user'
      AND subject_id = v_target_user
    LIMIT 1;

    IF v_rep IS NOT NULL THEN
      INSERT INTO public.sales_rep_followups
        (rep_user_id, subject_type, subject_id, kind, status, title, body)
      VALUES (
        v_rep,
        'user',
        v_target_user,
        'request',
        'open',
        'Client reported — please reach out',
        format(
          'A report was filed against your client%s. Category: %s. Reason: %s. Report ID: %s',
          CASE WHEN v_listing_title IS NOT NULL THEN ' (listing: '||v_listing_title||')' ELSE '' END,
          coalesce(NEW.category,'n/a'),
          coalesce(NEW.reason,'n/a'),
          NEW.id::text
        )
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block report insert on notification failure
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_report_created ON public.reports;
CREATE TRIGGER trg_notify_report_created
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_report_created();


-- ============================================================================
-- SOURCE MIGRATION: 20260615051550_216e1718-9be9-4635-81c1-16f7d40a4c68.sql
-- ============================================================================

-- Update dispatch plan capacity to new tiers (Solo / Team / Unlimited)
-- and keep legacy slugs as aliases so old subscription rows still match.
CREATE OR REPLACE FUNCTION public.dispatch_plan_capacity(_plan text)
RETURNS TABLE(max_jobs integer, max_regions integer, priority integer)
LANGUAGE sql IMMUTABLE AS $$
  SELECT t.max_jobs, t.max_regions, t.priority FROM (VALUES
    -- new
    ('dispatch_solo',       3,      1,  1),
    ('dispatch_team',       10,     3,  2),
    ('dispatch_unlimited',  999999, 99, 3),
    -- legacy aliases (any old rows still resolve)
    ('dispatch_starter',    3,      1,  1),
    ('dispatch_pro',        10,     3,  2),
    ('dispatch_fleet',      999999, 99, 3)
  ) AS t(plan, max_jobs, max_regions, priority)
  WHERE t.plan = _plan
$$;

-- Match function: treat unlimited (and legacy fleet) as nationwide
CREATE OR REPLACE FUNCTION public.dispatch_match_providers(_request_id uuid, _take integer DEFAULT 5)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req RECORD; matches uuid[];
BEGIN
  SELECT pickup_region, pickup_province, pickup_city, matched_provider_ids
    INTO req FROM public.tow_requests WHERE id = _request_id;
  IF req IS NULL THEN RETURN '{}'::uuid[]; END IF;

  WITH eligible AS (
    SELECT
      ptr.user_id,
      ap.plan AS plan_slug,
      cap.priority AS tier_priority,
      cap.max_jobs,
      COALESCE(ptr.avg_rating, 0) AS rating,
      COALESCE(ptr.avg_response_sec, 999999) AS resp,
      b.city, b.province, b.region,
      (SELECT count(*) FROM public.tow_requests tr
         WHERE tr.provider_id = ptr.user_id
           AND tr.status IN ('assigned','in_progress','picked_up')) AS active_jobs
    FROM public.provider_tow_rates ptr
    JOIN LATERAL (SELECT public.get_active_dispatch_plan(ptr.user_id) AS plan) ap ON ap.plan IS NOT NULL
    LEFT JOIN LATERAL public.dispatch_plan_capacity(ap.plan) cap ON true
    LEFT JOIN public.businesses b ON b.owner_id = ptr.user_id AND b.type_slug='towing' AND b.status='active'
    WHERE ptr.dispatch_enabled = true
      AND (ap.plan IN ('dispatch_unlimited','dispatch_fleet')
        OR req.pickup_region = ANY(ptr.dispatch_regions)
        OR (b.region IS NOT NULL AND b.region = req.pickup_region))
  )
  SELECT COALESCE(array_agg(user_id ORDER BY
    tier_priority DESC NULLS LAST,
    CASE WHEN city = req.pickup_city THEN 0
         WHEN province = req.pickup_province THEN 1
         WHEN region = req.pickup_region THEN 2 ELSE 3 END,
    rating DESC, resp ASC
  ), '{}'::uuid[]) INTO matches
  FROM eligible
  WHERE active_jobs < COALESCE(max_jobs, 999999)
    AND NOT (user_id = ANY(req.matched_provider_ids));

  RETURN matches[1:_take];
END $$;

-- Update subscription_plans entries for new dispatch tiers
UPDATE public.subscription_plans
   SET name='Dispatch Solo', price_php=250.00, stripe_lookup_key='dispatch_solo_monthly',
       features='["1 driver seat","1 service region","Up to 3 active jobs","Dispatch inbox (web + PWA)","Email + in-app alerts"]'::jsonb
 WHERE stripe_lookup_key='dispatch_starter_monthly';

UPDATE public.subscription_plans
   SET name='Dispatch Team', price_php=500.00, stripe_lookup_key='dispatch_team_monthly',
       features='["Up to 5 drivers","Up to 3 service regions","Up to 10 active jobs","Priority placement in dispatch queue","SMS + push job alerts","Auto-route to nearest driver"]'::jsonb
 WHERE stripe_lookup_key='dispatch_pro_monthly';

UPDATE public.subscription_plans
   SET name='Dispatch Unlimited', price_php=1000.00, stripe_lookup_key='dispatch_unlimited_monthly',
       features='["Unlimited drivers","Nationwide coverage","Unlimited active jobs","Top priority in dispatch queue","Live GPS tracking","White-label tracking link","API + webhooks"]'::jsonb
 WHERE stripe_lookup_key='dispatch_fleet_monthly';


-- ============================================================================
-- SOURCE MIGRATION: 20260616033348_a261b9e7-281d-4e16-bf61-1f3043a80d12.sql
-- ============================================================================

-- ============ enums ============
DO $$ BEGIN
  CREATE TYPE public.business_staff_role AS ENUM
    ('owner','manager','dispatcher','driver','mechanic','clerk');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.business_asset_kind AS ENUM
    ('tow_truck','flatbed','wrecker','service_van','trailer','equipment','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.business_asset_status AS ENUM
    ('active','maintenance','out_of_service','retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ business_staff ============
CREATE TABLE IF NOT EXISTS public.business_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.business_staff_role NOT NULL DEFAULT 'driver',
  title text,
  duties text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  on_shift boolean NOT NULL DEFAULT false,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
CREATE INDEX IF NOT EXISTS business_staff_user_idx ON public.business_staff(user_id);
CREATE INDEX IF NOT EXISTS business_staff_business_idx ON public.business_staff(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_staff TO authenticated;
GRANT ALL ON public.business_staff TO service_role;
ALTER TABLE public.business_staff ENABLE ROW LEVEL SECURITY;

-- security-definer helpers (defined before policies that use them)
CREATE OR REPLACE FUNCTION public.is_business_owner(_user uuid, _business uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business AND owner_id = _user)
$$;

CREATE OR REPLACE FUNCTION public.has_business_role(_user uuid, _business uuid, _role public.business_staff_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_business_owner(_user, _business)
    OR EXISTS (
      SELECT 1 FROM public.business_staff
      WHERE business_id = _business AND user_id = _user AND active = true
        AND (role = _role OR role = 'owner' OR role = 'manager')
    )
$$;

CREATE OR REPLACE FUNCTION public.is_business_member(_user uuid, _business uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_business_owner(_user, _business)
    OR EXISTS (
      SELECT 1 FROM public.business_staff
      WHERE business_id = _business AND user_id = _user AND active = true
    )
$$;

CREATE POLICY "staff: members read" ON public.business_staff
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR user_id = auth.uid());

CREATE POLICY "staff: owner/manager insert" ON public.business_staff
  FOR INSERT TO authenticated
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

CREATE POLICY "staff: owner/manager update" ON public.business_staff
  FOR UPDATE TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager') OR user_id = auth.uid())
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager') OR user_id = auth.uid());

CREATE POLICY "staff: owner delete" ON public.business_staff
  FOR DELETE TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id));

-- ============ business_assets ============
CREATE TABLE IF NOT EXISTS public.business_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind public.business_asset_kind NOT NULL DEFAULT 'tow_truck',
  name text NOT NULL,
  plate text,
  vin text,
  capacity_kg integer,
  status public.business_asset_status NOT NULL DEFAULT 'active',
  assigned_driver_id uuid,
  photos jsonb NOT NULL DEFAULT '[]',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_assets_business_idx ON public.business_assets(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_assets TO authenticated;
GRANT ALL ON public.business_assets TO service_role;
ALTER TABLE public.business_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assets: members read" ON public.business_assets
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "assets: manager write" ON public.business_assets
  FOR ALL TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

-- ============ business_asset_maintenance ============
CREATE TABLE IF NOT EXISTS public.business_asset_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.business_assets(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  odometer_km integer,
  work_done text NOT NULL,
  cost numeric(12,2),
  next_due_date date,
  next_due_km integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_asset_maint_asset_idx ON public.business_asset_maintenance(asset_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_asset_maintenance TO authenticated;
GRANT ALL ON public.business_asset_maintenance TO service_role;
ALTER TABLE public.business_asset_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_maint: members read" ON public.business_asset_maintenance
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "asset_maint: manager write" ON public.business_asset_maintenance
  FOR ALL TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

-- ============ business_inventory_items ============
CREATE TABLE IF NOT EXISTS public.business_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  category text,
  unit text NOT NULL DEFAULT 'pc',
  qty_on_hand numeric(12,2) NOT NULL DEFAULT 0,
  reorder_at numeric(12,2),
  cost numeric(12,2),
  location text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_inv_business_idx ON public.business_inventory_items(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_inventory_items TO authenticated;
GRANT ALL ON public.business_inventory_items TO service_role;
ALTER TABLE public.business_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv: members read" ON public.business_inventory_items
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "inv: manager write" ON public.business_inventory_items
  FOR ALL TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

-- ============ business_inventory_movements ============
CREATE TABLE IF NOT EXISTS public.business_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.business_inventory_items(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  delta numeric(12,2) NOT NULL,
  reason text,
  tow_request_id uuid,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_inv_mov_item_idx ON public.business_inventory_movements(item_id);

GRANT SELECT, INSERT ON public.business_inventory_movements TO authenticated;
GRANT ALL ON public.business_inventory_movements TO service_role;
ALTER TABLE public.business_inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_mov: members read" ON public.business_inventory_movements
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "inv_mov: member insert" ON public.business_inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_member(auth.uid(), business_id));

-- ============ tow_requests lifecycle extensions ============
ALTER TABLE public.tow_requests
  ADD COLUMN IF NOT EXISTS assigned_driver_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_asset_id uuid REFERENCES public.business_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS en_route_at timestamptz,
  ADD COLUMN IF NOT EXISTS on_scene_at timestamptz,
  ADD COLUMN IF NOT EXISTS towing_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS driver_notes text;

-- ============ updated_at triggers ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_business_staff_updated ON public.business_staff;
CREATE TRIGGER trg_business_staff_updated BEFORE UPDATE ON public.business_staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_business_assets_updated ON public.business_assets;
CREATE TRIGGER trg_business_assets_updated BEFORE UPDATE ON public.business_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_business_inv_updated ON public.business_inventory_items;
CREATE TRIGGER trg_business_inv_updated BEFORE UPDATE ON public.business_inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
-- SOURCE MIGRATION: 20260616035936_bd7cf61d-c7b3-4584-a54e-03f8bed4a751.sql
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='business_bookings') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.business_bookings';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='business_inquiries') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.business_inquiries';
  END IF;
END $$;
ALTER TABLE public.business_bookings REPLICA IDENTITY FULL;
ALTER TABLE public.business_inquiries REPLICA IDENTITY FULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260616041102_c21d2dd8-e20c-401e-a314-86a096e7b2c9.sql
-- ============================================================================

ALTER TABLE public.business_plans
  ADD COLUMN IF NOT EXISTS limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.business_subscriptions
  ADD COLUMN IF NOT EXISTS auto_upgrade boolean NOT NULL DEFAULT false;

-- Seed sensible defaults per tier. Existing rows only.
UPDATE public.business_plans
SET limits = CASE tier
  WHEN 'listed'   THEN '{"staff":3,  "assets":3,  "listings":10, "inventory_skus":50,  "tow_jobs_month":50,  "storage_mb":250}'::jsonb
  WHEN 'featured' THEN '{"staff":10, "assets":10, "listings":50, "inventory_skus":250, "tow_jobs_month":250, "storage_mb":1000}'::jsonb
  WHEN 'premium'  THEN '{"staff":50, "assets":50, "listings":500,"inventory_skus":2000,"tow_jobs_month":2000,"storage_mb":10000}'::jsonb
  ELSE limits
END
WHERE limits = '{}'::jsonb OR limits IS NULL;

UPDATE public.business_plans
SET features = CASE tier
  WHEN 'listed'   THEN '{"dispatch":true, "analytics":false, "auto_upgrade":false}'::jsonb
  WHEN 'featured' THEN '{"dispatch":true, "analytics":true,  "auto_upgrade":true}'::jsonb
  WHEN 'premium'  THEN '{"dispatch":true, "analytics":true,  "auto_upgrade":true, "priority_support":true}'::jsonb
  ELSE features
END
WHERE features = '{}'::jsonb OR features IS NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260616042054_404ed953-9c9e-47e3-9eaf-b25e7d5ebdf9.sql
-- ============================================================================

CREATE TABLE public.business_plan_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  from_plan_id uuid REFERENCES public.business_plans(id) ON DELETE SET NULL,
  to_plan_id uuid REFERENCES public.business_plans(id) ON DELETE SET NULL,
  from_tier text,
  to_tier text,
  reason text NOT NULL CHECK (reason IN ('auto_upgrade','manual','downgrade','cancel','reactivate')),
  triggered_by text NOT NULL CHECK (triggered_by IN ('user','system')),
  actor_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bpcl_business ON public.business_plan_change_log(business_id, created_at DESC);

GRANT SELECT ON public.business_plan_change_log TO authenticated;
GRANT ALL ON public.business_plan_change_log TO service_role;

ALTER TABLE public.business_plan_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view plan change log"
ON public.business_plan_change_log
FOR SELECT
TO authenticated
USING (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(),'admin'::app_role));
