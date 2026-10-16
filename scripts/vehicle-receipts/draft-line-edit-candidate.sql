-- UNAPPLIED mechanical laboratory candidate, NOT a migration/RPC/app connection.
-- Schema owner + auth.uid/GUC + retained legacy helpers are NOT original-human,
-- strict-session or fresh native role/tenant authority. No client/service grants.
-- This statement changes one existing draft item, never replaces the item set.
-- Full observed-row CAS is NOT an ABA epoch, durable operation ledger or retry
-- protocol. The acknowledgment is not an outer COMMIT/HTTP/recovery promise.
-- Receipt -> selected customer -> native vehicle -> item is this candidate's
-- order only. Legacy install/history/direct writers do not share the protocol;
-- all-writer/expense-phantom/current-catalog/native API/restore gates remain open.
-- No arbitrary-trigger or unseen concurrent-writer preservation is established.
BEGIN;
SET LOCAL search_path = pg_catalog, pg_temp;
CREATE SCHEMA receipt_line_candidate;
REVOKE ALL ON SCHEMA receipt_line_candidate FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION receipt_line_candidate.edit_draft_line(
  p_account uuid, p_receipt uuid, p_item uuid,
  p_selected_vehicle uuid, p_selected_shop_vehicle uuid, p_selected_shop uuid,
  p_expected_receipt jsonb, p_expected_item jsonb, p_changes jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_receipt public.vehicle_receipts;
  v_item public.vehicle_receipt_items;
  v_after public.vehicle_receipt_items;
  v_receipt_before jsonb;
  v_item_before jsonb;
  v_item_after jsonb;
  v_customer uuid;
  v_locked_customer uuid;
  v_locked_shop uuid;
  v_vehicle_customer uuid;
  v_owner uuid;
  v_key text;
  v_allowed text[] := ARRAY['description','category','brand','part_number','quantity','total','reviewed'];
  v_state text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_roles r ON r.oid=n.nspowner
      WHERE n.nspname='receipt_line_candidate' AND r.rolname=current_user)
    OR p_account IS NULL OR auth.uid() IS DISTINCT FROM p_account THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Draft line operation failed.';
  END IF;
  IF p_receipt IS NULL OR p_item IS NULL
    OR (p_selected_vehicle IS NULL)=(p_selected_shop_vehicle IS NULL)
    OR (p_selected_shop_vehicle IS NULL)<>(p_selected_shop IS NULL)
    OR pg_catalog.jsonb_typeof(p_expected_receipt) IS DISTINCT FROM 'object'
    OR pg_catalog.jsonb_typeof(p_expected_item) IS DISTINCT FROM 'object'
    OR pg_catalog.jsonb_typeof(p_changes) IS DISTINCT FROM 'object'
    OR pg_catalog.octet_length(p_expected_receipt::text)>65536
    OR pg_catalog.octet_length(p_expected_item::text)>65536
    OR pg_catalog.octet_length(p_changes::text)>65536 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Draft line operation failed.';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_changes))<>7
    OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(p_changes) k WHERE NOT(k=ANY(v_allowed)))
    OR pg_catalog.jsonb_typeof(p_changes->'description') IS DISTINCT FROM 'string'
    OR pg_catalog.jsonb_typeof(p_changes->'reviewed') IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Draft line operation failed.';
  END IF;
  FOREACH v_key IN ARRAY ARRAY['category','brand','part_number','quantity','total'] LOOP
    IF pg_catalog.jsonb_typeof(p_changes->v_key) NOT IN('string','null') THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Draft line operation failed.';
    END IF;
  END LOOP;
  -- Canonical nonnegative plain decimal strings preserve their native scale.
  -- This bounded candidate does not accept exponent/NaN/infinity/negative/plus
  -- forms or more than512 characters; it is not universal NUMERIC compatibility.
  FOREACH v_key IN ARRAY ARRAY['quantity','total'] LOOP
    IF p_changes->v_key<>'null'::jsonb AND (
      pg_catalog.length(p_changes->>v_key)>512
      OR (p_changes->>v_key)!~'^(0|[1-9][0-9]*)([.][0-9]+)?$'
      OR ((p_changes->>v_key)::numeric)::text IS DISTINCT FROM p_changes->>v_key) THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Draft line operation failed.';
    END IF;
  END LOOP;
  SELECT r.* INTO v_receipt FROM public.vehicle_receipts r WHERE r.id=p_receipt FOR UPDATE;
  IF NOT FOUND OR v_receipt.status IS DISTINCT FROM 'draft'
    OR (p_selected_vehicle IS NOT NULL AND v_receipt.vehicle_id IS DISTINCT FROM p_selected_vehicle)
    OR (p_selected_shop_vehicle IS NOT NULL AND v_receipt.shop_vehicle_id IS DISTINCT FROM p_selected_shop_vehicle) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Draft line operation failed.';
  END IF;
  v_receipt_before := pg_catalog.to_jsonb(v_receipt)||pg_catalog.jsonb_build_object('total',v_receipt.total::text);
  IF v_receipt_before IS DISTINCT FROM p_expected_receipt THEN
    RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='Draft line operation failed.';
  END IF;
  IF p_selected_shop_vehicle IS NOT NULL THEN
    SELECT v.customer_id INTO v_customer FROM shop_manager.vehicles v WHERE v.id=p_selected_shop_vehicle;
    SELECT c.id,c.shop_id INTO v_locked_customer,v_locked_shop
      FROM shop_manager.customers c WHERE c.id=v_customer FOR UPDATE;
    IF NOT FOUND OR v_locked_shop IS DISTINCT FROM p_selected_shop THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Draft line operation failed.';
    END IF;
    SELECT v.customer_id INTO v_vehicle_customer FROM shop_manager.vehicles v WHERE v.id=p_selected_shop_vehicle FOR UPDATE;
    IF NOT FOUND OR v_vehicle_customer IS DISTINCT FROM v_locked_customer
      OR vehicle_receipts_private.shop_access(p_selected_shop_vehicle,true) IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Draft line operation failed.';
    END IF;
  ELSE
    SELECT v.owner_user_id INTO v_owner FROM public.vehicles v WHERE v.id=p_selected_vehicle FOR UPDATE;
    IF NOT FOUND OR v_owner IS DISTINCT FROM p_account
      OR vehicle_receipts_private.owns_vehicle(p_selected_vehicle) IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Draft line operation failed.';
    END IF;
  END IF;
  SELECT i.* INTO v_item FROM public.vehicle_receipt_items i
    WHERE i.id=p_item AND i.receipt_id=p_receipt FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Draft line operation failed.';
  END IF;
  v_item_before := pg_catalog.to_jsonb(v_item)||pg_catalog.jsonb_build_object(
    'quantity',v_item.quantity::text,'total',v_item.total::text,'confidence',v_item.confidence::text,
    'odometer_km',v_item.odometer_km::text,'sort_order',v_item.sort_order::text);
  IF v_item_before IS DISTINCT FROM p_expected_item THEN
    RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='Draft line operation failed.';
  END IF;
  IF v_item.installed_on IS NOT NULL OR v_item.installed_by IS NOT NULL
    OR v_item.installation_origin IS NOT NULL OR v_item.odometer_km IS NOT NULL
    OR auth.uid() IS DISTINCT FROM p_account
    OR vehicle_receipts_private.receipt_access(p_receipt,true) IS DISTINCT FROM TRUE
    OR EXISTS(SELECT 1 FROM shop_manager.expenses e WHERE e.vehicle_receipt_id=p_receipt)
    OR (p_selected_shop_vehicle IS NOT NULL AND (
      NOT EXISTS(SELECT 1 FROM shop_manager.vehicles v JOIN shop_manager.customers c ON c.id=v.customer_id
        WHERE v.id=p_selected_shop_vehicle AND v.customer_id=v_locked_customer AND c.shop_id=p_selected_shop)
      OR vehicle_receipts_private.shop_access(p_selected_shop_vehicle,true) IS DISTINCT FROM TRUE))
    OR (p_selected_vehicle IS NOT NULL AND vehicle_receipts_private.owns_vehicle(p_selected_vehicle) IS DISTINCT FROM TRUE)
    OR NOT EXISTS(SELECT 1 FROM public.vehicle_receipts r WHERE r.id=p_receipt AND r.status='draft'
      AND (pg_catalog.to_jsonb(r)||pg_catalog.jsonb_build_object('total',r.total::text))=v_receipt_before) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Draft line operation failed.';
  END IF;
  -- Exactly one existing id AND receipt_id. No header update, history call,
  -- item insertion/deletion, confidence/order/provenance/consent normalization.
  UPDATE public.vehicle_receipt_items i SET
    description=p_changes->>'description', category=p_changes->>'category',
    brand=p_changes->>'brand', part_number=p_changes->>'part_number',
    quantity=(p_changes->>'quantity')::numeric, total=(p_changes->>'total')::numeric,
    reviewed=(p_changes->>'reviewed')::boolean
    WHERE i.id=p_item AND i.receipt_id=p_receipt RETURNING i.* INTO v_after;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Draft line operation failed.';
  END IF;
  -- RETURNING alone cannot detect a later AFTER trigger rewrite. Read persisted
  -- target/header again; arbitrary sibling/history/financial triggers remain an
  -- explicit current-catalog gate, not implied covered by this local postflight.
  SELECT i.* INTO v_after FROM public.vehicle_receipt_items i WHERE i.id=p_item AND i.receipt_id=p_receipt;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Draft line operation failed.';
  END IF;
  v_item_after := pg_catalog.to_jsonb(v_after)||pg_catalog.jsonb_build_object(
    'quantity',v_after.quantity::text,'total',v_after.total::text,'confidence',v_after.confidence::text,
    'odometer_km',v_after.odometer_km::text,'sort_order',v_after.sort_order::text);
  IF v_item_after IS DISTINCT FROM (v_item_before||p_changes)
    OR NOT EXISTS(SELECT 1 FROM public.vehicle_receipts r WHERE r.id=p_receipt
      AND (pg_catalog.to_jsonb(r)||pg_catalog.jsonb_build_object('total',r.total::text))=v_receipt_before)
    OR auth.uid() IS DISTINCT FROM p_account
    OR vehicle_receipts_private.receipt_access(p_receipt,true) IS DISTINCT FROM TRUE
    OR EXISTS(SELECT 1 FROM shop_manager.expenses e WHERE e.vehicle_receipt_id=p_receipt)
    OR (p_selected_shop_vehicle IS NOT NULL AND (
      NOT EXISTS(SELECT 1 FROM shop_manager.vehicles v JOIN shop_manager.customers c ON c.id=v.customer_id
        WHERE v.id=p_selected_shop_vehicle AND v.customer_id=v_locked_customer AND c.shop_id=p_selected_shop)
      OR vehicle_receipts_private.shop_access(p_selected_shop_vehicle,true) IS DISTINCT FROM TRUE))
    OR (p_selected_vehicle IS NOT NULL AND vehicle_receipts_private.owns_vehicle(p_selected_vehicle) IS DISTINCT FROM TRUE) THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Draft line operation failed.';
  END IF;
  RETURN pg_catalog.jsonb_build_object('version',1,'kind','draftLineUpdate',
    'accountId',p_account,'receiptId',p_receipt,'itemId',p_item,
    'selectedVehicleId',p_selected_vehicle,'selectedShopVehicleId',p_selected_shop_vehicle,
    'selectedShopId',p_selected_shop,'receipt',v_receipt_before,
    'before',v_item_before,'after',v_item_after);
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_state=RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE=v_state, MESSAGE='Draft line operation failed.';
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA receipt_line_candidate FROM PUBLIC, anon, authenticated, service_role;
-- Fail publication for unexpected default grantees; do not manufacture access.
-- This direct ACL gate does not neutralize DBA/superuser/inherited-owner powers.
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n,
      LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a
      WHERE n.nspname='receipt_line_candidate' AND a.grantee<>n.nspowner)
    OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
      LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      WHERE n.nspname='receipt_line_candidate' AND a.grantee<>p.proowner) THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Draft line candidate publication failed.';
  END IF;
END $$;
COMMIT;
