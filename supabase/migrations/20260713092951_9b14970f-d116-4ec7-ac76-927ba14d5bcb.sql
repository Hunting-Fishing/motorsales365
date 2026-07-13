
ALTER TABLE shop_manager.inventory_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access inventory_transactions" ON shop_manager.inventory_transactions;
CREATE POLICY "shop members access inventory_transactions"
ON shop_manager.inventory_transactions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.inventory_items i WHERE i.id = inventory_transactions.inventory_item_id AND i.shop_id = shop_manager.get_current_user_shop_id()))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.inventory_items i WHERE i.id = inventory_transactions.inventory_item_id AND i.shop_id = shop_manager.get_current_user_shop_id()));

ALTER TABLE shop_manager.work_order_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access work_order_parts" ON shop_manager.work_order_parts;
CREATE POLICY "shop members access work_order_parts"
ON shop_manager.work_order_parts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.work_orders w WHERE w.id = work_order_parts.work_order_id AND w.shop_id = shop_manager.get_current_user_shop_id()))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.work_orders w WHERE w.id = work_order_parts.work_order_id AND w.shop_id = shop_manager.get_current_user_shop_id()));

ALTER TABLE shop_manager.work_order_job_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access work_order_job_lines" ON shop_manager.work_order_job_lines;
CREATE POLICY "shop members access work_order_job_lines"
ON shop_manager.work_order_job_lines FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.work_orders w WHERE w.id = work_order_job_lines.work_order_id AND w.shop_id = shop_manager.get_current_user_shop_id()))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.work_orders w WHERE w.id = work_order_job_lines.work_order_id AND w.shop_id = shop_manager.get_current_user_shop_id()));

-- invoices: id is text; work_order_id is text; customer_id is uuid
ALTER TABLE shop_manager.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access invoices" ON shop_manager.invoices;
CREATE POLICY "shop members access invoices"
ON shop_manager.invoices FOR ALL TO authenticated
USING (
  (invoices.work_order_id IS NOT NULL AND EXISTS (SELECT 1 FROM shop_manager.work_orders w WHERE w.id::text = invoices.work_order_id AND w.shop_id = shop_manager.get_current_user_shop_id()))
  OR EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = invoices.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id())
)
WITH CHECK (
  (invoices.work_order_id IS NOT NULL AND EXISTS (SELECT 1 FROM shop_manager.work_orders w WHERE w.id::text = invoices.work_order_id AND w.shop_id = shop_manager.get_current_user_shop_id()))
  OR EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = invoices.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id())
);

ALTER TABLE shop_manager.invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access invoice_items" ON shop_manager.invoice_items;
CREATE POLICY "shop members access invoice_items"
ON shop_manager.invoice_items FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM shop_manager.invoices i
  LEFT JOIN shop_manager.work_orders w ON w.id::text = i.work_order_id
  LEFT JOIN shop_manager.customers c ON c.id = i.customer_id
  WHERE i.id = invoice_items.invoice_id
    AND (w.shop_id = shop_manager.get_current_user_shop_id() OR c.shop_id = shop_manager.get_current_user_shop_id())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM shop_manager.invoices i
  LEFT JOIN shop_manager.work_orders w ON w.id::text = i.work_order_id
  LEFT JOIN shop_manager.customers c ON c.id = i.customer_id
  WHERE i.id = invoice_items.invoice_id
    AND (w.shop_id = shop_manager.get_current_user_shop_id() OR c.shop_id = shop_manager.get_current_user_shop_id())
));

ALTER TABLE shop_manager.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access payments" ON shop_manager.payments;
CREATE POLICY "shop members access payments"
ON shop_manager.payments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = payments.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id()))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = payments.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id()));

ALTER TABLE shop_manager.purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access purchase_orders" ON shop_manager.purchase_orders;
CREATE POLICY "shop members access purchase_orders"
ON shop_manager.purchase_orders FOR ALL TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

ALTER TABLE shop_manager.purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access purchase_order_items" ON shop_manager.purchase_order_items;
CREATE POLICY "shop members access purchase_order_items"
ON shop_manager.purchase_order_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND (po.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND (po.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
