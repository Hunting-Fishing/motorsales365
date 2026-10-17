-- UNAPPLIED PRIVATE MECHANICS ONLY. Not a migration, app RPC or grant adoption.
-- Reuse unchanged selected 14-table/order fixture, including the actual retained
-- inventory timestamp body/attachment. That body differs from the dated current
-- catalog fingerprint; selected retained behavior is NOT current-schema parity.
-- Owner/id-only Auth/test.user/synthetic manager positives are NOT real Auth,
-- fresh sessions/native roles/tenant authority. Auth KEY SHARE fences deletion
-- only, not non-key/ban/session/role/refresh/expiry changes or configured TTL.
-- No Q/R/order-line locks follow inventory: no invented global lock/deadlock or
-- phantom protocol. Direct/legacy writers may not cooperate. No native PG,
-- external COMMIT, durable operation/idempotency/unknown-outcome reconciliation,
-- full recovery or app/release acceptance. A movement UUID is NOT a retry ledger.
-- Intrinsic owner/superuser/inherited capabilities and owner DDL remain possible.
BEGIN;
SET LOCAL search_path = pg_catalog, pg_temp;
CREATE SCHEMA manual_stock_candidate;
REVOKE ALL ON SCHEMA manual_stock_candidate FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION manual_stock_candidate.adjust(
  p_expected_account uuid,
  p_business_id uuid,
  p_item_id uuid,
  p_movement_id uuid,
  p_expected_quantity numeric,
  p_delta numeric,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_user_id uuid;
  v_business_id uuid;
  v_before public.business_inventory_items;
  v_returned public.business_inventory_items;
  v_persisted public.business_inventory_items;
  v_movement_returned public.business_inventory_movements;
  v_movement_persisted public.business_inventory_movements;
  v_expected_quantity public.business_inventory_items.qty_on_hand%TYPE;
  v_delta public.business_inventory_movements.delta%TYPE;
  v_new_quantity public.business_inventory_items.qty_on_hand%TYPE;
  v_result numeric;
  v_inventory_expected jsonb;
  v_movement_expected jsonb;
  v_inquiry_holds numeric;
  v_order_holds numeric;
  v_combined numeric;
  v_protected_floor numeric;
  v_before_inquiry_holds numeric;
  v_before_order_holds numeric;
  v_inquiry_vector jsonb;
  v_order_vector jsonb;
  v_before_inquiry_vector jsonb;
  v_before_order_vector jsonb;
  v_malformed boolean;
  v_phase integer;
  v_state text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_namespace n
    JOIN pg_catalog.pg_roles r ON r.oid = n.nspowner
    WHERE n.nspname = 'manual_stock_candidate' AND r.rolname = current_user
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Stock adjustment failed.';
  END IF;
  IF p_expected_account IS NULL OR p_business_id IS NULL OR p_item_id IS NULL
    OR p_movement_id IS NULL OR p_expected_quantity IS NULL OR p_delta IS NULL
    OR p_expected_quantity::text IN ('NaN', 'Infinity', '-Infinity')
    OR p_delta::text IN ('NaN', 'Infinity', '-Infinity')
    OR p_expected_quantity < 0 OR p_delta = 0
    OR (p_reason IS NOT NULL AND pg_catalog.char_length(p_reason) > 2000) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Stock adjustment failed.';
  END IF;
  -- Exact selected NUMERIC(12,2), not JS arithmetic, silent typmod rounding,
  -- integer casts, GREATEST clamps or a newly invented stock constraint.
  BEGIN
    v_expected_quantity := p_expected_quantity::numeric(12,2);
    v_delta := p_delta::numeric(12,2);
    v_result := p_expected_quantity + p_delta;
    v_new_quantity := v_result::numeric(12,2);
  EXCEPTION WHEN numeric_value_out_of_range THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Stock adjustment failed.';
  END;
  IF v_expected_quantity IS DISTINCT FROM p_expected_quantity
    OR v_delta IS DISTINCT FROM p_delta OR v_new_quantity IS DISTINCT FROM v_result
    OR v_result::text IN ('NaN', 'Infinity', '-Infinity') OR v_new_quantity < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Stock adjustment failed.';
  END IF;
  IF auth.uid() IS DISTINCT FROM p_expected_account
    OR public.has_business_role(p_expected_account, p_business_id, 'manager'::public.business_staff_role) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Stock adjustment failed.';
  END IF;

  -- First explicit row lock is the exact existing Auth user. Never grant
  -- ordinary Auth-table SELECT/UPDATE or invent an Auth/actor FK to make it pass.
  SELECT u.id INTO v_user_id FROM auth.users u
    WHERE u.id = p_expected_account FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Stock adjustment failed.';
  END IF;
  SELECT b.id INTO v_business_id FROM public.businesses b
    WHERE b.id = p_business_id FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Stock adjustment failed.';
  END IF;
  SELECT i.* INTO v_before FROM public.business_inventory_items i
    WHERE i.id = p_item_id FOR UPDATE;
  IF NOT FOUND OR v_before.business_id IS DISTINCT FROM p_business_id
    OR auth.uid() IS DISTINCT FROM p_expected_account
    OR public.has_business_role(p_expected_account, p_business_id, 'manager'::public.business_staff_role) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Stock adjustment failed.';
  END IF;
  IF v_before.qty_on_hand IS NULL OR v_before.qty_on_hold IS NULL OR v_before.qty_on_order IS NULL
    OR v_before.qty_on_hand::text IN ('NaN', 'Infinity', '-Infinity')
    OR v_before.qty_on_hold::text IN ('NaN', 'Infinity', '-Infinity')
    OR v_before.qty_on_order::text IN ('NaN', 'Infinity', '-Infinity')
    OR v_before.qty_on_hand < 0 OR v_before.qty_on_hold < 0 OR v_before.qty_on_order < 0
    OR v_before.qty_on_hold > v_before.qty_on_hand THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Stock adjustment failed.';
  END IF;
  IF v_before.qty_on_hand IS DISTINCT FROM v_expected_quantity THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Stock adjustment failed.';
  END IF;

  FOR v_phase IN 0..1 LOOP
    -- Direct actual-family predicates. Snapshot validation and sum share each
    -- query snapshot; no Q/R/order/line row locks after the inventory lock.
    SELECT COALESCE(pg_catalog.bool_or(
      q.reserved_quantity IS NULL OR q.reserved_quantity::text IN ('NaN', 'Infinity', '-Infinity')
      OR q.reserved_quantity <= 0 OR q.business_id IS DISTINCT FROM p_business_id
      OR q.item_id IS DISTINCT FROM p_item_id
    ), FALSE), COALESCE(pg_catalog.sum(q.reserved_quantity), 0),
      COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(q) ORDER BY q.id), '[]'::jsonb)
    INTO v_malformed, v_inquiry_holds, v_inquiry_vector
    FROM public.network_part_inquiries q
    WHERE q.reserved_item_id = p_item_id AND q.status = 'accepted'
      AND q.reserved_until IS NOT NULL AND q.reserved_until > now();
    IF v_malformed THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Stock adjustment failed.';
    END IF;
    SELECT COALESCE(pg_catalog.bool_or(
      r.quantity IS NULL OR r.quantity::text IN ('NaN', 'Infinity', '-Infinity')
      OR r.quantity <= 0 OR r.expires_at IS NULL OR o.id IS NULL OR l.id IS NULL
      OR r.supplier_business_id IS DISTINCT FROM p_business_id
      OR o.supplier_business_id IS DISTINCT FROM p_business_id
      OR l.order_id IS DISTINCT FROM r.order_id OR l.inventory_item_id IS DISTINCT FROM p_item_id
    ), FALSE), COALESCE(pg_catalog.sum(r.quantity), 0),
      COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'reservation', pg_catalog.to_jsonb(r), 'order', pg_catalog.to_jsonb(o), 'line', pg_catalog.to_jsonb(l)
      ) ORDER BY r.id), '[]'::jsonb)
    INTO v_malformed, v_order_holds, v_order_vector
    FROM public.parts_reservations r
    LEFT JOIN public.parts_orders o ON o.id = r.order_id
    LEFT JOIN public.parts_order_lines l ON l.id = r.order_line_id
    WHERE r.inventory_item_id = p_item_id AND r.released_at IS NULL AND r.fulfilled_at IS NULL
      AND (r.expires_at > now() OR o.status IN ('picking', 'ready'));
    v_combined := v_inquiry_holds + v_order_holds;
    IF v_malformed OR v_combined IS NULL
      OR v_inquiry_holds::text IN ('NaN', 'Infinity', '-Infinity')
      OR v_order_holds::text IN ('NaN', 'Infinity', '-Infinity')
      OR v_combined::text IN ('NaN', 'Infinity', '-Infinity')
      OR v_inquiry_holds < 0 OR v_order_holds < 0 OR v_combined > v_before.qty_on_hand THEN
      -- Even a positive delta cannot silently repair an existing hold deficit.
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Stock adjustment failed.';
    END IF;
    -- Conservative PRIVATE quarantine of an opaque/stale hold counter, not a
    -- certified production rule or counter-repair path. Use the MAXIMUM floor,
    -- never add a derived counter to the two-family reservation total.
    v_protected_floor := CASE WHEN v_before.qty_on_hold > v_combined
      THEN v_before.qty_on_hold ELSE v_combined END;
    IF v_new_quantity < v_protected_floor THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Stock adjustment failed.';
    END IF;
    -- qty_on_hold/on_order are checked but NEVER added as independent holds.
    IF v_phase = 0 THEN
      v_before_inquiry_holds := v_inquiry_holds;
      v_before_order_holds := v_order_holds;
      v_before_inquiry_vector := v_inquiry_vector;
      v_before_order_vector := v_order_vector;
      v_inventory_expected := pg_catalog.to_jsonb(v_before) || pg_catalog.jsonb_build_object(
        'qty_on_hand', v_new_quantity, 'updated_at', now());
      UPDATE public.business_inventory_items
        SET qty_on_hand = v_new_quantity, updated_at = now()
        WHERE id = p_item_id AND business_id = p_business_id
        RETURNING * INTO v_returned;
      IF NOT FOUND OR pg_catalog.to_jsonb(v_returned) IS DISTINCT FROM v_inventory_expected THEN
        RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Stock adjustment failed.';
      END IF;
      SELECT i.* INTO v_persisted FROM public.business_inventory_items i WHERE i.id = p_item_id;
      IF NOT FOUND OR pg_catalog.to_jsonb(v_persisted) IS DISTINCT FROM v_inventory_expected THEN
        RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Stock adjustment failed.';
      END IF;
      v_movement_expected := pg_catalog.jsonb_build_object(
        'id', p_movement_id, 'item_id', p_item_id, 'business_id', p_business_id,
        'delta', v_delta, 'reason', p_reason, 'tow_request_id', NULL,
        'actor_id', p_expected_account, 'created_at', now());
      INSERT INTO public.business_inventory_movements(
        id, item_id, business_id, delta, reason, tow_request_id, actor_id, created_at
      ) VALUES (
        p_movement_id, p_item_id, p_business_id, v_delta, p_reason, NULL, p_expected_account, now()
      ) RETURNING * INTO v_movement_returned;
      -- Existing PK duplicate23505 remains an error, never success/dedupe/replay.
      IF NOT FOUND OR pg_catalog.to_jsonb(v_movement_returned) IS DISTINCT FROM v_movement_expected THEN
        RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Stock adjustment failed.';
      END IF;
      SELECT m.* INTO v_movement_persisted FROM public.business_inventory_movements m WHERE m.id = p_movement_id;
      IF NOT FOUND OR pg_catalog.to_jsonb(v_movement_persisted) IS DISTINCT FROM v_movement_expected THEN
        RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Stock adjustment failed.';
      END IF;
    ELSIF v_inquiry_holds IS DISTINCT FROM v_before_inquiry_holds
      OR v_order_holds IS DISTINCT FROM v_before_order_holds
      OR v_inquiry_vector IS DISTINCT FROM v_before_inquiry_vector
      OR v_order_vector IS DISTINCT FROM v_before_order_vector THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Stock adjustment failed.';
    END IF;
  END LOOP;

  SELECT i.* INTO v_persisted FROM public.business_inventory_items i WHERE i.id = p_item_id;
  IF NOT FOUND OR pg_catalog.to_jsonb(v_persisted) IS DISTINCT FROM v_inventory_expected THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Stock adjustment failed.';
  END IF;
  SELECT m.* INTO v_movement_persisted FROM public.business_inventory_movements m WHERE m.id = p_movement_id;
  IF NOT FOUND OR pg_catalog.to_jsonb(v_movement_persisted) IS DISTINCT FROM v_movement_expected THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Stock adjustment failed.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_expected_account)
    OR NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p_business_id)
    OR auth.uid() IS DISTINCT FROM p_expected_account
    OR public.has_business_role(p_expected_account, p_business_id, 'manager'::public.business_staff_role) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Stock adjustment failed.';
  END IF;
  RETURN pg_catalog.jsonb_build_object(
    'accountId', p_expected_account, 'businessId', p_business_id, 'itemId', p_item_id,
    'movementId', p_movement_id, 'quantityBefore', v_before.qty_on_hand::text,
    'delta', v_delta::text, 'quantityAfter', v_new_quantity::text,
    'inquiryHolds', v_inquiry_holds::text, 'orderHolds', v_order_holds::text,
    'counterHolds', v_before.qty_on_hold::text, 'protectedFloor', v_protected_floor::text,
    'mixedReservationAvailabilityAfter', (v_new_quantity - v_combined)::text,
    'availableAfter', (v_new_quantity - v_protected_floor)::text);
  -- Statement acknowledgement only; external COMMIT/durable retry is unproved.
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE = v_state, MESSAGE = 'Stock adjustment failed.';
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA manual_stock_candidate FROM PUBLIC, anon, authenticated, service_role;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_namespace n,
      LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl, pg_catalog.acldefault('n', n.nspowner))) a
    WHERE n.nspname = 'manual_stock_candidate' AND a.grantee <> n.nspowner
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace,
      LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
    WHERE n.nspname = 'manual_stock_candidate' AND a.grantee <> p.proowner
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Stock candidate publication failed.';
  END IF;
END $$;
COMMIT;
