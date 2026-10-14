-- 365 Associate Network: canonical catalogue, verified fitment, and stock locations.
--
-- This migration deliberately extends the existing parts_catalog and
-- business_inventory_items tables. It does not replace either of the app's
-- working inventory systems.

-- ---------------------------------------------------------------------------
-- Canonical product identity
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_part_number(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT NULLIF(upper(regexp_replace(COALESCE(_value, ''), '[^A-Za-z0-9]', '', 'g')), '');
$$;

REVOKE ALL ON FUNCTION public.normalize_part_number(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_part_number(text) TO anon, authenticated, service_role;

ALTER TABLE public.parts_catalog
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS manufacturer_part_number text,
  ADD COLUMN IF NOT EXISTS normalized_manufacturer_part_number text
    GENERATED ALWAYS AS (public.normalize_part_number(manufacturer_part_number)) STORED,
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'replacement',
  ADD COLUMN IF NOT EXISTS country_scope text[] NOT NULL DEFAULT ARRAY['PH']::text[],
  ADD COLUMN IF NOT EXISTS catalog_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS data_source text,
  ADD COLUMN IF NOT EXISTS source_reference text,
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS uom text NOT NULL DEFAULT 'pc',
  ADD COLUMN IF NOT EXISTS warranty_months integer,
  ADD COLUMN IF NOT EXISTS core_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hazardous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS superseded_by_id uuid REFERENCES public.parts_catalog(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parts_catalog_product_type_check'
  ) THEN
    ALTER TABLE public.parts_catalog ADD CONSTRAINT parts_catalog_product_type_check
      CHECK (product_type IN ('genuine_oem','oem_equivalent','aftermarket','remanufactured','used','universal','replacement'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parts_catalog_status_check'
  ) THEN
    ALTER TABLE public.parts_catalog ADD CONSTRAINT parts_catalog_status_check
      CHECK (catalog_status IN ('draft','active','retired'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parts_catalog_year_range_check'
  ) THEN
    ALTER TABLE public.parts_catalog ADD CONSTRAINT parts_catalog_year_range_check
      CHECK (year_min IS NULL OR year_max IS NULL OR year_min <= year_max);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parts_catalog_warranty_months_check'
  ) THEN
    ALTER TABLE public.parts_catalog ADD CONSTRAINT parts_catalog_warranty_months_check
      CHECK (warranty_months IS NULL OR warranty_months >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS parts_catalog_mpn_idx
  ON public.parts_catalog (normalized_manufacturer_part_number)
  WHERE normalized_manufacturer_part_number IS NOT NULL AND active;
CREATE INDEX IF NOT EXISTS parts_catalog_manufacturer_idx
  ON public.parts_catalog (lower(manufacturer))
  WHERE manufacturer IS NOT NULL AND active;
CREATE INDEX IF NOT EXISTS parts_catalog_country_scope_idx
  ON public.parts_catalog USING gin (country_scope);

CREATE TABLE IF NOT EXISTS public.parts_product_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.parts_catalog(id) ON DELETE CASCADE,
  number text NOT NULL,
  normalized_number text
    GENERATED ALWAYS AS (public.normalize_part_number(number)) STORED,
  number_type text NOT NULL DEFAULT 'interchange'
    CHECK (number_type IN ('manufacturer','oem','aftermarket','interchange','superseded','barcode')),
  manufacturer text,
  country_code text NOT NULL DEFAULT 'PH',
  is_primary boolean NOT NULL DEFAULT false,
  source text,
  source_reference text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(country_code) = 2),
  CHECK (normalized_number IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS parts_product_numbers_identity_idx
  ON public.parts_product_numbers (product_id, normalized_number, number_type, country_code);
CREATE INDEX IF NOT EXISTS parts_product_numbers_lookup_idx
  ON public.parts_product_numbers (normalized_number, country_code)
  WHERE active;
CREATE INDEX IF NOT EXISTS parts_product_numbers_product_idx
  ON public.parts_product_numbers (product_id);

GRANT SELECT ON public.parts_product_numbers TO anon, authenticated;
GRANT ALL ON public.parts_product_numbers TO service_role;
ALTER TABLE public.parts_product_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parts numbers: public read active"
  ON public.parts_product_numbers FOR SELECT TO anon, authenticated
  USING (
    active AND EXISTS (
      SELECT 1 FROM public.parts_catalog p
      WHERE p.id = product_id AND p.active AND p.catalog_status = 'active'
    )
  );

CREATE TRIGGER parts_product_numbers_updated_at
  BEFORE UPDATE ON public.parts_product_numbers
  FOR EACH ROW EXECUTE FUNCTION public.parts_set_updated_at();

-- ---------------------------------------------------------------------------
-- Vehicle identity and fitment evidence
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.parts_vehicle_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL DEFAULT 'PH',
  make text NOT NULL,
  model text NOT NULL,
  variant text,
  year_min integer,
  year_max integer,
  engine_code text,
  engine_description text,
  chassis_code text,
  transmission text,
  body_style text,
  drive_type text,
  market_code text,
  source text NOT NULL,
  source_reference text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','retired')),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(country_code) = 2),
  CHECK (year_min IS NULL OR year_min BETWEEN 1886 AND 2200),
  CHECK (year_max IS NULL OR year_max BETWEEN 1886 AND 2200),
  CHECK (year_min IS NULL OR year_max IS NULL OR year_min <= year_max)
);

CREATE UNIQUE INDEX IF NOT EXISTS parts_vehicle_profiles_identity_idx
  ON public.parts_vehicle_profiles (
    country_code,
    lower(make),
    lower(model),
    COALESCE(lower(variant), ''),
    COALESCE(year_min, 0),
    COALESCE(year_max, 9999),
    COALESCE(lower(engine_code), ''),
    COALESCE(upper(chassis_code), '')
  );
CREATE INDEX IF NOT EXISTS parts_vehicle_profiles_ymm_idx
  ON public.parts_vehicle_profiles (lower(make), lower(model), year_min, year_max)
  WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS parts_vehicle_profiles_chassis_idx
  ON public.parts_vehicle_profiles (upper(chassis_code))
  WHERE chassis_code IS NOT NULL AND status = 'approved';

GRANT SELECT ON public.parts_vehicle_profiles TO anon, authenticated;
GRANT ALL ON public.parts_vehicle_profiles TO service_role;
ALTER TABLE public.parts_vehicle_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle profiles: public read approved"
  ON public.parts_vehicle_profiles FOR SELECT TO anon, authenticated
  USING (status = 'approved');

CREATE TRIGGER parts_vehicle_profiles_updated_at
  BEFORE UPDATE ON public.parts_vehicle_profiles
  FOR EACH ROW EXECUTE FUNCTION public.parts_set_updated_at();

CREATE TABLE IF NOT EXISTS public.parts_fitment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.parts_catalog(id) ON DELETE CASCADE,
  vehicle_profile_id uuid NOT NULL REFERENCES public.parts_vehicle_profiles(id) ON DELETE CASCADE,
  position text,
  qualifiers jsonb NOT NULL DEFAULT '{}'::jsonb,
  fitment_status text NOT NULL DEFAULT 'unverified'
    CHECK (fitment_status IN ('confirmed','unverified','does_not_fit','retired')),
  source text NOT NULL,
  source_reference text,
  confidence numeric(4,3) NOT NULL DEFAULT 0.500
    CHECK (confidence >= 0 AND confidence <= 1),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS parts_fitment_identity_idx
  ON public.parts_fitment (product_id, vehicle_profile_id, COALESCE(lower(position), ''));
CREATE INDEX IF NOT EXISTS parts_fitment_vehicle_idx
  ON public.parts_fitment (vehicle_profile_id, product_id)
  WHERE fitment_status = 'confirmed';
CREATE INDEX IF NOT EXISTS parts_fitment_product_idx
  ON public.parts_fitment (product_id, vehicle_profile_id)
  WHERE fitment_status = 'confirmed';

GRANT SELECT ON public.parts_fitment TO anon, authenticated;
GRANT ALL ON public.parts_fitment TO service_role;
ALTER TABLE public.parts_fitment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fitment: public read confirmed"
  ON public.parts_fitment FOR SELECT TO anon, authenticated
  USING (
    fitment_status = 'confirmed'
    AND EXISTS (
      SELECT 1 FROM public.parts_catalog p
      WHERE p.id = product_id AND p.active AND p.catalog_status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM public.parts_vehicle_profiles v
      WHERE v.id = vehicle_profile_id AND v.status = 'approved'
    )
  );

CREATE TRIGGER parts_fitment_updated_at
  BEFORE UPDATE ON public.parts_fitment
  FOR EACH ROW EXECUTE FUNCTION public.parts_set_updated_at();

-- ---------------------------------------------------------------------------
-- Inventory locations and Shop Manager bridge
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_inventory_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  location_type text NOT NULL DEFAULT 'store'
    CHECK (location_type IN ('store','warehouse','repair_shop','counter','mobile','other')),
  address_line text,
  barangay text,
  city text,
  province text,
  region text,
  postal_code text,
  lat numeric,
  lng numeric,
  pickup_notes text,
  network_visible boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, code),
  CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
  CHECK (lng IS NULL OR lng BETWEEN -180 AND 180)
);

CREATE INDEX IF NOT EXISTS business_inventory_locations_business_idx
  ON public.business_inventory_locations (business_id, active);
CREATE INDEX IF NOT EXISTS business_inventory_locations_geo_idx
  ON public.business_inventory_locations (province, city)
  WHERE active AND network_visible;

GRANT SELECT ON public.business_inventory_locations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.business_inventory_locations TO authenticated;
GRANT ALL ON public.business_inventory_locations TO service_role;
ALTER TABLE public.business_inventory_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory locations: members read"
  ON public.business_inventory_locations FOR SELECT TO authenticated
  USING (public.is_business_member((select auth.uid()), business_id));

CREATE POLICY "inventory locations: network read"
  ON public.business_inventory_locations FOR SELECT TO anon, authenticated
  USING (
    active AND network_visible AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.status = 'active'
        AND b.expose_inventory_to_network
        AND b.network_exposure_status = 'approved'
    )
  );

