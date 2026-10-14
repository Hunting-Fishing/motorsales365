
-- ============================================================================
-- SOURCE MIGRATION: 20260902123940_business_part_cross_references.sql
-- ============================================================================
-- Private Associate supplier-number cross references.
--
-- Canonical numbers in parts_product_numbers are shared network data. These
-- rows belong to one business and are intentionally never exposed through
-- network_stock or any public policy.

CREATE TABLE IF NOT EXISTS public.business_part_cross_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.business_inventory_items(id) ON DELETE CASCADE,
  catalog_part_id uuid REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  supplier_name text,
  part_number text NOT NULL,
  normalized_number text
    GENERATED ALWAYS AS (public.normalize_part_number(part_number)) STORED,
  number_type text NOT NULL
    CHECK (number_type IN ('business_sku','supplier_sku','manufacturer','oem','barcode','interchange')),
  source text NOT NULL DEFAULT 'inventory_sync'
    CHECK (source IN ('inventory_sync','manual','supplier_feed','import')),
  is_preferred boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (normalized_number IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS business_part_xref_identity_idx
  ON public.business_part_cross_references
  (business_id, inventory_item_id, normalized_number, number_type);
CREATE INDEX IF NOT EXISTS business_part_xref_lookup_idx
  ON public.business_part_cross_references (business_id, normalized_number)
  WHERE active;
CREATE INDEX IF NOT EXISTS business_part_xref_catalog_idx
  ON public.business_part_cross_references (business_id, catalog_part_id)
  WHERE active AND catalog_part_id IS NOT NULL;

ALTER TABLE public.business_part_cross_references ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_part_cross_references FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_part_cross_references TO authenticated;
GRANT ALL ON public.business_part_cross_references TO service_role;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.business_part_cross_references FROM authenticated;

CREATE POLICY "business part xrefs: members read"
  ON public.business_part_cross_references FOR SELECT TO authenticated
  USING (public.is_business_member((select auth.uid()), business_id));

CREATE POLICY "business part xrefs: managers insert"
  ON public.business_part_cross_references FOR INSERT TO authenticated
  WITH CHECK (
    public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role)
  );

CREATE POLICY "business part xrefs: managers update"
  ON public.business_part_cross_references FOR UPDATE TO authenticated
  USING (
    public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role)
  )
  WITH CHECK (
    public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role)
  );

CREATE POLICY "business part xrefs: managers delete"
  ON public.business_part_cross_references FOR DELETE TO authenticated
  USING (
    public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role)
  );

CREATE TRIGGER business_part_cross_references_updated_at
  BEFORE UPDATE ON public.business_part_cross_references
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_inventory_part_cross_references()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.business_part_cross_references
  WHERE inventory_item_id = NEW.id
    AND source = 'inventory_sync';

  INSERT INTO public.business_part_cross_references (
    business_id, inventory_item_id, catalog_part_id, supplier_name,
    part_number, number_type, source, is_preferred, created_by
  )
  SELECT NEW.business_id, NEW.id, NEW.catalog_part_id, NEW.supplier,
         candidate.part_number, candidate.number_type, 'inventory_sync',
         candidate.is_preferred, auth.uid()
  FROM (VALUES
    (NEW.sku, 'business_sku', true),
    (NEW.manufacturer_part_number, 'manufacturer', false),
    (NEW.oem_part_number, 'oem', false),
    (NEW.barcode, 'barcode', false)
  ) AS candidate(part_number, number_type, is_preferred)
  WHERE public.normalize_part_number(candidate.part_number) IS NOT NULL
  ON CONFLICT (business_id, inventory_item_id, normalized_number, number_type)
  DO UPDATE SET
    catalog_part_id = EXCLUDED.catalog_part_id,
    supplier_name = EXCLUDED.supplier_name,
    part_number = EXCLUDED.part_number,
    active = true,
    updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_inventory_part_cross_references() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_inventory_part_cross_references() TO service_role;

CREATE TRIGGER sync_inventory_part_cross_references
  AFTER INSERT OR UPDATE OF business_id, sku, manufacturer_part_number,
    oem_part_number, barcode, supplier, catalog_part_id
  ON public.business_inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_part_cross_references();

