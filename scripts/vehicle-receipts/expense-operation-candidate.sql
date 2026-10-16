-- UNAPPLIED mechanical laboratory candidate, NOT a migration/RPC/app connection.
-- Cash/AP/tax-zero/positive-cents are modeled, not approved financial policy.
-- Schema ownership and auth.uid are NOT original-human/fresh native authority.
-- The retained shop/module/manager helpers are synthetic in the memory fixture.
-- No client/service execute or ledger DML is granted. FORCE RLS may deny a
-- nonsuperuser schema owner; do not add grants/bypass to make this an app API.
-- DBA/owner DDL, direct owner INSERT, superusers and role membership are not a
-- tamper-proof/durable external trust boundary. Independent-session races,
-- current catalog/baseline, protected writers and recovery remain unaccepted.
-- Financial row locks do not prevent phantom account-code/line inserts: native
-- chart_of_accounts lacks UNIQUE(shop_id,code), and legacy writers do not share
-- this protocol. No independent-session/global-writer consistency is accepted.
BEGIN;
SET LOCAL search_path = pg_catalog, pg_temp;
CREATE SCHEMA receipt_expense_candidate;
REVOKE ALL ON SCHEMA receipt_expense_candidate FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE receipt_expense_candidate.outcomes (
  account_id uuid NOT NULL REFERENCES auth.users(id),
  operation_id uuid NOT NULL,
  receipt_id uuid NOT NULL UNIQUE REFERENCES public.vehicle_receipts(id),
  expense_id uuid NOT NULL REFERENCES shop_manager.expenses(id),
  journal_entry_id uuid NOT NULL REFERENCES shop_manager.journal_entries(id),
  payload jsonb NOT NULL,
  binding text NOT NULL,
  acknowledgment jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY(account_id, operation_id)
);
ALTER TABLE receipt_expense_candidate.outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_expense_candidate.outcomes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE receipt_expense_candidate.outcomes FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION receipt_expense_candidate.deny_outcome_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Expense outcome mutation is unavailable.';
END $$;
CREATE TRIGGER outcome_no_update_delete BEFORE UPDATE OR DELETE ON receipt_expense_candidate.outcomes
FOR EACH ROW EXECUTE FUNCTION receipt_expense_candidate.deny_outcome_mutation();
CREATE TRIGGER outcome_no_truncate BEFORE TRUNCATE ON receipt_expense_candidate.outcomes
FOR EACH STATEMENT EXECUTE FUNCTION receipt_expense_candidate.deny_outcome_mutation();

