-- 365 Associate Network: B2B ordering, transfers, receiving, returns, warranty,
-- and installed-component history.
--
-- All commercial mutations go through narrowly granted, authenticated RPCs.
-- The tables themselves are readable by the two participating businesses but
-- are not directly writable from the client.

CREATE SEQUENCE IF NOT EXISTS public.parts_order_number_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS public.parts_return_number_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS public.parts_warranty_number_seq START 1000;

GRANT USAGE, SELECT ON SEQUENCE public.parts_order_number_seq,
  public.parts_return_number_seq, public.parts_warranty_number_seq TO service_role;

-- ---------------------------------------------------------------------------
-- Orders, lines, reservations, and immutable events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.parts_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT (
    'PN-' || to_char(CURRENT_DATE, 'YYMM') || '-' || lpad(nextval('public.parts_order_number_seq')::text, 6, '0')
  ),
  order_kind text NOT NULL DEFAULT 'purchase'
    CHECK (order_kind IN ('purchase','transfer')),
  requester_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  supplier_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  requester_shop_id uuid REFERENCES shop_manager.shops(id) ON DELETE SET NULL,
  source_location_id uuid REFERENCES public.business_inventory_locations(id) ON DELETE SET NULL,
  destination_location_id uuid REFERENCES public.business_inventory_locations(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES shop_manager.work_orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'draft','submitted','accepted','declined','picking','ready','shipped',
      'partially_received','received','cancelled'
    )),
  fulfillment_method text NOT NULL DEFAULT 'pickup'
    CHECK (fulfillment_method IN ('pickup','delivery','courier','transfer')),
  currency_code text NOT NULL DEFAULT 'PHP',
  subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
  fee_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (fee_total >= 0),
  total numeric(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  destination_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  requester_note text,
  supplier_note text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  accepted_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(currency_code) = 3),
  CHECK (
    (order_kind = 'transfer' AND requester_business_id = supplier_business_id)
    OR (order_kind = 'purchase' AND requester_business_id <> supplier_business_id)
  ),
  CHECK (
    order_kind <> 'transfer'
    OR (
      source_location_id IS NOT NULL
      AND destination_location_id IS NOT NULL
      AND source_location_id <> destination_location_id
    )
  )
);

CREATE TABLE IF NOT EXISTS public.parts_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.parts_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.business_inventory_items(id) ON DELETE SET NULL,
  destination_inventory_item_id uuid REFERENCES public.business_inventory_items(id) ON DELETE SET NULL,
  catalog_part_id uuid REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  sku_snapshot text,
  part_number_snapshot text,
  name_snapshot text NOT NULL,
  brand_snapshot text,
  condition_snapshot text,
  warranty_months_snapshot integer,
  requested_quantity numeric(12,2) NOT NULL CHECK (requested_quantity > 0),
  accepted_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (accepted_quantity >= 0),
  shipped_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (shipped_quantity >= 0),
  received_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  tax_rate numeric(7,4) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
  tax_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  fee_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  line_total numeric(14,2) NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (accepted_quantity <= requested_quantity),
  CHECK (shipped_quantity <= accepted_quantity),
  CHECK (received_quantity <= requested_quantity)
);

