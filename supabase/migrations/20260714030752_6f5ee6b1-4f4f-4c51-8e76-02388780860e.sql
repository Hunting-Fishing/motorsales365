
-- Suppliers: no shop_id column; scope by whether user belongs to any shop
CREATE POLICY sm_suppliers_all ON shop_manager.suppliers
  FOR ALL TO authenticated
  USING (shop_manager.get_current_user_shop_id() IS NOT NULL)
  WITH CHECK (shop_manager.get_current_user_shop_id() IS NOT NULL);

CREATE POLICY sm_vendor_bills_all ON shop_manager.vendor_bills
  FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

CREATE POLICY sm_vendor_bill_lines_all ON shop_manager.vendor_bill_lines
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shop_manager.vendor_bills b WHERE b.id = vendor_bill_lines.bill_id AND b.shop_id = shop_manager.get_current_user_shop_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.vendor_bills b WHERE b.id = vendor_bill_lines.bill_id AND b.shop_id = shop_manager.get_current_user_shop_id()));

CREATE POLICY sm_vendor_payments_all ON shop_manager.vendor_payments
  FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());