CREATE FUNCTION receipt_expense_candidate.validate_intent(p_intent jsonb, p_binding text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_key text;
  v_expected text[] := ARRAY['version','kind','operationId','expectedAccountId','expectedShopId',
    'expectedShopVehicleId','receiptId','amount','taxAmount','currency','expenseDate','vendor','paymentIntent'];
  v_payload text;
  v_binding text;
  v_date date;
  v_state text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_roles r ON r.oid=n.nspowner
    WHERE n.nspname='receipt_expense_candidate' AND r.rolname=current_user) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Expense operation failed.';
  END IF;
  IF p_intent IS NULL OR pg_catalog.jsonb_typeof(p_intent)<>'object'
    OR pg_catalog.length(p_intent::text)>8192 OR p_binding IS NULL OR pg_catalog.length(p_binding)>8192 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Expense operation failed.';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_intent))<>13
    OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(p_intent) k WHERE NOT(k=ANY(v_expected)))
    OR p_intent->'version' IS DISTINCT FROM '1'::jsonb OR p_intent->>'kind' IS DISTINCT FROM 'create' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Expense operation failed.';
  END IF;
  FOREACH v_key IN ARRAY v_expected LOOP
    IF v_key='version' THEN CONTINUE; END IF;
    IF v_key='vendor' AND p_intent->'vendor'='null'::jsonb THEN CONTINUE; END IF;
    IF pg_catalog.jsonb_typeof(p_intent->v_key) IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Expense operation failed.';
    END IF;
  END LOOP;
  FOREACH v_key IN ARRAY ARRAY['operationId','expectedAccountId','expectedShopId','expectedShopVehicleId','receiptId'] LOOP
    IF (p_intent->>v_key)!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Expense operation failed.';
    END IF;
  END LOOP;
  IF p_intent->>'amount'!~'^(0|[1-9][0-9]{0,7})[.][0-9]{2}$'
    OR (p_intent->>'amount')::numeric<=0 OR (p_intent->>'amount')::numeric>99999999
    OR p_intent->>'taxAmount' IS DISTINCT FROM '0.00' OR p_intent->>'currency' IS DISTINCT FROM 'PHP'
    OR p_intent->>'paymentIntent' NOT IN('cash','accounts_payable')
    OR (p_intent->'vendor'<>'null'::jsonb AND pg_catalog.length(p_intent->>'vendor')>200)
    OR p_intent->>'expenseDate'!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Expense operation failed.';
  END IF;
  BEGIN
    v_date := (p_intent->>'expenseDate')::date;
    IF NOT pg_catalog.isfinite(v_date) OR v_date<DATE '0001-01-01' OR v_date>DATE '9999-12-31'
      OR pg_catalog.to_char(v_date,'YYYY-MM-DD')<>p_intent->>'expenseDate' THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Expense operation failed.';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Expense operation failed.';
  END;
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM (p_intent->>'expectedAccountId')::uuid THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Expense operation failed.';
  END IF;
  -- Same fixed-key construction as bindExpenseOperationRequest. Scalar to_json
  -- handles escaping; JSONB textual key order/spacing is NEVER a binding source.
  v_payload := '{"version":1,"kind":"create"';
  FOREACH v_key IN ARRAY v_expected[3:13] LOOP
    v_payload := v_payload || ',' || pg_catalog.to_json(v_key)::text || ':' ||
      CASE WHEN p_intent->v_key='null'::jsonb THEN 'null' ELSE pg_catalog.to_json(p_intent->>v_key)::text END;
  END LOOP;
  v_payload := v_payload || '}';
  v_binding := '{"key":{"accountId":' || pg_catalog.to_json(p_intent->>'expectedAccountId')::text ||
    ',"operationId":' || pg_catalog.to_json(p_intent->>'operationId')::text || '},"payload":' || v_payload || '}';
  IF p_binding IS DISTINCT FROM v_binding THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Expense operation failed.';
  END IF;
  RETURN p_intent;
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_state=RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE=v_state, MESSAGE='Expense operation failed.';
END $$;

