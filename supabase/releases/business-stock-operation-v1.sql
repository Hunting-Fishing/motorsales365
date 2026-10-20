-- Forward release SQL. Install with the tested business-staff boundary first.
-- All objects are new; no historical migrations or customer rows are rewritten.
BEGIN;
SET LOCAL search_path = pg_catalog, pg_temp;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
      JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE t.tgrelid='public.business_staff'::regclass
      AND t.tgname='zz_client_staff_boundary' AND t.tgenabled='O'
      AND n.nspname='client_business_access_candidate' AND p.proname='guard_roster')
    OR NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid='public.business_staff'::regclass
      AND t.tgname='zzz_client_staff_authority_target' AND t.tgenabled='O') THEN
    RAISE EXCEPTION 'Install and validate the business staff authority boundary before stock operations';
  END IF;
END $$;
CREATE SCHEMA business_stock_operations_v1;
REVOKE ALL ON SCHEMA business_stock_operations_v1 FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE business_stock_operations_v1.outcomes (
  account_id uuid NOT NULL REFERENCES auth.users(id),
  operation_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  item_id uuid NOT NULL REFERENCES public.business_inventory_items(id),
  movement_id uuid UNIQUE REFERENCES public.business_inventory_movements(id),
  request jsonb NOT NULL CHECK (jsonb_typeof(request)='object'),
  result jsonb NOT NULL CHECK (result->>'status' IN ('completed','rejected')),
  movement_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, operation_id),
  CHECK ((result->>'status'='completed')=(movement_id IS NOT NULL)),
  CHECK ((movement_id IS NULL)=(movement_snapshot IS NULL))
);
ALTER TABLE business_stock_operations_v1.outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_stock_operations_v1.outcomes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON business_stock_operations_v1.outcomes FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION business_stock_operations_v1.immutable() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
BEGIN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Stock outcome is immutable.'; END $$;
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON business_stock_operations_v1.outcomes
FOR EACH ROW EXECUTE FUNCTION business_stock_operations_v1.immutable();
CREATE TRIGGER immutable_table BEFORE TRUNCATE ON business_stock_operations_v1.outcomes
FOR EACH STATEMENT EXECUTE FUNCTION business_stock_operations_v1.immutable();

