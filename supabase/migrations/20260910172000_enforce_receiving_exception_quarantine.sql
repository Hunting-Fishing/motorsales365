-- Prevent open receiving exceptions from also being posted as accepted stock.

CREATE OR REPLACE FUNCTION public.enforce_receiving_exception_quarantine()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_open_exception_quantity numeric;
  v_fulfillment_quantity numeric;
BEGIN
  IF NEW.received_quantity <= OLD.received_quantity THEN RETURN NEW; END IF;
  SELECT COALESCE(sum(e.affected_quantity), 0) INTO v_open_exception_quantity
  FROM public.parts_receiving_exceptions e
  WHERE e.order_line_id = NEW.id
    AND e.status NOT IN ('resolved','rejected','cancelled');
  v_fulfillment_quantity := COALESCE(NULLIF(NEW.accepted_quantity, 0), NEW.requested_quantity);
  IF NEW.received_quantity > v_fulfillment_quantity - v_open_exception_quantity THEN
    RAISE EXCEPTION 'Receipt exceeds accepted quantity available after receiving quarantine';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_receiving_exception_quarantine()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_receiving_exception_quarantine
  ON public.parts_order_lines;
CREATE TRIGGER enforce_receiving_exception_quarantine
  BEFORE UPDATE OF received_quantity ON public.parts_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.enforce_receiving_exception_quarantine();

CREATE OR REPLACE FUNCTION public.create_parts_receiving_exception(
  _order_id uuid,
  _order_line_id uuid,
  _exception_type text,
  _affected_quantity numeric,
  _description text,
  _evidence jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.parts_orders%ROWTYPE;
  v_line public.parts_order_lines%ROWTYPE;
  v_exception public.parts_receiving_exceptions%ROWTYPE;
  v_remaining numeric;
  v_open_exception_quantity numeric;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _exception_type NOT IN ('damaged','incorrect','short') THEN RAISE EXCEPTION 'Invalid receiving exception type'; END IF;
  IF _affected_quantity IS NULL OR _affected_quantity <= 0 THEN RAISE EXCEPTION 'Affected quantity must be greater than zero'; END IF;
  IF char_length(trim(COALESCE(_description, ''))) NOT BETWEEN 5 AND 4000 THEN RAISE EXCEPTION 'Description must be between 5 and 4000 characters'; END IF;
  IF _evidence IS NULL OR jsonb_typeof(_evidence) <> 'array' THEN RAISE EXCEPTION 'Evidence must be an array'; END IF;

  SELECT * INTO v_order FROM public.parts_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.order_kind <> 'purchase' THEN RAISE EXCEPTION 'Receiving exceptions apply to supplier purchase orders'; END IF;
  IF NOT public.has_business_role((select auth.uid()), v_order.requester_business_id, 'manager'::public.business_staff_role) THEN
    RAISE EXCEPTION 'Requesting business manager access required';
  END IF;
  IF v_order.status NOT IN ('ready','shipped','partially_received') THEN RAISE EXCEPTION 'Order is not open for receiving inspection'; END IF;

  SELECT * INTO v_line FROM public.parts_order_lines WHERE id = _order_line_id AND order_id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order line not found'; END IF;
  SELECT COALESCE(sum(e.affected_quantity), 0) INTO v_open_exception_quantity
  FROM public.parts_receiving_exceptions e
  WHERE e.order_line_id = v_line.id AND e.status NOT IN ('resolved','rejected','cancelled');
  v_remaining := COALESCE(NULLIF(v_line.accepted_quantity, 0), v_line.requested_quantity)
    - v_line.received_quantity - v_open_exception_quantity;
  IF _affected_quantity > v_remaining THEN RAISE EXCEPTION 'Affected quantity cannot exceed % remaining', v_remaining; END IF;

  INSERT INTO public.parts_receiving_exceptions (
    order_id, order_line_id, requester_business_id, supplier_business_id,
    reported_by, exception_type, affected_quantity, description, evidence
  ) VALUES (
    v_order.id, v_line.id, v_order.requester_business_id, v_order.supplier_business_id,
    (select auth.uid()), _exception_type, _affected_quantity, trim(_description), _evidence
  ) RETURNING * INTO v_exception;
  INSERT INTO public.parts_order_events (order_id, actor_id, event_type, note, metadata)
  VALUES (v_order.id, (select auth.uid()), 'receiving_exception_reported', trim(_description),
    jsonb_build_object('exception_id', v_exception.id, 'exception_number', v_exception.exception_number,
      'exception_type', v_exception.exception_type, 'affected_quantity', v_exception.affected_quantity,
      'order_line_id', v_line.id));
  RETURN jsonb_build_object('id', v_exception.id, 'exception_number', v_exception.exception_number, 'status', v_exception.status);
END;
$$;

REVOKE ALL ON FUNCTION public.create_parts_receiving_exception(uuid,uuid,text,numeric,text,jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_parts_receiving_exception(uuid,uuid,text,numeric,text,jsonb)
  TO authenticated;