CREATE FUNCTION receipt_expense_candidate.verify_outcome(
  p_intent jsonb, p_binding text, p_expense uuid, p_journal uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_intent jsonb;
  v_receipt public.vehicle_receipts;
  v_expense shop_manager.expenses;
  v_journal shop_manager.journal_entries;
  v_shop uuid;
  v_vehicle uuid;
  v_account uuid;
  v_amount numeric;
  v_date date;
  v_description text;
  v_ap boolean;
  v_lines jsonb;
  v_state text;
BEGIN
  v_intent := receipt_expense_candidate.validate_intent(p_intent,p_binding);
  -- After receipt/customer/vehicle in create_operation, financial order is
  -- expense -> journal -> existing lines by UUID -> referenced accounts by UUID.
  -- New posting also locks any referenced preexisting accounts here. Re-read ALL
  -- financial/source values below after waits; no cached pre-wait row is trusted.
  PERFORM e.id FROM shop_manager.expenses e WHERE e.id=p_expense FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Expense operation failed.'; END IF;
  PERFORM j.id FROM shop_manager.journal_entries j WHERE j.source_type='expense' AND j.source_id=p_expense ORDER BY j.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Expense operation failed.'; END IF;
  PERFORM l.id FROM shop_manager.journal_entry_lines l WHERE l.journal_entry_id IN(
    SELECT j.id FROM shop_manager.journal_entries j WHERE j.source_type='expense' AND j.source_id=p_expense)
    ORDER BY l.id FOR UPDATE;
  PERFORM a.id FROM shop_manager.chart_of_accounts a WHERE a.id IN(
    SELECT l.account_id FROM shop_manager.journal_entry_lines l JOIN shop_manager.journal_entries j ON j.id=l.journal_entry_id
    WHERE j.source_type='expense' AND j.source_id=p_expense) ORDER BY a.id FOR UPDATE;
  v_intent := receipt_expense_candidate.validate_intent(p_intent,p_binding);
  v_shop := (v_intent->>'expectedShopId')::uuid;
  v_vehicle := (v_intent->>'expectedShopVehicleId')::uuid;
  v_account := (v_intent->>'expectedAccountId')::uuid;
  v_amount := (v_intent->>'amount')::numeric;
  v_date := (v_intent->>'expenseDate')::date;
  v_description := COALESCE(v_intent->>'vendor','Vehicle parts receipt');
  v_ap := v_intent->>'paymentIntent'='accounts_payable';
  SELECT r.* INTO v_receipt FROM public.vehicle_receipts r WHERE r.id=(v_intent->>'receiptId')::uuid;
  IF NOT FOUND OR v_receipt.shop_vehicle_id IS DISTINCT FROM v_vehicle OR v_receipt.status<>'confirmed'
    OR v_receipt.currency<>'PHP' OR v_receipt.total IS DISTINCT FROM v_amount
    OR v_receipt.purchased_on IS DISTINCT FROM v_date OR v_receipt.vendor IS DISTINCT FROM v_intent->>'vendor' THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Expense operation failed.';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM shop_manager.vehicles v JOIN shop_manager.customers c ON c.id=v.customer_id
      WHERE v.id=v_vehicle AND c.shop_id=v_shop)
    OR vehicle_receipts_private.shop_access(v_vehicle,true) IS DISTINCT FROM TRUE
    OR shop_manager.is_shop_operations_manager(v_account,v_shop) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Expense operation failed.';
  END IF;
  SELECT e.* INTO v_expense FROM shop_manager.expenses e WHERE e.id=p_expense;
  IF NOT FOUND OR v_expense.shop_id IS DISTINCT FROM v_shop OR v_expense.vehicle_id IS DISTINCT FROM v_vehicle
    OR v_expense.vehicle_receipt_id IS DISTINCT FROM v_receipt.id OR v_expense.amount IS DISTINCT FROM v_amount
    OR v_expense.tax_amount IS DISTINCT FROM 0::numeric OR v_expense.expense_date IS DISTINCT FROM v_date
    OR v_expense.description IS DISTINCT FROM v_description OR v_expense.created_by IS DISTINCT FROM v_account
    OR v_expense.status IS DISTINCT FROM (CASE WHEN v_ap THEN 'unpaid' ELSE 'recorded' END)
    OR v_expense.category_id IS NOT NULL OR v_expense.vendor_id IS NOT NULL OR v_expense.payment_method IS NOT NULL
    OR v_expense.reference_number IS NOT NULL OR v_expense.notes IS NOT NULL OR v_expense.receipt_url IS NOT NULL
    OR (SELECT pg_catalog.count(*) FROM shop_manager.expenses e WHERE e.vehicle_receipt_id=v_receipt.id)<>1 THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Expense operation failed.';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM shop_manager.journal_entries j WHERE j.source_type='expense' AND j.source_id=p_expense)<>1 THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Expense operation failed.';
  END IF;
  SELECT j.* INTO v_journal FROM shop_manager.journal_entries j WHERE j.source_type='expense' AND j.source_id=p_expense;
  IF (p_journal IS NOT NULL AND v_journal.id IS DISTINCT FROM p_journal)
    OR v_journal.shop_id IS DISTINCT FROM v_shop OR v_journal.entry_date IS DISTINCT FROM v_date
    OR v_journal.reference IS DISTINCT FROM 'EXP-'||pg_catalog.substr(p_expense::text,1,8)
    OR v_journal.memo IS DISTINCT FROM v_description OR v_journal.status<>'posted' OR v_journal.created_by IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Expense operation failed.';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM shop_manager.journal_entry_lines l WHERE l.journal_entry_id=v_journal.id)<>2
    -- Existing duplicate account codes are an unsupported cohort. Never adopt
    -- the arbitrary LIMIT1 choice or rewrite/delete those native accounts.
    OR (SELECT pg_catalog.count(*) FROM shop_manager.chart_of_accounts a WHERE a.shop_id=v_shop AND a.code='6000')<>1
    OR (SELECT pg_catalog.count(*) FROM shop_manager.chart_of_accounts a WHERE a.shop_id=v_shop AND a.code=(CASE WHEN v_ap THEN '2000' ELSE '1000' END))<>1
    OR (SELECT pg_catalog.sum(l.debit) FROM shop_manager.journal_entry_lines l WHERE l.journal_entry_id=v_journal.id) IS DISTINCT FROM v_amount
    OR (SELECT pg_catalog.sum(l.credit) FROM shop_manager.journal_entry_lines l WHERE l.journal_entry_id=v_journal.id) IS DISTINCT FROM v_amount
    OR (SELECT pg_catalog.count(DISTINCT l.account_id) FROM shop_manager.journal_entry_lines l WHERE l.journal_entry_id=v_journal.id)<>2
    OR EXISTS(SELECT 1 FROM shop_manager.journal_entry_lines l LEFT JOIN shop_manager.chart_of_accounts a ON a.id=l.account_id
      WHERE l.journal_entry_id=v_journal.id AND (
        l.line_order NOT IN(0,1) OR a.id IS NULL OR a.shop_id IS DISTINCT FROM v_shop
        OR l.account_code IS DISTINCT FROM (CASE WHEN l.line_order=0 THEN '6000' WHEN v_ap THEN '2000' ELSE '1000' END)
        OR a.code IS DISTINCT FROM l.account_code
        OR a.name IS DISTINCT FROM (CASE WHEN l.line_order=0 THEN 'Operating Expenses' WHEN v_ap THEN 'Accounts Payable' ELSE 'Cash' END)
        OR a.account_type IS DISTINCT FROM (CASE WHEN l.line_order=0 THEN 'expense' WHEN v_ap THEN 'liability' ELSE 'asset' END)
        OR l.debit IS DISTINCT FROM (CASE WHEN l.line_order=0 THEN v_amount ELSE 0::numeric END)
        OR l.credit IS DISTINCT FROM (CASE WHEN l.line_order=0 THEN 0::numeric ELSE v_amount END)
        OR l.description IS DISTINCT FROM (CASE WHEN l.line_order=0 THEN v_description ELSE 'Cash out' END)))
    OR (SELECT pg_catalog.count(DISTINCT l.line_order) FROM shop_manager.journal_entry_lines l WHERE l.journal_entry_id=v_journal.id)<>2 THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Expense operation failed.';
  END IF;
  SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id',l.id,'accountId',a.id,'accountShopId',a.shop_id,'accountCode',l.account_code,'accountName',a.name,
    'accountType',a.account_type,'debit',l.debit::text,'credit',l.credit::text,'lineOrder',l.line_order,'description',l.description
  ) ORDER BY l.line_order,l.id) INTO v_lines
  FROM shop_manager.journal_entry_lines l JOIN shop_manager.chart_of_accounts a ON a.id=l.account_id WHERE l.journal_entry_id=v_journal.id;
  RETURN pg_catalog.jsonb_build_object('requestBinding',p_binding,'operationId',v_intent->>'operationId',
    'accountId',v_account,'shopId',v_shop,'shopVehicleId',v_vehicle,'receiptId',v_receipt.id,
    'expense',pg_catalog.jsonb_build_object('id',v_expense.id,'shopId',v_expense.shop_id,'shopVehicleId',v_expense.vehicle_id,
      'receiptId',v_expense.vehicle_receipt_id,'amount',v_expense.amount::text,'taxAmount',v_expense.tax_amount::text,
      'expenseDate',pg_catalog.to_char(v_expense.expense_date,'YYYY-MM-DD'),'createdBy',v_expense.created_by,
      'description',v_expense.description,'status',v_expense.status,'paymentMethod',v_expense.payment_method),
    'journal',pg_catalog.jsonb_build_object('id',v_journal.id,'shopId',v_journal.shop_id,
      'entryDate',pg_catalog.to_char(v_journal.entry_date,'YYYY-MM-DD'),'reference',v_journal.reference,'memo',v_journal.memo,
      'status',v_journal.status,'createdBy',v_journal.created_by,'sourceType',v_journal.source_type,'sourceId',v_journal.source_id,
      'postingState','verified','lines',v_lines));
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_state=RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE=v_state, MESSAGE='Expense operation failed.';
END $$;

