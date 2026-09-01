-- Associate privacy, offboarding, live-stock freshness, and consented vehicle history.
-- Additive: private business ledgers and all historical transactions are retained.

ALTER TABLE public.business_associate_applications
  ADD COLUMN IF NOT EXISTS access_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_enabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS offboarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS offboard_reason text,
  ADD COLUMN IF NOT EXISTS last_transaction_at timestamptz;

UPDATE public.business_associate_applications
SET access_enabled = (status = 'approved'),
    access_enabled_at = CASE WHEN status = 'approved' THEN COALESCE(access_enabled_at, approved_at, reviewed_at) ELSE access_enabled_at END,
    access_disabled_at = CASE WHEN status IN ('suspended','withdrawn','rejected') THEN COALESCE(access_disabled_at, reviewed_at, updated_at) ELSE access_disabled_at END;

CREATE OR REPLACE FUNCTION public.is_active_associate(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_associate_applications a
    JOIN public.businesses b ON b.id = a.business_id
    WHERE a.business_id = _business_id
      AND a.status = 'approved'
      AND a.access_enabled
      AND a.offboarded_at IS NULL
      AND b.status = 'active'
  );
$$;
REVOKE ALL ON FUNCTION public.is_active_associate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_associate(uuid) TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.associate_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  application_id uuid REFERENCES public.business_associate_applications(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('approved','access_enabled','access_disabled','suspended','offboarded','reinstated','api_connected','api_disconnected')),
  previous_status text,
  new_status text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS associate_access_audit_business_idx ON public.associate_access_audit(business_id, occurred_at DESC);
