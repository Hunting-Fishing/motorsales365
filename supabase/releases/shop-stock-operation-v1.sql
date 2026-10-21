-- Forward source only. Install the complete reviewed business/staff package first.
-- No historical migrations or other stock writers are replaced by this package.
BEGIN;
SET LOCAL search_path = pg_catalog, pg_temp;
DO $$ BEGIN
  IF to_regprocedure('client_business_access_candidate.require_role(uuid,uuid,text[])') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.business_staff'::regclass
      AND tgname='zz_client_staff_boundary' AND tgenabled='O')
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.business_staff'::regclass
      AND tgname='zzz_client_staff_authority_target' AND tgenabled='O') THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Reviewed staff boundary required.';
  END IF;
END $$;
-- The existing audit trigger is retained, not bypassed. Its exact body and
-- attachment are part of this writer's reviewed compatibility envelope.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('shop_manager.capture_employee_operation()')
      AND md5(replace(prosrc,chr(13),''))='d81faf24ab9e5c6744a25ad8d264c3ad' AND prosecdef
      AND proconfig=ARRAY['search_path=shop_manager, public, pg_temp'])
    OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('shop_manager.current_employee_profile()')
      AND md5(replace(prosrc,chr(13),''))='f4135fe6ed3f063cd52be5c69d1ead08' AND prosecdef
      AND proconfig=ARRAY['search_path=shop_manager, public, pg_temp'])
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='shop_manager.inventory_transactions'::regclass
      AND tgname='employee_operation_audit' AND tgfoid=to_regprocedure('shop_manager.capture_employee_operation()')
      AND tgenabled='O' AND tgtype=29 AND tgqual IS NULL AND tgnargs=0) THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Reviewed employee audit required.';
  END IF;
END $$;
CREATE SCHEMA shop_stock_operations_v1;
REVOKE ALL ON SCHEMA shop_stock_operations_v1 FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE shop_stock_operations_v1.outcomes (
  account_id uuid NOT NULL REFERENCES auth.users(id),
  operation_id uuid NOT NULL,
  shop_id uuid NOT NULL REFERENCES shop_manager.shops(id),
  item_id uuid NOT NULL REFERENCES shop_manager.inventory_items(id),
  transaction_id uuid UNIQUE REFERENCES shop_manager.inventory_transactions(id),
  request jsonb NOT NULL CHECK (jsonb_typeof(request)='object'),
  result jsonb NOT NULL CHECK (result->>'status' IN ('completed','rejected')),
  transaction_snapshot jsonb,
  audit_event_id bigint UNIQUE REFERENCES shop_manager.employee_operational_events(id),
  audit_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(account_id,operation_id),
  CHECK ((result->>'status'='completed')=(transaction_id IS NOT NULL)),
  CHECK ((transaction_id IS NULL)=(transaction_snapshot IS NULL)),
  CHECK ((transaction_id IS NULL)=(audit_event_id IS NULL)),
  CHECK ((audit_event_id IS NULL)=(audit_snapshot IS NULL))
);
ALTER TABLE shop_stock_operations_v1.outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_stock_operations_v1.outcomes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON shop_stock_operations_v1.outcomes FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION shop_stock_operations_v1.immutable() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
BEGIN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Stock outcome is immutable.'; END $$;
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON shop_stock_operations_v1.outcomes
FOR EACH ROW EXECUTE FUNCTION shop_stock_operations_v1.immutable();
CREATE TRIGGER immutable_table BEFORE TRUNCATE ON shop_stock_operations_v1.outcomes
FOR EACH STATEMENT EXECUTE FUNCTION shop_stock_operations_v1.immutable();