CREATE FUNCTION receipt_expense_candidate.create_operation(p_intent jsonb, p_binding text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_intent jsonb;
  v_before receipt_expense_candidate.outcomes;
  v_saved receipt_expense_candidate.outcomes;
  v_had_before boolean;
  v_receipt public.vehicle_receipts;
  v_customer uuid;
  v_locked_customer uuid;
  v_locked_shop uuid;
  v_vehicle_customer uuid;
  v_expense uuid;
  v_inserted uuid;
  v_ack jsonb;
  v_stored receipt_expense_candidate.outcomes;
  v_state text;
BEGIN
  v_intent := receipt_expense_candidate.validate_intent(p_intent,p_binding);
  SELECT o.* INTO v_before FROM receipt_expense_candidate.outcomes o
    WHERE o.account_id=(v_intent->>'expectedAccountId')::uuid AND o.operation_id=(v_intent->>'operationId')::uuid;
  v_had_before := FOUND;
  IF v_had_before AND (v_before.payload IS DISTINCT FROM v_intent OR v_before.binding IS DISTINCT FROM p_binding) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Expense operation failed.';
  END IF;
  -- Consistent candidate lock order: receipt -> customer -> vehicle. Other
  -- existing writers do NOT yet share this protocol; no global deadlock claim.
  SELECT r.* INTO v_receipt FROM public.vehicle_receipts r WHERE r.id=(v_intent->>'receiptId')::uuid FOR UPDATE;
  IF NOT FOUND OR v_receipt.shop_vehicle_id IS DISTINCT FROM (v_intent->>'expectedShopVehicleId')::uuid THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Expense operation failed.';
  END IF;
  SELECT o.* INTO v_saved FROM receipt_expense_candidate.outcomes o
    WHERE o.account_id=(v_intent->>'expectedAccountId')::uuid AND o.operation_id=(v_intent->>'operationId')::uuid;
  IF (v_had_before AND NOT FOUND) OR (FOUND AND (v_saved.payload IS DISTINCT FROM v_intent OR v_saved.binding IS DISTINCT FROM p_binding)) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Expense operation failed.';
  END IF;
  SELECT v.customer_id INTO v_customer FROM shop_manager.vehicles v WHERE v.id=(v_intent->>'expectedShopVehicleId')::uuid;
  SELECT c.id,c.shop_id INTO v_locked_customer,v_locked_shop FROM shop_manager.customers c WHERE c.id=v_customer FOR UPDATE;
  IF NOT FOUND OR v_locked_shop IS DISTINCT FROM (v_intent->>'expectedShopId')::uuid THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Expense operation failed.';
  END IF;
  SELECT v.customer_id INTO v_vehicle_customer FROM shop_manager.vehicles v WHERE v.id=(v_intent->>'expectedShopVehicleId')::uuid FOR UPDATE;
  IF NOT FOUND OR v_vehicle_customer IS DISTINCT FROM v_locked_customer
    OR NOT EXISTS(SELECT 1 FROM shop_manager.customers c WHERE c.id=v_locked_customer AND c.shop_id=(v_intent->>'expectedShopId')::uuid)
    OR auth.uid() IS DISTINCT FROM (v_intent->>'expectedAccountId')::uuid
    OR vehicle_receipts_private.shop_access((v_intent->>'expectedShopVehicleId')::uuid,true) IS DISTINCT FROM TRUE
    OR shop_manager.is_shop_operations_manager((v_intent->>'expectedAccountId')::uuid,(v_intent->>'expectedShopId')::uuid) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Expense operation failed.';
  END IF;
  IF v_receipt.status<>'confirmed' OR v_receipt.currency<>'PHP'
    OR v_receipt.total IS DISTINCT FROM (v_intent->>'amount')::numeric
    OR v_receipt.purchased_on IS DISTINCT FROM (v_intent->>'expenseDate')::date
    OR v_receipt.vendor IS DISTINCT FROM v_intent->>'vendor' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Expense operation failed.';
  END IF;
  -- Recheck operation after ALL waits, not only the initial optimistic lookup.
  SELECT o.* INTO v_saved FROM receipt_expense_candidate.outcomes o
    WHERE o.account_id=(v_intent->>'expectedAccountId')::uuid AND o.operation_id=(v_intent->>'operationId')::uuid;
  IF FOUND THEN
    IF v_saved.payload IS DISTINCT FROM v_intent OR v_saved.binding IS DISTINCT FROM p_binding
      OR v_saved.receipt_id IS DISTINCT FROM v_receipt.id THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Expense operation failed.';
    END IF;
    v_ack := receipt_expense_candidate.verify_outcome(v_intent,p_binding,v_saved.expense_id,v_saved.journal_entry_id);
    IF v_ack IS DISTINCT FROM v_saved.acknowledgment THEN
      RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Expense operation failed.';
    END IF;
    RETURN v_saved.acknowledgment; -- No UPDATE, timestamp touch or second posting.
  END IF;
  IF v_had_before OR EXISTS(SELECT 1 FROM receipt_expense_candidate.outcomes o WHERE o.receipt_id=v_receipt.id)
    OR EXISTS(SELECT 1 FROM shop_manager.expenses e WHERE e.vehicle_receipt_id=v_receipt.id) THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Expense operation failed.';
  END IF;
  v_expense := pg_catalog.gen_random_uuid();
  INSERT INTO shop_manager.expenses(id,shop_id,vehicle_id,vehicle_receipt_id,amount,tax_amount,expense_date,description,created_by,status)
  VALUES(v_expense,(v_intent->>'expectedShopId')::uuid,(v_intent->>'expectedShopVehicleId')::uuid,v_receipt.id,
    (v_intent->>'amount')::numeric,0,(v_intent->>'expenseDate')::date,COALESCE(v_intent->>'vendor','Vehicle parts receipt'),
    (v_intent->>'expectedAccountId')::uuid,CASE WHEN v_intent->>'paymentIntent'='accounts_payable' THEN 'unpaid' ELSE 'recorded' END)
  RETURNING id INTO v_inserted;
  IF v_inserted IS DISTINCT FROM v_expense THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Expense operation failed.';
  END IF;
  -- The retained AFTER INSERT chain posts exactly once. Never invoke legacy
  -- record_expense or sm_post_journal separately after inserting the expense.
  v_ack := receipt_expense_candidate.verify_outcome(v_intent,p_binding,v_expense,NULL);
  INSERT INTO receipt_expense_candidate.outcomes(account_id,operation_id,receipt_id,expense_id,journal_entry_id,payload,binding,acknowledgment)
  VALUES((v_intent->>'expectedAccountId')::uuid,(v_intent->>'operationId')::uuid,v_receipt.id,v_expense,
    (v_ack->'journal'->>'id')::uuid,v_intent,p_binding,v_ack) RETURNING * INTO v_stored;
  IF v_stored.account_id IS DISTINCT FROM (v_intent->>'expectedAccountId')::uuid
    OR v_stored.operation_id IS DISTINCT FROM (v_intent->>'operationId')::uuid OR v_stored.receipt_id IS DISTINCT FROM v_receipt.id
    OR v_stored.expense_id IS DISTINCT FROM v_expense OR v_stored.journal_entry_id IS DISTINCT FROM (v_ack->'journal'->>'id')::uuid
    OR v_stored.payload IS DISTINCT FROM v_intent OR v_stored.binding IS DISTINCT FROM p_binding
    OR v_stored.acknowledgment IS DISTINCT FROM v_ack THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Expense operation failed.';
  END IF;
  -- Ledger triggers are also untrusted side effects; final native and ledger
  -- rereads must match before this statement can return an acknowledgment.
  IF receipt_expense_candidate.verify_outcome(v_intent,p_binding,v_expense,(v_ack->'journal'->>'id')::uuid) IS DISTINCT FROM v_ack
    OR NOT EXISTS(SELECT 1 FROM shop_manager.vehicles v JOIN shop_manager.customers c ON c.id=v.customer_id
      WHERE v.id=(v_intent->>'expectedShopVehicleId')::uuid AND v.customer_id=v_locked_customer
      AND c.shop_id=(v_intent->>'expectedShopId')::uuid)
    OR (SELECT pg_catalog.count(*) FROM receipt_expense_candidate.outcomes o WHERE o.receipt_id=v_receipt.id)<>1
    OR NOT EXISTS(SELECT 1 FROM receipt_expense_candidate.outcomes o WHERE o.account_id=v_stored.account_id
      AND o.operation_id=v_stored.operation_id AND o.payload=v_intent AND o.binding=p_binding AND o.acknowledgment=v_ack
      AND o.receipt_id=v_receipt.id AND o.expense_id=v_expense AND o.journal_entry_id=v_stored.journal_entry_id) THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Expense operation failed.';
  END IF;
  RETURN v_ack; -- SQL statement outcome, not an external COMMIT/HTTP promise.
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_state=RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE=v_state, MESSAGE='Expense operation failed.';
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA receipt_expense_candidate FROM PUBLIC, anon, authenticated, service_role;
-- Fail publication rather than silently retaining unexpected default grantees.
-- Direct owner-only ACL does not block superuser/inherited owner capabilities.
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n,
      LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a
      WHERE n.nspname='receipt_expense_candidate' AND a.grantee<>n.nspowner)
    OR EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
      LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
      WHERE n.nspname='receipt_expense_candidate' AND a.grantee<>c.relowner)
    OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
      LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      WHERE n.nspname='receipt_expense_candidate' AND a.grantee<>p.proowner) THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Expense candidate publication failed.';
  END IF;
END $$;
COMMIT;