-- Backfill the working inventory without altering any inventory row.
INSERT INTO public.business_part_cross_references (
  business_id, inventory_item_id, catalog_part_id, supplier_name,
  part_number, number_type, source, is_preferred
)
SELECT i.business_id, i.id, i.catalog_part_id, i.supplier,
       candidate.part_number, candidate.number_type, 'inventory_sync', candidate.is_preferred
FROM public.business_inventory_items i
CROSS JOIN LATERAL (VALUES
  (i.sku, 'business_sku', true),
  (i.manufacturer_part_number, 'manufacturer', false),
  (i.oem_part_number, 'oem', false),
  (i.barcode, 'barcode', false)
) AS candidate(part_number, number_type, is_preferred)
WHERE public.normalize_part_number(candidate.part_number) IS NOT NULL
ON CONFLICT (business_id, inventory_item_id, normalized_number, number_type)
DO UPDATE SET
  catalog_part_id = EXCLUDED.catalog_part_id,
  supplier_name = EXCLUDED.supplier_name,
  part_number = EXCLUDED.part_number,
  active = true,
  updated_at = now();


-- ============================================================================
-- SOURCE MIGRATION: 20260902131844_seed_ph_chassis_vehicle_profiles.sql
-- ============================================================================
-- Promote the existing curated Asian/JDM chassis-code reference into the
-- canonical PH vehicle-profile layer. This creates vehicle identities only;
-- it deliberately does not claim that any part fits a vehicle.

INSERT INTO public.parts_vehicle_profiles (
  country_code,
  make,
  model,
  year_min,
  year_max,
  engine_code,
  chassis_code,
  market_code,
  source,
  source_reference,
  status,
  attributes
)
SELECT
  'PH',
  j.make,
  j.model,
  j.year_min,
  j.year_max,
  NULLIF(btrim(j.engine), ''),
  upper(j.code),
  'PH-JDM',
  '365_jdm_chassis_codes',
  'jdm_chassis_codes:' || upper(j.code),
  'approved',
  jsonb_strip_nulls(jsonb_build_object('notes', j.notes))
FROM public.jdm_chassis_codes j
WHERE NOT EXISTS (
  SELECT 1
  FROM public.parts_vehicle_profiles v
  WHERE v.country_code = 'PH'
    AND lower(v.make) = lower(j.make)
    AND lower(v.model) = lower(j.model)
    AND upper(COALESCE(v.chassis_code, '')) = upper(j.code)
    AND COALESCE(v.year_min, 0) = COALESCE(j.year_min, 0)
    AND COALESCE(v.year_max, 9999) = COALESCE(j.year_max, 9999)
);


-- ============================================================================
-- SOURCE MIGRATION: 20260902151438_assistant_manager_temporary_canonical_permission.sql
-- ============================================================================
-- Add an Assistant Manager tier and narrowly scoped, expiring staff grants for
-- linking private inventory rows to active canonical catalogue products.

ALTER TYPE public.business_staff_role ADD VALUE IF NOT EXISTS 'assistant_manager' AFTER 'manager';

CREATE OR REPLACE FUNCTION public.has_business_role(
  _user uuid,
  _business uuid,
  _role public.business_staff_role
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_business_owner(_user, _business)
    OR EXISTS (
      SELECT 1
      FROM public.business_staff
      WHERE business_id = _business
        AND user_id = _user
        AND active = true
        AND (
          role = _role
          OR role::text IN ('owner', 'manager', 'assistant_manager')
        )
    )
$$;
REVOKE ALL ON FUNCTION public.has_business_role(uuid,uuid,public.business_staff_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_business_role(uuid,uuid,public.business_staff_role) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.business_staff_temporary_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key text NOT NULL CHECK (permission_key IN ('canonical_inventory_link')),
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  reason text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > granted_at)
);

CREATE INDEX IF NOT EXISTS business_staff_temp_permission_lookup_idx
  ON public.business_staff_temporary_permissions
  (business_id, user_id, permission_key, expires_at DESC)
  WHERE revoked_at IS NULL;

