-- Forward release: authenticated quote approval and atomic quote-to-work-order.
-- Install after the reviewed staff/native-stock package; no automatic live apply.
BEGIN;
SET LOCAL search_path=pg_catalog,pg_temp;
DO $$ BEGIN
  IF to_regprocedure('shop_stock_operations_v1.authorize(uuid,uuid,boolean)') IS NULL
    OR to_regprocedure('shop_stock_operations_v1.audit_context(uuid,uuid)') IS NULL
    OR to_regprocedure('shop_manager.capture_employee_operation()') IS NULL
    OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='shop_manager.work_orders'::regclass
      AND tgname='employee_operation_audit' AND tgfoid=to_regprocedure('shop_manager.capture_employee_operation()')
      AND tgenabled='O' AND tgtype=29 AND tgqual IS NULL AND tgnargs=0) THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Reviewed stock authority and work-order audit required.';
  END IF;
END $$;
CREATE SCHEMA quote_workflow_v1;
REVOKE ALL ON SCHEMA quote_workflow_v1 FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE quote_workflow_v1.outcomes(
  account_id uuid NOT NULL REFERENCES auth.users(id),
  operation_id uuid NOT NULL,
  shop_id uuid NOT NULL REFERENCES shop_manager.shops(id),
  quote_id uuid NOT NULL REFERENCES shop_manager.quotes(id),
  request jsonb NOT NULL CHECK(jsonb_typeof(request)='object'),
  result jsonb NOT NULL CHECK(jsonb_typeof(result)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(account_id,operation_id)
);
CREATE TABLE quote_workflow_v1.conversions(
  quote_id uuid PRIMARY KEY REFERENCES shop_manager.quotes(id),
  work_order_id uuid NOT NULL UNIQUE REFERENCES shop_manager.work_orders(id),
  shop_id uuid NOT NULL REFERENCES shop_manager.shops(id),
  account_id uuid NOT NULL REFERENCES auth.users(id),
  source_snapshot jsonb NOT NULL,
  destination_snapshot jsonb NOT NULL,
  audit_id bigint NOT NULL UNIQUE REFERENCES shop_manager.employee_operational_events(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quote_workflow_v1.outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_workflow_v1.outcomes FORCE ROW LEVEL SECURITY;
ALTER TABLE quote_workflow_v1.conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_workflow_v1.conversions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA quote_workflow_v1 FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION quote_workflow_v1.immutable() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
BEGIN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Quote history is immutable.'; END $$;
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON quote_workflow_v1.outcomes FOR EACH ROW EXECUTE FUNCTION quote_workflow_v1.immutable();
CREATE TRIGGER immutable_table BEFORE TRUNCATE ON quote_workflow_v1.outcomes FOR EACH STATEMENT EXECUTE FUNCTION quote_workflow_v1.immutable();
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON quote_workflow_v1.conversions FOR EACH ROW EXECUTE FUNCTION quote_workflow_v1.immutable();
CREATE TRIGGER immutable_table BEFORE TRUNCATE ON quote_workflow_v1.conversions FOR EACH STATEMENT EXECUTE FUNCTION quote_workflow_v1.immutable();

-- All item writers lock the parent. Conversion never takes child row locks after
-- this parent lock, avoiding the parent/child inversion of a row UPDATE trigger.
CREATE FUNCTION quote_workflow_v1.item_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE old_id uuid; new_id uuid; target uuid; q shop_manager.quotes; s uuid;
BEGIN
  IF TG_OP<>'INSERT' THEN old_id:=OLD.quote_id; END IF;
  IF TG_OP<>'DELETE' THEN new_id:=NEW.quote_id; END IF;
  FOR target IN SELECT DISTINCT x FROM unnest(ARRAY[old_id,new_id]) x WHERE x IS NOT NULL ORDER BY x LOOP
    SELECT * INTO q FROM shop_manager.quotes WHERE id=target FOR UPDATE;
    IF NOT FOUND OR q.status='converted' OR q.converted_to_work_order_id IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Converted or missing quote cannot be edited.';
    END IF;
    IF current_setting('role',true)='authenticated' THEN
      SELECT shop_id INTO s FROM shop_manager.customers WHERE id=q.customer_id;
      PERFORM shop_stock_operations_v1.authorize(auth.uid(),s,true);
      PERFORM shop_stock_operations_v1.audit_context(auth.uid(),s);
    END IF;
  END LOOP;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER zz_quote_workflow_parent BEFORE INSERT OR UPDATE OR DELETE ON shop_manager.quote_items
FOR EACH ROW EXECUTE FUNCTION quote_workflow_v1.item_guard();

-- Freeze a converted source, and prevent direct ordinary callers from fabricating
-- conversion linkage. This is an additional restriction, never a table grant.
CREATE FUNCTION quote_workflow_v1.quote_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
DECLARE owner_name name;
BEGIN
  IF TG_OP<>'INSERT' AND (OLD.status='converted' OR OLD.converted_to_work_order_id IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Converted quote history cannot be changed.';
  END IF;
  SELECT r.rolname INTO owner_name FROM pg_class c JOIN pg_roles r ON r.oid=c.relowner WHERE c.oid=TG_RELID;
  IF TG_OP<>'DELETE' AND current_user<>owner_name AND
    (NEW.status='converted' OR NEW.converted_to_work_order_id IS NOT NULL OR NEW.converted_at IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Use the authorized quote conversion.';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER zz_quote_workflow_link BEFORE INSERT OR UPDATE OR DELETE ON shop_manager.quotes
FOR EACH ROW EXECUTE FUNCTION quote_workflow_v1.quote_guard();

CREATE FUNCTION quote_workflow_v1.snapshot(a uuid,qid uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='5s' AS $$
DECLARE q shop_manager.quotes; c shop_manager.customers; p shop_manager.profiles;
  s uuid; expected_customer uuid; audit jsonb; rows jsonb; v shop_manager.vehicles;
BEGIN
  SELECT c0.shop_id,q0.customer_id INTO s,expected_customer FROM shop_manager.quotes q0
    JOIN shop_manager.customers c0 ON c0.id=q0.customer_id WHERE q0.id=qid;
  IF NOT FOUND OR s IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Quote unavailable.'; END IF;
  PERFORM shop_stock_operations_v1.authorize(a,s,true);
  audit:=shop_stock_operations_v1.audit_context(a,s);
  SELECT * INTO p FROM shop_manager.profiles WHERE id=(audit->>'profileId')::uuid FOR SHARE;
  IF NOT FOUND OR p.shop_id IS DISTINCT FROM s THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Quote unavailable.'; END IF;
  SELECT * INTO q FROM shop_manager.quotes WHERE id=qid FOR UPDATE;
  IF NOT FOUND OR q.customer_id IS DISTINCT FROM expected_customer THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Quote unavailable.'; END IF;
  SELECT * INTO c FROM shop_manager.customers WHERE id=q.customer_id FOR SHARE;
  IF NOT FOUND OR c.shop_id IS DISTINCT FROM s THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Quote unavailable.'; END IF;
  IF q.vehicle_id IS NOT NULL THEN
    SELECT * INTO v FROM shop_manager.vehicles WHERE id=q.vehicle_id FOR SHARE;
    IF NOT FOUND OR v.customer_id IS DISTINCT FROM c.id THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Quote unavailable.'; END IF;
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.id),'[]'::jsonb) INTO rows
    FROM (SELECT * FROM shop_manager.quote_items WHERE quote_id=qid ORDER BY id LIMIT 501) i;
  PERFORM shop_stock_operations_v1.authorize(a,s,true);
  RETURN jsonb_build_object('quote',to_jsonb(q),'items',rows,'shopId',s,
    'profileId',p.id,'profileUpdatedAt',p.updated_at::text,'audit',audit);
END $$;
CREATE FUNCTION quote_workflow_v1.issue(snapshot jsonb) RETURNS text
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
DECLARE q jsonb:=snapshot->'quote'; item jsonb; subtotal numeric:=0; quantity numeric; price numeric; line numeric; rate numeric; tax numeric; total numeric;
BEGIN
  IF jsonb_array_length(snapshot->'items')=0 THEN RETURN 'empty_quote'; END IF;
  IF jsonb_array_length(snapshot->'items')>500 THEN RETURN 'too_many_items'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(snapshot->'items') LOOP
    IF item->>'item_type' NOT IN ('service','labor','part') OR item->>'name' IS NULL OR length(btrim(item->>'name'))=0
      OR length(item->>'name')>500 OR length(COALESCE(item->>'description',''))>4000 THEN RETURN 'invalid_items'; END IF;
    quantity:=(item->>'quantity')::numeric; price:=(item->>'unit_price')::numeric; line:=(item->>'total_price')::numeric;
    IF quantity IS NULL OR price IS NULL OR line IS NULL OR quantity::text IN ('NaN','Infinity','-Infinity')
      OR price::text IN ('NaN','Infinity','-Infinity') OR line::text IN ('NaN','Infinity','-Infinity')
      OR quantity<=0 OR price<0 OR line<0 OR line<>round(quantity*price,2) THEN RETURN 'inconsistent_totals'; END IF;
    IF item->>'item_type'='part' AND (quantity<>trunc(quantity) OR quantity>2147483647) THEN RETURN 'fractional_part_quantity'; END IF;
    subtotal:=subtotal+line;
  END LOOP;
  rate:=(q->>'tax_rate')::numeric; tax:=(q->>'tax_amount')::numeric; total:=(q->>'total_amount')::numeric;
  IF rate IS NULL OR tax IS NULL OR total IS NULL OR rate::text IN ('NaN','Infinity','-Infinity')
    OR tax::text IN ('NaN','Infinity','-Infinity') OR total::text IN ('NaN','Infinity','-Infinity')
    OR rate<0 OR rate>1 OR tax<>round(subtotal*rate,2) OR total<>subtotal+tax
    OR (q->>'subtotal')::numeric IS DISTINCT FROM subtotal OR total>99999999.99 THEN RETURN 'inconsistent_totals'; END IF;
  RETURN NULL;
END $$;
CREATE FUNCTION quote_workflow_v1.read_quote(a uuid,qid uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='5s' AS $$
DECLARE snap jsonb; q jsonb; items jsonb; fault text; state text;
BEGIN
  snap:=quote_workflow_v1.snapshot(a,qid); q:=snap->'quote'; fault:=quote_workflow_v1.issue(snap);
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',i->>'id','name',i->>'name','kind',i->>'item_type',
    'quantity',i->>'quantity','unitPrice',i->>'unit_price','total',i->>'total_price') ORDER BY i->>'id'),'[]')
    INTO items FROM jsonb_array_elements(snap->'items') i;
  RETURN jsonb_build_object('version',1,'accountId',a,'shopId',snap->>'shopId','quoteId',qid,
    'profileId',snap->>'profileId','profileUpdatedAt',snap->>'profileUpdatedAt','updatedAt',q->>'updated_at',
    'fingerprint',encode(sha256(convert_to(snap::text,'UTF8')),'hex'),'quoteNumber',q->>'quote_number',
    'quoteStatus',q->>'status','subtotal',q->>'subtotal','tax',q->>'tax_amount','total',q->>'total_amount',
    'expiryDate',q->>'expiry_date','issue',fault,'items',items,'workOrderId',q->>'converted_to_work_order_id');
EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS state=RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE=state,MESSAGE='Quote unavailable.';
END $$;
CREATE FUNCTION quote_workflow_v1.execute(request jsonb,inspect boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='5s' AS $$
DECLARE a uuid; s uuid; qid uuid; op uuid; action text; saved quote_workflow_v1.outcomes;
  snap jsonb; q jsonb; item jsonb; fault text; result jsonb; wo shop_manager.work_orders;
  line_id uuid; job_ids uuid[]:='{}'; part_ids uuid[]:='{}'; audit shop_manager.employee_operational_events;
  proof jsonb; persisted jsonb; source_count integer; copied_count integer; state text; ack_count integer;
BEGIN
  IF request IS NULL OR jsonb_typeof(request)<>'object' OR inspect IS NULL OR pg_column_size(request)>12000
    OR request->'version' IS DISTINCT FROM '1'::jsonb
    OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(request) k) IS DISTINCT FROM
      ARRAY['action','expectedAccountId','expectedFingerprint','expectedProfileId','expectedProfileUpdatedAt','expectedUpdatedAt','operationId','quoteId','reason','shopId','version']::text[]
    OR EXISTS(SELECT 1 FROM jsonb_each(request) e WHERE e.key<>'version' AND jsonb_typeof(e.value)<>'string')
    OR request->>'action' NOT IN ('approve','convert') OR length(btrim(request->>'reason'))=0 OR length(request->>'reason')>2000
    OR request->>'expectedFingerprint' !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid quote request.';
  END IF;
  a:=(request->>'expectedAccountId')::uuid; s:=(request->>'shopId')::uuid; qid:=(request->>'quoteId')::uuid;
  op:=(request->>'operationId')::uuid; action:=request->>'action';
  PERFORM shop_stock_operations_v1.authorize(a,s,true);
  IF NOT inspect THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('365-quote-v1:'||a::text||':'||op::text,0));
    PERFORM shop_stock_operations_v1.authorize(a,s,true);
  END IF;
  SELECT * INTO saved FROM quote_workflow_v1.outcomes WHERE account_id=a AND operation_id=op;
  IF FOUND THEN
    IF saved.request IS DISTINCT FROM request THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Conflicting quote request.'; END IF;
    RETURN saved.result;
  END IF;
  IF inspect THEN RETURN jsonb_build_object('version',1,'status','not_observed','operationId',op,'accountId',a,'shopId',s,'quoteId',qid,'action',action); END IF;
  snap:=quote_workflow_v1.snapshot(a,qid); q:=snap->'quote';
  IF snap->>'shopId' IS DISTINCT FROM s::text THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Quote unavailable.'; END IF;
  IF snap->>'profileId' IS DISTINCT FROM request->>'expectedProfileId'
    OR snap->>'profileUpdatedAt' IS DISTINCT FROM request->>'expectedProfileUpdatedAt'
    OR q->>'updated_at' IS DISTINCT FROM request->>'expectedUpdatedAt'
    OR encode(sha256(convert_to(snap::text,'UTF8')),'hex') IS DISTINCT FROM request->>'expectedFingerprint' THEN fault:='stale_quote';
  ELSIF q->>'converted_to_work_order_id' IS NOT NULL OR q->>'status'='converted' THEN fault:='already_converted';
  ELSIF (action='approve' AND q->>'status' NOT IN ('draft','sent')) OR (action='convert' AND q->>'status'<>'approved') THEN fault:='wrong_status';
  ELSIF q->>'expiry_date' IS NOT NULL AND (NOT isfinite((q->>'expiry_date')::date) OR (q->>'expiry_date')::date<CURRENT_DATE) THEN fault:='expired_quote';
  ELSE fault:=quote_workflow_v1.issue(snap); END IF;
  IF fault IS NULL AND action='approve' THEN
    UPDATE shop_manager.quotes SET status='approved',approved_at=now(),updated_at=now() WHERE id=qid;
    GET DIAGNOSTICS ack_count=ROW_COUNT;
    SELECT to_jsonb(t) INTO persisted FROM shop_manager.quotes t WHERE id=qid;
    IF ack_count<>1 OR persisted IS DISTINCT FROM q||jsonb_build_object('status','approved','approved_at',now(),'updated_at',now()) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Quote approval unconfirmed.';
    END IF;
  ELSIF fault IS NULL THEN
    INSERT INTO shop_manager.work_orders(shop_id,customer_id,vehicle_id,status,description,created_by,total_cost,authorization_limit)
      VALUES(s,(q->>'customer_id')::uuid,(q->>'vehicle_id')::uuid,'pending',q->>'notes',a,(q->>'subtotal')::numeric,(q->>'total_amount')::numeric)
      RETURNING * INTO wo;
    IF wo.id IS NULL OR wo.shop_id IS DISTINCT FROM s OR wo.customer_id::text IS DISTINCT FROM q->>'customer_id'
      OR wo.vehicle_id::text IS DISTINCT FROM q->>'vehicle_id' OR wo.created_by IS DISTINCT FROM a OR wo.status<>'pending'
      OR wo.description IS DISTINCT FROM q->>'notes'
      OR wo.total_cost IS DISTINCT FROM (q->>'subtotal')::numeric OR wo.authorization_limit IS DISTINCT FROM (q->>'total_amount')::numeric THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Work order unconfirmed.';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(snap->'items') LOOP
      line_id:=gen_random_uuid();
      IF item->>'item_type'='part' THEN
        INSERT INTO shop_manager.work_order_parts(id,work_order_id,part_name,quantity,customer_price,retail_price,part_type,category,is_stock_item,notes)
          VALUES(line_id,wo.id,item->>'name',(item->>'quantity')::numeric::integer,(item->>'unit_price')::numeric,(item->>'unit_price')::numeric,
            'non-inventory',item->>'category',false,item->>'description');
        part_ids:=array_append(part_ids,line_id);
        SELECT to_jsonb(t) INTO persisted FROM shop_manager.work_order_parts t WHERE id=line_id;
        IF persisted IS NULL OR persisted->>'work_order_id' IS DISTINCT FROM wo.id::text OR persisted->>'part_name' IS DISTINCT FROM item->>'name'
          OR (persisted->>'quantity')::numeric IS DISTINCT FROM (item->>'quantity')::numeric
          OR (persisted->>'customer_price')::numeric IS DISTINCT FROM (item->>'unit_price')::numeric
          OR persisted->>'notes' IS DISTINCT FROM item->>'description' OR persisted->>'category' IS DISTINCT FROM item->>'category'
          OR (persisted->>'retail_price')::numeric IS DISTINCT FROM (item->>'unit_price')::numeric
          OR persisted->>'part_type' IS DISTINCT FROM 'non-inventory' OR persisted->>'inventory_item_id' IS NOT NULL
          OR persisted->'is_stock_item' IS DISTINCT FROM 'false'::jsonb THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Part copy unconfirmed.'; END IF;
      ELSE
        INSERT INTO shop_manager.work_order_job_lines(id,work_order_id,name,description,category,estimated_hours,labor_rate,total_amount,display_order)
          VALUES(line_id,wo.id,item->>'name',item->>'description',item->>'category',(item->>'quantity')::numeric,
            (item->>'unit_price')::numeric,(item->>'total_price')::numeric,(item->>'display_order')::integer);
        job_ids:=array_append(job_ids,line_id);
        SELECT to_jsonb(t) INTO persisted FROM shop_manager.work_order_job_lines t WHERE id=line_id;
        IF persisted IS NULL OR persisted->>'work_order_id' IS DISTINCT FROM wo.id::text OR persisted->>'name' IS DISTINCT FROM item->>'name'
          OR persisted->>'description' IS DISTINCT FROM item->>'description' OR persisted->>'category' IS DISTINCT FROM item->>'category'
          OR (persisted->>'display_order')::integer IS DISTINCT FROM (item->>'display_order')::integer
          OR persisted->>'status' IS DISTINCT FROM 'pending'
          OR (persisted->>'estimated_hours')::numeric IS DISTINCT FROM (item->>'quantity')::numeric
          OR (persisted->>'labor_rate')::numeric IS DISTINCT FROM (item->>'unit_price')::numeric
          OR (persisted->>'total_amount')::numeric IS DISTINCT FROM (item->>'total_price')::numeric THEN
          RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Job copy unconfirmed.'; END IF;
      END IF;
    END LOOP;
    source_count:=jsonb_array_length(snap->'items');
    SELECT (SELECT count(*) FROM shop_manager.work_order_job_lines WHERE work_order_id=wo.id)+(SELECT count(*) FROM shop_manager.work_order_parts WHERE work_order_id=wo.id) INTO copied_count;
    IF copied_count<>source_count THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Quote lines unconfirmed.'; END IF;
    SELECT count(*) INTO copied_count FROM shop_manager.employee_operational_events e
      WHERE e.entity_type='work_orders' AND e.entity_id=wo.id::text AND e.action='insert_work_orders';
    SELECT * INTO audit FROM shop_manager.employee_operational_events e
      WHERE e.entity_type='work_orders' AND e.entity_id=wo.id::text AND e.action='insert_work_orders';
    IF copied_count<>1 OR audit.shop_id IS DISTINCT FROM s OR audit.profile_id::text IS DISTINCT FROM snap->>'profileId'
      OR audit.actor_user_id IS DISTINCT FROM a OR audit.shift_id::text IS DISTINCT FROM snap->'audit'->>'shiftId'
      OR audit.customer_id::text IS DISTINCT FROM q->>'customer_id' THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Work-order audit unconfirmed.'; END IF;
    UPDATE shop_manager.quotes SET status='converted',converted_at=now(),converted_to_work_order_id=wo.id,updated_at=now() WHERE id=qid;
    GET DIAGNOSTICS ack_count=ROW_COUNT;
    SELECT to_jsonb(t) INTO persisted FROM shop_manager.quotes t WHERE id=qid;
    IF ack_count<>1 OR persisted IS DISTINCT FROM q||jsonb_build_object('status','converted','converted_at',now(),'converted_to_work_order_id',wo.id,'updated_at',now()) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Quote conversion unconfirmed.';
    END IF;
    SELECT jsonb_build_object('workOrder',to_jsonb(t),'jobIds',job_ids,'partIds',part_ids) INTO proof FROM shop_manager.work_orders t WHERE id=wo.id;
    IF proof->'workOrder' IS DISTINCT FROM to_jsonb(wo) THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Work order changed.'; END IF;
    INSERT INTO quote_workflow_v1.conversions(quote_id,work_order_id,shop_id,account_id,source_snapshot,destination_snapshot,audit_id)
      VALUES(qid,wo.id,s,a,snap,proof,audit.id);
    GET DIAGNOSTICS ack_count=ROW_COUNT;
    SELECT to_jsonb(t) INTO persisted FROM quote_workflow_v1.conversions t WHERE t.quote_id=qid;
    IF ack_count<>1 OR persisted->>'work_order_id' IS DISTINCT FROM wo.id::text
      OR persisted->>'shop_id' IS DISTINCT FROM s::text OR persisted->>'account_id' IS DISTINCT FROM a::text
      OR persisted->'source_snapshot' IS DISTINCT FROM snap OR persisted->'destination_snapshot' IS DISTINCT FROM proof
      OR (persisted->>'audit_id')::bigint IS DISTINCT FROM audit.id THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Quote link unconfirmed.'; END IF;
  END IF;
  PERFORM shop_stock_operations_v1.authorize(a,s,true);
  result:=jsonb_build_object('version',1,'status',CASE WHEN fault IS NULL THEN 'completed' ELSE 'rejected' END,
    'operationId',op,'accountId',a,'shopId',s,'quoteId',qid,'action',action,'reason',fault,
    'workOrderId',wo.id,'quoteStatus',CASE WHEN fault IS NOT NULL THEN q->>'status' WHEN action='approve' THEN 'approved' ELSE 'converted' END);
  INSERT INTO quote_workflow_v1.outcomes(account_id,operation_id,shop_id,quote_id,request,result) VALUES(a,op,s,qid,request,result);
  GET DIAGNOSTICS ack_count=ROW_COUNT;
  SELECT * INTO saved FROM quote_workflow_v1.outcomes WHERE account_id=a AND operation_id=op;
  IF ack_count<>1 OR NOT FOUND OR saved.request IS DISTINCT FROM request OR saved.result IS DISTINCT FROM result
    OR saved.shop_id IS DISTINCT FROM s OR saved.quote_id IS DISTINCT FROM qid THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Quote outcome unconfirmed.';
  END IF;
  RETURN result;
EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS state=RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE=state,MESSAGE='Quote operation unavailable. Preserve the request and check its result.';
END $$;
CREATE FUNCTION public.quote_workflow_read_v1(_account uuid,_quote uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$ SELECT quote_workflow_v1.read_quote(_account,_quote) $$;
CREATE FUNCTION public.quote_workflow_change_v1(_request jsonb,_inspect boolean DEFAULT false) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$ SELECT quote_workflow_v1.execute(_request,_inspect) $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA quote_workflow_v1 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.quote_workflow_read_v1(uuid,uuid),public.quote_workflow_change_v1(jsonb,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA quote_workflow_v1 TO authenticated;
GRANT EXECUTE ON FUNCTION quote_workflow_v1.read_quote(uuid,uuid),quote_workflow_v1.execute(jsonb,boolean),
  public.quote_workflow_read_v1(uuid,uuid),public.quote_workflow_change_v1(jsonb,boolean) TO authenticated;
-- Retire the broken, unauthenticated legacy helper; never use it as a fallback.
DO $$ BEGIN
  IF to_regprocedure('shop_manager.convert_quote_to_work_order(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION shop_manager.convert_quote_to_work_order(uuid) FROM PUBLIC,anon,authenticated,service_role;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_namespace n,
    LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) x
    WHERE n.nspname='quote_workflow_v1' AND x.grantee<>n.nspowner
      AND NOT(x.grantee='authenticated'::regrole AND x.privilege_type='USAGE' AND NOT x.is_grantable))
    OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,
    LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) x
    WHERE n.nspname='quote_workflow_v1' AND x.grantee<>c.relowner)
    OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,
      LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) x
      WHERE (n.nspname='quote_workflow_v1' OR p.oid IN ('public.quote_workflow_read_v1(uuid,uuid)'::regprocedure,'public.quote_workflow_change_v1(jsonb,boolean)'::regprocedure))
      AND x.grantee<>p.proowner AND NOT(x.grantee='authenticated'::regrole AND x.privilege_type='EXECUTE' AND NOT x.is_grantable
        AND p.proname IN ('read_quote','execute','quote_workflow_read_v1','quote_workflow_change_v1'))) THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Unexpected quote workflow grants.';
  END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
