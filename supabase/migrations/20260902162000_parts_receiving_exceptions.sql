-- Associate Network receiving exceptions and quarantine workflow.
-- Non-accepted goods are reported as cases and never enter sellable inventory.

CREATE SEQUENCE IF NOT EXISTS public.parts_receiving_exception_number_seq START 1000;
REVOKE ALL ON SEQUENCE public.parts_receiving_exception_number_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.parts_receiving_exception_number_seq TO service_role;

CREATE TABLE IF NOT EXISTS public.parts_receiving_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_number text NOT NULL UNIQUE DEFAULT (
    'RX-' || to_char(CURRENT_DATE, 'YYMM') || '-' ||
    lpad(nextval('public.parts_receiving_exception_number_seq')::text, 6, '0')
  ),
  order_id uuid NOT NULL REFERENCES public.parts_orders(id) ON DELETE RESTRICT,
  order_line_id uuid NOT NULL REFERENCES public.parts_order_lines(id) ON DELETE RESTRICT,
  requester_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  supplier_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  reported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  exception_type text NOT NULL CHECK (exception_type IN ('damaged','incorrect','short')),
  affected_quantity numeric(12,2) NOT NULL CHECK (affected_quantity > 0),
  description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 5 AND 4000),
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence) = 'array'),
  status text NOT NULL DEFAULT 'reported' CHECK (status IN (
    'reported','supplier_review','replacement_authorized','credit_authorized',
    'return_authorized','resolved','rejected','cancelled'
  )),
  supplier_note text,
  resolution text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_business_id <> supplier_business_id)
);

