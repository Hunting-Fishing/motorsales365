-- 365 Parts Partner Network — P2 cross-organization RLS hardening (gate G2).
--
-- Closes the findings of supabase/tests/parts_network_adversarial_rls.sql
-- (see docs/365_PARTS_P2_RLS_ADVERSARIAL_REPORT.md):
--
--   F1  business_inventory_items private columns (cost, notes, bin location,
--       supplier, markup, ...) were readable by anon and by every signed-in
--       user for network-published rows. Column-level GRANTs had no effect
--       because both roles also held table-level SELECT.
--   F2  The base-table network policy ignored the Associate state, so stock of
--       suspended/offboarded partners stayed readable (and streamed over
--       Realtime) whenever the business row still said "exposure approved".
--   F3  network_stock joined business_associate_applications columns that anon
--       cannot read, so the public network search failed for anon callers.
--   F4  Business owners could set network_exposure_status = 'approved' (and
--       forge the reviewer fields) with a direct UPDATE — self-approval.
--   F5  Inquiry inserts could be attributed to another user and could pre-set
--       lifecycle fields (status, prices, reservations); inquiries could also
--       be sent to suspended partners.
--   F6  Defense in depth: lifecycle RPCs executable by anon; RPC-only tables
--       still carried direct write grants for anon/authenticated.
--
-- Additive and idempotent: no table or column is dropped, no data is changed.
-- Apply manually after review; do not run against production without the G2
-- sign-off recorded in docs/365_PARTS_PARTNER_NETWORK_PLAN.md.

-- ---------------------------------------------------------------------------
-- 1. Single definition of "this partner may publish to the network"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_network_publishable_business(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = _business_id
      AND b.status = 'active'
      AND b.expose_inventory_to_network
      AND b.network_exposure_status = 'approved'
  )
  AND public.is_active_associate(_business_id);
$$;

COMMENT ON FUNCTION public.is_network_publishable_business(uuid) IS
  'True only for an active business with admin-approved network exposure AND an approved, enabled, non-offboarded 365 Associate record. Backs network RLS policies and the network_stock projection.';

