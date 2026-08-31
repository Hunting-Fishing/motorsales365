-- Nextpart-style employee operating layer for Shop Manager.
-- Additive: existing work orders, inventory, customers, invoices, payments,
-- purchase orders, discounts, and reports remain the systems of record.

CREATE TABLE IF NOT EXISTS shop_manager.employee_work_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shop_manager.shops(id) ON DELETE RESTRICT,
  name text NOT NULL,
  location_type text NOT NULL DEFAULT 'store'
    CHECK (location_type IN ('store','parts_counter','service_desk','warehouse','office','mobile','other')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id,name)
);
CREATE INDEX IF NOT EXISTS employee_work_locations_shop_idx
  ON shop_manager.employee_work_locations(shop_id,active,name);
INSERT INTO shop_manager.employee_work_locations(shop_id,name,location_type)
SELECT s.id,COALESCE(NULLIF(trim(s.name),''),'Main location'),'store'
FROM shop_manager.shops s
ON CONFLICT (shop_id,name) DO NOTHING;

CREATE OR REPLACE FUNCTION shop_manager.create_default_employee_work_location()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
BEGIN
  INSERT INTO shop_manager.employee_work_locations(shop_id,name,location_type)
  VALUES(NEW.id,COALESCE(NULLIF(trim(NEW.name),''),'Main location'),'store')
  ON CONFLICT (shop_id,name) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS shops_create_employee_work_location ON shop_manager.shops;
CREATE TRIGGER shops_create_employee_work_location
  AFTER INSERT ON shop_manager.shops FOR EACH ROW
  EXECUTE FUNCTION shop_manager.create_default_employee_work_location();