CREATE INDEX IF NOT EXISTS parts_receiving_exceptions_requester_status_idx
  ON public.parts_receiving_exceptions (requester_business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_receiving_exceptions_supplier_status_idx
  ON public.parts_receiving_exceptions (supplier_business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_receiving_exceptions_order_line_idx
  ON public.parts_receiving_exceptions (order_line_id, created_at DESC);

REVOKE ALL ON public.parts_receiving_exceptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.parts_receiving_exceptions TO authenticated;
GRANT ALL ON public.parts_receiving_exceptions TO service_role;
ALTER TABLE public.parts_receiving_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parts receiving exceptions: participants read"
  ON public.parts_receiving_exceptions FOR SELECT TO authenticated
  USING (
    public.is_business_member((select auth.uid()), requester_business_id)
    OR public.is_business_member((select auth.uid()), supplier_business_id)
  );

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
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _exception_type NOT IN ('damaged','incorrect','short') THEN
    RAISE EXCEPTION 'Invalid receiving exception type';
  END IF;
  IF _affected_quantity IS NULL OR _affected_quantity <= 0 THEN
    RAISE EXCEPTION 'Affected quantity must be greater than zero';
  END IF;
  IF char_length(trim(COALESCE(_description, ''))) NOT BETWEEN 5 AND 4000 THEN
    RAISE EXCEPTION 'Description must be between 5 and 4000 characters';
  END IF;
  IF _evidence IS NULL OR jsonb_typeof(_evidence) <> 'array' THEN
    RAISE EXCEPTION 'Evidence must be an array';
  END IF;

  SELECT * INTO v_order FROM public.parts_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.order_kind <> 'purchase' THEN
    RAISE EXCEPTION 'Receiving exceptions apply to supplier purchase orders';
  END IF;
  IF NOT public.has_business_role(
    (select auth.uid()), v_order.requester_business_id, 'manager'::public.business_staff_role
  ) THEN
    RAISE EXCEPTION 'Requesting business manager access required';
  END IF;
  IF v_order.status NOT IN ('ready','shipped','partially_received') THEN
    RAISE EXCEPTION 'Order is not open for receiving inspection';
  END IF;

  SELECT * INTO v_line FROM public.parts_order_lines
    WHERE id = _order_line_id AND order_id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order line not found'; END IF;
  v_remaining := COALESCE(NULLIF(v_line.accepted_quantity, 0), v_line.requested_quantity)
    - v_line.received_quantity;
  IF _affected_quantity > v_remaining THEN
    RAISE EXCEPTION 'Affected quantity cannot exceed % remaining', v_remaining;
  END IF;

  INSERT INTO public.parts_receiving_exceptions (
    order_id, order_line_id, requester_business_id, supplier_business_id,
    reported_by, exception_type, affected_quantity, description, evidence
  ) VALUES (
    v_order.id, v_line.id, v_order.requester_business_id, v_order.supplier_business_id,
    (select auth.uid()), _exception_type, _affected_quantity, trim(_description), _evidence
  ) RETURNING * INTO v_exception;

  INSERT INTO public.parts_order_events (order_id, actor_id, event_type, note, metadata)
  VALUES (
    v_order.id, (select auth.uid()), 'receiving_exception_reported', trim(_description),
    jsonb_build_object(
      'exception_id', v_exception.id,
      'exception_number', v_exception.exception_number,
      'exception_type', v_exception.exception_type,
      'affected_quantity', v_exception.affected_quantity,
      'order_line_id', v_line.id
    )
  );

  RETURN jsonb_build_object(
    'id', v_exception.id,
    'exception_number', v_exception.exception_number,
    'status', v_exception.status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_parts_receiving_exception(uuid,uuid,text,numeric,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_parts_receiving_exception(uuid,uuid,text,numeric,text,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_parts_receiving_exception(uuid,uuid,text,numeric,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_parts_receiving_exception(
  _exception_id uuid,
  _target_status text,
  _note text DEFAULT NULL,
  _resolution text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_case public.parts_receiving_exceptions%ROWTYPE;
  v_requester boolean;
  v_supplier boolean;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_case FROM public.parts_receiving_exceptions
    WHERE id = _exception_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receiving exception not found'; END IF;

  v_requester := public.has_business_role(
    (select auth.uid()), v_case.requester_business_id, 'manager'::public.business_staff_role
  );
  v_supplier := public.has_business_role(
    (select auth.uid()), v_case.supplier_business_id, 'manager'::public.business_staff_role
  );
  IF NOT v_requester AND NOT v_supplier THEN RAISE EXCEPTION 'Manager access required'; END IF;

  IF _target_status = 'cancelled' THEN
    IF NOT v_requester OR v_case.status <> 'reported' THEN RAISE EXCEPTION 'Case cannot be cancelled'; END IF;
  ELSIF _target_status = 'supplier_review' THEN
    IF NOT v_supplier OR v_case.status <> 'reported' THEN RAISE EXCEPTION 'Case cannot enter review'; END IF;
  ELSIF _target_status IN ('replacement_authorized','credit_authorized','return_authorized','rejected') THEN
    IF NOT v_supplier OR v_case.status NOT IN ('reported','supplier_review') THEN
      RAISE EXCEPTION 'Supplier cannot apply that resolution now';
    END IF;
  ELSIF _target_status = 'resolved' THEN
    IF NOT (v_requester OR v_supplier)
      OR v_case.status NOT IN ('replacement_authorized','credit_authorized','return_authorized') THEN
      RAISE EXCEPTION 'Only an authorized resolution can be closed';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid receiving exception status';
  END IF;

  UPDATE public.parts_receiving_exceptions
  SET status = _target_status,
      supplier_note = CASE WHEN v_supplier AND NULLIF(trim(_note), '') IS NOT NULL
        THEN trim(_note) ELSE supplier_note END,
      resolution = COALESCE(NULLIF(trim(_resolution), ''), resolution),
      resolved_by = CASE WHEN _target_status IN ('resolved','rejected','cancelled')
        THEN (select auth.uid()) ELSE resolved_by END,
      resolved_at = CASE WHEN _target_status IN ('resolved','rejected','cancelled')
        THEN now() ELSE resolved_at END,
      updated_at = now()
  WHERE id = v_case.id;

  INSERT INTO public.parts_order_events (order_id, actor_id, event_type, note, metadata)
  VALUES (
    v_case.order_id, (select auth.uid()), 'receiving_exception_' || _target_status,
    NULLIF(trim(_note), ''),
    jsonb_build_object('exception_id', v_case.id, 'exception_number', v_case.exception_number)
  );

  RETURN jsonb_build_object('id', v_case.id, 'status', _target_status);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_parts_receiving_exception(uuid,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_parts_receiving_exception(uuid,text,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.transition_parts_receiving_exception(uuid,text,text,text) TO authenticated;