-- Deliberately narrow privileged lookups: never grant clients Auth table access.
-- Authority comes from current ownership/active staff, not mutable native profiles.
CREATE FUNCTION shop_stock_operations_v1.authorize(a uuid,s uuid,manage boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE
  claims jsonb; sid uuid; expires numeric; u auth.users; sess auth.sessions;
  b uuid; checked_b uuid; role_name text;
BEGIN
  IF current_setting('role',true) IS DISTINCT FROM 'authenticated'
    OR a IS NULL OR s IS NULL OR manage IS NULL OR auth.uid() IS DISTINCT FROM a THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop stock unavailable.';
  END IF;
  claims:=auth.jwt();
  IF claims->>'role' IS DISTINCT FROM 'authenticated'
    OR claims->>'exp' IS NULL OR claims->>'exp' !~ '^[0-9]{1,11}$'
    OR claims->>'session_id' IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop stock unavailable.';
  END IF;
  sid:=(claims->>'session_id')::uuid; expires:=(claims->>'exp')::numeric;
  SELECT * INTO u FROM auth.users WHERE id=a FOR SHARE;
  IF NOT FOUND OR u.deleted_at IS NOT NULL OR u.is_anonymous IS DISTINCT FROM FALSE
    OR (u.banned_until IS NOT NULL AND u.banned_until>clock_timestamp()) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop stock unavailable.';
  END IF;
  SELECT * INTO sess FROM auth.sessions WHERE id=sid AND user_id=a FOR SHARE;
  IF NOT FOUND OR expires<=extract(epoch FROM clock_timestamp())
    OR (sess.not_after IS NOT NULL AND sess.not_after<=clock_timestamp()) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop stock unavailable.';
  END IF;
  SELECT business_id INTO b FROM shop_manager.shops WHERE id=s AND is_active IS TRUE;
  IF NOT FOUND OR b IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop stock unavailable.';
  END IF;
  role_name:=client_business_access_candidate.require_role(a,b,CASE WHEN manage
    THEN ARRAY['owner','manager','assistant_manager']
    ELSE ARRAY['owner','manager','assistant_manager','dispatcher','driver','mechanic','clerk'] END);
  IF role_name IS NULL OR NOT (role_name=ANY(CASE WHEN manage
    THEN ARRAY['owner','manager','assistant_manager']
    ELSE ARRAY['owner','manager','assistant_manager','dispatcher','driver','mechanic','clerk'] END)) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop stock unavailable.';
  END IF;
  SELECT business_id INTO checked_b FROM shop_manager.shops WHERE id=s AND is_active IS TRUE FOR SHARE;
  IF NOT FOUND OR checked_b IS DISTINCT FROM b OR auth.uid() IS DISTINCT FROM a
    OR expires<=extract(epoch FROM clock_timestamp())
    OR (sess.not_after IS NOT NULL AND sess.not_after<=clock_timestamp()) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop stock unavailable.';
  END IF;
  RETURN role_name;
END $$;

-- Selection is an audit-routing prerequisite, NEVER membership authority.
-- Lock the exact profile/shift witnesses so the retained audit trigger cannot
-- attribute this adjustment to another selected shop. No automatic shop switch.
CREATE FUNCTION shop_stock_operations_v1.audit_context(a uuid,s uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE p shop_manager.profiles; current_p shop_manager.profiles;
  shift shop_manager.employee_shifts; n integer:=0; shift_id uuid;
BEGIN
  FOR p IN SELECT * FROM shop_manager.profiles WHERE user_id=a OR id=a ORDER BY id FOR SHARE LOOP
    n:=n+1;
    IF p.shop_id IS DISTINCT FROM s OR NOT (p.user_id=a OR (p.user_id IS NULL AND p.id=a)) THEN
      RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Select the authorized shop before adjusting stock.';
    END IF;
  END LOOP;
  IF n<>1 THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unambiguous selected profile required.'; END IF;
  SELECT * INTO current_p FROM shop_manager.current_employee_profile();
  IF current_p.id IS DISTINCT FROM p.id OR current_p.shop_id IS DISTINCT FROM s THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Selected shop changed.';
  END IF;
  n:=0;
  FOR shift IN SELECT * FROM shop_manager.employee_shifts WHERE user_id=a
    AND status IN ('on_shift','on_break') ORDER BY id FOR SHARE LOOP
    n:=n+1; shift_id:=shift.id;
    IF shift.shop_id IS DISTINCT FROM s OR shift.profile_id IS DISTINCT FROM p.id THEN
      RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Selected shift does not match this shop.';
    END IF;
  END LOOP;
  IF n>1 THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unambiguous active shift required.'; END IF;
  RETURN jsonb_build_object('profileId',p.id,'shiftId',shift_id);
END $$;

CREATE FUNCTION shop_stock_operations_v1.read_item(a uuid,i uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
SET lock_timeout='5s' AS $$
DECLARE s uuid; role_name text; part shop_manager.inventory_items; recent jsonb; item_data jsonb; state text; can_adjust boolean:=false;
BEGIN
  IF a IS NULL OR i IS NULL OR auth.uid() IS DISTINCT FROM a THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop stock unavailable.';
  END IF;
  SELECT shop_id INTO s FROM shop_manager.inventory_items WHERE id=i;
  IF NOT FOUND OR s IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop stock unavailable.';
  END IF;
  role_name:=shop_stock_operations_v1.authorize(a,s,false);
  SELECT * INTO part FROM shop_manager.inventory_items WHERE id=i AND shop_id=s FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop stock unavailable.'; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.transaction_date DESC,t.id),'[]'::jsonb)
    INTO recent FROM (SELECT id,inventory_item_id,transaction_type,quantity,transaction_date,
      reference_type,reference_id,notes FROM shop_manager.inventory_transactions
      WHERE inventory_item_id=i ORDER BY transaction_date DESC,id LIMIT 50) t;
  -- Explicit projection: future table columns do not become a public API.
  SELECT jsonb_object_agg(x.key,x.value) INTO item_data FROM jsonb_each(to_jsonb(part)) x
    WHERE x.key=ANY(ARRAY['id','shop_id','name','sku','part_number','barcode','category','subcategory',
      'supplier','manufacturer','quantity','quantity_in_stock','reorder_point','on_hold','on_order',
      'unit_price','cost_per_unit','sell_price_per_unit','margin_markup','location','status','description',
      'vehicle_compatibility','warranty_period','notes','created_at','updated_at']);
  IF role_name IN ('owner','manager','assistant_manager') THEN
    BEGIN
      PERFORM shop_stock_operations_v1.audit_context(a,s);
      can_adjust:=true;
    EXCEPTION WHEN insufficient_privilege THEN can_adjust:=false; END;
  END IF;
  -- A non-management reader receives no supplier/cost/margin values.
  PERFORM shop_stock_operations_v1.authorize(a,s,false);
  RETURN jsonb_build_object('version',1,'accountId',a,'shopId',s,
    'canAdjust',can_adjust,
    'costRestricted',role_name NOT IN ('owner','manager','assistant_manager'),
    'item', CASE WHEN role_name IN ('owner','manager','assistant_manager') THEN item_data
      ELSE (item_data-'supplier'-'cost_per_unit'-'margin_markup') END,
    'transactions',recent);
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS state=RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE=state,MESSAGE='Shop stock unavailable.';
END $$;

CREATE FUNCTION shop_stock_operations_v1.execute(_request jsonb,_inspect boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
SET lock_timeout='5s' AS $$
DECLARE
  a uuid; s uuid; i uuid; op uuid; expected integer; delta integer; target bigint;
  expected_at timestamptz; reason text; request jsonb; result jsonb; rejection text;
  before_item shop_manager.inventory_items; changed shop_manager.inventory_items;
  persisted shop_manager.inventory_items; tx shop_manager.inventory_transactions;
  persisted_tx shop_manager.inventory_transactions; tx_id uuid;
  saved shop_stock_operations_v1.outcomes; inserted shop_stock_operations_v1.outcomes;
  audit_context jsonb; audit_row shop_manager.employee_operational_events;
  persisted_audit shop_manager.employee_operational_events; audit_count integer;
  state text;
BEGIN
  IF current_setting('role',true) IS DISTINCT FROM 'authenticated' OR _inspect IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop stock unavailable.';
  END IF;
  IF jsonb_typeof(_request) IS DISTINCT FROM 'object' OR _request->'version' IS DISTINCT FROM '1'::jsonb
    OR (SELECT count(*) FROM jsonb_object_keys(_request))<>9
    OR NOT (_request ?& ARRAY['version','operationId','expectedAccountId','shopId','itemId',
      'expectedUpdatedAt','expectedQuantity','delta','reason'])
    OR EXISTS (SELECT 1 FROM jsonb_each(_request) x WHERE x.key<>'version' AND jsonb_typeof(x.value)<>'string') THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid stock request.';
  END IF;
  a:=(_request->>'expectedAccountId')::uuid; s:=(_request->>'shopId')::uuid;
  i:=(_request->>'itemId')::uuid; op:=(_request->>'operationId')::uuid;
  IF a IS NULL OR s IS NULL OR i IS NULL OR op IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid stock request.';
  END IF;
  IF (_request->>'expectedQuantity') !~ '^[0-9]{1,10}$' OR (_request->>'delta') !~ '^-?[0-9]{1,10}$'
    OR (_request->>'expectedUpdatedAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$' THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid stock request.';
  END IF;
  expected:=(_request->>'expectedQuantity')::integer; delta:=(_request->>'delta')::integer;
  expected_at:=(_request->>'expectedUpdatedAt')::timestamptz; reason:=btrim(_request->>'reason');
  IF expected<0 OR delta=0 OR delta=-2147483648 OR NOT isfinite(expected_at)
    OR length(reason) NOT BETWEEN 1 AND 500 OR reason ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid stock request.';
  END IF;
  request:=jsonb_build_object('version',1,'operationId',op,'expectedAccountId',a,'shopId',s,
    'itemId',i,'expectedUpdatedAt',_request->>'expectedUpdatedAt','expectedQuantity',expected::text,
    'delta',delta::text,'reason',reason);
  PERFORM shop_stock_operations_v1.authorize(a,s,true);
  PERFORM pg_advisory_xact_lock(hashtextextended('365-native-stock-v1:'||a::text||':'||op::text,0));
  SELECT * INTO saved FROM shop_stock_operations_v1.outcomes WHERE account_id=a AND operation_id=op;
  IF FOUND THEN
    IF saved.request IS DISTINCT FROM request THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Stock identity already used.';
    END IF;
    IF saved.transaction_id IS NOT NULL THEN
      SELECT * INTO persisted_tx FROM shop_manager.inventory_transactions WHERE id=saved.transaction_id;
      IF NOT FOUND OR to_jsonb(persisted_tx) IS DISTINCT FROM saved.transaction_snapshot THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Stock history needs review.';
      END IF;
    END IF;
    IF saved.audit_event_id IS NOT NULL THEN
      SELECT * INTO persisted_audit FROM shop_manager.employee_operational_events WHERE id=saved.audit_event_id;
      IF NOT FOUND OR to_jsonb(persisted_audit) IS DISTINCT FROM saved.audit_snapshot THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Employee audit needs review.';
      END IF;
    END IF;
    result:=saved.result;
  ELSIF _inspect THEN
    result:=jsonb_build_object('version',1,'status','not_observed','request',request);
  ELSE
    audit_context:=shop_stock_operations_v1.audit_context(a,s);
    SELECT * INTO before_item FROM shop_manager.inventory_items WHERE id=i AND shop_id=s FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop stock unavailable.'; END IF;
    target:=expected::bigint+delta::bigint;
    IF before_item.quantity IS DISTINCT FROM expected OR before_item.updated_at IS DISTINCT FROM expected_at THEN
      rejection:='conflict';
    ELSIF before_item.quantity<0 OR COALESCE(before_item.on_hold,0)<0 OR COALESCE(before_item.on_order,0)<0
      OR COALESCE(before_item.on_hold,0)>before_item.quantity
      OR (before_item.quantity_in_stock IS NOT NULL AND before_item.quantity_in_stock<>before_item.quantity) THEN
      rejection:='invalid_stock';
    ELSIF target<COALESCE(before_item.on_hold,0) OR target<0 THEN
      rejection:='reserved_stock';
    ELSIF target>2147483647 THEN rejection:='invalid_stock';
    END IF;
    IF rejection IS NOT NULL THEN
      result:=jsonb_build_object('version',1,'status','rejected','request',request,'code',rejection);
    ELSE
      UPDATE shop_manager.inventory_items SET quantity=target::integer,quantity_in_stock=target::integer,
        updated_at=clock_timestamp() WHERE id=i AND shop_id=s RETURNING * INTO changed;
      IF NOT FOUND OR changed.quantity IS DISTINCT FROM target::integer
        OR changed.quantity_in_stock IS DISTINCT FROM target::integer OR changed.updated_at IS NULL
        OR (to_jsonb(changed)-'quantity'-'quantity_in_stock'-'updated_at')
          IS DISTINCT FROM (to_jsonb(before_item)-'quantity'-'quantity_in_stock'-'updated_at') THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Stock write unconfirmed.';
      END IF;
      tx_id:=gen_random_uuid();
      -- The retained CHECK permits adjustment, NOT stock_in/stock_out.
      INSERT INTO shop_manager.inventory_transactions(id,inventory_item_id,transaction_type,quantity,
        transaction_date,reference_type,reference_id,performed_by,notes)
        VALUES(tx_id,i,'adjustment',delta,now(),'manual_adjustment',op,a,reason) RETURNING * INTO tx;
      IF NOT FOUND OR tx.id IS DISTINCT FROM tx_id OR tx.inventory_item_id IS DISTINCT FROM i
        OR tx.transaction_type IS DISTINCT FROM 'adjustment' OR tx.quantity IS DISTINCT FROM delta
        OR tx.performed_by IS DISTINCT FROM a OR tx.reference_id IS DISTINCT FROM op
        OR tx.reference_type IS DISTINCT FROM 'manual_adjustment' OR tx.notes IS DISTINCT FROM reason
        OR tx.transaction_date IS DISTINCT FROM now() OR tx.created_at IS DISTINCT FROM now()
        OR tx.updated_at IS DISTINCT FROM now() THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Stock history unconfirmed.';
      END IF;
      SELECT count(*) INTO audit_count FROM shop_manager.employee_operational_events
        WHERE entity_type='inventory_transactions' AND entity_id=tx_id::text AND action='insert_inventory_transactions';
      SELECT * INTO audit_row FROM shop_manager.employee_operational_events
        WHERE entity_type='inventory_transactions' AND entity_id=tx_id::text AND action='insert_inventory_transactions';
      IF audit_count<>1 OR audit_row.shop_id IS DISTINCT FROM s OR audit_row.actor_user_id IS DISTINCT FROM a
        OR audit_row.profile_id::text IS DISTINCT FROM audit_context->>'profileId'
        OR audit_row.shift_id::text IS DISTINCT FROM audit_context->>'shiftId'
        OR audit_row.event_category IS DISTINCT FROM 'inventory' OR audit_row.quantity IS DISTINCT FROM delta::numeric
        OR audit_row.customer_id IS NOT NULL OR audit_row.amount IS NOT NULL OR audit_row.reason IS NOT NULL
        OR audit_row.approval_request_id IS NOT NULL OR audit_row.occurred_at IS DISTINCT FROM now()
        OR audit_row.source IS DISTINCT FROM 'shop_manager'
        OR audit_row.metadata IS DISTINCT FROM jsonb_build_object('transaction_type','adjustment',
          'reference_type','manual_adjustment','reference_id',op) THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Employee audit unconfirmed.';
      END IF;
      result:=jsonb_build_object('version',1,'status','completed','request',request,'transactionId',tx_id,
        'quantityBefore',expected::text,'quantityAfter',target::text);
    END IF;
    INSERT INTO shop_stock_operations_v1.outcomes(account_id,operation_id,shop_id,item_id,transaction_id,
      request,result,transaction_snapshot,audit_event_id,audit_snapshot) VALUES(a,op,s,i,tx_id,request,result,
        CASE WHEN tx_id IS NULL THEN NULL ELSE to_jsonb(tx) END,audit_row.id,
        CASE WHEN tx_id IS NULL THEN NULL ELSE to_jsonb(audit_row) END) RETURNING * INTO inserted;
    IF NOT FOUND OR inserted.account_id IS DISTINCT FROM a OR inserted.operation_id IS DISTINCT FROM op
      OR inserted.shop_id IS DISTINCT FROM s OR inserted.item_id IS DISTINCT FROM i
      OR inserted.transaction_id IS DISTINCT FROM tx_id OR inserted.request IS DISTINCT FROM request
      OR inserted.audit_event_id IS DISTINCT FROM audit_row.id
      OR inserted.audit_snapshot IS DISTINCT FROM (CASE WHEN tx_id IS NULL THEN NULL ELSE to_jsonb(audit_row) END)
      OR inserted.result IS DISTINCT FROM result OR inserted.created_at IS DISTINCT FROM now()
      OR inserted.transaction_snapshot IS DISTINCT FROM (CASE WHEN tx_id IS NULL THEN NULL ELSE to_jsonb(tx) END) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Stock outcome unconfirmed.';
    END IF;
    SELECT * INTO saved FROM shop_stock_operations_v1.outcomes WHERE account_id=a AND operation_id=op;
    IF NOT FOUND OR to_jsonb(saved) IS DISTINCT FROM to_jsonb(inserted) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Stock outcome unconfirmed.';
    END IF;
    IF tx_id IS NOT NULL THEN
      SELECT * INTO persisted FROM shop_manager.inventory_items WHERE id=i AND shop_id=s;
      SELECT * INTO persisted_tx FROM shop_manager.inventory_transactions WHERE id=tx_id;
      SELECT * INTO persisted_audit FROM shop_manager.employee_operational_events WHERE id=audit_row.id;
      IF to_jsonb(persisted_audit) IS DISTINCT FROM to_jsonb(audit_row)
        OR shop_stock_operations_v1.audit_context(a,s) IS DISTINCT FROM audit_context THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Employee audit unconfirmed.';
      END IF;
      IF to_jsonb(persisted) IS DISTINCT FROM to_jsonb(changed) OR to_jsonb(persisted_tx) IS DISTINCT FROM to_jsonb(tx) THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Stock write unconfirmed.';
      END IF;
    END IF;
  END IF;
  PERFORM shop_stock_operations_v1.authorize(a,s,true);
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS state=RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE=state,MESSAGE='Shop stock request could not be confirmed.';
END $$;
CREATE FUNCTION public.shop_stock_operation_v1(_request jsonb,_inspect boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
  SELECT shop_stock_operations_v1.execute(_request,_inspect)
$$;
CREATE FUNCTION public.shop_stock_item_v1(_account uuid,_item uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
  SELECT shop_stock_operations_v1.read_item(_account,_item)
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA shop_stock_operations_v1 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.shop_stock_operation_v1(jsonb,boolean),public.shop_stock_item_v1(uuid,uuid)
FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA shop_stock_operations_v1 TO authenticated;
GRANT EXECUTE ON FUNCTION shop_stock_operations_v1.execute(jsonb,boolean),shop_stock_operations_v1.read_item(uuid,uuid),
  public.shop_stock_operation_v1(jsonb,boolean),public.shop_stock_item_v1(uuid,uuid) TO authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace n,
    LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a
    WHERE n.nspname='shop_stock_operations_v1' AND a.grantee<>n.nspowner
      AND NOT(a.grantee='authenticated'::regrole AND a.privilege_type='USAGE' AND NOT a.is_grantable))
  OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,
    LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a
    WHERE n.nspname='shop_stock_operations_v1' AND a.grantee<>c.relowner)
  OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,
    LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
    WHERE (n.nspname='shop_stock_operations_v1' OR p.oid IN
      ('public.shop_stock_operation_v1(jsonb,boolean)'::regprocedure,'public.shop_stock_item_v1(uuid,uuid)'::regprocedure))
      AND a.grantee<>p.proowner AND NOT(a.grantee='authenticated'::regrole AND a.privilege_type='EXECUTE'
        AND NOT a.is_grantable AND p.proname IN ('execute','read_item','shop_stock_operation_v1','shop_stock_item_v1'))) THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Unexpected shop stock grants.';
  END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