REVOKE ALL ON FUNCTION public.is_network_publishable_business(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_network_publishable_business(uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. business_inventory_items: anon gets the public projection columns only;
--    signed-in non-members no longer read other organizations' rows at all.
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.business_inventory_items FROM anon;
GRANT SELECT (
  id, business_id, sku, name, category, brand, unit, qty_on_hand, price,
  catalog_part_id, manufacturer_part_number, oem_part_number, item_condition,
  lead_time_hours, fulfillment_methods, warranty_months, location_id,
  country_code, active, network_visible, updated_at
) ON public.business_inventory_items TO anon;

-- Members keep full-row access through "inv: members read" / "inv: manager write".
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.business_inventory_items FROM authenticated;

DROP POLICY IF EXISTS "inv: public network read" ON public.business_inventory_items;
CREATE POLICY "inv: public network read"
  ON public.business_inventory_items FOR SELECT
  TO anon
  USING (
    active
    AND network_visible
    AND public.is_network_publishable_business(business_id)
    AND (
      location_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.business_inventory_locations l
        WHERE l.id = business_inventory_items.location_id
          AND l.business_id = business_inventory_items.business_id
          AND l.active
          AND l.network_visible
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 3. business_inventory_locations: same partner gate; anon loses private
--    address/pickup columns and every write privilege.
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.business_inventory_locations FROM anon;
GRANT SELECT (
  id, business_id, name, location_type, barangay, city, province, region,
  postal_code, lat, lng, network_visible, active, inventory_source,
  last_inventory_sync_at, stale_after_minutes, updated_at
) ON public.business_inventory_locations TO anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.business_inventory_locations FROM authenticated;

DROP POLICY IF EXISTS "inventory locations: network read" ON public.business_inventory_locations;
CREATE POLICY "inventory locations: network read"
  ON public.business_inventory_locations FOR SELECT
  TO anon, authenticated
  USING (
    active
    AND network_visible
    AND public.is_network_publishable_business(business_id)
  );

-- ---------------------------------------------------------------------------
-- 4. network_stock: identical columns, partner gate through the helper so the
--    view no longer needs anon access to Associate application columns.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.network_stock WITH (security_invoker = on) AS
SELECT
  i.id, i.business_id, i.sku, i.name, i.category, i.brand, i.unit, i.qty_on_hand,
  GREATEST(i.qty_on_hand - public.active_reservation_qty(i.id), 0) AS available_qty,
  public.active_reservation_qty(i.id) AS reserved_qty, i.price, i.catalog_part_id,
  i.manufacturer_part_number, i.oem_part_number, i.item_condition, i.lead_time_hours,
  i.fulfillment_methods, COALESCE(i.warranty_months, c.warranty_months) AS warranty_months,
  i.location_id AS stock_location_id, COALESCE(l.name, b.name) AS stock_location_name,
  i.updated_at, b.name AS business_name, b.slug AS business_slug,
  COALESCE(l.city, b.city) AS city, COALESCE(l.province, b.province) AS province,
  COALESCE(l.region, b.region) AS region, COALESCE(l.lat, b.lat) AS lat, COALESCE(l.lng, b.lng) AS lng,
  COALESCE(c.compatible_makes, ARRAY[]::text[]) || COALESCE(fit.makes, ARRAY[]::text[]) AS compatible_makes,
  COALESCE(c.compatible_models, ARRAY[]::text[]) || COALESCE(fit.models, ARRAY[]::text[]) AS compatible_models,
  COALESCE(c.year_min, fit.year_min) AS year_min, COALESCE(c.year_max, fit.year_max) AS year_max,
  c.manufacturer AS catalog_manufacturer, c.manufacturer_part_number AS catalog_part_number,
  COALESCE(fit.profiles, '[]'::jsonb) AS fitment_profiles,
  CASE WHEN l.inventory_source = 'api' THEN l.last_inventory_sync_at ELSE i.updated_at END AS stock_verified_at
FROM public.business_inventory_items i
JOIN public.businesses b ON b.id = i.business_id
LEFT JOIN public.business_inventory_locations l ON l.id = i.location_id AND l.business_id = i.business_id AND l.active
LEFT JOIN public.parts_catalog c ON c.id = i.catalog_part_id
LEFT JOIN LATERAL (
  SELECT array_agg(DISTINCT vp.make) FILTER (WHERE vp.make IS NOT NULL) AS makes,
    array_agg(DISTINCT vp.model) FILTER (WHERE vp.model IS NOT NULL) AS models,
    min(vp.year_min) AS year_min, max(vp.year_max) AS year_max,
    jsonb_agg(jsonb_build_object('profile_id',vp.id,'make',vp.make,'model',vp.model,'variant',vp.variant,
      'year_min',vp.year_min,'year_max',vp.year_max,'engine_code',vp.engine_code,'chassis_code',vp.chassis_code,
      'position',pf.position,'confidence',pf.confidence)) AS profiles
  FROM public.parts_fitment pf JOIN public.parts_vehicle_profiles vp ON vp.id = pf.vehicle_profile_id
  WHERE pf.product_id = c.id AND pf.fitment_status = 'confirmed' AND vp.status = 'approved'
) fit ON true
WHERE i.active AND i.network_visible AND GREATEST(i.qty_on_hand - public.active_reservation_qty(i.id), 0) > 0
  AND (l.id IS NULL OR l.network_visible)
  AND (l.id IS NULL OR l.inventory_source <> 'api' OR (l.last_inventory_sync_at IS NOT NULL
       AND l.last_inventory_sync_at > now() - make_interval(mins => l.stale_after_minutes)))
  AND public.is_network_publishable_business(b.id);

GRANT SELECT ON public.network_stock TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Exposure approval stays an administrator decision (§3 rule 3, §5.1).
--    Owners may opt in/out and (re)request review through
--    request_network_exposure(); only moderators/admins or service-role
--    contexts may approve, revoke, or write reviewer fields.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_business_network_exposure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (select auth.uid()) IS NULL OR public.can_moderate((select auth.uid())) THEN
    RETURN NEW;
  END IF;

  IF NEW.network_exposure_reviewed_at IS DISTINCT FROM OLD.network_exposure_reviewed_at
     OR NEW.network_exposure_reviewed_by IS DISTINCT FROM OLD.network_exposure_reviewed_by
     OR NEW.network_exposure_review_note IS DISTINCT FROM OLD.network_exposure_review_note THEN
    RAISE EXCEPTION 'Network exposure review fields are administrator-only'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.network_exposure_status IS DISTINCT FROM OLD.network_exposure_status
     AND NEW.network_exposure_status NOT IN ('pending', 'none') THEN
    RAISE EXCEPTION 'Network exposure approval or revocation requires administrator review'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_business_network_exposure() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_business_network_exposure ON public.businesses;
CREATE TRIGGER trg_guard_business_network_exposure
  BEFORE UPDATE OF network_exposure_status, network_exposure_reviewed_at,
    network_exposure_reviewed_by, network_exposure_review_note
  ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.guard_business_network_exposure();

-- ---------------------------------------------------------------------------
-- 6. Network inquiries: identity cannot be forged, lifecycle fields start
--    empty, and only publishable partners can be contacted.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "npi: anyone insert" ON public.network_part_inquiries;
DROP POLICY IF EXISTS "npi: guest insert" ON public.network_part_inquiries;
DROP POLICY IF EXISTS "npi: signed-in insert" ON public.network_part_inquiries;

CREATE POLICY "npi: guest insert"
  ON public.network_part_inquiries FOR INSERT
  TO anon
  WITH CHECK (
    requester_user_id IS NULL
    AND status = 'pending'
    AND response_note IS NULL AND responded_at IS NULL AND responded_by IS NULL
    AND fulfilled_price IS NULL AND fulfilled_quantity IS NULL
    AND fulfilled_eta IS NULL AND fulfilled_message IS NULL
    AND reserved_quantity IS NULL AND reserved_until IS NULL AND reserved_item_id IS NULL
    AND public.is_network_publishable_business(business_id)
  );

CREATE POLICY "npi: signed-in insert"
  ON public.network_part_inquiries FOR INSERT
  TO authenticated
  WITH CHECK (
    (requester_user_id IS NULL OR requester_user_id = (select auth.uid()))
    AND status = 'pending'
    AND response_note IS NULL AND responded_at IS NULL AND responded_by IS NULL
    AND fulfilled_price IS NULL AND fulfilled_quantity IS NULL
    AND fulfilled_eta IS NULL AND fulfilled_message IS NULL
    AND reserved_quantity IS NULL AND reserved_until IS NULL AND reserved_item_id IS NULL
    AND public.is_network_publishable_business(business_id)
  );

-- Guests insert only; they never read, update or delete inquiries.
REVOKE ALL ON public.network_part_inquiries FROM anon;
GRANT INSERT ON public.network_part_inquiries TO anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, DELETE ON public.network_part_inquiries FROM authenticated;

-- ---------------------------------------------------------------------------
-- 7. Defense in depth: RPC-only commercial tables are read-only to API roles,
--    and lifecycle RPCs are not executable by anon.
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.parts_orders, public.parts_order_lines, public.parts_reservations,
  public.parts_order_events, public.parts_receipts, public.parts_receipt_lines,
  public.installed_components, public.parts_returns, public.parts_return_lines,
  public.parts_warranty_claims, public.business_network_exposure_audit
  FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.parts_orders, public.parts_order_lines, public.parts_reservations,
  public.parts_order_events, public.parts_receipts, public.parts_receipt_lines,
  public.installed_components, public.parts_returns, public.parts_return_lines,
  public.parts_warranty_claims, public.business_network_exposure_audit
  FROM authenticated;
GRANT SELECT ON public.parts_orders, public.parts_order_lines, public.parts_reservations,
  public.parts_order_events, public.parts_receipts, public.parts_receipt_lines,
  public.installed_components, public.parts_returns, public.parts_return_lines,
  public.parts_warranty_claims, public.business_network_exposure_audit
  TO authenticated;

DO $revoke_rpc$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'create_parts_network_order', 'transition_parts_network_order',
        'receive_parts_network_order', 'record_installed_component',
        'create_parts_return', 'transition_parts_return',
        'create_parts_warranty_claim', 'transition_parts_warranty_claim',
        'can_access_parts_order'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END
$revoke_rpc$;
