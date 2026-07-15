
-- ============================================================
-- Shop Manager: helper functions
-- ============================================================

-- Sequences for auto-generated numbers (per-shop scoping done via prefix)
CREATE SEQUENCE IF NOT EXISTS shop_manager.quote_number_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS shop_manager.work_order_number_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS shop_manager.receipt_number_seq START 1000;
GRANT USAGE ON SEQUENCE shop_manager.quote_number_seq TO authenticated;
GRANT USAGE ON SEQUENCE shop_manager.work_order_number_seq TO authenticated;
GRANT USAGE ON SEQUENCE shop_manager.receipt_number_seq TO authenticated;

-- Generate quote number
CREATE OR REPLACE FUNCTION shop_manager.generate_quote_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := 'Q-' || to_char(now(), 'YYMM') || '-' ||
      lpad(nextval('shop_manager.quote_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_quote_number ON shop_manager.quotes;
CREATE TRIGGER trg_generate_quote_number
  BEFORE INSERT ON shop_manager.quotes
  FOR EACH ROW EXECUTE FUNCTION shop_manager.generate_quote_number();

-- Generate work-order number
CREATE OR REPLACE FUNCTION shop_manager.generate_work_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
BEGIN
  IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
    NEW.work_order_number := 'WO-' || to_char(now(), 'YYMM') || '-' ||
      lpad(nextval('shop_manager.work_order_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_work_order_number ON shop_manager.work_orders;
CREATE TRIGGER trg_generate_work_order_number
  BEFORE INSERT ON shop_manager.work_orders
  FOR EACH ROW EXECUTE FUNCTION shop_manager.generate_work_order_number();

-- Generate payment receipt number (uses transaction_id as receipt slot)
CREATE OR REPLACE FUNCTION shop_manager.generate_receipt_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
BEGIN
  IF NEW.transaction_id IS NULL OR NEW.transaction_id = '' THEN
    NEW.transaction_id := 'RC-' || to_char(now(), 'YYMM') || '-' ||
      lpad(nextval('shop_manager.receipt_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_receipt_number ON shop_manager.payments;
CREATE TRIGGER trg_generate_receipt_number
  BEFORE INSERT ON shop_manager.payments
  FOR EACH ROW EXECUTE FUNCTION shop_manager.generate_receipt_number();

-- Recalculate work-order totals from job lines + parts
CREATE OR REPLACE FUNCTION shop_manager.calculate_work_order_totals(_work_order_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE
  labor_total numeric := 0;
  parts_total numeric := 0;
  grand numeric := 0;
BEGIN
  SELECT COALESCE(SUM(total_amount), 0) INTO labor_total
    FROM shop_manager.work_order_job_lines WHERE work_order_id = _work_order_id;
  SELECT COALESCE(SUM(customer_price * quantity), 0) INTO parts_total
    FROM shop_manager.work_order_parts WHERE work_order_id = _work_order_id;
  grand := labor_total + parts_total;
  UPDATE shop_manager.work_orders SET total_cost = grand, updated_at = now()
    WHERE id = _work_order_id;
  RETURN grand;
END $$;

GRANT EXECUTE ON FUNCTION shop_manager.calculate_work_order_totals(uuid) TO authenticated;

-- Detect scheduling conflicts for a technician in a time window
CREATE OR REPLACE FUNCTION shop_manager.detect_schedule_conflicts(
  _technician_id uuid,
  _start timestamptz,
  _end timestamptz,
  _exclude_work_order uuid DEFAULT NULL
)
RETURNS TABLE(work_order_id uuid, start_time timestamptz, end_time timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
  SELECT id, start_time, end_time
  FROM shop_manager.work_orders
  WHERE technician_id = _technician_id
    AND start_time IS NOT NULL
    AND end_time IS NOT NULL
    AND (_exclude_work_order IS NULL OR id <> _exclude_work_order)
    AND tstzrange(start_time, end_time, '[)') && tstzrange(_start, _end, '[)');
$$;

GRANT EXECUTE ON FUNCTION shop_manager.detect_schedule_conflicts(uuid, timestamptz, timestamptz, uuid) TO authenticated;

-- Convert a quote to a work order (copies quote_items → work_order_job_lines / parts)
CREATE OR REPLACE FUNCTION shop_manager.convert_quote_to_work_order(_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE
  q shop_manager.quotes%ROWTYPE;
  new_wo_id uuid;
BEGIN
  SELECT * INTO q FROM shop_manager.quotes WHERE id = _quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote % not found', _quote_id; END IF;
  IF q.status = 'converted' AND q.converted_to_work_order_id IS NOT NULL THEN
    RETURN q.converted_to_work_order_id;
  END IF;

  INSERT INTO shop_manager.work_orders (customer_id, vehicle_id, status, description, created_by)
  VALUES (q.customer_id, q.vehicle_id, 'pending', q.notes, auth.uid())
  RETURNING id INTO new_wo_id;

  -- Services / labor lines
  INSERT INTO shop_manager.work_order_job_lines
    (work_order_id, name, description, category, estimated_hours, labor_rate, total_amount, display_order)
  SELECT new_wo_id, name, description, category, quantity, unit_price, total_price, display_order
  FROM shop_manager.quote_items WHERE quote_id = _quote_id AND item_type IN ('service','labor');

  -- Parts lines
  INSERT INTO shop_manager.work_order_parts
    (work_order_id, part_name, quantity, customer_price, retail_price, part_type, category)
  SELECT new_wo_id, name, quantity::int, unit_price, unit_price, 'aftermarket', category
  FROM shop_manager.quote_items WHERE quote_id = _quote_id AND item_type = 'part';

  UPDATE shop_manager.quotes
    SET status = 'converted', converted_at = now(), converted_to_work_order_id = new_wo_id, updated_at = now()
    WHERE id = _quote_id;

  PERFORM shop_manager.calculate_work_order_totals(new_wo_id);
  RETURN new_wo_id;
END $$;

GRANT EXECUTE ON FUNCTION shop_manager.convert_quote_to_work_order(uuid) TO authenticated;

-- Convert a work order to an invoice
CREATE OR REPLACE FUNCTION shop_manager.convert_work_order_to_invoice(_work_order_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE
  wo shop_manager.work_orders%ROWTYPE;
  cust shop_manager.customers%ROWTYPE;
  new_invoice_id text;
  subtotal_v numeric := 0;
  tax_rate_v numeric := 0.12;
  tax_v numeric := 0;
BEGIN
  SELECT * INTO wo FROM shop_manager.work_orders WHERE id = _work_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Work order % not found', _work_order_id; END IF;
  IF wo.invoice_id IS NOT NULL THEN RETURN wo.invoice_id; END IF;

  SELECT * INTO cust FROM shop_manager.customers WHERE id = wo.customer_id;

  PERFORM shop_manager.calculate_work_order_totals(_work_order_id);
  SELECT total_cost INTO subtotal_v FROM shop_manager.work_orders WHERE id = _work_order_id;
  subtotal_v := COALESCE(subtotal_v, 0);
  tax_v := round(subtotal_v * tax_rate_v, 2);

  new_invoice_id := 'INV-' || to_char(now(), 'YYMM') || '-' ||
    lpad(nextval('shop_manager.work_order_number_seq')::text, 5, '0');

  INSERT INTO shop_manager.invoices
    (id, customer, customer_email, description, date, due_date, status,
     work_order_id, subtotal, tax, total, created_by, customer_id, created_at)
  VALUES
    (new_invoice_id,
     TRIM(CONCAT(cust.first_name, ' ', cust.last_name)),
     cust.email,
     wo.description,
     to_char(now(), 'YYYY-MM-DD'),
     to_char(now() + interval '30 days', 'YYYY-MM-DD'),
     'unpaid',
     _work_order_id::text,
     subtotal_v,
     tax_v,
     subtotal_v + tax_v,
     auth.uid()::text,
     wo.customer_id,
     now());

  -- Copy job lines as invoice items
  INSERT INTO shop_manager.invoice_items (invoice_id, name, description, quantity, price, total, hours)
  SELECT new_invoice_id, name, description, estimated_hours, labor_rate, total_amount, true
  FROM shop_manager.work_order_job_lines WHERE work_order_id = _work_order_id;

  -- Copy parts as invoice items
  INSERT INTO shop_manager.invoice_items (invoice_id, name, description, quantity, price, total, hours)
  SELECT new_invoice_id, part_name, part_number, quantity, customer_price, customer_price * quantity, false
  FROM shop_manager.work_order_parts WHERE work_order_id = _work_order_id;

  UPDATE shop_manager.work_orders
    SET invoice_id = new_invoice_id, invoiced_at = now(), updated_at = now()
    WHERE id = _work_order_id;

  RETURN new_invoice_id;
END $$;

GRANT EXECUTE ON FUNCTION shop_manager.convert_work_order_to_invoice(uuid) TO authenticated;

-- ============================================================
-- Helper views (security_invoker=on so RLS binds to the caller)
-- ============================================================

-- Technicians view: shop staff resolved from profiles
CREATE OR REPLACE VIEW shop_manager.technicians
WITH (security_invoker=on) AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.full_name,
  p.email,
  p.phone,
  p.shop_id,
  p.job_title,
  p.hourly_rate,
  p.cost_rate
FROM shop_manager.profiles p
WHERE p.shop_id IS NOT NULL;

GRANT SELECT ON shop_manager.technicians TO authenticated;

-- Customer overview: spend & visits
CREATE OR REPLACE VIEW shop_manager.customer_overview
WITH (security_invoker=on) AS
SELECT
  c.id AS customer_id,
  c.shop_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  COUNT(DISTINCT w.id) AS work_order_count,
  COALESCE(SUM(w.total_cost), 0) AS lifetime_spend,
  MAX(w.created_at) AS last_visit_at,
  MIN(w.created_at) AS first_visit_at
FROM shop_manager.customers c
LEFT JOIN shop_manager.work_orders w ON w.customer_id = c.id
GROUP BY c.id, c.shop_id, c.first_name, c.last_name, c.email, c.phone;

GRANT SELECT ON shop_manager.customer_overview TO authenticated;

-- Inventory stock view
CREATE OR REPLACE VIEW shop_manager.inventory_stock_view
WITH (security_invoker=on) AS
SELECT
  i.id,
  i.shop_id,
  i.name,
  i.sku,
  i.part_number,
  i.category,
  i.supplier,
  i.manufacturer,
  i.quantity AS on_hand,
  COALESCE(i.on_hold, 0) AS on_hold,
  COALESCE(i.on_order, 0) AS on_order,
  GREATEST(i.quantity - COALESCE(i.on_hold, 0), 0) AS available,
  i.reorder_point,
  i.cost_per_unit,
  i.sell_price_per_unit,
  i.unit_price,
  (i.quantity * COALESCE(i.cost_per_unit, 0)) AS stock_value_cost,
  (i.quantity * COALESCE(i.sell_price_per_unit, i.unit_price)) AS stock_value_retail,
  i.status,
  i.updated_at
FROM shop_manager.inventory_items i;

GRANT SELECT ON shop_manager.inventory_stock_view TO authenticated;

-- Financial summary: month-to-date rollup per shop
CREATE OR REPLACE VIEW shop_manager.financial_summary_view
WITH (security_invoker=on) AS
WITH inv AS (
  SELECT
    c.shop_id,
    date_trunc('month', now()) AS period_start,
    COUNT(*) FILTER (WHERE i.status <> 'draft') AS invoice_count,
    COALESCE(SUM(i.total) FILTER (WHERE i.status <> 'draft'), 0) AS invoiced_total,
    COALESCE(SUM(i.total) FILTER (WHERE i.status = 'unpaid'), 0) AS unpaid_total
  FROM shop_manager.invoices i
  LEFT JOIN shop_manager.customers c ON c.id = i.customer_id
  WHERE i.created_at >= date_trunc('month', now())
  GROUP BY c.shop_id
),
pay AS (
  SELECT
    c.shop_id,
    COALESCE(SUM(p.amount), 0) AS payments_total
  FROM shop_manager.payments p
  JOIN shop_manager.customers c ON c.id = p.customer_id
  WHERE p.created_at >= date_trunc('month', now())
    AND p.status IN ('completed','captured','paid','succeeded')
  GROUP BY c.shop_id
),
exp AS (
  SELECT
    e.shop_id,
    COALESCE(SUM(e.amount), 0) AS expense_total
  FROM shop_manager.expenses e
  WHERE e.created_at >= date_trunc('month', now())
  GROUP BY e.shop_id
)
SELECT
  s.id AS shop_id,
  date_trunc('month', now()) AS period_start,
  COALESCE(inv.invoice_count, 0) AS invoice_count,
  COALESCE(inv.invoiced_total, 0) AS invoiced_total,
  COALESCE(inv.unpaid_total, 0) AS unpaid_total,
  COALESCE(pay.payments_total, 0) AS payments_total,
  COALESCE(exp.expense_total, 0) AS expense_total,
  COALESCE(pay.payments_total, 0) - COALESCE(exp.expense_total, 0) AS net_cash
FROM shop_manager.shops s
LEFT JOIN inv ON inv.shop_id = s.id
LEFT JOIN pay ON pay.shop_id = s.id
LEFT JOIN exp ON exp.shop_id = s.id;

GRANT SELECT ON shop_manager.financial_summary_view TO authenticated;
