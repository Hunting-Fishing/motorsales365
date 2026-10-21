-- UNAPPLIED, owner-only stock operation/recovery candidate. Not a public RPC.
-- Composes manual_stock_candidate.adjust WITHOUT replacing its frozen SQL.
-- Retains its synthetic-authority/current-catalog/all-writer limitations.
-- The advisory key serializes this operation family only. Other stock writers
-- still require a compatible lock/authorization protocol before app adoption.
BEGIN;
SET LOCAL search_path = pg_catalog, pg_temp;
CREATE SCHEMA manual_stock_operations_candidate;
REVOKE ALL ON SCHEMA manual_stock_operations_candidate FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE manual_stock_operations_candidate.outcomes (
  account_id uuid NOT NULL REFERENCES auth.users(id),
  operation_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  item_id uuid NOT NULL REFERENCES public.business_inventory_items(id),
  movement_id uuid NOT NULL UNIQUE REFERENCES public.business_inventory_movements(id),
  request jsonb NOT NULL CHECK (pg_catalog.jsonb_typeof(request) = 'object'),
  acknowledgment jsonb NOT NULL CHECK (pg_catalog.jsonb_typeof(acknowledgment) = 'object'),
  movement_snapshot jsonb NOT NULL CHECK (pg_catalog.jsonb_typeof(movement_snapshot) = 'object'),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY(account_id, operation_id)
);
ALTER TABLE manual_stock_operations_candidate.outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_stock_operations_candidate.outcomes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE manual_stock_operations_candidate.outcomes FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION manual_stock_operations_candidate.deny_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Stock operation failed.';
END $$;
CREATE TRIGGER immutable_outcome BEFORE UPDATE OR DELETE ON manual_stock_operations_candidate.outcomes
FOR EACH ROW EXECUTE FUNCTION manual_stock_operations_candidate.deny_mutation();
CREATE TRIGGER immutable_outcomes BEFORE TRUNCATE ON manual_stock_operations_candidate.outcomes
FOR EACH STATEMENT EXECUTE FUNCTION manual_stock_operations_candidate.deny_mutation();

CREATE FUNCTION manual_stock_operations_candidate.authorize(
  p_account uuid, p_business uuid, p_operation uuid
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF p_account IS NULL OR p_business IS NULL OR p_operation IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n
      WHERE n.nspname = 'manual_stock_operations_candidate' AND n.nspowner =
        (SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname = current_user))
    OR auth.uid() IS DISTINCT FROM p_account
    OR public.has_business_role(p_account, p_business, 'manager'::public.business_staff_role) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Stock operation failed.';
  END IF;
END $$;