CREATE TABLE IF NOT EXISTS shop_manager.employee_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shop_manager.shops(id) ON DELETE RESTRICT,
  profile_id uuid NOT NULL REFERENCES shop_manager.profiles(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  location_id uuid REFERENCES shop_manager.employee_work_locations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'on_shift'
    CHECK (status IN ('on_shift','on_break','completed','manager_closed')),
  clocked_in_at timestamptz NOT NULL DEFAULT now(),
  clocked_out_at timestamptz,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  opening_note text,
  closing_note text,
  closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (clocked_out_at IS NULL OR clocked_out_at >= clocked_in_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS employee_shifts_one_open_per_user
  ON shop_manager.employee_shifts(user_id) WHERE status IN ('on_shift','on_break');
CREATE INDEX IF NOT EXISTS employee_shifts_shop_time_idx
  ON shop_manager.employee_shifts(shop_id, clocked_in_at DESC);

CREATE TABLE IF NOT EXISTS shop_manager.employee_shift_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES shop_manager.employee_shifts(id) ON DELETE RESTRICT,
  shop_id uuid NOT NULL REFERENCES shop_manager.shops(id) ON DELETE RESTRICT,
  profile_id uuid NOT NULL REFERENCES shop_manager.profiles(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'clock_in','break_start','break_end','clock_out','manager_close','note'
  )),
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS employee_shift_events_shift_idx
  ON shop_manager.employee_shift_events(shift_id, occurred_at);
CREATE INDEX IF NOT EXISTS employee_shift_events_shop_idx
  ON shop_manager.employee_shift_events(shop_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS shop_manager.employee_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shop_manager.shops(id) ON DELETE RESTRICT,
  requested_by_profile_id uuid NOT NULL REFERENCES shop_manager.profiles(id) ON DELETE RESTRICT,
  requested_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  request_type text NOT NULL CHECK (request_type IN (
    'discount','price_override','return','refund','void_payment','stock_adjustment','credit','other'
  )),
  entity_type text,
  entity_id text,
  requested_value numeric,
  original_value numeric,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','expired')),
  decided_by_profile_id uuid REFERENCES shop_manager.profiles(id) ON DELETE SET NULL,
  decided_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS employee_approvals_shop_status_idx
  ON shop_manager.employee_approval_requests(shop_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS employee_approvals_requester_idx
  ON shop_manager.employee_approval_requests(requested_by_profile_id, requested_at DESC);

CREATE TABLE IF NOT EXISTS shop_manager.employee_operational_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES shop_manager.shops(id) ON DELETE RESTRICT,
  profile_id uuid REFERENCES shop_manager.profiles(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  shift_id uuid REFERENCES shop_manager.employee_shifts(id) ON DELETE SET NULL,
  event_category text NOT NULL CHECK (event_category IN (
    'shift','customer','sale','payment','pricing','discount','inventory','receiving',
    'transfer','return','warranty','work_order','order','security','other'
  )),
  action text NOT NULL,
  entity_type text,
  entity_id text,
  customer_id uuid REFERENCES shop_manager.customers(id) ON DELETE SET NULL,
  amount numeric,
  quantity numeric,
  approval_request_id uuid REFERENCES shop_manager.employee_approval_requests(id) ON DELETE SET NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'shop_manager'
);
CREATE INDEX IF NOT EXISTS employee_ops_shop_time_idx
  ON shop_manager.employee_operational_events(shop_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS employee_ops_profile_time_idx
  ON shop_manager.employee_operational_events(profile_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS employee_ops_entity_idx
  ON shop_manager.employee_operational_events(entity_type, entity_id, occurred_at DESC)
  WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS employee_ops_customer_idx
  ON shop_manager.employee_operational_events(customer_id, occurred_at DESC)
  WHERE customer_id IS NOT NULL;

ALTER TABLE shop_manager.employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.employee_work_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.employee_shift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.employee_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.employee_operational_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON shop_manager.employee_work_locations, shop_manager.employee_shifts, shop_manager.employee_shift_events,
  shop_manager.employee_approval_requests, shop_manager.employee_operational_events
  FROM anon, authenticated;
GRANT SELECT ON shop_manager.employee_work_locations, shop_manager.employee_shifts, shop_manager.employee_shift_events,
  shop_manager.employee_approval_requests, shop_manager.employee_operational_events
  TO authenticated;
GRANT ALL ON shop_manager.employee_work_locations, shop_manager.employee_shifts, shop_manager.employee_shift_events,
  shop_manager.employee_approval_requests, shop_manager.employee_operational_events
  TO service_role;

CREATE OR REPLACE FUNCTION shop_manager.is_shop_operations_manager(_user_id uuid, _shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
  SELECT shop_manager.user_belongs_to_shop(_user_id, _shop_id)
    AND (
      shop_manager.has_role(_user_id, 'owner'::text)
      OR shop_manager.has_role(_user_id, 'admin'::text)
      OR shop_manager.has_role(_user_id, 'manager'::text)
      OR shop_manager.has_role(_user_id, 'operations_manager'::text)
      OR shop_manager.has_role(_user_id, 'parts_manager'::text)
      OR shop_manager.has_role(_user_id, 'office_admin'::text)
    );
$$;
REVOKE ALL ON FUNCTION shop_manager.is_shop_operations_manager(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.is_shop_operations_manager(uuid,uuid) TO authenticated, service_role;

CREATE POLICY employee_shifts_read ON shop_manager.employee_shifts FOR SELECT TO authenticated USING (
  user_id = (select auth.uid())
  OR shop_manager.is_shop_operations_manager((select auth.uid()), shop_id)
);
CREATE POLICY employee_work_locations_read ON shop_manager.employee_work_locations FOR SELECT TO authenticated USING (
  shop_manager.user_belongs_to_shop((select auth.uid()),shop_id)
);
CREATE POLICY employee_shift_events_read ON shop_manager.employee_shift_events FOR SELECT TO authenticated USING (
  actor_user_id = (select auth.uid())
  OR EXISTS (SELECT 1 FROM shop_manager.employee_shifts s WHERE s.id = shift_id AND s.user_id = (select auth.uid()))
  OR shop_manager.is_shop_operations_manager((select auth.uid()), shop_id)
);
CREATE POLICY employee_approvals_read ON shop_manager.employee_approval_requests FOR SELECT TO authenticated USING (
  requested_by_user_id = (select auth.uid())
  OR shop_manager.is_shop_operations_manager((select auth.uid()), shop_id)
);
CREATE POLICY employee_operational_events_read ON shop_manager.employee_operational_events FOR SELECT TO authenticated USING (
  actor_user_id = (select auth.uid())
  OR shop_manager.is_shop_operations_manager((select auth.uid()), shop_id)
);

CREATE OR REPLACE FUNCTION shop_manager.current_employee_profile()
RETURNS shop_manager.profiles LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
  SELECT p FROM shop_manager.profiles p
  WHERE p.user_id = (select auth.uid()) OR p.id = (select auth.uid())
  ORDER BY (p.user_id = (select auth.uid())) DESC LIMIT 1;
$$;
REVOKE ALL ON FUNCTION shop_manager.current_employee_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.current_employee_profile() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION shop_manager.employee_operating_context()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
DECLARE v_profile shop_manager.profiles%ROWTYPE; v_shift shop_manager.employee_shifts%ROWTYPE; v_roles jsonb; v_locations jsonb;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_profile FROM shop_manager.current_employee_profile();
  IF NOT FOUND OR v_profile.shop_id IS NULL THEN RAISE EXCEPTION 'No Shop Manager employee profile is linked to this account'; END IF;
  SELECT COALESCE(jsonb_agg(r.name::text ORDER BY r.name::text), '[]'::jsonb) INTO v_roles
  FROM shop_manager.user_roles ur JOIN shop_manager.roles r ON r.id = ur.role_id
  WHERE ur.user_id IN (v_profile.id, (select auth.uid()));
  SELECT * INTO v_shift FROM shop_manager.employee_shifts
  WHERE user_id = (select auth.uid()) AND status IN ('on_shift','on_break')
  ORDER BY clocked_in_at DESC LIMIT 1;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'location_type',l.location_type) ORDER BY l.name),'[]'::jsonb)
  INTO v_locations FROM shop_manager.employee_work_locations l WHERE l.shop_id=v_profile.shop_id AND l.active;
  RETURN jsonb_build_object(
    'shop_id', v_profile.shop_id, 'profile_id', v_profile.id,
    'employee_name', COALESCE(v_profile.full_name, concat_ws(' ',v_profile.first_name,v_profile.last_name),v_profile.email),
    'job_title', v_profile.job_title, 'department', v_profile.department, 'roles', v_roles,
    'locations', v_locations,
    'can_manage', shop_manager.is_shop_operations_manager((select auth.uid()), v_profile.shop_id),
    'active_shift', CASE WHEN v_shift.id IS NULL THEN NULL ELSE to_jsonb(v_shift) END
  );
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.employee_operating_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.employee_operating_context() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION shop_manager.employee_shift_action(
  _action text, _note text DEFAULT NULL, _location_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
DECLARE v_profile shop_manager.profiles%ROWTYPE; v_shift shop_manager.employee_shifts%ROWTYPE; v_event text;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_profile FROM shop_manager.current_employee_profile();
  IF NOT FOUND OR v_profile.shop_id IS NULL THEN RAISE EXCEPTION 'No employee profile or shop is linked to this account'; END IF;
  IF _location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM shop_manager.employee_work_locations
    WHERE id = _location_id AND shop_id = v_profile.shop_id AND active
  ) THEN RAISE EXCEPTION 'Invalid or inactive location'; END IF;
  SELECT * INTO v_shift FROM shop_manager.employee_shifts
  WHERE user_id = (select auth.uid()) AND status IN ('on_shift','on_break')
  FOR UPDATE;

  IF _action = 'clock_in' THEN
    IF FOUND THEN RAISE EXCEPTION 'You already have an active shift'; END IF;
    INSERT INTO shop_manager.employee_shifts(shop_id,profile_id,user_id,location_id,opening_note)
    VALUES(v_profile.shop_id,v_profile.id,(select auth.uid()),_location_id,NULLIF(trim(_note),'')) RETURNING * INTO v_shift;
    v_event := 'clock_in';
  ELSIF _action = 'break_start' THEN
    IF NOT FOUND OR v_shift.status <> 'on_shift' THEN RAISE EXCEPTION 'Clock in before starting a break'; END IF;
    UPDATE shop_manager.employee_shifts SET status='on_break',updated_at=now() WHERE id=v_shift.id RETURNING * INTO v_shift;
    v_event := 'break_start';
  ELSIF _action = 'break_end' THEN
    IF NOT FOUND OR v_shift.status <> 'on_break' THEN RAISE EXCEPTION 'No active break to end'; END IF;
    UPDATE shop_manager.employee_shifts SET status='on_shift',updated_at=now() WHERE id=v_shift.id RETURNING * INTO v_shift;
    v_event := 'break_end';
  ELSIF _action = 'clock_out' THEN
    IF NOT FOUND THEN RAISE EXCEPTION 'No active shift to close'; END IF;
    UPDATE shop_manager.employee_shifts SET status='completed',clocked_out_at=now(),closing_note=NULLIF(trim(_note),''),updated_at=now()
    WHERE id=v_shift.id RETURNING * INTO v_shift;
    v_event := 'clock_out';
  ELSE RAISE EXCEPTION 'Invalid shift action'; END IF;

  INSERT INTO shop_manager.employee_shift_events(shift_id,shop_id,profile_id,actor_user_id,event_type,note)
  VALUES(v_shift.id,v_shift.shop_id,v_shift.profile_id,(select auth.uid()),v_event,NULLIF(trim(_note),''));
  INSERT INTO shop_manager.employee_operational_events(shop_id,profile_id,actor_user_id,shift_id,event_category,action,entity_type,entity_id,reason)
  VALUES(v_shift.shop_id,v_shift.profile_id,(select auth.uid()),v_shift.id,'shift',v_event,'employee_shift',v_shift.id::text,NULLIF(trim(_note),''));
  RETURN to_jsonb(v_shift);
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.employee_shift_action(text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.employee_shift_action(text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION shop_manager.request_employee_approval(
  _request_type text, _reason text, _entity_type text DEFAULT NULL, _entity_id text DEFAULT NULL,
  _requested_value numeric DEFAULT NULL, _original_value numeric DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS shop_manager.employee_approval_requests LANGUAGE plpgsql SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
DECLARE v_profile shop_manager.profiles%ROWTYPE; v_result shop_manager.employee_approval_requests%ROWTYPE; v_shift_id uuid;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _request_type NOT IN ('discount','price_override','return','refund','void_payment','stock_adjustment','credit','other') THEN RAISE EXCEPTION 'Invalid approval type'; END IF;
  IF char_length(trim(COALESCE(_reason,''))) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
  SELECT * INTO v_profile FROM shop_manager.current_employee_profile();
  IF NOT FOUND OR v_profile.shop_id IS NULL THEN RAISE EXCEPTION 'No employee shop is linked'; END IF;
  SELECT id INTO v_shift_id FROM shop_manager.employee_shifts WHERE user_id=(select auth.uid()) AND status IN ('on_shift','on_break') LIMIT 1;
  INSERT INTO shop_manager.employee_approval_requests(shop_id,requested_by_profile_id,requested_by_user_id,request_type,
    entity_type,entity_id,requested_value,original_value,reason,expires_at,metadata)
  VALUES(v_profile.shop_id,v_profile.id,(select auth.uid()),_request_type,NULLIF(trim(_entity_type),''),NULLIF(trim(_entity_id),''),
    _requested_value,_original_value,trim(_reason),now()+interval '24 hours',COALESCE(_metadata,'{}'::jsonb)) RETURNING * INTO v_result;
  INSERT INTO shop_manager.employee_operational_events(shop_id,profile_id,actor_user_id,shift_id,event_category,action,
    entity_type,entity_id,amount,approval_request_id,reason)
  VALUES(v_profile.shop_id,v_profile.id,(select auth.uid()),v_shift_id,
    CASE WHEN _request_type IN ('discount','price_override') THEN 'pricing' WHEN _request_type IN ('return','refund') THEN 'return' ELSE 'other' END,
    'approval_requested',_entity_type,_entity_id,_requested_value,v_result.id,trim(_reason));
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.request_employee_approval(text,text,text,text,numeric,numeric,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.request_employee_approval(text,text,text,text,numeric,numeric,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION shop_manager.decide_employee_approval(
  _request_id uuid, _decision text, _note text DEFAULT NULL
) RETURNS shop_manager.employee_approval_requests LANGUAGE plpgsql SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
DECLARE v_request shop_manager.employee_approval_requests%ROWTYPE; v_profile shop_manager.profiles%ROWTYPE; v_shift_id uuid;
BEGIN
  IF _decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  SELECT * INTO v_request FROM shop_manager.employee_approval_requests WHERE id=_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Approval request not found'; END IF;
  IF v_request.status <> 'pending' THEN RAISE EXCEPTION 'Approval request is already resolved'; END IF;
  IF NOT shop_manager.is_shop_operations_manager((select auth.uid()),v_request.shop_id) THEN RAISE EXCEPTION 'Manager approval required'; END IF;
  SELECT * INTO v_profile FROM shop_manager.current_employee_profile();
  UPDATE shop_manager.employee_approval_requests SET status=_decision,decided_by_profile_id=v_profile.id,
    decided_by_user_id=(select auth.uid()),decision_note=NULLIF(trim(_note),''),decided_at=now()
  WHERE id=_request_id RETURNING * INTO v_request;
  SELECT id INTO v_shift_id FROM shop_manager.employee_shifts WHERE user_id=(select auth.uid()) AND status IN ('on_shift','on_break') LIMIT 1;
  INSERT INTO shop_manager.employee_operational_events(shop_id,profile_id,actor_user_id,shift_id,event_category,action,
    entity_type,entity_id,amount,approval_request_id,reason)
  VALUES(v_request.shop_id,v_profile.id,(select auth.uid()),v_shift_id,'pricing','approval_'||_decision,
    v_request.entity_type,v_request.entity_id,v_request.requested_value,v_request.id,NULLIF(trim(_note),''));
  RETURN v_request;
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.decide_employee_approval(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.decide_employee_approval(uuid,text,text) TO authenticated;

-- Central audit hook for the existing systems of record. It records attribution
-- and operational facts, never customer PII, card data, free-form invoice notes, or credentials.
CREATE OR REPLACE FUNCTION shop_manager.capture_employee_operation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
DECLARE v_row jsonb; v_profile shop_manager.profiles%ROWTYPE; v_shop_id uuid; v_shift_id uuid;
  v_category text; v_action text; v_amount numeric; v_quantity numeric; v_customer_id uuid; v_entity_id text;
BEGIN
  IF (select auth.uid()) IS NULL THEN
    IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  v_row := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  SELECT * INTO v_profile FROM shop_manager.current_employee_profile();
  v_shop_id := v_profile.shop_id;
  IF v_shop_id IS NULL THEN
    IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  SELECT id INTO v_shift_id FROM shop_manager.employee_shifts WHERE user_id=(select auth.uid()) AND status IN ('on_shift','on_break') LIMIT 1;
  v_entity_id := v_row->>'id';
  v_customer_id := NULLIF(v_row->>'customer_id','')::uuid;
  v_amount := COALESCE(NULLIF(v_row->>'amount','')::numeric,NULLIF(v_row->>'total','')::numeric,NULLIF(v_row->>'total_amount','')::numeric);
  v_quantity := COALESCE(NULLIF(v_row->>'quantity','')::numeric,NULLIF(v_row->>'quantity_received','')::numeric);
  v_category := CASE TG_TABLE_NAME WHEN 'payments' THEN 'payment' WHEN 'invoices' THEN 'sale'
    WHEN 'inventory_transactions' THEN 'inventory' WHEN 'inventory_purchase_orders' THEN 'receiving'
    WHEN 'stock_transfers' THEN 'transfer' WHEN 'customers' THEN 'customer'
    WHEN 'work_orders' THEN 'work_order' WHEN 'work_order_discounts' THEN 'discount' ELSE 'other' END;
  v_action := lower(TG_OP)||'_'||TG_TABLE_NAME;
  INSERT INTO shop_manager.employee_operational_events(shop_id,profile_id,actor_user_id,shift_id,event_category,action,
    entity_type,entity_id,customer_id,amount,quantity,metadata)
  VALUES(v_shop_id,v_profile.id,(select auth.uid()),v_shift_id,v_category,v_action,TG_TABLE_NAME,v_entity_id,v_customer_id,v_amount,v_quantity,
    jsonb_strip_nulls(jsonb_build_object('status',v_row->>'status','transaction_type',v_row->>'transaction_type',
      'payment_type',v_row->>'payment_type','reference_type',v_row->>'reference_type','reference_id',v_row->>'reference_id')));
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['payments','invoices','inventory_transactions','inventory_purchase_orders','stock_transfers','customers','work_orders','work_order_discounts']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS employee_operation_audit ON shop_manager.%I',t);
    EXECUTE format('CREATE TRIGGER employee_operation_audit AFTER INSERT OR UPDATE OR DELETE ON shop_manager.%I FOR EACH ROW EXECUTE FUNCTION shop_manager.capture_employee_operation()',t);
  END LOOP;
END $$;

CREATE OR REPLACE VIEW shop_manager.employee_daily_performance
WITH (security_invoker = true) AS
SELECT e.shop_id,e.profile_id,date_trunc('day',e.occurred_at) AS work_day,
  count(*) AS total_actions,
  count(*) FILTER (WHERE e.event_category='sale') AS sales_actions,
  count(*) FILTER (WHERE e.event_category='payment') AS payment_actions,
  count(*) FILTER (WHERE e.event_category IN ('inventory','receiving','transfer')) AS inventory_actions,
  count(*) FILTER (WHERE e.event_category='return') AS return_actions,
  COALESCE(sum(e.amount) FILTER (WHERE e.event_category='payment' AND e.action LIKE 'insert_%'),0) AS payments_recorded,
  count(DISTINCT e.customer_id) FILTER (WHERE e.customer_id IS NOT NULL) AS customers_helped
FROM shop_manager.employee_operational_events e
GROUP BY e.shop_id,e.profile_id,date_trunc('day',e.occurred_at);
GRANT SELECT ON shop_manager.employee_daily_performance TO authenticated, service_role;
