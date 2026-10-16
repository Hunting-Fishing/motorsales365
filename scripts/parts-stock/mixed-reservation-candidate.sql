-- UNAPPLIED PRIVATE MECHANICS ONLY: not a migration or application RPC.
-- Owner + auth.uid/test.user/synthetic manager support is NOT real Auth,
-- strict session/native membership, current catalog or original-human authority.
-- One inquiry hold changes; no inventory quantity/counter, movement, order,
-- money, payment/fee/delivery policy, durable operation receipt or outbox writes.
-- Existing direct/legacy writers, phantoms, independent-session/global lock
-- ordering, expiration/retry/recovery and production acceptance remain OPEN.
-- Intrinsic owner/superuser/inherited capabilities and owner DDL remain possible.
BEGIN;
SET LOCAL search_path = pg_catalog, pg_temp;
CREATE SCHEMA mixed_reservation_candidate;
REVOKE ALL ON SCHEMA mixed_reservation_candidate FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION mixed_reservation_candidate.reserve_inquiry(
  p_expected_account uuid,
  p_business_id uuid,
  p_inquiry_id uuid,
  p_item_id uuid,
  p_quantity numeric,
  p_hours integer,
  p_note text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_before public.network_part_inquiries;
  v_current public.network_part_inquiries;
  v_updated public.network_part_inquiries;
  v_inventory public.business_inventory_items;
  v_inventory_current public.business_inventory_items;
  v_quantity public.network_part_inquiries.reserved_quantity%TYPE;
  v_inquiry_holds numeric;
  v_order_holds numeric;
  v_other_holds numeric;
  v_available numeric;
  v_until timestamptz;
  v_expected jsonb;
  v_combined numeric;
  v_state text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_roles r ON r.oid=n.nspowner
    WHERE n.nspname='mixed_reservation_candidate' AND r.rolname=current_user)
    OR p_expected_account IS NULL OR auth.uid() IS DISTINCT FROM p_expected_account
    OR public.has_business_role(p_expected_account,p_business_id,'manager'::public.business_staff_role) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Stock reservation failed.';
  END IF;
  IF p_business_id IS NULL OR p_inquiry_id IS NULL OR p_item_id IS NULL
    OR p_quantity IS NULL OR p_quantity::text IN('NaN','Infinity','-Infinity') OR p_quantity<=0
    OR p_hours IS NULL OR p_hours<=0 OR p_hours>168 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Stock reservation failed.';
  END IF;
  -- Use the actual selected NUMERIC(12,2) column, never a JS float/rounding rule.
  -- Typmod assignment may round, so compare exact NUMERIC values BEFORE writes.
  BEGIN
    v_quantity := p_quantity::numeric(12,2);
  EXCEPTION WHEN numeric_value_out_of_range THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Stock reservation failed.';
  END;
  IF v_quantity IS DISTINCT FROM p_quantity THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Stock reservation failed.';
  END IF;

  -- Same local order as the retained inquiry path: inquiry -> bound inventory.
  -- This does NOT establish an all-writer/global deadlock protocol.
  SELECT q.* INTO v_before FROM public.network_part_inquiries q WHERE q.id=p_inquiry_id FOR UPDATE;
  IF NOT FOUND OR v_before.business_id IS DISTINCT FROM p_business_id OR v_before.item_id IS DISTINCT FROM p_item_id THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Stock reservation failed.';
  END IF;
  SELECT i.* INTO v_inventory FROM public.business_inventory_items i WHERE i.id=p_item_id FOR UPDATE;
  IF NOT FOUND OR v_inventory.business_id IS DISTINCT FROM p_business_id THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Stock reservation failed.';
  END IF;
  -- Re-read after any inventory wait; no cached pre-wait binding is adopted.
  SELECT q.* INTO v_current FROM public.network_part_inquiries q WHERE q.id=p_inquiry_id;
  IF NOT FOUND OR v_current.business_id IS DISTINCT FROM p_business_id OR v_current.item_id IS DISTINCT FROM p_item_id
    OR pg_catalog.to_jsonb(v_current) IS DISTINCT FROM pg_catalog.to_jsonb(v_before)
    OR auth.uid() IS DISTINCT FROM p_expected_account
    OR public.has_business_role(p_expected_account,p_business_id,'manager'::public.business_staff_role) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Stock reservation failed.';
  END IF;
  IF v_inventory.qty_on_hand::text IN('NaN','Infinity','-Infinity') OR v_inventory.qty_on_hand<0 THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Stock reservation failed.';
  END IF;

  -- Preserve the later retained active_reservation_qty predicates verbatim:
  -- inquiry accepted/unexpired; B2B unreleased/unfulfilled, unexpired OR picking/ready.
  -- Exclude ONLY this inquiry, not every hold by the same actor/business/order.
  IF EXISTS(SELECT 1 FROM public.network_part_inquiries q
    WHERE q.reserved_item_id=p_item_id AND q.id<>p_inquiry_id AND q.status='accepted'
      AND q.reserved_until IS NOT NULL AND q.reserved_until>now()
      AND (q.reserved_quantity IS NULL OR q.reserved_quantity::text IN('NaN','Infinity','-Infinity') OR q.reserved_quantity<=0))
    OR EXISTS(SELECT 1 FROM public.parts_reservations r JOIN public.parts_orders o ON o.id=r.order_id
      WHERE r.inventory_item_id=p_item_id AND r.released_at IS NULL AND r.fulfilled_at IS NULL
        AND (r.expires_at>now() OR o.status IN('picking','ready'))
        AND (r.quantity::text IN('NaN','Infinity','-Infinity') OR r.quantity<=0)) THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Stock reservation failed.';
  END IF;
  SELECT COALESCE(pg_catalog.sum(q.reserved_quantity),0) INTO v_inquiry_holds
    FROM public.network_part_inquiries q WHERE q.reserved_item_id=p_item_id AND q.id<>p_inquiry_id
      AND q.status='accepted' AND q.reserved_until IS NOT NULL AND q.reserved_until>now();
  SELECT COALESCE(pg_catalog.sum(r.quantity),0) INTO v_order_holds
    FROM public.parts_reservations r JOIN public.parts_orders o ON o.id=r.order_id
    WHERE r.inventory_item_id=p_item_id AND r.released_at IS NULL AND r.fulfilled_at IS NULL
      AND (r.expires_at>now() OR o.status IN('picking','ready'));
  v_other_holds := v_inquiry_holds+v_order_holds;
  v_available := v_inventory.qty_on_hand-v_other_holds;
  -- Never hide inconsistent holds with GREATEST(...,0), nor double-count the
  -- derived qty_on_hold counter as if it were another independent reservation.
  IF v_available<0 THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Stock reservation failed.';
  END IF;
  IF v_quantity>v_available THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Stock reservation failed.';
  END IF;
  v_until := now()+pg_catalog.make_interval(hours=>p_hours);
  v_expected := pg_catalog.to_jsonb(v_before)||pg_catalog.jsonb_build_object(
    'status','accepted','reserved_item_id',p_item_id,'reserved_quantity',v_quantity,
    'reserved_until',v_until,'response_note',COALESCE(p_note,v_before.response_note),
    'responded_at',now(),'responded_by',p_expected_account);
  UPDATE public.network_part_inquiries SET status='accepted',reserved_item_id=p_item_id,
    reserved_quantity=v_quantity,reserved_until=v_until,response_note=COALESCE(p_note,response_note),
    responded_at=now(),responded_by=p_expected_account WHERE id=p_inquiry_id
    RETURNING * INTO v_updated;
  IF NOT FOUND OR pg_catalog.to_jsonb(v_updated) IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Stock reservation failed.';
  END IF;
  -- Do not accept suppressed/retargeted/rewritten trigger results as an ack.
  SELECT q.* INTO v_current FROM public.network_part_inquiries q WHERE q.id=p_inquiry_id;
  IF NOT FOUND OR pg_catalog.to_jsonb(v_current) IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Stock reservation failed.';
  END IF;
  SELECT i.* INTO v_inventory_current FROM public.business_inventory_items i WHERE i.id=p_item_id;
  IF NOT FOUND OR pg_catalog.to_jsonb(v_inventory_current) IS DISTINCT FROM pg_catalog.to_jsonb(v_inventory) THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Stock reservation failed.';
  END IF;
  v_combined := public.active_reservation_qty(p_item_id);
  IF v_combined IS NULL OR v_combined::text IN('NaN','Infinity','-Infinity')
    OR v_combined IS DISTINCT FROM v_other_holds+v_quantity OR v_combined>v_inventory.qty_on_hand
    OR auth.uid() IS DISTINCT FROM p_expected_account
    OR public.has_business_role(p_expected_account,p_business_id,'manager'::public.business_staff_role) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Stock reservation failed.';
  END IF;
  RETURN pg_catalog.jsonb_build_object('accountId',p_expected_account,'businessId',p_business_id,
    'inquiryId',p_inquiry_id,'itemId',p_item_id,'quantity',v_quantity::text,
    'reservedUntil',v_until,'otherInquiryHolds',v_inquiry_holds::text,'orderHolds',v_order_holds::text,
    'availableBefore',v_available::text,'availableAfter',(v_available-v_quantity)::text);
  -- Statement result only: no external COMMIT, durable operation/replay or TTL fence.
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_state=RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE=v_state, MESSAGE='Stock reservation failed.';
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA mixed_reservation_candidate FROM PUBLIC,anon,authenticated,service_role;
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n,
    LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a
    WHERE n.nspname='mixed_reservation_candidate' AND a.grantee<>n.nspowner)
    OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
      LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      WHERE n.nspname='mixed_reservation_candidate' AND a.grantee<>p.proowner) THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Stock candidate publication failed.';
  END IF;
END $$;
COMMIT;