ALTER TABLE public.business_staff_temporary_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_staff_temporary_permissions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.business_staff_temporary_permissions TO authenticated;
GRANT ALL ON public.business_staff_temporary_permissions TO service_role;

CREATE POLICY "temporary permissions: employee or managers read"
  ON public.business_staff_temporary_permissions FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role)
  );

CREATE POLICY "temporary permissions: managers grant"
  ON public.business_staff_temporary_permissions FOR INSERT TO authenticated
  WITH CHECK (
    public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role)
    AND granted_by = (select auth.uid())
    AND public.is_business_member(user_id, business_id)
  );

CREATE POLICY "temporary permissions: managers revoke"
  ON public.business_staff_temporary_permissions FOR UPDATE TO authenticated
  USING (public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role))
  WITH CHECK (public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role));

CREATE OR REPLACE FUNCTION public.has_active_business_permission(
  _user uuid,
  _business uuid,
  _permission_key text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_business_role(_user, _business, 'manager'::public.business_staff_role)
    OR EXISTS (
      SELECT 1
      FROM public.business_staff_temporary_permissions p
      JOIN public.business_staff s
        ON s.business_id = p.business_id AND s.user_id = p.user_id AND s.active
      WHERE p.business_id = _business
        AND p.user_id = _user
        AND p.permission_key = _permission_key
        AND p.revoked_at IS NULL
        AND p.expires_at > now()
    )
$$;
REVOKE ALL ON FUNCTION public.has_active_business_permission(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_business_permission(uuid,uuid,text) TO authenticated, service_role;

-- Deliberately expose one narrow mutation instead of widening the inventory
-- table UPDATE policy. The caller can change only catalog_part_id, and the
-- selected product must be an approved, active canonical catalogue record.
CREATE OR REPLACE FUNCTION public.link_business_inventory_catalog_part(
  _business_id uuid,
  _inventory_item_id uuid,
  _catalog_part_id uuid
) RETURNS public.business_inventory_items
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_actor uuid := (select auth.uid());
  v_item public.business_inventory_items%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.has_active_business_permission(
    v_actor, _business_id, 'canonical_inventory_link'
  ) THEN
    RAISE EXCEPTION 'Canonical catalogue linking permission required';
  END IF;

  SELECT * INTO v_item
  FROM public.business_inventory_items
  WHERE id = _inventory_item_id AND business_id = _business_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item not found'; END IF;

  IF _catalog_part_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.parts_catalog
    WHERE id = _catalog_part_id AND active = true AND catalog_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Select an active approved canonical catalogue product';
  END IF;

  UPDATE public.business_inventory_items
  SET catalog_part_id = _catalog_part_id, updated_at = now()
  WHERE id = _inventory_item_id AND business_id = _business_id
  RETURNING * INTO v_item;

  INSERT INTO public.business_inventory_movements(
    item_id, business_id, delta, reason, actor_id
  ) VALUES (
    _inventory_item_id,
    _business_id,
    0,
    CASE WHEN _catalog_part_id IS NULL
      THEN 'Canonical catalogue link removed'
      ELSE 'Canonical catalogue product linked'
    END,
    v_actor
  );

  RETURN v_item;
END;
$$;
REVOKE ALL ON FUNCTION public.link_business_inventory_catalog_part(uuid,uuid,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_business_inventory_catalog_part(uuid,uuid,uuid)
  TO authenticated, service_role;

-- Keep the existing Shop Manager bridge aligned with the new role.
CREATE OR REPLACE FUNCTION shop_manager.sync_business_staff_member(
  _business_id uuid,
  _user_id uuid,
  _active boolean,
  _business_role text,
  _title text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = shop_manager, public, auth, pg_temp
AS $$
DECLARE
  v_business public.businesses%ROWTYPE;
  v_public_profile public.profiles%ROWTYPE;
  v_shop_id uuid;
  v_shop_role text;
  v_role_id uuid;
  v_email text;
BEGIN
  SELECT * INTO v_business FROM public.businesses WHERE id = _business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Business not found'; END IF;
  SELECT * INTO v_public_profile FROM public.profiles WHERE id = _user_id;
  SELECT email INTO v_email FROM auth.users WHERE id = _user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'Employee auth account not found'; END IF;

  INSERT INTO shop_manager.shops(name,organization_id,business_id,slug,address,phone,email,city,is_active,business_type,industry)
  VALUES (v_business.name,v_business.id,v_business.id,'sm-'||left(replace(v_business.id::text,'-',''),20),v_business.street_address,v_business.phone,v_business.email,v_business.city,true,'business',v_business.type_slug)
  ON CONFLICT (business_id) WHERE business_id IS NOT NULL DO UPDATE
    SET name=EXCLUDED.name,address=EXCLUDED.address,phone=EXCLUDED.phone,email=EXCLUDED.email,city=EXCLUDED.city,is_active=true,updated_at=now()
  RETURNING id INTO v_shop_id;

  INSERT INTO shop_manager.cash_registers(shop_id,name)
  SELECT v_shop_id,'Front Counter' WHERE NOT EXISTS (SELECT 1 FROM shop_manager.cash_registers WHERE shop_id=v_shop_id);

  IF NOT _active THEN
    UPDATE shop_manager.register_sessions SET status='manager_closed',closed_at=now(),counted_cash=expected_cash,variance=0,closing_note='Employee access deactivated' WHERE opened_by_user_id=_user_id AND status='open';
    UPDATE shop_manager.employee_shifts SET status='clocked_out',clocked_out_at=now(),closing_note='Employee access deactivated',updated_at=now() WHERE user_id=_user_id AND status IN ('on_shift','on_break');
    UPDATE shop_manager.profiles SET shop_id=NULL,updated_at=now() WHERE user_id=_user_id AND shop_id=v_shop_id;
    DELETE FROM shop_manager.user_roles ur USING shop_manager.roles r WHERE ur.role_id=r.id AND ur.user_id=_user_id AND r.name::text IN ('owner','manager','dispatch','truck_driver','technician','office_admin');
    RETURN;
  END IF;

  v_shop_role := CASE WHEN v_business.owner_id=_user_id THEN 'owner' ELSE CASE lower(_business_role)
    WHEN 'owner' THEN 'owner' WHEN 'manager' THEN 'manager' WHEN 'assistant_manager' THEN 'manager'
    WHEN 'dispatcher' THEN 'dispatch' WHEN 'driver' THEN 'truck_driver'
    WHEN 'mechanic' THEN 'technician' WHEN 'clerk' THEN 'office_admin' ELSE 'other_staff' END END;

  INSERT INTO shop_manager.profiles(id,user_id,email,first_name,last_name,shop_id,job_title,department,has_auth_account)
  VALUES (_user_id,_user_id,v_email,COALESCE(NULLIF(v_public_profile.first_name,''),'Employee'),COALESCE(NULLIF(v_public_profile.last_name,''),''),v_shop_id,COALESCE(NULLIF(_title,''),initcap(replace(_business_role,'_',' '))),'Operations',true)
  ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET email=EXCLUDED.email,first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,shop_id=EXCLUDED.shop_id,job_title=EXCLUDED.job_title,department=EXCLUDED.department,has_auth_account=true,updated_at=now();

  DELETE FROM shop_manager.user_roles ur USING shop_manager.roles r WHERE ur.role_id=r.id AND ur.user_id=_user_id AND r.name::text IN ('owner','manager','dispatch','truck_driver','technician','office_admin','other_staff');
  SELECT id INTO v_role_id FROM shop_manager.roles WHERE name::text=v_shop_role;
  IF v_role_id IS NULL THEN RAISE EXCEPTION 'Mapped Shop Manager role not found: %',v_shop_role; END IF;
  INSERT INTO shop_manager.user_roles(user_id,role_id) VALUES(_user_id,v_role_id) ON CONFLICT(user_id,role_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text) TO service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260902162000_parts_receiving_exceptions.sql
-- ============================================================================
-- Associate Network receiving exceptions and quarantine workflow.
-- Non-accepted goods are reported as cases and never enter sellable inventory.

CREATE SEQUENCE IF NOT EXISTS public.parts_receiving_exception_number_seq START 1000;
REVOKE ALL ON SEQUENCE public.parts_receiving_exception_number_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.parts_receiving_exception_number_seq TO service_role;

CREATE TABLE IF NOT EXISTS public.parts_receiving_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_number text NOT NULL UNIQUE DEFAULT (
    'RX-' || to_char(CURRENT_DATE, 'YYMM') || '-' ||
    lpad(nextval('public.parts_receiving_exception_number_seq')::text, 6, '0')
  ),
  order_id uuid NOT NULL REFERENCES public.parts_orders(id) ON DELETE RESTRICT,
  order_line_id uuid NOT NULL REFERENCES public.parts_order_lines(id) ON DELETE RESTRICT,
  requester_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  supplier_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  reported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  exception_type text NOT NULL CHECK (exception_type IN ('damaged','incorrect','short')),
  affected_quantity numeric(12,2) NOT NULL CHECK (affected_quantity > 0),
  description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 5 AND 4000),
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence) = 'array'),
  status text NOT NULL DEFAULT 'reported' CHECK (status IN (
    'reported','supplier_review','replacement_authorized','credit_authorized',
    'return_authorized','resolved','rejected','cancelled'
  )),
  supplier_note text,
  resolution text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_business_id <> supplier_business_id)
);