CREATE TABLE IF NOT EXISTS public.parts_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.parts_orders(id) ON DELETE CASCADE,
  order_line_id uuid NOT NULL UNIQUE REFERENCES public.parts_order_lines(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.business_inventory_items(id) ON DELETE CASCADE,
  supplier_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  expires_at timestamptz NOT NULL,
  released_at timestamptz,
  fulfilled_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS public.parts_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.parts_orders(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parts_orders_requester_status_idx
  ON public.parts_orders (requester_business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_orders_supplier_status_idx
  ON public.parts_orders (supplier_business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_orders_work_order_idx
  ON public.parts_orders (work_order_id)
  WHERE work_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS parts_order_lines_order_idx
  ON public.parts_order_lines (order_id, created_at);
CREATE INDEX IF NOT EXISTS parts_order_lines_inventory_idx
  ON public.parts_order_lines (inventory_item_id)
  WHERE inventory_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS parts_reservations_active_idx
  ON public.parts_reservations (inventory_item_id, expires_at)
  WHERE released_at IS NULL AND fulfilled_at IS NULL;
CREATE INDEX IF NOT EXISTS parts_order_events_order_idx
  ON public.parts_order_events (order_id, created_at);

-- ---------------------------------------------------------------------------
-- Receiving, installed components, returns, and warranty claims
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.parts_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.parts_orders(id) ON DELETE RESTRICT,
  recipient_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  destination_location_id uuid REFERENCES public.business_inventory_locations(id) ON DELETE SET NULL,
  received_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  delivery_reference text,
  notes text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parts_receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.parts_receipts(id) ON DELETE CASCADE,
  order_line_id uuid NOT NULL REFERENCES public.parts_order_lines(id) ON DELETE RESTRICT,
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  condition_on_receipt text NOT NULL DEFAULT 'accepted'
    CHECK (condition_on_receipt IN ('accepted','damaged','incorrect','short')),
  serial_numbers text[] NOT NULL DEFAULT ARRAY[]::text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.installed_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  order_line_id uuid REFERENCES public.parts_order_lines(id) ON DELETE SET NULL,
  catalog_part_id uuid REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES shop_manager.work_orders(id) ON DELETE SET NULL,
  shop_manager_vehicle_id uuid REFERENCES shop_manager.vehicles(id) ON DELETE SET NULL,
  public_vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  part_number_snapshot text,
  name_snapshot text NOT NULL,
  serial_number text,
  position text,
  installed_quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK (installed_quantity > 0),
  installed_at timestamptz NOT NULL DEFAULT now(),
  installed_odometer_km integer,
  warranty_starts_at date,
  warranty_ends_at date,
  installer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (shop_manager_vehicle_id IS NOT NULL OR public_vehicle_id IS NOT NULL),
  CHECK (warranty_starts_at IS NULL OR warranty_ends_at IS NULL OR warranty_starts_at <= warranty_ends_at)
);

CREATE TABLE IF NOT EXISTS public.parts_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number text NOT NULL UNIQUE DEFAULT (
    'RT-' || to_char(CURRENT_DATE, 'YYMM') || '-' || lpad(nextval('public.parts_return_number_seq')::text, 6, '0')
  ),
  order_id uuid NOT NULL REFERENCES public.parts_orders(id) ON DELETE RESTRICT,
  requester_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  supplier_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','approved','rejected','shipped','received','refunded','replaced','cancelled','closed')),
  reason_code text NOT NULL
    CHECK (reason_code IN ('incorrect_part','damaged','defective','not_as_described','core_return','buyer_error','other')),
  requested_resolution text NOT NULL DEFAULT 'refund'
    CHECK (requested_resolution IN ('refund','replacement','credit','repair')),
  resolution text,
  requester_note text,
  supplier_note text,
  status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.parts_return_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.parts_returns(id) ON DELETE CASCADE,
  order_line_id uuid NOT NULL REFERENCES public.parts_order_lines(id) ON DELETE RESTRICT,
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  condition_notes text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_quantity numeric(12,2) CHECK (approved_quantity IS NULL OR approved_quantity >= 0),
  refund_amount numeric(14,2) CHECK (refund_amount IS NULL OR refund_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (return_id, order_line_id)
);

CREATE TABLE IF NOT EXISTS public.parts_warranty_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text NOT NULL UNIQUE DEFAULT (
    'WC-' || to_char(CURRENT_DATE, 'YYMM') || '-' || lpad(nextval('public.parts_warranty_number_seq')::text, 6, '0')
  ),
  order_line_id uuid REFERENCES public.parts_order_lines(id) ON DELETE SET NULL,
  installed_component_id uuid REFERENCES public.installed_components(id) ON DELETE SET NULL,
  claimant_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  supplier_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','reviewing','approved','rejected','replacement_sent','credit_issued','cancelled','closed')),
  issue_description text NOT NULL,
  failure_date date,
  odometer_km integer,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_note text,
  status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (order_line_id IS NOT NULL OR installed_component_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS parts_receipts_order_idx
  ON public.parts_receipts (order_id, received_at DESC);
CREATE INDEX IF NOT EXISTS parts_receipt_lines_receipt_idx
  ON public.parts_receipt_lines (receipt_id, order_line_id);
CREATE INDEX IF NOT EXISTS installed_components_business_vehicle_idx
  ON public.installed_components (business_id, shop_manager_vehicle_id, installed_at DESC);
CREATE INDEX IF NOT EXISTS installed_components_public_vehicle_idx
  ON public.installed_components (public_vehicle_id, installed_at DESC)
  WHERE public_vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS installed_components_order_line_idx
  ON public.installed_components (order_line_id)
  WHERE order_line_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS parts_returns_requester_status_idx
  ON public.parts_returns (requester_business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_returns_supplier_status_idx
  ON public.parts_returns (supplier_business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_return_lines_order_line_idx
  ON public.parts_return_lines (order_line_id);
CREATE INDEX IF NOT EXISTS parts_warranty_claims_claimant_status_idx
  ON public.parts_warranty_claims (claimant_business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_warranty_claims_supplier_status_idx
  ON public.parts_warranty_claims (supplier_business_id, status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Explicit privileges and tenant-isolated read policies
-- ---------------------------------------------------------------------------

GRANT SELECT ON public.parts_orders, public.parts_order_lines,
  public.parts_reservations, public.parts_order_events,
  public.parts_receipts, public.parts_receipt_lines,
  public.installed_components, public.parts_returns, public.parts_return_lines,
  public.parts_warranty_claims TO authenticated;

GRANT ALL ON public.parts_orders, public.parts_order_lines,
  public.parts_reservations, public.parts_order_events,
  public.parts_receipts, public.parts_receipt_lines,
  public.installed_components, public.parts_returns, public.parts_return_lines,
  public.parts_warranty_claims TO service_role;

ALTER TABLE public.parts_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installed_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_return_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_warranty_claims ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_parts_order(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, shop_manager, pg_temp
AS $$
  SELECT (select auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.parts_orders o
    WHERE o.id = _order_id
      AND (
        public.is_business_member((select auth.uid()), o.requester_business_id)
        OR public.is_business_member((select auth.uid()), o.supplier_business_id)
        OR (
          o.requester_shop_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM shop_manager.profiles p
            WHERE p.shop_id = o.requester_shop_id
              AND (p.id = (select auth.uid()) OR p.user_id = (select auth.uid()))
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_parts_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_parts_order(uuid) TO authenticated;

CREATE POLICY "parts orders: participants read"
  ON public.parts_orders FOR SELECT TO authenticated
  USING (
    public.is_business_member((select auth.uid()), requester_business_id)
    OR public.is_business_member((select auth.uid()), supplier_business_id)
    OR (
      requester_shop_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM shop_manager.profiles p
        WHERE p.shop_id = requester_shop_id
          AND (p.id = (select auth.uid()) OR p.user_id = (select auth.uid()))
      )
    )
  );

CREATE POLICY "parts order lines: participants read"
  ON public.parts_order_lines FOR SELECT TO authenticated
  USING (public.can_access_parts_order(order_id));

CREATE POLICY "parts reservations: participants read"
  ON public.parts_reservations FOR SELECT TO authenticated
  USING (public.can_access_parts_order(order_id));

CREATE POLICY "parts order events: participants read"
  ON public.parts_order_events FOR SELECT TO authenticated
  USING (public.can_access_parts_order(order_id));

CREATE POLICY "parts receipts: participants read"
  ON public.parts_receipts FOR SELECT TO authenticated
  USING (public.can_access_parts_order(order_id));

CREATE POLICY "parts receipt lines: participants read"
  ON public.parts_receipt_lines FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parts_receipts r
      WHERE r.id = receipt_id AND public.can_access_parts_order(r.order_id)
    )
  );

CREATE POLICY "installed components: business members read"
  ON public.installed_components FOR SELECT TO authenticated
  USING (public.is_business_member((select auth.uid()), business_id));

CREATE POLICY "parts returns: participants read"
  ON public.parts_returns FOR SELECT TO authenticated
  USING (
    public.is_business_member((select auth.uid()), requester_business_id)
    OR public.is_business_member((select auth.uid()), supplier_business_id)
  );

CREATE POLICY "parts return lines: participants read"
  ON public.parts_return_lines FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parts_returns r
      WHERE r.id = return_id
        AND (
          public.is_business_member((select auth.uid()), r.requester_business_id)
          OR public.is_business_member((select auth.uid()), r.supplier_business_id)
        )
    )
  );

CREATE POLICY "parts warranty: participants read"
  ON public.parts_warranty_claims FOR SELECT TO authenticated
  USING (
    public.is_business_member((select auth.uid()), claimant_business_id)
    OR public.is_business_member((select auth.uid()), supplier_business_id)
  );

CREATE TRIGGER parts_orders_updated_at
  BEFORE UPDATE ON public.parts_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER parts_order_lines_updated_at
  BEFORE UPDATE ON public.parts_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER installed_components_updated_at
  BEFORE UPDATE ON public.installed_components
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER parts_returns_updated_at
  BEFORE UPDATE ON public.parts_returns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER parts_warranty_claims_updated_at
  BEFORE UPDATE ON public.parts_warranty_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Include live order allocations alongside existing inquiry holds.
CREATE OR REPLACE FUNCTION public.active_reservation_qty(_item_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    COALESCE((
      SELECT SUM(i.reserved_quantity)
      FROM public.network_part_inquiries i
      WHERE i.reserved_item_id = _item_id
        AND i.status = 'accepted'
        AND i.reserved_until IS NOT NULL
        AND i.reserved_until > now()
    ), 0)
    +
    COALESCE((
      SELECT SUM(r.quantity)
      FROM public.parts_reservations r
      JOIN public.parts_orders o ON o.id = r.order_id
      WHERE r.inventory_item_id = _item_id
        AND r.released_at IS NULL
        AND r.fulfilled_at IS NULL
        AND (r.expires_at > now() OR o.status IN ('picking','ready'))
    ), 0)
  )::numeric;
$$;

REVOKE ALL ON FUNCTION public.active_reservation_qty(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.active_reservation_qty(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Authenticated workflow RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_parts_network_order(
  _requester_business_id uuid,
  _supplier_business_id uuid,
  _source_location_id uuid DEFAULT NULL,
  _destination_location_id uuid DEFAULT NULL,
  _requester_shop_id uuid DEFAULT NULL,
  _work_order_id uuid DEFAULT NULL,
  _order_kind text DEFAULT 'purchase',
  _fulfillment_method text DEFAULT 'pickup',
  _requester_note text DEFAULT NULL,
  _lines jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shop_manager, pg_temp
AS $$
DECLARE
  v_order public.parts_orders%ROWTYPE;
  v_requested jsonb;
  v_item record;
  v_item_id uuid;
  v_quantity numeric;
  v_subtotal numeric := 0;
  v_tax_total numeric := 0;
  v_fee_total numeric := 0;
  v_line_subtotal numeric;
  v_line_tax numeric;
  v_line_fees numeric;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.has_business_role((select auth.uid()), _requester_business_id, 'manager'::public.business_staff_role) THEN
    RAISE EXCEPTION 'Manager access to the requesting business is required';
  END IF;
  IF _order_kind NOT IN ('purchase','transfer') THEN RAISE EXCEPTION 'Invalid order kind'; END IF;
  IF _fulfillment_method NOT IN ('pickup','delivery','courier','transfer') THEN RAISE EXCEPTION 'Invalid fulfillment method'; END IF;
  IF _order_kind = 'purchase' AND _requester_business_id = _supplier_business_id THEN
    RAISE EXCEPTION 'Use a transfer between locations for stock owned by the same business';
  END IF;
  IF _order_kind = 'transfer' AND (
    _requester_business_id <> _supplier_business_id
    OR _source_location_id IS NULL OR _destination_location_id IS NULL
    OR _source_location_id = _destination_location_id
  ) THEN
    RAISE EXCEPTION 'Transfers require two different locations in the same business';
  END IF;
  IF jsonb_typeof(_lines) <> 'array' OR jsonb_array_length(_lines) < 1 OR jsonb_array_length(_lines) > 100 THEN
    RAISE EXCEPTION 'Order must contain between 1 and 100 lines';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = _supplier_business_id AND b.status = 'active'
      AND (
        _order_kind = 'transfer'
        OR (b.expose_inventory_to_network AND b.network_exposure_status = 'approved')
      )
  ) THEN
    RAISE EXCEPTION 'Supplier is not available on the Associate Network';
  END IF;

  IF _source_location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.business_inventory_locations l
    WHERE l.id = _source_location_id AND l.business_id = _supplier_business_id AND l.active
  ) THEN RAISE EXCEPTION 'Invalid source location'; END IF;
  IF _destination_location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.business_inventory_locations l
    WHERE l.id = _destination_location_id AND l.business_id = _requester_business_id AND l.active
  ) THEN RAISE EXCEPTION 'Invalid destination location'; END IF;

  IF _requester_shop_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM shop_manager.shops s
    JOIN shop_manager.profiles p ON p.shop_id = s.id
    WHERE s.id = _requester_shop_id
      AND s.business_id = _requester_business_id
      AND (p.id = (select auth.uid()) OR p.user_id = (select auth.uid()))
  ) THEN RAISE EXCEPTION 'Shop Manager workspace is not linked to this business'; END IF;

  IF _work_order_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM shop_manager.work_orders w
    JOIN shop_manager.profiles p ON p.shop_id = w.shop_id
    WHERE w.id = _work_order_id
      AND (_requester_shop_id IS NULL OR w.shop_id = _requester_shop_id)
      AND (p.id = (select auth.uid()) OR p.user_id = (select auth.uid()))
  ) THEN RAISE EXCEPTION 'Work order is not available to this user'; END IF;

  INSERT INTO public.parts_orders (
    order_kind, requester_business_id, supplier_business_id,
    requester_shop_id, source_location_id, destination_location_id,
    work_order_id, fulfillment_method, requester_note, created_by
  ) VALUES (
    _order_kind, _requester_business_id, _supplier_business_id,
    _requester_shop_id, _source_location_id, _destination_location_id,
    _work_order_id, _fulfillment_method, NULLIF(trim(_requester_note), ''), (select auth.uid())
  ) RETURNING * INTO v_order;

  FOR v_requested IN SELECT value FROM jsonb_array_elements(_lines)
  LOOP
    BEGIN
      v_item_id := (v_requested->>'inventory_item_id')::uuid;
      v_quantity := (v_requested->>'quantity')::numeric;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Every order line requires a valid inventory item and quantity';
    END;
    IF v_item_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0 OR v_quantity > 999999 THEN
      RAISE EXCEPTION 'Invalid order line quantity';
    END IF;

    SELECT
      i.*,
      c.manufacturer_part_number AS canonical_part_number,
      c.warranty_months AS canonical_warranty_months
    INTO v_item
    FROM public.business_inventory_items i
    LEFT JOIN public.parts_catalog c ON c.id = i.catalog_part_id
    WHERE i.id = v_item_id
      AND i.business_id = _supplier_business_id
      AND i.active AND i.network_visible
      AND (_source_location_id IS NULL OR i.location_id = _source_location_id);

    IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item % is not available from this supplier/location', v_item_id; END IF;
    IF v_item.price IS NULL THEN RAISE EXCEPTION 'Inventory item % requires a quote before ordering', v_item.name; END IF;
    IF v_quantity > GREATEST(v_item.qty_on_hand - public.active_reservation_qty(v_item.id), 0) THEN
      RAISE EXCEPTION 'Only % of % is currently available',
        GREATEST(v_item.qty_on_hand - public.active_reservation_qty(v_item.id), 0), v_item.name;
    END IF;

    v_line_subtotal := round(v_quantity * v_item.price, 2);
    v_line_fees := round(v_quantity * (
      COALESCE(v_item.environmental_fee, 0)
      + COALESCE(v_item.core_charge, 0)
      + COALESCE(v_item.hazmat_fee, 0)
    ), 2);
    v_line_tax := CASE WHEN COALESCE(v_item.tax_exempt, false) THEN 0 ELSE
      round((v_line_subtotal + v_line_fees) * COALESCE(v_item.tax_rate, 0) / 100, 2)
    END;

    INSERT INTO public.parts_order_lines (
      order_id, inventory_item_id, catalog_part_id,
      sku_snapshot, part_number_snapshot, name_snapshot, brand_snapshot,
      condition_snapshot, warranty_months_snapshot, requested_quantity,
      unit_price, tax_rate, tax_amount, fee_amount, line_total
    ) VALUES (
      v_order.id, v_item.id, v_item.catalog_part_id,
      v_item.sku,
      COALESCE(v_item.canonical_part_number, v_item.manufacturer_part_number, v_item.oem_part_number, v_item.sku),
      v_item.name, COALESCE(v_item.brand, v_item.manufacturer),
      v_item.item_condition, COALESCE(v_item.warranty_months, v_item.canonical_warranty_months),
      v_quantity, v_item.price, COALESCE(v_item.tax_rate, 0),
      v_line_tax, v_line_fees, v_line_subtotal + v_line_tax + v_line_fees
    );

    v_subtotal := v_subtotal + v_line_subtotal;
    v_tax_total := v_tax_total + v_line_tax;
    v_fee_total := v_fee_total + v_line_fees;
  END LOOP;

  UPDATE public.parts_orders
  SET subtotal = v_subtotal,
      tax_total = v_tax_total,
      fee_total = v_fee_total,
      total = v_subtotal + v_tax_total + v_fee_total
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  INSERT INTO public.parts_order_events (order_id, actor_id, event_type, to_status, note)
  VALUES (v_order.id, (select auth.uid()), 'submitted', 'submitted', v_order.requester_note);

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'total', v_order.total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_parts_network_order(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_parts_network_order(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_parts_network_order(
  _order_id uuid,
  _target_status text,
  _note text DEFAULT NULL,
  _hold_hours integer DEFAULT 72
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shop_manager, pg_temp
AS $$
DECLARE
  v_order public.parts_orders%ROWTYPE;
  v_line record;
  v_requester_manager boolean;
  v_supplier_manager boolean;
  v_available numeric;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_order FROM public.parts_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  v_requester_manager := public.has_business_role((select auth.uid()), v_order.requester_business_id, 'manager'::public.business_staff_role);
  v_supplier_manager := public.has_business_role((select auth.uid()), v_order.supplier_business_id, 'manager'::public.business_staff_role);

  IF _target_status IN ('accepted','declined','picking','ready','shipped') AND NOT v_supplier_manager THEN
    RAISE EXCEPTION 'Supplier manager access required';
  END IF;
  IF _target_status = 'cancelled' AND NOT (v_requester_manager OR v_supplier_manager) THEN
    RAISE EXCEPTION 'Participant manager access required';
  END IF;
  IF NOT (
    (v_order.status = 'submitted' AND _target_status IN ('accepted','declined','cancelled'))
    OR (v_order.status = 'accepted' AND _target_status IN ('picking','cancelled'))
    OR (v_order.status = 'picking' AND _target_status IN ('ready','cancelled'))
    OR (v_order.status = 'ready' AND _target_status IN ('shipped','cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid order transition from % to %', v_order.status, _target_status;
  END IF;

  IF _target_status = 'picking' AND EXISTS (
    SELECT 1
    FROM public.parts_order_lines l
    WHERE l.order_id = _order_id
      AND NOT EXISTS (
        SELECT 1 FROM public.parts_reservations r
        WHERE r.order_line_id = l.id
          AND r.released_at IS NULL
          AND r.fulfilled_at IS NULL
          AND r.expires_at > now()
      )
  ) THEN
    RAISE EXCEPTION 'The stock reservation expired; cancel this order and submit it again';
  END IF;

  IF _target_status = 'accepted' THEN
    IF _hold_hours < 1 OR _hold_hours > 336 THEN RAISE EXCEPTION 'Hold must be between 1 and 336 hours'; END IF;
    PERFORM i.id
    FROM public.business_inventory_items i
    JOIN public.parts_order_lines l ON l.inventory_item_id = i.id
    WHERE l.order_id = _order_id
    ORDER BY i.id
    FOR UPDATE OF i;

    FOR v_line IN
      SELECT l.*, i.qty_on_hand, i.name
      FROM public.parts_order_lines l
      JOIN public.business_inventory_items i ON i.id = l.inventory_item_id
      WHERE l.order_id = _order_id
      ORDER BY i.id
    LOOP
      v_available := GREATEST(v_line.qty_on_hand - public.active_reservation_qty(v_line.inventory_item_id), 0);
      IF v_line.requested_quantity > v_available THEN
        RAISE EXCEPTION 'Only % of % remains available', v_available, v_line.name;
      END IF;
      INSERT INTO public.parts_reservations (
        order_id, order_line_id, inventory_item_id, supplier_business_id,
        quantity, expires_at, created_by
      ) VALUES (
        _order_id, v_line.id, v_line.inventory_item_id, v_order.supplier_business_id,
        v_line.requested_quantity, now() + make_interval(hours => _hold_hours), (select auth.uid())
      );
      UPDATE public.parts_order_lines
        SET accepted_quantity = requested_quantity
        WHERE id = v_line.id;
      UPDATE public.business_inventory_items
        SET qty_on_hold = qty_on_hold + v_line.requested_quantity
        WHERE id = v_line.inventory_item_id;
    END LOOP;
  ELSIF _target_status IN ('declined','cancelled') THEN
    FOR v_line IN
      SELECT r.* FROM public.parts_reservations r
      WHERE r.order_id = _order_id AND r.released_at IS NULL AND r.fulfilled_at IS NULL
      ORDER BY r.inventory_item_id
      FOR UPDATE
    LOOP
      UPDATE public.business_inventory_items
        SET qty_on_hold = GREATEST(qty_on_hold - v_line.quantity, 0)
        WHERE id = v_line.inventory_item_id;
      UPDATE public.parts_reservations SET released_at = now() WHERE id = v_line.id;
    END LOOP;
  ELSIF _target_status = 'shipped' THEN
    FOR v_line IN
      SELECT l.*, i.qty_on_hand
      FROM public.parts_order_lines l
      JOIN public.business_inventory_items i ON i.id = l.inventory_item_id
      WHERE l.order_id = _order_id
      ORDER BY i.id
      FOR UPDATE OF i
    LOOP
      IF v_line.qty_on_hand < v_line.accepted_quantity THEN
        RAISE EXCEPTION 'Stock changed before shipment for %', v_line.name_snapshot;
      END IF;
      UPDATE public.business_inventory_items
        SET qty_on_hand = qty_on_hand - v_line.accepted_quantity,
            qty_on_hold = GREATEST(qty_on_hold - v_line.accepted_quantity, 0),
            date_last_used = CURRENT_DATE
        WHERE id = v_line.inventory_item_id;
      INSERT INTO public.business_inventory_movements (item_id, business_id, delta, reason, actor_id)
      VALUES (
        v_line.inventory_item_id, v_order.supplier_business_id,
        -v_line.accepted_quantity, 'Associate order ' || v_order.order_number, (select auth.uid())
      );
      UPDATE public.parts_order_lines
        SET shipped_quantity = accepted_quantity
        WHERE id = v_line.id;
      UPDATE public.parts_reservations SET fulfilled_at = now()
        WHERE order_line_id = v_line.id AND fulfilled_at IS NULL;
    END LOOP;
  END IF;

  UPDATE public.parts_orders
  SET status = _target_status,
      supplier_note = CASE WHEN v_supplier_manager AND NULLIF(trim(_note), '') IS NOT NULL THEN _note ELSE supplier_note END,
      accepted_at = CASE WHEN _target_status = 'accepted' THEN now() ELSE accepted_at END,
      shipped_at = CASE WHEN _target_status = 'shipped' THEN now() ELSE shipped_at END,
      completed_at = CASE WHEN _target_status IN ('declined','cancelled') THEN now() ELSE completed_at END
  WHERE id = _order_id;

  INSERT INTO public.parts_order_events (order_id, actor_id, event_type, from_status, to_status, note)
  VALUES (_order_id, (select auth.uid()), _target_status, v_order.status, _target_status, NULLIF(trim(_note), ''));

  RETURN jsonb_build_object('id', _order_id, 'status', _target_status);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_parts_network_order(uuid,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_parts_network_order(uuid,text,text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.receive_parts_network_order(
  _order_id uuid,
  _lines jsonb DEFAULT NULL,
  _note text DEFAULT NULL,
  _delivery_reference text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shop_manager, pg_temp
AS $$
DECLARE
  v_order public.parts_orders%ROWTYPE;
  v_receipt_id uuid;
  v_requested jsonb;
  v_line public.parts_order_lines%ROWTYPE;
  v_line_id uuid;
  v_quantity numeric;
  v_remaining numeric;
  v_stock_out numeric;
  v_destination_item_id uuid;
  v_all_received boolean;
  v_status text;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_order FROM public.parts_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF NOT public.has_business_role((select auth.uid()), v_order.requester_business_id, 'manager'::public.business_staff_role) THEN
    RAISE EXCEPTION 'Requesting business manager access required';
  END IF;
  IF v_order.status NOT IN ('ready','shipped','partially_received') THEN
    RAISE EXCEPTION 'Order is not ready to receive';
  END IF;

  IF _lines IS NULL THEN
    SELECT jsonb_agg(jsonb_build_object(
      'order_line_id', l.id,
      'quantity', GREATEST(COALESCE(NULLIF(l.accepted_quantity, 0), l.requested_quantity) - l.received_quantity, 0),
      'condition', 'accepted'
    )) INTO _lines
    FROM public.parts_order_lines l WHERE l.order_id = _order_id;
  END IF;
  IF jsonb_typeof(_lines) <> 'array' OR jsonb_array_length(_lines) < 1 THEN
    RAISE EXCEPTION 'At least one receipt line is required';
  END IF;

  INSERT INTO public.parts_receipts (
    order_id, recipient_business_id, destination_location_id,
    received_by, delivery_reference, notes
  ) VALUES (
    _order_id, v_order.requester_business_id, v_order.destination_location_id,
    (select auth.uid()), NULLIF(trim(_delivery_reference), ''), NULLIF(trim(_note), '')
  ) RETURNING id INTO v_receipt_id;

  FOR v_requested IN SELECT value FROM jsonb_array_elements(_lines)
  LOOP
    BEGIN
      v_line_id := (v_requested->>'order_line_id')::uuid;
      v_quantity := (v_requested->>'quantity')::numeric;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid receipt line';
    END;
    SELECT * INTO v_line
    FROM public.parts_order_lines
    WHERE id = v_line_id AND order_id = _order_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order line not found'; END IF;
    v_remaining := COALESCE(NULLIF(v_line.accepted_quantity, 0), v_line.requested_quantity) - v_line.received_quantity;
    IF v_quantity IS NULL OR v_quantity <= 0 OR v_quantity > v_remaining THEN
      RAISE EXCEPTION 'Receipt quantity for % must be between 0 and %', v_line.name_snapshot, v_remaining;
    END IF;

    -- Pickup/transfer receipts may be the first physical handoff. If the
    -- supplier did not mark the line shipped, consume only the missing amount.
    v_stock_out := GREATEST((v_line.received_quantity + v_quantity) - v_line.shipped_quantity, 0);
    IF v_stock_out > 0 AND v_line.inventory_item_id IS NOT NULL THEN
      PERFORM 1 FROM public.business_inventory_items
        WHERE id = v_line.inventory_item_id AND qty_on_hand >= v_stock_out FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Supplier stock is no longer sufficient for %', v_line.name_snapshot; END IF;
      UPDATE public.business_inventory_items
        SET qty_on_hand = qty_on_hand - v_stock_out,
            qty_on_hold = GREATEST(qty_on_hold - v_stock_out, 0),
            date_last_used = CURRENT_DATE
        WHERE id = v_line.inventory_item_id;
      INSERT INTO public.business_inventory_movements (item_id, business_id, delta, reason, actor_id)
      VALUES (
        v_line.inventory_item_id, v_order.supplier_business_id,
        -v_stock_out, 'Associate order pickup ' || v_order.order_number, (select auth.uid())
      );
      UPDATE public.parts_reservations SET fulfilled_at = COALESCE(fulfilled_at, now())
        WHERE order_line_id = v_line.id;
    END IF;

    SELECT i.id INTO v_destination_item_id
    FROM public.business_inventory_items i
    WHERE i.business_id = v_order.requester_business_id
      AND (
        (v_line.catalog_part_id IS NOT NULL AND i.catalog_part_id = v_line.catalog_part_id)
        OR (v_line.catalog_part_id IS NULL AND i.sku IS NOT DISTINCT FROM v_line.sku_snapshot)
      )
      AND i.location_id IS NOT DISTINCT FROM v_order.destination_location_id
      AND i.active
    ORDER BY i.created_at
    LIMIT 1
    FOR UPDATE;

    IF v_destination_item_id IS NULL THEN
      INSERT INTO public.business_inventory_items (
        business_id, location_id, sku, name, category, brand, unit,
        qty_on_hand, cost, price, catalog_part_id, manufacturer_part_number,
        item_condition, warranty_months, active, network_visible
      )
      SELECT
        v_order.requester_business_id, v_order.destination_location_id,
        v_line.sku_snapshot, v_line.name_snapshot, src.category, v_line.brand_snapshot, src.unit,
        v_quantity, v_line.unit_price, NULL, v_line.catalog_part_id, v_line.part_number_snapshot,
        COALESCE(v_line.condition_snapshot, 'new'), v_line.warranty_months_snapshot, true, false
      FROM public.business_inventory_items src
      WHERE src.id = v_line.inventory_item_id
      RETURNING id INTO v_destination_item_id;
    ELSE
      UPDATE public.business_inventory_items
        SET qty_on_hand = qty_on_hand + v_quantity,
            cost = v_line.unit_price,
            date_purchased = CURRENT_DATE,
            date_last_ordered = CURRENT_DATE
        WHERE id = v_destination_item_id;
    END IF;

    INSERT INTO public.business_inventory_movements (item_id, business_id, delta, reason, actor_id)
    VALUES (
      v_destination_item_id, v_order.requester_business_id,
      v_quantity, 'Received Associate order ' || v_order.order_number, (select auth.uid())
    );

    INSERT INTO public.parts_receipt_lines (
      receipt_id, order_line_id, quantity, condition_on_receipt, notes
    ) VALUES (
      v_receipt_id, v_line.id, v_quantity,
      CASE WHEN v_requested->>'condition' IN ('accepted','damaged','incorrect','short')
        THEN v_requested->>'condition' ELSE 'accepted' END,
      NULLIF(trim(v_requested->>'notes'), '')
    );

    UPDATE public.parts_order_lines
      SET received_quantity = received_quantity + v_quantity,
          shipped_quantity = GREATEST(shipped_quantity, received_quantity + v_quantity),
          destination_inventory_item_id = v_destination_item_id
      WHERE id = v_line.id;
  END LOOP;

  SELECT bool_and(received_quantity >= COALESCE(NULLIF(accepted_quantity, 0), requested_quantity))
    INTO v_all_received
  FROM public.parts_order_lines WHERE order_id = _order_id;
  v_status := CASE WHEN COALESCE(v_all_received, false) THEN 'received' ELSE 'partially_received' END;

  UPDATE public.parts_orders
  SET status = v_status,
      completed_at = CASE WHEN v_status = 'received' THEN now() ELSE completed_at END
  WHERE id = _order_id;
  INSERT INTO public.parts_order_events (order_id, actor_id, event_type, from_status, to_status, note, metadata)
  VALUES (
    _order_id, (select auth.uid()), 'received', v_order.status, v_status, NULLIF(trim(_note), ''),
    jsonb_build_object('receipt_id', v_receipt_id)
  );

  RETURN jsonb_build_object('id', _order_id, 'status', v_status, 'receipt_id', v_receipt_id);
END;
$$;

REVOKE ALL ON FUNCTION public.receive_parts_network_order(uuid,jsonb,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.receive_parts_network_order(uuid,jsonb,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_parts_return(
  _order_id uuid,
  _reason_code text,
  _requested_resolution text,
  _requester_note text,
  _lines jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.parts_orders%ROWTYPE;
  v_return public.parts_returns%ROWTYPE;
  v_requested jsonb;
  v_line public.parts_order_lines%ROWTYPE;
  v_line_id uuid;
  v_quantity numeric;
  v_already_requested numeric;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_order FROM public.parts_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status NOT IN ('partially_received','received') THEN
    RAISE EXCEPTION 'Only received orders can be returned';
  END IF;
  IF NOT public.has_business_role((select auth.uid()), v_order.requester_business_id, 'manager'::public.business_staff_role) THEN
    RAISE EXCEPTION 'Requesting business manager access required';
  END IF;
  IF _reason_code NOT IN ('incorrect_part','damaged','defective','not_as_described','core_return','buyer_error','other') THEN
    RAISE EXCEPTION 'Invalid return reason';
  END IF;
  IF _requested_resolution NOT IN ('refund','replacement','credit','repair') THEN
    RAISE EXCEPTION 'Invalid requested resolution';
  END IF;
  IF jsonb_typeof(_lines) <> 'array' OR jsonb_array_length(_lines) < 1 THEN
    RAISE EXCEPTION 'At least one return line is required';
  END IF;

  INSERT INTO public.parts_returns (
    order_id, requester_business_id, supplier_business_id,
    reason_code, requested_resolution, requester_note, created_by, status_history
  ) VALUES (
    _order_id, v_order.requester_business_id, v_order.supplier_business_id,
    _reason_code, _requested_resolution, NULLIF(trim(_requester_note), ''), (select auth.uid()),
    jsonb_build_array(jsonb_build_object('status','requested','at',now(),'actor_id',(select auth.uid())))
  ) RETURNING * INTO v_return;

  FOR v_requested IN SELECT value FROM jsonb_array_elements(_lines)
  LOOP
    BEGIN
      v_line_id := (v_requested->>'order_line_id')::uuid;
      v_quantity := (v_requested->>'quantity')::numeric;
    EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'Invalid return line'; END;
    SELECT * INTO v_line FROM public.parts_order_lines
      WHERE id = v_line_id AND order_id = _order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order line not found'; END IF;
    SELECT COALESCE(SUM(rl.quantity), 0) INTO v_already_requested
    FROM public.parts_return_lines rl
    JOIN public.parts_returns r ON r.id = rl.return_id
    WHERE rl.order_line_id = v_line_id AND r.status NOT IN ('rejected','cancelled');
    IF v_quantity IS NULL OR v_quantity <= 0 OR v_quantity > (v_line.received_quantity - v_already_requested) THEN
      RAISE EXCEPTION 'Return quantity exceeds received quantity for %', v_line.name_snapshot;
    END IF;
    INSERT INTO public.parts_return_lines (
      return_id, order_line_id, quantity, condition_notes, evidence
    ) VALUES (
      v_return.id, v_line_id, v_quantity,
      NULLIF(trim(v_requested->>'condition_notes'), ''),
      COALESCE(v_requested->'evidence', '[]'::jsonb)
    );
  END LOOP;

  RETURN jsonb_build_object('id', v_return.id, 'return_number', v_return.return_number, 'status', v_return.status);
END;
$$;

REVOKE ALL ON FUNCTION public.create_parts_return(uuid,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_parts_return(uuid,text,text,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_installed_component(
  _business_id uuid,
  _order_line_id uuid,
  _work_order_id uuid,
  _quantity numeric DEFAULT 1,
  _position text DEFAULT NULL,
  _serial_number text DEFAULT NULL,
  _installed_odometer_km integer DEFAULT NULL,
  _installed_at timestamptz DEFAULT now(),
  _notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shop_manager, pg_temp
AS $$
DECLARE
  v_line public.parts_order_lines%ROWTYPE;
  v_order public.parts_orders%ROWTYPE;
  v_vehicle_id uuid;
  v_already_installed numeric;
  v_component_id uuid;
  v_warranty_end date;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.has_business_role((select auth.uid()), _business_id, 'manager'::public.business_staff_role) THEN
    RAISE EXCEPTION 'Business manager access required';
  END IF;
  IF _quantity IS NULL OR _quantity <= 0 THEN RAISE EXCEPTION 'Installed quantity must be positive'; END IF;

  SELECT l.* INTO v_line
  FROM public.parts_order_lines l
  JOIN public.parts_orders o ON o.id = l.order_id
  WHERE l.id = _order_line_id
    AND o.requester_business_id = _business_id
    AND o.work_order_id = _work_order_id
    AND o.status IN ('partially_received','received')
  FOR UPDATE OF l;
  IF NOT FOUND THEN RAISE EXCEPTION 'Received order line is not linked to this work order'; END IF;

  SELECT w.vehicle_id INTO v_vehicle_id
  FROM shop_manager.work_orders w
  JOIN shop_manager.profiles p ON p.shop_id = w.shop_id
  WHERE w.id = _work_order_id
    AND (p.id = (select auth.uid()) OR p.user_id = (select auth.uid()));
  IF v_vehicle_id IS NULL THEN RAISE EXCEPTION 'The work order needs a vehicle before recording installation'; END IF;

  SELECT COALESCE(SUM(ic.installed_quantity), 0) INTO v_already_installed
  FROM public.installed_components ic WHERE ic.order_line_id = _order_line_id;
  IF _quantity > (v_line.received_quantity - v_already_installed) THEN
    RAISE EXCEPTION 'Installed quantity exceeds received quantity remaining';
  END IF;

  v_warranty_end := CASE
    WHEN v_line.warranty_months_snapshot IS NULL THEN NULL
    ELSE (_installed_at::date + make_interval(months => v_line.warranty_months_snapshot))::date
  END;

  INSERT INTO public.installed_components (
    business_id, order_line_id, catalog_part_id, work_order_id, shop_manager_vehicle_id,
    part_number_snapshot, name_snapshot, serial_number, position, installed_quantity,
    installed_at, installed_odometer_km, warranty_starts_at, warranty_ends_at,
    installer_user_id, notes
  ) VALUES (
    _business_id, _order_line_id, v_line.catalog_part_id, _work_order_id, v_vehicle_id,
    v_line.part_number_snapshot, v_line.name_snapshot, NULLIF(trim(_serial_number), ''),
    NULLIF(trim(_position), ''), _quantity, _installed_at, _installed_odometer_km,
    _installed_at::date, v_warranty_end, (select auth.uid()), NULLIF(trim(_notes), '')
  ) RETURNING id INTO v_component_id;

  RETURN jsonb_build_object('id', v_component_id, 'warranty_ends_at', v_warranty_end);
END;
$$;

REVOKE ALL ON FUNCTION public.record_installed_component(uuid,uuid,uuid,numeric,text,text,integer,timestamptz,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_installed_component(uuid,uuid,uuid,numeric,text,text,integer,timestamptz,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_parts_warranty_claim(
  _claimant_business_id uuid,
  _order_line_id uuid DEFAULT NULL,
  _installed_component_id uuid DEFAULT NULL,
  _issue_description text DEFAULT NULL,
  _failure_date date DEFAULT NULL,
  _odometer_km integer DEFAULT NULL,
  _evidence jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_supplier_business_id uuid;
  v_claim public.parts_warranty_claims%ROWTYPE;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.has_business_role((select auth.uid()), _claimant_business_id, 'manager'::public.business_staff_role) THEN
    RAISE EXCEPTION 'Claimant business manager access required';
  END IF;
  IF _order_line_id IS NULL AND _installed_component_id IS NULL THEN
    RAISE EXCEPTION 'An order line or installed component is required';
  END IF;
  IF NULLIF(trim(_issue_description), '') IS NULL THEN RAISE EXCEPTION 'Issue description is required'; END IF;

  SELECT o.supplier_business_id INTO v_supplier_business_id
  FROM public.parts_order_lines l
  JOIN public.parts_orders o ON o.id = l.order_id
  WHERE l.id = COALESCE(
    _order_line_id,
    (SELECT ic.order_line_id FROM public.installed_components ic
      WHERE ic.id = _installed_component_id AND ic.business_id = _claimant_business_id)
  )
    AND o.requester_business_id = _claimant_business_id;
  IF v_supplier_business_id IS NULL THEN RAISE EXCEPTION 'Covered order line not found'; END IF;

  INSERT INTO public.parts_warranty_claims (
    order_line_id, installed_component_id, claimant_business_id, supplier_business_id,
    issue_description, failure_date, odometer_km, evidence, created_by, status_history
  ) VALUES (
    _order_line_id, _installed_component_id, _claimant_business_id, v_supplier_business_id,
    trim(_issue_description), _failure_date, _odometer_km, COALESCE(_evidence, '[]'::jsonb),
    (select auth.uid()),
    jsonb_build_array(jsonb_build_object('status','submitted','at',now(),'actor_id',(select auth.uid())))
  ) RETURNING * INTO v_claim;

  RETURN jsonb_build_object('id', v_claim.id, 'claim_number', v_claim.claim_number, 'status', v_claim.status);
END;
$$;

REVOKE ALL ON FUNCTION public.create_parts_warranty_claim(uuid,uuid,uuid,text,date,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_parts_warranty_claim(uuid,uuid,uuid,text,date,integer,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_parts_return(
  _return_id uuid,
  _target_status text,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_return public.parts_returns%ROWTYPE;
  v_requester_manager boolean;
  v_supplier_manager boolean;
  v_line record;
  v_quantity numeric;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_return FROM public.parts_returns WHERE id = _return_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Return not found'; END IF;
  v_requester_manager := public.has_business_role((select auth.uid()), v_return.requester_business_id, 'manager'::public.business_staff_role);
  v_supplier_manager := public.has_business_role((select auth.uid()), v_return.supplier_business_id, 'manager'::public.business_staff_role);
  IF _target_status IN ('cancelled','shipped') AND NOT v_requester_manager THEN RAISE EXCEPTION 'Requester manager access required'; END IF;
  IF _target_status NOT IN ('cancelled','shipped') AND NOT v_supplier_manager THEN RAISE EXCEPTION 'Supplier manager access required'; END IF;
  IF NOT (
    (v_return.status = 'requested' AND _target_status IN ('approved','rejected','cancelled'))
    OR (v_return.status = 'approved' AND _target_status IN ('shipped','received','cancelled'))
    OR (v_return.status = 'shipped' AND _target_status = 'received')
    OR (v_return.status = 'received' AND _target_status IN ('refunded','replaced','closed'))
    OR (v_return.status IN ('refunded','replaced') AND _target_status = 'closed')
  ) THEN RAISE EXCEPTION 'Invalid return transition from % to %', v_return.status, _target_status; END IF;

  IF _target_status = 'approved' THEN
    UPDATE public.parts_return_lines
      SET approved_quantity = quantity
      WHERE return_id = _return_id AND approved_quantity IS NULL;
  END IF;

  -- When the buyer ships a return (or the supplier receives an in-person
  -- return directly from Approved), remove it from the buyer's received stock.
  IF _target_status = 'shipped' OR (_target_status = 'received' AND v_return.status = 'approved') THEN
    FOR v_line IN
      SELECT rl.*, ol.destination_inventory_item_id, ol.name_snapshot
      FROM public.parts_return_lines rl
      JOIN public.parts_order_lines ol ON ol.id = rl.order_line_id
      WHERE rl.return_id = _return_id
      ORDER BY ol.destination_inventory_item_id
    LOOP
      v_quantity := COALESCE(v_line.approved_quantity, v_line.quantity);
      IF v_line.destination_inventory_item_id IS NULL THEN
        RAISE EXCEPTION 'Received inventory link is missing for %', v_line.name_snapshot;
      END IF;
      PERFORM 1 FROM public.business_inventory_items
        WHERE id = v_line.destination_inventory_item_id AND qty_on_hand >= v_quantity FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient received stock to return %', v_line.name_snapshot; END IF;
      UPDATE public.business_inventory_items
        SET qty_on_hand = qty_on_hand - v_quantity
        WHERE id = v_line.destination_inventory_item_id;
      INSERT INTO public.business_inventory_movements (item_id, business_id, delta, reason, actor_id)
      VALUES (
        v_line.destination_inventory_item_id, v_return.requester_business_id,
        -v_quantity, 'Return ' || v_return.return_number, (select auth.uid())
      );
    END LOOP;
  END IF;

  -- Supplier receipt puts approved stock back into the original source item.
  IF _target_status = 'received' THEN
    FOR v_line IN
      SELECT rl.*, ol.inventory_item_id, ol.name_snapshot
      FROM public.parts_return_lines rl
      JOIN public.parts_order_lines ol ON ol.id = rl.order_line_id
      WHERE rl.return_id = _return_id
      ORDER BY ol.inventory_item_id
    LOOP
      v_quantity := COALESCE(v_line.approved_quantity, v_line.quantity);
      IF v_line.inventory_item_id IS NOT NULL THEN
        UPDATE public.business_inventory_items
          SET qty_on_hand = qty_on_hand + v_quantity
          WHERE id = v_line.inventory_item_id;
        INSERT INTO public.business_inventory_movements (item_id, business_id, delta, reason, actor_id)
        VALUES (
          v_line.inventory_item_id, v_return.supplier_business_id,
          v_quantity, 'Received return ' || v_return.return_number, (select auth.uid())
        );
      END IF;
    END LOOP;
  END IF;

  UPDATE public.parts_returns
  SET status = _target_status,
      supplier_note = CASE WHEN v_supplier_manager AND NULLIF(trim(_note), '') IS NOT NULL THEN _note ELSE supplier_note END,
      status_history = status_history || jsonb_build_array(jsonb_build_object(
        'status', _target_status, 'at', now(), 'actor_id', (select auth.uid()), 'note', NULLIF(trim(_note), '')
      )),
      resolved_at = CASE WHEN _target_status IN ('rejected','refunded','replaced','cancelled','closed') THEN now() ELSE resolved_at END
  WHERE id = _return_id;
  RETURN jsonb_build_object('id', _return_id, 'status', _target_status);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_parts_return(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_parts_return(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_parts_warranty_claim(
  _claim_id uuid,
  _target_status text,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_claim public.parts_warranty_claims%ROWTYPE;
  v_claimant_manager boolean;
  v_supplier_manager boolean;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_claim FROM public.parts_warranty_claims WHERE id = _claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Warranty claim not found'; END IF;
  v_claimant_manager := public.has_business_role((select auth.uid()), v_claim.claimant_business_id, 'manager'::public.business_staff_role);
  v_supplier_manager := public.has_business_role((select auth.uid()), v_claim.supplier_business_id, 'manager'::public.business_staff_role);
  IF _target_status = 'cancelled' AND NOT v_claimant_manager THEN RAISE EXCEPTION 'Claimant manager access required'; END IF;
  IF _target_status <> 'cancelled' AND NOT v_supplier_manager THEN RAISE EXCEPTION 'Supplier manager access required'; END IF;
  IF NOT (
    (v_claim.status = 'submitted' AND _target_status IN ('reviewing','approved','rejected','cancelled'))
    OR (v_claim.status = 'reviewing' AND _target_status IN ('approved','rejected'))
    OR (v_claim.status = 'approved' AND _target_status IN ('replacement_sent','credit_issued','closed'))
    OR (v_claim.status IN ('replacement_sent','credit_issued') AND _target_status = 'closed')
  ) THEN RAISE EXCEPTION 'Invalid warranty transition from % to %', v_claim.status, _target_status; END IF;

  UPDATE public.parts_warranty_claims
  SET status = _target_status,
      decision_note = CASE WHEN v_supplier_manager AND NULLIF(trim(_note), '') IS NOT NULL THEN _note ELSE decision_note END,
      status_history = status_history || jsonb_build_array(jsonb_build_object(
        'status', _target_status, 'at', now(), 'actor_id', (select auth.uid()), 'note', NULLIF(trim(_note), '')
      )),
      resolved_at = CASE WHEN _target_status IN ('rejected','replacement_sent','credit_issued','cancelled','closed') THEN now() ELSE resolved_at END
  WHERE id = _claim_id;
  RETURN jsonb_build_object('id', _claim_id, 'status', _target_status);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_parts_warranty_claim(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_parts_warranty_claim(uuid,text,text) TO authenticated;