CREATE POLICY "inventory locations: managers insert"
  ON public.business_inventory_locations FOR INSERT TO authenticated
  WITH CHECK (public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role));

CREATE POLICY "inventory locations: managers update"
  ON public.business_inventory_locations FOR UPDATE TO authenticated
  USING (public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role))
  WITH CHECK (public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role));

CREATE POLICY "inventory locations: managers delete"
  ON public.business_inventory_locations FOR DELETE TO authenticated
  USING (public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role));

CREATE TRIGGER business_inventory_locations_updated_at
  BEFORE UPDATE ON public.business_inventory_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.business_inventory_items
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.business_inventory_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'PH',
  ADD COLUMN IF NOT EXISTS item_condition text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS lead_time_hours integer,
  ADD COLUMN IF NOT EXISTS fulfillment_methods text[] NOT NULL DEFAULT ARRAY['pickup']::text[],
  ADD COLUMN IF NOT EXISTS warranty_months integer,
  ADD COLUMN IF NOT EXISTS serial_tracking boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_inventory_items_condition_check'
  ) THEN
    ALTER TABLE public.business_inventory_items ADD CONSTRAINT business_inventory_items_condition_check
      CHECK (item_condition IN ('new','remanufactured','used','core'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_inventory_items_lead_time_check'
  ) THEN
    ALTER TABLE public.business_inventory_items ADD CONSTRAINT business_inventory_items_lead_time_check
      CHECK (lead_time_hours IS NULL OR lead_time_hours >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_inventory_items_warranty_months_check'
  ) THEN
    ALTER TABLE public.business_inventory_items ADD CONSTRAINT business_inventory_items_warranty_months_check
      CHECK (warranty_months IS NULL OR warranty_months >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS business_inventory_items_location_idx
  ON public.business_inventory_items (location_id, catalog_part_id)
  WHERE active;
CREATE INDEX IF NOT EXISTS business_inventory_items_mpn_idx
  ON public.business_inventory_items (public.normalize_part_number(manufacturer_part_number))
  WHERE manufacturer_part_number IS NOT NULL AND active;
CREATE INDEX IF NOT EXISTS business_inventory_items_oem_idx
  ON public.business_inventory_items (public.normalize_part_number(oem_part_number))
  WHERE oem_part_number IS NOT NULL AND active;

GRANT SELECT (
  manufacturer_part_number, oem_part_number, location_id, country_code,
  item_condition, lead_time_hours, fulfillment_methods, warranty_months
) ON public.business_inventory_items TO anon, authenticated;

-- Optional one-to-one link. Existing Shop Manager shops continue to work when
-- this is null; linking enables work-order procurement through the network.
ALTER TABLE shop_manager.shops
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS shop_manager_shops_business_idx
  ON shop_manager.shops (business_id)
  WHERE business_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Public stock feed: preserve existing columns and add canonical/location data
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS public.network_stock;
CREATE VIEW public.network_stock
WITH (security_invoker = on) AS
SELECT
  i.id,
  i.business_id,
  i.sku,
  i.name,
  i.category,
  i.brand,
  i.unit,
  i.qty_on_hand,
  GREATEST(i.qty_on_hand - public.active_reservation_qty(i.id), 0) AS available_qty,
  public.active_reservation_qty(i.id) AS reserved_qty,
  i.price,
  i.catalog_part_id,
  i.manufacturer_part_number,
  i.oem_part_number,
  i.item_condition,
  i.lead_time_hours,
  i.fulfillment_methods,
  COALESCE(i.warranty_months, c.warranty_months) AS warranty_months,
  i.location_id AS stock_location_id,
  COALESCE(l.name, b.name) AS stock_location_name,
  i.updated_at,
  b.name AS business_name,
  b.slug AS business_slug,
  COALESCE(l.city, b.city) AS city,
  COALESCE(l.province, b.province) AS province,
  COALESCE(l.region, b.region) AS region,
  COALESCE(l.lat, b.lat) AS lat,
  COALESCE(l.lng, b.lng) AS lng,
  COALESCE(c.compatible_makes, ARRAY[]::text[]) || COALESCE(fit.makes, ARRAY[]::text[]) AS compatible_makes,
  COALESCE(c.compatible_models, ARRAY[]::text[]) || COALESCE(fit.models, ARRAY[]::text[]) AS compatible_models,
  COALESCE(c.year_min, fit.year_min) AS year_min,
  COALESCE(c.year_max, fit.year_max) AS year_max,
  c.manufacturer AS catalog_manufacturer,
  c.manufacturer_part_number AS catalog_part_number,
  COALESCE(fit.profiles, '[]'::jsonb) AS fitment_profiles
FROM public.business_inventory_items i
JOIN public.businesses b ON b.id = i.business_id
LEFT JOIN public.business_inventory_locations l
  ON l.id = i.location_id AND l.business_id = i.business_id AND l.active
LEFT JOIN public.parts_catalog c ON c.id = i.catalog_part_id
LEFT JOIN LATERAL (
  SELECT
    array_agg(DISTINCT vp.make) FILTER (WHERE vp.make IS NOT NULL) AS makes,
    array_agg(DISTINCT vp.model) FILTER (WHERE vp.model IS NOT NULL) AS models,
    min(vp.year_min) AS year_min,
    max(vp.year_max) AS year_max,
    jsonb_agg(
      jsonb_build_object(
        'profile_id', vp.id,
        'make', vp.make,
        'model', vp.model,
        'variant', vp.variant,
        'year_min', vp.year_min,
        'year_max', vp.year_max,
        'engine_code', vp.engine_code,
        'chassis_code', vp.chassis_code,
        'position', pf.position,
        'confidence', pf.confidence
      )
    ) AS profiles
  FROM public.parts_fitment pf
  JOIN public.parts_vehicle_profiles vp ON vp.id = pf.vehicle_profile_id
  WHERE pf.product_id = c.id
    AND pf.fitment_status = 'confirmed'
    AND vp.status = 'approved'
) fit ON true
WHERE i.active
  AND i.network_visible
  AND (l.id IS NULL OR l.network_visible)
  AND b.expose_inventory_to_network
  AND b.network_exposure_status = 'approved'
  AND b.status = 'active';

GRANT SELECT ON public.network_stock TO anon, authenticated;