CREATE INDEX IF NOT EXISTS parts_receiving_exceptions_requester_status_idx
  ON public.parts_receiving_exceptions (requester_business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_receiving_exceptions_supplier_status_idx
  ON public.parts_receiving_exceptions (supplier_business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_receiving_exceptions_order_line_idx
  ON public.parts_receiving_exceptions (order_line_id, created_at DESC);

REVOKE ALL ON public.parts_receiving_exceptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.parts_receiving_exceptions TO authenticated;
GRANT ALL ON public.parts_receiving_exceptions TO service_role;
ALTER TABLE public.parts_receiving_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parts receiving exceptions: participants read"
  ON public.parts_receiving_exceptions FOR SELECT TO authenticated
  USING (
    public.is_business_member((select auth.uid()), requester_business_id)
    OR public.is_business_member((select auth.uid()), supplier_business_id)
  );

CREATE OR REPLACE FUNCTION public.create_parts_receiving_exception(
  _order_id uuid,
  _order_line_id uuid,
  _exception_type text,
  _affected_quantity numeric,
  _description text,
  _evidence jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.parts_orders%ROWTYPE;
  v_line public.parts_order_lines%ROWTYPE;
  v_exception public.parts_receiving_exceptions%ROWTYPE;
  v_remaining numeric;
  v_open_exception_quantity numeric;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _exception_type NOT IN ('damaged','incorrect','short') THEN
    RAISE EXCEPTION 'Invalid receiving exception type';
  END IF;
  IF _affected_quantity IS NULL OR _affected_quantity <= 0 THEN
    RAISE EXCEPTION 'Affected quantity must be greater than zero';
  END IF;
  IF char_length(trim(COALESCE(_description, ''))) NOT BETWEEN 5 AND 4000 THEN
    RAISE EXCEPTION 'Description must be between 5 and 4000 characters';
  END IF;
  IF _evidence IS NULL OR jsonb_typeof(_evidence) <> 'array' THEN
    RAISE EXCEPTION 'Evidence must be an array';
  END IF;

  SELECT * INTO v_order FROM public.parts_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.order_kind <> 'purchase' THEN
    RAISE EXCEPTION 'Receiving exceptions apply to supplier purchase orders';
  END IF;
  IF NOT public.has_business_role(
    (select auth.uid()), v_order.requester_business_id, 'manager'::public.business_staff_role
  ) THEN
    RAISE EXCEPTION 'Requesting business manager access required';
  END IF;
  IF v_order.status NOT IN ('ready','shipped','partially_received') THEN
    RAISE EXCEPTION 'Order is not open for receiving inspection';
  END IF;

  SELECT * INTO v_line FROM public.parts_order_lines
    WHERE id = _order_line_id AND order_id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order line not found'; END IF;
  v_remaining := COALESCE(NULLIF(v_line.accepted_quantity, 0), v_line.requested_quantity)
    - v_line.received_quantity;
  SELECT COALESCE(sum(e.affected_quantity), 0) INTO v_open_exception_quantity
  FROM public.parts_receiving_exceptions e
  WHERE e.order_line_id = v_line.id
    AND e.status NOT IN ('resolved','rejected','cancelled');
  v_remaining := v_remaining - v_open_exception_quantity;
  IF _affected_quantity > v_remaining THEN
    RAISE EXCEPTION 'Affected quantity cannot exceed % remaining', v_remaining;
  END IF;

  INSERT INTO public.parts_receiving_exceptions (
    order_id, order_line_id, requester_business_id, supplier_business_id,
    reported_by, exception_type, affected_quantity, description, evidence
  ) VALUES (
    v_order.id, v_line.id, v_order.requester_business_id, v_order.supplier_business_id,
    (select auth.uid()), _exception_type, _affected_quantity, trim(_description), _evidence
  ) RETURNING * INTO v_exception;

  INSERT INTO public.parts_order_events (order_id, actor_id, event_type, note, metadata)
  VALUES (
    v_order.id, (select auth.uid()), 'receiving_exception_reported', trim(_description),
    jsonb_build_object(
      'exception_id', v_exception.id,
      'exception_number', v_exception.exception_number,
      'exception_type', v_exception.exception_type,
      'affected_quantity', v_exception.affected_quantity,
      'order_line_id', v_line.id
    )
  );

  RETURN jsonb_build_object(
    'id', v_exception.id,
    'exception_number', v_exception.exception_number,
    'status', v_exception.status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_parts_receiving_exception(uuid,uuid,text,numeric,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_parts_receiving_exception(uuid,uuid,text,numeric,text,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_parts_receiving_exception(uuid,uuid,text,numeric,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_parts_receiving_exception(
  _exception_id uuid,
  _target_status text,
  _note text DEFAULT NULL,
  _resolution text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_case public.parts_receiving_exceptions%ROWTYPE;
  v_requester boolean;
  v_supplier boolean;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_case FROM public.parts_receiving_exceptions
    WHERE id = _exception_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receiving exception not found'; END IF;

  v_requester := public.has_business_role(
    (select auth.uid()), v_case.requester_business_id, 'manager'::public.business_staff_role
  );
  v_supplier := public.has_business_role(
    (select auth.uid()), v_case.supplier_business_id, 'manager'::public.business_staff_role
  );
  IF NOT v_requester AND NOT v_supplier THEN RAISE EXCEPTION 'Manager access required'; END IF;

  IF _target_status = 'cancelled' THEN
    IF NOT v_requester OR v_case.status <> 'reported' THEN RAISE EXCEPTION 'Case cannot be cancelled'; END IF;
  ELSIF _target_status = 'supplier_review' THEN
    IF NOT v_supplier OR v_case.status <> 'reported' THEN RAISE EXCEPTION 'Case cannot enter review'; END IF;
  ELSIF _target_status IN ('replacement_authorized','credit_authorized','return_authorized','rejected') THEN
    IF NOT v_supplier OR v_case.status NOT IN ('reported','supplier_review') THEN
      RAISE EXCEPTION 'Supplier cannot apply that resolution now';
    END IF;
  ELSIF _target_status = 'resolved' THEN
    IF NOT (v_requester OR v_supplier)
      OR v_case.status NOT IN ('replacement_authorized','credit_authorized','return_authorized') THEN
      RAISE EXCEPTION 'Only an authorized resolution can be closed';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid receiving exception status';
  END IF;

  UPDATE public.parts_receiving_exceptions
  SET status = _target_status,
      supplier_note = CASE WHEN v_supplier AND NULLIF(trim(_note), '') IS NOT NULL
        THEN trim(_note) ELSE supplier_note END,
      resolution = COALESCE(NULLIF(trim(_resolution), ''), resolution),
      resolved_by = CASE WHEN _target_status IN ('resolved','rejected','cancelled')
        THEN (select auth.uid()) ELSE resolved_by END,
      resolved_at = CASE WHEN _target_status IN ('resolved','rejected','cancelled')
        THEN now() ELSE resolved_at END,
      updated_at = now()
  WHERE id = v_case.id;

  INSERT INTO public.parts_order_events (order_id, actor_id, event_type, note, metadata)
  VALUES (
    v_case.order_id, (select auth.uid()), 'receiving_exception_' || _target_status,
    NULLIF(trim(_note), ''),
    jsonb_build_object('exception_id', v_case.id, 'exception_number', v_case.exception_number)
  );

  RETURN jsonb_build_object('id', v_case.id, 'status', _target_status);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_parts_receiving_exception(uuid,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_parts_receiving_exception(uuid,text,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.transition_parts_receiving_exception(uuid,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_receiving_exception_quarantine()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_open_exception_quantity numeric;
  v_fulfillment_quantity numeric;
BEGIN
  IF NEW.received_quantity <= OLD.received_quantity THEN RETURN NEW; END IF;
  SELECT COALESCE(sum(e.affected_quantity), 0) INTO v_open_exception_quantity
  FROM public.parts_receiving_exceptions e
  WHERE e.order_line_id = NEW.id
    AND e.status NOT IN ('resolved','rejected','cancelled');
  v_fulfillment_quantity := COALESCE(NULLIF(NEW.accepted_quantity, 0), NEW.requested_quantity);
  IF NEW.received_quantity > v_fulfillment_quantity - v_open_exception_quantity THEN
    RAISE EXCEPTION 'Receipt exceeds accepted quantity available after receiving quarantine';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_receiving_exception_quarantine() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_receiving_exception_quarantine
  ON public.parts_order_lines;
CREATE TRIGGER enforce_receiving_exception_quarantine
  BEFORE UPDATE OF received_quantity ON public.parts_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.enforce_receiving_exception_quarantine();


-- ============================================================================
-- SOURCE MIGRATION: 20260910170500_harden_parts_receiving_exception_privileges.sql
-- ============================================================================
-- Explicit least-privilege hardening for projects with broad default grants.
REVOKE ALL ON SEQUENCE public.parts_receiving_exception_number_seq
  FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.parts_receiving_exception_number_seq TO service_role;

REVOKE ALL ON public.parts_receiving_exceptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.parts_receiving_exceptions TO authenticated;
GRANT ALL ON public.parts_receiving_exceptions TO service_role;

REVOKE ALL ON FUNCTION public.create_parts_receiving_exception(uuid,uuid,text,numeric,text,jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_parts_receiving_exception(uuid,uuid,text,numeric,text,jsonb)
  TO authenticated;

REVOKE ALL ON FUNCTION public.transition_parts_receiving_exception(uuid,text,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_parts_receiving_exception(uuid,text,text,text)
  TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260910172000_enforce_receiving_exception_quarantine.sql
-- ============================================================================
-- Prevent open receiving exceptions from also being posted as accepted stock.

CREATE OR REPLACE FUNCTION public.enforce_receiving_exception_quarantine()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_open_exception_quantity numeric;
  v_fulfillment_quantity numeric;
BEGIN
  IF NEW.received_quantity <= OLD.received_quantity THEN RETURN NEW; END IF;
  SELECT COALESCE(sum(e.affected_quantity), 0) INTO v_open_exception_quantity
  FROM public.parts_receiving_exceptions e
  WHERE e.order_line_id = NEW.id
    AND e.status NOT IN ('resolved','rejected','cancelled');
  v_fulfillment_quantity := COALESCE(NULLIF(NEW.accepted_quantity, 0), NEW.requested_quantity);
  IF NEW.received_quantity > v_fulfillment_quantity - v_open_exception_quantity THEN
    RAISE EXCEPTION 'Receipt exceeds accepted quantity available after receiving quarantine';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_receiving_exception_quarantine()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_receiving_exception_quarantine
  ON public.parts_order_lines;
CREATE TRIGGER enforce_receiving_exception_quarantine
  BEFORE UPDATE OF received_quantity ON public.parts_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.enforce_receiving_exception_quarantine();

CREATE OR REPLACE FUNCTION public.create_parts_receiving_exception(
  _order_id uuid,
  _order_line_id uuid,
  _exception_type text,
  _affected_quantity numeric,
  _description text,
  _evidence jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.parts_orders%ROWTYPE;
  v_line public.parts_order_lines%ROWTYPE;
  v_exception public.parts_receiving_exceptions%ROWTYPE;
  v_remaining numeric;
  v_open_exception_quantity numeric;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _exception_type NOT IN ('damaged','incorrect','short') THEN RAISE EXCEPTION 'Invalid receiving exception type'; END IF;
  IF _affected_quantity IS NULL OR _affected_quantity <= 0 THEN RAISE EXCEPTION 'Affected quantity must be greater than zero'; END IF;
  IF char_length(trim(COALESCE(_description, ''))) NOT BETWEEN 5 AND 4000 THEN RAISE EXCEPTION 'Description must be between 5 and 4000 characters'; END IF;
  IF _evidence IS NULL OR jsonb_typeof(_evidence) <> 'array' THEN RAISE EXCEPTION 'Evidence must be an array'; END IF;

  SELECT * INTO v_order FROM public.parts_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.order_kind <> 'purchase' THEN RAISE EXCEPTION 'Receiving exceptions apply to supplier purchase orders'; END IF;
  IF NOT public.has_business_role((select auth.uid()), v_order.requester_business_id, 'manager'::public.business_staff_role) THEN
    RAISE EXCEPTION 'Requesting business manager access required';
  END IF;
  IF v_order.status NOT IN ('ready','shipped','partially_received') THEN RAISE EXCEPTION 'Order is not open for receiving inspection'; END IF;

  SELECT * INTO v_line FROM public.parts_order_lines WHERE id = _order_line_id AND order_id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order line not found'; END IF;
  SELECT COALESCE(sum(e.affected_quantity), 0) INTO v_open_exception_quantity
  FROM public.parts_receiving_exceptions e
  WHERE e.order_line_id = v_line.id AND e.status NOT IN ('resolved','rejected','cancelled');
  v_remaining := COALESCE(NULLIF(v_line.accepted_quantity, 0), v_line.requested_quantity)
    - v_line.received_quantity - v_open_exception_quantity;
  IF _affected_quantity > v_remaining THEN RAISE EXCEPTION 'Affected quantity cannot exceed % remaining', v_remaining; END IF;

  INSERT INTO public.parts_receiving_exceptions (
    order_id, order_line_id, requester_business_id, supplier_business_id,
    reported_by, exception_type, affected_quantity, description, evidence
  ) VALUES (
    v_order.id, v_line.id, v_order.requester_business_id, v_order.supplier_business_id,
    (select auth.uid()), _exception_type, _affected_quantity, trim(_description), _evidence
  ) RETURNING * INTO v_exception;
  INSERT INTO public.parts_order_events (order_id, actor_id, event_type, note, metadata)
  VALUES (v_order.id, (select auth.uid()), 'receiving_exception_reported', trim(_description),
    jsonb_build_object('exception_id', v_exception.id, 'exception_number', v_exception.exception_number,
      'exception_type', v_exception.exception_type, 'affected_quantity', v_exception.affected_quantity,
      'order_line_id', v_line.id));
  RETURN jsonb_build_object('id', v_exception.id, 'exception_number', v_exception.exception_number, 'status', v_exception.status);
END;
$$;

REVOKE ALL ON FUNCTION public.create_parts_receiving_exception(uuid,uuid,text,numeric,text,jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_parts_receiving_exception(uuid,uuid,text,numeric,text,jsonb)
  TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260911120000_close_standalone_migration_ingress.sql
-- ============================================================================
-- Close the temporary anonymous migration ingress after cutover verification.
-- The copied records remain available to service_role for rollback evidence.

drop policy if exists migration_ingest_anon_count_metadata_select
  on public.migration_ingest;
drop policy if exists migration_ingest_anon_insert
  on public.migration_ingest;

revoke all on table public.migration_ingest from anon, authenticated;
revoke all on table public.migration_auth_transfer_keys from anon, authenticated;

alter table public.migration_ingest enable row level security;
alter table public.migration_ingest force row level security;
alter table public.migration_auth_transfer_keys enable row level security;
alter table public.migration_auth_transfer_keys force row level security;

comment on table public.migration_ingest is
  'Sealed source-migration archive. Direct client access was revoked after standalone cutover verification on 2026-09-11.';
comment on table public.migration_auth_transfer_keys is
  'Sealed authentication-transfer archive. Accessible only through privileged operational tooling.';