CREATE FUNCTION business_stock_operations_v1.execute(_request jsonb,_inspect boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='5s' AS $$
DECLARE
  a uuid; b uuid; i uuid; op uuid; sid uuid; owner_id uuid; staff_role text;
  u auth.users; sess auth.sessions; claims jsonb;
  expected numeric(12,2); delta numeric(12,2); target numeric(12,2); expected_at timestamptz;
  reason text; request jsonb; outcome jsonb; rejection text;
  old_item public.business_inventory_items; new_item public.business_inventory_items;
  movement public.business_inventory_movements; saved_movement public.business_inventory_movements;
  saved business_stock_operations_v1.outcomes; inserted business_stock_operations_v1.outcomes;
  movement_id uuid; inquiries numeric; reservations numeric; protected numeric; malformed boolean;
  snapshot_time timestamptz; expires numeric; state text;
BEGIN
  IF current_setting('role',true) IS DISTINCT FROM 'authenticated' OR _inspect IS NULL
    OR jsonb_typeof(_request) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Stock request unavailable.';
  END IF;
  IF _request->'version' IS DISTINCT FROM '1'::jsonb
    OR (SELECT count(*) FROM jsonb_object_keys(_request))<>9
    OR NOT (_request ?& ARRAY['version','operationId','expectedAccountId','businessId','itemId',
      'expectedUpdatedAt','expectedQuantity','delta','reason']) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid stock request.';
  END IF;
  -- JSON types must be strings, not coercible arrays/objects/numbers.
  IF EXISTS (SELECT 1 FROM jsonb_each(_request) x
    WHERE x.key<>'version' AND jsonb_typeof(x.value)<>'string') THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid stock request.';
  END IF;
  a:=(_request->>'expectedAccountId')::uuid; b:=(_request->>'businessId')::uuid;
  i:=(_request->>'itemId')::uuid; op:=(_request->>'operationId')::uuid;
  IF a IS NULL OR b IS NULL OR i IS NULL OR op IS NULL OR auth.uid() IS DISTINCT FROM a THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Stock request unavailable.';
  END IF;
  IF (_request->>'expectedQuantity') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$'
    OR (_request->>'delta') !~ '^-?[0-9]{1,10}(\.[0-9]{1,2})?$'
    OR (_request->>'expectedUpdatedAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$' THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid quantity.';
  END IF;
  expected:=(_request->>'expectedQuantity')::numeric; delta:=(_request->>'delta')::numeric;
  expected_at:=(_request->>'expectedUpdatedAt')::timestamptz;
  reason:=btrim(_request->>'reason');
  IF expected<0 OR delta=0 OR expected_at IS NULL OR NOT isfinite(expected_at)
    OR reason IS NULL OR length(reason) NOT BETWEEN 1 AND 500 OR reason ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid stock request.';
  END IF;
  request:=jsonb_build_object('version',1,'operationId',op,'expectedAccountId',a,'businessId',b,
    'itemId',i,'expectedUpdatedAt',_request->>'expectedUpdatedAt','expectedQuantity',expected::text,
    'delta',delta::text,'reason',reason);

  claims:=auth.jwt();
  IF claims->>'role' IS DISTINCT FROM 'authenticated'
    OR (claims->>'exp') IS NULL OR (claims->>'exp') !~ '^[0-9]{1,11}$'
    OR (claims->>'session_id') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Stock request unavailable.';
  END IF;
  sid:=(claims->>'session_id')::uuid; expires:=(claims->>'exp')::numeric;
  SELECT * INTO u FROM auth.users WHERE id=a FOR SHARE;
  IF NOT FOUND OR u.deleted_at IS NOT NULL OR u.is_anonymous IS DISTINCT FROM FALSE
    OR (u.banned_until IS NOT NULL AND u.banned_until>clock_timestamp()) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Stock request unavailable.';
  END IF;
  SELECT * INTO sess FROM auth.sessions WHERE id=sid AND user_id=a FOR SHARE;
  IF NOT FOUND OR (sess.not_after IS NOT NULL AND sess.not_after<=clock_timestamp())
    OR expires<=extract(epoch FROM clock_timestamp()) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Stock request unavailable.';
  END IF;
  SELECT x.owner_id INTO owner_id FROM public.businesses x WHERE id=b FOR SHARE;
  IF NOT FOUND OR owner_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Stock request unavailable.';
  END IF;
  IF owner_id<>a THEN
    SELECT s.role::text INTO staff_role FROM public.business_staff s
      WHERE s.business_id=b AND s.user_id=a AND s.active IS TRUE FOR SHARE;
    IF NOT FOUND OR staff_role NOT IN ('manager','assistant_manager') THEN
      RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Stock request unavailable.';
    END IF;
  END IF;

  -- Operation identity is account-wide. Hash collisions serialize, never dedupe.
  PERFORM pg_advisory_xact_lock(hashtextextended('365-stock-v1:'||a::text||':'||op::text,0));
  SELECT * INTO saved FROM business_stock_operations_v1.outcomes WHERE account_id=a AND operation_id=op;
  IF FOUND THEN
    IF saved.request IS DISTINCT FROM request THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Stock operation identity already used.';
    END IF;
    IF saved.movement_id IS NOT NULL THEN
      SELECT * INTO saved_movement FROM public.business_inventory_movements WHERE id=saved.movement_id;
      IF NOT FOUND OR to_jsonb(saved_movement) IS DISTINCT FROM saved.movement_snapshot THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Stock history needs review.';
      END IF;
    END IF;
    outcome:=saved.result;
  ELSIF _inspect THEN
    -- This is not cancellation. Retry only this same operation ID and intent.
    outcome:=jsonb_build_object('version',1,'status','not_observed','request',request);
  ELSE
    SELECT * INTO old_item FROM public.business_inventory_items WHERE id=i AND business_id=b FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Stock request unavailable.';
    END IF;
    IF old_item.updated_at IS DISTINCT FROM expected_at OR old_item.qty_on_hand IS DISTINCT FROM expected THEN
      rejection:='conflict';
    ELSIF old_item.active IS DISTINCT FROM TRUE OR old_item.qty_on_hand<0 OR old_item.qty_on_hold<0
      OR old_item.qty_on_order<0 OR old_item.qty_on_hand::text IN ('NaN','Infinity','-Infinity')
      OR old_item.qty_on_hold::text IN ('NaN','Infinity','-Infinity')
      OR old_item.qty_on_order::text IN ('NaN','Infinity','-Infinity')
      OR old_item.qty_on_hand IS NULL OR old_item.qty_on_hold IS NULL OR old_item.qty_on_order IS NULL THEN
      rejection:='invalid_stock';
    ELSE
      snapshot_time:=clock_timestamp();
      SELECT COALESCE(sum(q.reserved_quantity),0), COALESCE(bool_or(
        q.business_id IS DISTINCT FROM b OR q.item_id IS DISTINCT FROM i OR q.reserved_quantity IS NULL
        OR q.reserved_quantity<=0 OR q.reserved_quantity::text IN ('NaN','Infinity','-Infinity')),false)
        INTO inquiries,malformed FROM public.network_part_inquiries q
        WHERE q.reserved_item_id=i AND q.status='accepted' AND q.reserved_until>snapshot_time;
      IF malformed THEN rejection:='invalid_stock'; END IF;
      SELECT COALESCE(sum(r.quantity),0), COALESCE(bool_or(r.quantity IS NULL OR r.quantity<=0
        OR r.quantity::text IN ('NaN','Infinity','-Infinity') OR r.supplier_business_id IS DISTINCT FROM b
        OR o.id IS NULL OR l.id IS NULL OR o.supplier_business_id IS DISTINCT FROM b
        OR l.order_id IS DISTINCT FROM r.order_id OR l.inventory_item_id IS DISTINCT FROM i),false)
        INTO reservations,malformed FROM public.parts_reservations r
        LEFT JOIN public.parts_orders o ON o.id=r.order_id LEFT JOIN public.parts_order_lines l ON l.id=r.order_line_id
        WHERE r.inventory_item_id=i AND r.released_at IS NULL AND r.fulfilled_at IS NULL
          AND (r.expires_at>snapshot_time OR o.status IN ('picking','ready'));
      protected:=greatest(old_item.qty_on_hold,inquiries+reservations);
      IF malformed OR protected::text IN ('NaN','Infinity','-Infinity') OR protected>old_item.qty_on_hand THEN
        rejection:='invalid_stock';
      ELSIF expected+delta<protected OR expected+delta<0 THEN
        rejection:='reserved_stock';
      ELSIF expected+delta>9999999999.99 THEN
        rejection:='invalid_stock';
      END IF;
    END IF;
    IF rejection IS NOT NULL THEN
      outcome:=jsonb_build_object('version',1,'status','rejected','request',request,'code',rejection);
    ELSE
      target:=expected+delta;
      UPDATE public.business_inventory_items SET qty_on_hand=target WHERE id=i AND business_id=b
        RETURNING * INTO new_item;
      IF NOT FOUND OR new_item.qty_on_hand IS DISTINCT FROM target
        OR (to_jsonb(new_item)-'qty_on_hand'-'updated_at') IS DISTINCT FROM (to_jsonb(old_item)-'qty_on_hand'-'updated_at') THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Stock write unconfirmed.';
      END IF;
      SELECT * INTO old_item FROM public.business_inventory_items WHERE id=i AND business_id=b;
      IF NOT FOUND OR to_jsonb(old_item) IS DISTINCT FROM to_jsonb(new_item) THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Stock write unconfirmed.';
      END IF;
      movement_id:=gen_random_uuid();
      INSERT INTO public.business_inventory_movements(id,item_id,business_id,delta,reason,actor_id)
        VALUES(movement_id,i,b,delta,reason,a) RETURNING * INTO movement;
      IF NOT FOUND OR movement.id IS DISTINCT FROM movement_id OR movement.item_id IS DISTINCT FROM i
        OR movement.business_id IS DISTINCT FROM b OR movement.delta IS DISTINCT FROM delta
        OR movement.reason IS DISTINCT FROM reason OR movement.actor_id IS DISTINCT FROM a THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Stock movement unconfirmed.';
      END IF;
      SELECT * INTO saved_movement FROM public.business_inventory_movements WHERE id=movement_id;
      IF NOT FOUND OR to_jsonb(saved_movement) IS DISTINCT FROM to_jsonb(movement) THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Stock movement unconfirmed.';
      END IF;
      outcome:=jsonb_build_object('version',1,'status','completed','request',request,'movementId',movement_id,
        'quantityBefore',expected::text,'quantityAfter',target::text);
    END IF;
    INSERT INTO business_stock_operations_v1.outcomes(account_id,operation_id,business_id,item_id,
      movement_id,request,result,movement_snapshot)
      VALUES(a,op,b,i,movement_id,request,outcome,CASE WHEN movement_id IS NOT NULL THEN to_jsonb(movement) ELSE NULL END)
      RETURNING * INTO inserted;
    IF NOT FOUND OR inserted.request IS DISTINCT FROM request OR inserted.result IS DISTINCT FROM outcome
      OR inserted.account_id IS DISTINCT FROM a OR inserted.operation_id IS DISTINCT FROM op
      OR inserted.business_id IS DISTINCT FROM b OR inserted.item_id IS DISTINCT FROM i
      OR inserted.movement_id IS DISTINCT FROM movement_id
      OR inserted.movement_snapshot IS DISTINCT FROM (CASE WHEN movement_id IS NOT NULL THEN to_jsonb(movement) ELSE NULL END)
      OR inserted.created_at IS DISTINCT FROM now() THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Stock outcome unconfirmed.';
    END IF;
    SELECT * INTO saved FROM business_stock_operations_v1.outcomes WHERE account_id=a AND operation_id=op;
    IF NOT FOUND OR to_jsonb(saved) IS DISTINCT FROM to_jsonb(inserted) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Stock outcome unconfirmed.';
    END IF;
  END IF;
  -- Re-read after the ledger write too: an AFTER trigger must not turn a
  -- confirmed transaction receipt into a statement-only acknowledgment.
  IF movement_id IS NOT NULL THEN
    SELECT * INTO old_item FROM public.business_inventory_items WHERE id=i AND business_id=b;
    IF NOT FOUND OR to_jsonb(old_item) IS DISTINCT FROM to_jsonb(new_item) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Stock write unconfirmed.';
    END IF;
    SELECT * INTO saved_movement FROM public.business_inventory_movements WHERE id=movement_id;
    IF NOT FOUND OR to_jsonb(saved_movement) IS DISTINCT FROM to_jsonb(movement) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Stock movement unconfirmed.';
    END IF;
  END IF;
  -- The locked user/session/business/staff rows prevent concurrent revocation
  -- from overtaking this transaction. Clock expiry is checked again after waits.
  IF auth.uid() IS DISTINCT FROM a OR expires<=extract(epoch FROM clock_timestamp())
    OR (sess.not_after IS NOT NULL AND sess.not_after<=clock_timestamp()) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Stock request unavailable.';
  END IF;
  RETURN outcome;
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS state=RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE=state,MESSAGE='Stock request could not be confirmed.';
END $$;

CREATE FUNCTION public.business_stock_operation_v1(_request jsonb,_inspect boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
  SELECT business_stock_operations_v1.execute(_request,_inspect)
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA business_stock_operations_v1 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.business_stock_operation_v1(jsonb,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA business_stock_operations_v1 TO authenticated;
GRANT EXECUTE ON FUNCTION business_stock_operations_v1.execute(jsonb,boolean),
  public.business_stock_operation_v1(jsonb,boolean) TO authenticated;
-- Refuse unexpected inherited/default grants rather than publishing a wider API.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_namespace n,
      LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) acl
    WHERE n.nspname='business_stock_operations_v1' AND acl.grantee<>n.nspowner
      AND NOT (acl.grantee='authenticated'::regrole AND acl.privilege_type='USAGE' AND NOT acl.is_grantable)
  ) OR EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,
      LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) acl
    WHERE n.nspname='business_stock_operations_v1' AND acl.grantee<>c.relowner
  ) OR EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,
      LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) acl
    WHERE (n.nspname='business_stock_operations_v1'
      OR p.oid='public.business_stock_operation_v1(jsonb,boolean)'::regprocedure)
      AND acl.grantee<>p.proowner
      AND NOT (acl.grantee='authenticated'::regrole AND acl.privilege_type='EXECUTE'
        AND NOT acl.is_grantable AND p.proname IN ('execute','business_stock_operation_v1'))
  ) THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Unexpected stock operation grants.';
  END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