CREATE FUNCTION manual_stock_operations_candidate.inspect(
  p_account uuid, p_business uuid, p_operation uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_saved manual_stock_operations_candidate.outcomes;
  v_movement jsonb;
  v_state text;
BEGIN
  PERFORM manual_stock_operations_candidate.authorize(p_account, p_business, p_operation);
  SELECT * INTO v_saved FROM manual_stock_operations_candidate.outcomes
    WHERE account_id = p_account AND operation_id = p_operation;
  IF NOT FOUND THEN
    -- A missing committed row is NOT cancellation or proof an in-flight request
    -- cannot commit. Recover/retry with the SAME operation identity and intent.
    RETURN pg_catalog.jsonb_build_object('version', 1, 'status', 'not_observed', 'operationId', p_operation);
  END IF;
  IF v_saved.business_id IS DISTINCT FROM p_business THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Stock operation failed.';
  END IF;
  SELECT pg_catalog.to_jsonb(m) INTO v_movement FROM public.business_inventory_movements m
    WHERE m.id = v_saved.movement_id;
  IF NOT FOUND OR v_movement IS DISTINCT FROM v_saved.movement_snapshot
    OR v_movement->>'business_id' IS DISTINCT FROM p_business::text
    OR v_movement->>'item_id' IS DISTINCT FROM v_saved.item_id::text
    OR v_movement->>'actor_id' IS DISTINCT FROM p_account::text THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Stock operation failed.';
  END IF;
  PERFORM manual_stock_operations_candidate.authorize(p_account, p_business, p_operation);
  RETURN pg_catalog.jsonb_build_object('version', 1, 'status', 'completed',
    'operationId', p_operation, 'result', v_saved.acknowledgment);
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE = v_state, MESSAGE = 'Stock operation failed.';
END $$;

CREATE FUNCTION manual_stock_operations_candidate.apply(
  p_account uuid, p_business uuid, p_item uuid, p_operation uuid,
  p_expected numeric, p_delta numeric, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_expected numeric(12,2);
  v_delta numeric(12,2);
  v_after numeric(12,2);
  v_request jsonb;
  v_saved manual_stock_operations_candidate.outcomes;
  v_inserted manual_stock_operations_candidate.outcomes;
  v_movement_id uuid;
  v_ack jsonb;
  v_movement jsonb;
  v_state text;
BEGIN
  PERFORM manual_stock_operations_candidate.authorize(p_account, p_business, p_operation);
  IF p_item IS NULL OR p_expected IS NULL OR p_delta IS NULL
    OR p_expected::text IN ('NaN', 'Infinity', '-Infinity')
    OR p_delta::text IN ('NaN', 'Infinity', '-Infinity')
    OR p_expected < 0 OR p_delta = 0
    OR (p_reason IS NOT NULL AND pg_catalog.char_length(p_reason) > 2000) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Stock operation failed.';
  END IF;
  BEGIN
    v_expected := p_expected;
    v_delta := p_delta;
    v_after := p_expected + p_delta;
  EXCEPTION WHEN numeric_value_out_of_range THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Stock operation failed.';
  END;
  IF v_expected IS DISTINCT FROM p_expected OR v_delta IS DISTINCT FROM p_delta
    OR v_after IS DISTINCT FROM p_expected + p_delta OR v_after < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Stock operation failed.';
  END IF;
  v_request := pg_catalog.jsonb_build_object('version', 1, 'accountId', p_account,
    'businessId', p_business, 'itemId', p_item, 'operationId', p_operation,
    'expectedQuantity', v_expected, 'delta', v_delta, 'reason', p_reason);
  -- A hash collision only serializes unrelated requests: exact identity is
  -- always checked through the (account_id,operation_id) key and full request.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    '365-manual-stock-v1:' || p_account::text || ':' || p_operation::text, 0));
  PERFORM manual_stock_operations_candidate.authorize(p_account, p_business, p_operation);
  SELECT * INTO v_saved FROM manual_stock_operations_candidate.outcomes
    WHERE account_id = p_account AND operation_id = p_operation;
  IF FOUND THEN
    IF v_saved.request IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Stock operation failed.';
    END IF;
    RETURN manual_stock_operations_candidate.inspect(p_account, p_business, p_operation);
  END IF;

  v_movement_id := pg_catalog.gen_random_uuid();
  v_ack := manual_stock_candidate.adjust(p_account, p_business, p_item,
    v_movement_id, p_expected, p_delta, p_reason);
  SELECT pg_catalog.to_jsonb(m) INTO v_movement FROM public.business_inventory_movements m
    WHERE m.id = v_movement_id;
  IF NOT FOUND OR v_ack->>'accountId' IS DISTINCT FROM p_account::text
    OR v_ack->>'businessId' IS DISTINCT FROM p_business::text
    OR v_ack->>'itemId' IS DISTINCT FROM p_item::text
    OR v_ack->>'movementId' IS DISTINCT FROM v_movement_id::text
    OR v_ack->>'quantityBefore' IS DISTINCT FROM v_expected::text
    OR v_ack->>'delta' IS DISTINCT FROM v_delta::text
    OR v_ack->>'quantityAfter' IS DISTINCT FROM v_after::text THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Stock operation failed.';
  END IF;
  INSERT INTO manual_stock_operations_candidate.outcomes
    (account_id, operation_id, business_id, item_id, movement_id, request, acknowledgment, movement_snapshot)
    VALUES (p_account, p_operation, p_business, p_item, v_movement_id, v_request, v_ack, v_movement)
    RETURNING * INTO v_inserted;
  IF NOT FOUND OR v_inserted.account_id IS DISTINCT FROM p_account
    OR v_inserted.operation_id IS DISTINCT FROM p_operation
    OR v_inserted.business_id IS DISTINCT FROM p_business
    OR v_inserted.item_id IS DISTINCT FROM p_item
    OR v_inserted.movement_id IS DISTINCT FROM v_movement_id
    OR v_inserted.request IS DISTINCT FROM v_request
    OR v_inserted.acknowledgment IS DISTINCT FROM v_ack
    OR v_inserted.movement_snapshot IS DISTINCT FROM v_movement
    OR v_inserted.created_at IS DISTINCT FROM pg_catalog.now() THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Stock operation failed.';
  END IF;
  SELECT * INTO v_saved FROM manual_stock_operations_candidate.outcomes
    WHERE account_id = p_account AND operation_id = p_operation;
  IF NOT FOUND OR pg_catalog.to_jsonb(v_saved) IS DISTINCT FROM pg_catalog.to_jsonb(v_inserted) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Stock operation failed.';
  END IF;
  RETURN manual_stock_operations_candidate.inspect(p_account, p_business, p_operation);
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE = v_state, MESSAGE = 'Stock operation failed.';
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA manual_stock_operations_candidate FROM PUBLIC, anon, authenticated, service_role;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_namespace n,
      LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl, pg_catalog.acldefault('n', n.nspowner))) a
    WHERE n.nspname = 'manual_stock_operations_candidate' AND a.grantee <> n.nspowner
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace,
      LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
    WHERE n.nspname = 'manual_stock_operations_candidate' AND a.grantee <> p.proowner
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace,
      LATERAL pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
    WHERE n.nspname = 'manual_stock_operations_candidate' AND a.grantee <> c.relowner
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Stock operation publication failed.';
  END IF;
END $$;
COMMIT;