ALTER TABLE public.associate_access_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.associate_access_audit FROM anon, authenticated;
GRANT SELECT ON public.associate_access_audit TO authenticated;
GRANT ALL ON public.associate_access_audit TO service_role;
CREATE POLICY "associate access audit: managers and admins read" ON public.associate_access_audit
  FOR SELECT TO authenticated USING (
    public.is_business_member((select auth.uid()), business_id)
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

CREATE TABLE IF NOT EXISTS public.associate_api_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  connection_name text NOT NULL,
  provider text NOT NULL DEFAULT 'associate_api',
  credential_reference text, -- reference to a secrets manager only; never store API secrets here
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','paused','revoked')),
  last_heartbeat_at timestamptz,
  last_sync_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, connection_name)
);
ALTER TABLE public.associate_api_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.associate_api_connections FROM anon, authenticated;
GRANT SELECT ON public.associate_api_connections TO authenticated;
GRANT ALL ON public.associate_api_connections TO service_role;
CREATE POLICY "associate api: managers and admins read" ON public.associate_api_connections
  FOR SELECT TO authenticated USING (
    public.is_business_member((select auth.uid()), business_id)
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

ALTER TABLE public.business_inventory_locations
  ADD COLUMN IF NOT EXISTS inventory_source text NOT NULL DEFAULT 'manual'
    CHECK (inventory_source IN ('manual','api','shop_manager','import')),
  ADD COLUMN IF NOT EXISTS last_inventory_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS stale_after_minutes integer NOT NULL DEFAULT 1440
    CHECK (stale_after_minutes BETWEEN 5 AND 43200);

-- New commercial transactions require active Associate access. Existing orders,
-- returns, warranties, and their history remain available for completion/audit.
CREATE OR REPLACE FUNCTION public.enforce_active_associate_on_new_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_active_associate(NEW.requester_business_id) THEN
    RAISE EXCEPTION 'Requesting business does not have active 365 Associate access';
  END IF;
  IF NOT public.is_active_associate(NEW.supplier_business_id) THEN
    RAISE EXCEPTION 'Supplying business does not have active 365 Associate access';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS parts_orders_require_active_associates ON public.parts_orders;
CREATE TRIGGER parts_orders_require_active_associates
  BEFORE INSERT ON public.parts_orders FOR EACH ROW
  EXECUTE FUNCTION public.enforce_active_associate_on_new_order();

CREATE OR REPLACE FUNCTION public.touch_associate_last_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.business_associate_applications
  SET last_transaction_at = GREATEST(COALESCE(last_transaction_at, '-infinity'::timestamptz), NEW.created_at),
      updated_at = now()
  WHERE business_id IN (
    SELECT requester_business_id FROM public.parts_orders WHERE id = NEW.order_id
    UNION
    SELECT supplier_business_id FROM public.parts_orders WHERE id = NEW.order_id
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS parts_order_events_touch_associate ON public.parts_order_events;
CREATE TRIGGER parts_order_events_touch_associate
  AFTER INSERT ON public.parts_order_events FOR EACH ROW
  EXECUTE FUNCTION public.touch_associate_last_transaction();

CREATE OR REPLACE FUNCTION public.offboard_business_associate(
  _application_id uuid,
  _reason text
) RETURNS public.business_associate_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_app public.business_associate_applications%ROWTYPE;
BEGIN
  IF (select auth.uid()) IS NULL OR NOT public.has_role((select auth.uid()), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF NULLIF(trim(_reason), '') IS NULL THEN RAISE EXCEPTION 'An offboarding reason is required'; END IF;

  SELECT * INTO v_app FROM public.business_associate_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Associate application not found'; END IF;

  UPDATE public.business_associate_applications SET
    status = 'suspended', access_enabled = false, access_disabled_at = now(),
    offboarded_at = now(), offboard_reason = trim(_reason), reviewed_at = now(),
    reviewed_by = (select auth.uid()), review_note = trim(_reason), updated_at = now()
  WHERE id = _application_id RETURNING * INTO v_app;

  UPDATE public.businesses SET expose_inventory_to_network = false,
    network_exposure_status = 'revoked', network_exposure_reviewed_at = now(),
    network_exposure_reviewed_by = (select auth.uid()),
    network_exposure_review_note = trim(_reason), updated_at = now()
  WHERE id = v_app.business_id;

  UPDATE public.associate_api_connections SET status = 'revoked', revoked_at = now(),
    revoked_by = (select auth.uid()), credential_reference = NULL, updated_at = now()
  WHERE business_id = v_app.business_id AND status <> 'revoked';

  INSERT INTO public.associate_access_audit
    (business_id, application_id, actor_id, event_type, previous_status, new_status, reason)
  VALUES (v_app.business_id, v_app.id, (select auth.uid()), 'offboarded', 'approved', 'suspended', trim(_reason));
  RETURN v_app;
END;
$$;
REVOKE ALL ON FUNCTION public.offboard_business_associate(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.offboard_business_associate(uuid,text) TO authenticated;

-- Keep approval state and legacy network-exposure state synchronized.
CREATE OR REPLACE FUNCTION public.sync_associate_access_state()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    NEW.access_enabled := true;
    NEW.access_enabled_at := COALESCE(NEW.access_enabled_at, now());
    NEW.access_disabled_at := NULL;
    NEW.offboarded_at := NULL;
    NEW.offboard_reason := NULL;
    UPDATE public.businesses SET expose_inventory_to_network = true,
      network_exposure_status = 'approved', network_exposure_reviewed_at = now(), updated_at = now()
    WHERE id = NEW.business_id;
  ELSIF NEW.status IN ('suspended','withdrawn','rejected') THEN
    NEW.access_enabled := false;
    NEW.access_disabled_at := COALESCE(NEW.access_disabled_at, now());
    UPDATE public.businesses SET expose_inventory_to_network = false,
      network_exposure_status = 'revoked', network_exposure_reviewed_at = now(), updated_at = now()
    WHERE id = NEW.business_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS business_associate_sync_access ON public.business_associate_applications;
CREATE TRIGGER business_associate_sync_access
  BEFORE INSERT OR UPDATE OF status ON public.business_associate_applications
  FOR EACH ROW EXECUTE FUNCTION public.sync_associate_access_state();

-- Customer identity stays private. Cross-location visibility is explicit and revocable.
CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.customer_business_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE RESTRICT,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  purpose text NOT NULL DEFAULT 'service_and_warranty',
  status text NOT NULL DEFAULT 'granted' CHECK (status IN ('pending','granted','revoked','expired')),
  granted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  terms_version text NOT NULL DEFAULT 'customer-network-v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_account_id, business_id, purpose)
);
CREATE TABLE IF NOT EXISTS public.vehicle_history_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE RESTRICT,
  business_id uuid REFERENCES public.businesses(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('part_ordered','part_paid','part_installed','service','inspection','warranty_opened','warranty_resolved','return_opened','return_resolved','odometer','ownership_note')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  odometer_km integer CHECK (odometer_km IS NULL OR odometer_km >= 0),
  title text NOT NULL,
  summary text,
  source_table text,
  source_id uuid,
  verification_status text NOT NULL DEFAULT 'business_attested' CHECK (verification_status IN ('customer_entered','business_attested','365_verified')),
  public_summary_allowed boolean NOT NULL DEFAULT false,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicle_history_events_vehicle_idx ON public.vehicle_history_events(vehicle_id, occurred_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_history_events_source_idx ON public.vehicle_history_events(source_table, source_id, event_type) WHERE source_id IS NOT NULL;

ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_business_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_history_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_accounts, public.customer_business_consents, public.vehicle_history_events FROM anon, authenticated;
GRANT SELECT ON public.customer_accounts, public.customer_business_consents, public.vehicle_history_events TO authenticated;
GRANT ALL ON public.customer_accounts, public.customer_business_consents, public.vehicle_history_events TO service_role;
CREATE POLICY "customer accounts: owner read" ON public.customer_accounts FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "customer consents: customer or business read" ON public.customer_business_consents FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.customer_accounts c WHERE c.id = customer_account_id AND c.user_id = (select auth.uid()))
  OR public.is_business_member((select auth.uid()), business_id)
);
CREATE POLICY "vehicle history: owner or consented business read" ON public.vehicle_history_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.customer_accounts c WHERE c.id = customer_account_id AND c.user_id = (select auth.uid()))
  OR (business_id IS NOT NULL AND public.is_business_member((select auth.uid()), business_id)
      AND EXISTS (SELECT 1 FROM public.customer_business_consents cc WHERE cc.customer_account_id = vehicle_history_events.customer_account_id
        AND cc.business_id = vehicle_history_events.business_id AND cc.status = 'granted'
        AND (cc.expires_at IS NULL OR cc.expires_at > now())))
  OR public.has_role((select auth.uid()), 'admin'::public.app_role)
);

CREATE POLICY "vehicle history: opted-in public summary" ON public.vehicle_history_events
  FOR SELECT TO anon, authenticated USING (
    public_summary_allowed AND EXISTS (
      SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.is_public
    )
  );
GRANT SELECT (id, vehicle_id, event_type, occurred_at, odometer_km, title, summary, verification_status, public_summary_allowed)
  ON public.vehicle_history_events TO anon;

CREATE OR REPLACE FUNCTION public.ensure_customer_account(_display_name text DEFAULT NULL)
RETURNS public.customer_accounts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_account public.customer_accounts%ROWTYPE;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.customer_accounts(user_id, display_name)
  VALUES ((select auth.uid()), NULLIF(trim(_display_name), ''))
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(NULLIF(trim(EXCLUDED.display_name), ''), customer_accounts.display_name),
    updated_at = now()
  RETURNING * INTO v_account;
  RETURN v_account;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_customer_account(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_customer_account(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_customer_business_consent(
  _business_id uuid, _purpose text, _grant boolean, _expires_at timestamptz DEFAULT NULL
) RETURNS public.customer_business_consents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_customer public.customer_accounts%ROWTYPE; v_consent public.customer_business_consents%ROWTYPE;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_customer FROM public.customer_accounts WHERE user_id = (select auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Create a customer account first'; END IF;
  IF NOT public.is_active_associate(_business_id) THEN RAISE EXCEPTION 'Business is not an active 365 Associate'; END IF;
  IF NULLIF(trim(_purpose), '') IS NULL THEN RAISE EXCEPTION 'Consent purpose is required'; END IF;
  INSERT INTO public.customer_business_consents
    (customer_account_id, business_id, purpose, status, granted_at, revoked_at, expires_at)
  VALUES (v_customer.id, _business_id, trim(_purpose), CASE WHEN _grant THEN 'granted' ELSE 'revoked' END,
    CASE WHEN _grant THEN now() END, CASE WHEN NOT _grant THEN now() END, CASE WHEN _grant THEN _expires_at END)
  ON CONFLICT (customer_account_id, business_id, purpose) DO UPDATE SET
    status = EXCLUDED.status, granted_at = CASE WHEN _grant THEN now() ELSE customer_business_consents.granted_at END,
    revoked_at = CASE WHEN _grant THEN NULL ELSE now() END, expires_at = EXCLUDED.expires_at, updated_at = now()
  RETURNING * INTO v_consent;
  RETURN v_consent;
END;
$$;
REVOKE ALL ON FUNCTION public.set_customer_business_consent(uuid,text,boolean,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_customer_business_consent(uuid,text,boolean,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.append_vehicle_history_event(
  _vehicle_id uuid, _customer_account_id uuid, _business_id uuid, _event_type text,
  _occurred_at timestamptz, _title text, _summary text DEFAULT NULL, _odometer_km integer DEFAULT NULL,
  _source_table text DEFAULT NULL, _source_id uuid DEFAULT NULL, _public_summary_allowed boolean DEFAULT false,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.vehicle_history_events
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_event public.vehicle_history_events%ROWTYPE; v_is_owner boolean; v_is_business boolean;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.customer_accounts c
    WHERE c.id = _customer_account_id AND c.user_id = (select auth.uid())) INTO v_is_owner;
  v_is_business := _business_id IS NOT NULL
    AND public.is_active_associate(_business_id)
    AND public.has_business_role((select auth.uid()), _business_id, 'manager'::public.business_staff_role)
    AND EXISTS (SELECT 1 FROM public.customer_business_consents cc
      WHERE cc.customer_account_id = _customer_account_id AND cc.business_id = _business_id
        AND cc.status = 'granted' AND (cc.expires_at IS NULL OR cc.expires_at > now()));
  IF NOT v_is_owner AND NOT v_is_business THEN RAISE EXCEPTION 'Customer consent or vehicle-owner access required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vehicles v JOIN public.customer_accounts c ON c.user_id = v.owner_user_id
    WHERE v.id = _vehicle_id AND c.id = _customer_account_id) THEN
    RAISE EXCEPTION 'Vehicle is not linked to this customer account';
  END IF;
  INSERT INTO public.vehicle_history_events(vehicle_id, customer_account_id, business_id, event_type,
    occurred_at, odometer_km, title, summary, source_table, source_id, verification_status,
    public_summary_allowed, actor_id, metadata)
  VALUES (_vehicle_id, _customer_account_id, _business_id, _event_type, COALESCE(_occurred_at, now()),
    _odometer_km, trim(_title), NULLIF(trim(_summary), ''), NULLIF(trim(_source_table), ''), _source_id,
    CASE WHEN v_is_business THEN 'business_attested' ELSE 'customer_entered' END,
    CASE WHEN v_is_owner THEN _public_summary_allowed ELSE false END, (select auth.uid()), COALESCE(_metadata, '{}'::jsonb))
  RETURNING * INTO v_event;
  RETURN v_event;
END;
$$;
REVOKE ALL ON FUNCTION public.append_vehicle_history_event(uuid,uuid,uuid,text,timestamptz,text,text,integer,text,uuid,boolean,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.append_vehicle_history_event(uuid,uuid,uuid,text,timestamptz,text,text,integer,text,uuid,boolean,jsonb) TO authenticated;

CREATE OR REPLACE VIEW public.vehicle_history_public
WITH (security_invoker = true) AS
SELECT e.id, e.vehicle_id, e.event_type, e.occurred_at, e.odometer_km, e.title,
  e.summary, e.verification_status
FROM public.vehicle_history_events e
JOIN public.vehicles v ON v.id = e.vehicle_id
WHERE v.is_public AND e.public_summary_allowed;
GRANT SELECT ON public.vehicle_history_public TO anon, authenticated;

-- Rebuild the minimum network projection. Private cost, notes, bins, customer data,
-- exact API configuration, and non-published inventory never enter this view.
DROP VIEW IF EXISTS public.network_stock;
CREATE VIEW public.network_stock WITH (security_invoker = on) AS
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
JOIN public.business_associate_applications a ON a.business_id = b.id
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
  AND b.expose_inventory_to_network AND b.network_exposure_status = 'approved' AND b.status = 'active'
  AND a.status = 'approved' AND a.access_enabled AND a.offboarded_at IS NULL;
GRANT SELECT ON public.network_stock TO anon, authenticated;
