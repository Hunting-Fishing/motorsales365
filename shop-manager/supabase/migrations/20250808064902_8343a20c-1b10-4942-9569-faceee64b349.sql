-- Create function to convert a completed work order into an invoice
CREATE OR REPLACE FUNCTION public.convert_work_order_to_invoice(
  p_work_order_id uuid,
  p_converted_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  wo_record public.work_orders%ROWTYPE;
  totals JSONB;
  new_invoice_id UUID;
  shop UUID;
  due_days INTEGER := 14;
BEGIN
  -- Fetch the work order
  SELECT * INTO wo_record FROM public.work_orders WHERE id = p_work_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order with ID % not found', p_work_order_id;
  END IF;

  -- Ensure work order is completed before conversion
  IF wo_record.status IS NULL OR lower(wo_record.status::text) != 'completed' THEN
    RAISE EXCEPTION 'Work order must be completed before conversion to invoice';
  END IF;

  -- Get user's shop for RLS compliance
  shop := public.get_user_shop_id_secure(p_converted_by);

  -- Calculate totals using existing helper
  totals := public.calculate_work_order_totals_with_discounts(p_work_order_id);

  -- Create invoice
  INSERT INTO public.invoices (
    customer_id,
    status,
    date,
    due_date,
    subtotal,
    tax,
    total,
    created_by,
    work_order_id,
    description,
    created_at,
    updated_at,
    shop_id
  ) VALUES (
    wo_record.customer_id,
    'pending',
    now()::date,
    (now() + (due_days || ' days')::interval)::date,
    COALESCE((totals->>'subtotal_before_wo_discounts')::numeric, 0),
    0,
    COALESCE((totals->>'final_total')::numeric, 0),
    p_converted_by,
    p_work_order_id,
    COALESCE(wo_record.description, '') || CASE WHEN p_notes IS NOT NULL THEN ' - ' || p_notes ELSE '' END,
    now(),
    now(),
    shop
  ) RETURNING id INTO new_invoice_id;

  -- Link back to work order and mark invoiced timestamp
  UPDATE public.work_orders
  SET invoiced_at = now(),
      invoice_id = COALESCE(invoice_id, new_invoice_id),
      updated_at = now()
  WHERE id = p_work_order_id;

  -- Return the new invoice id
  RETURN new_invoice_id;
END;
$function$;