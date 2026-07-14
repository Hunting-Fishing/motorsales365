
-- Communications & notes: shop-scoped via customer join
CREATE POLICY sm_customer_comms_all ON shop_manager.customer_communications
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = customer_communications.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = customer_communications.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id()));

CREATE POLICY sm_customer_notes_all ON shop_manager.customer_notes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = customer_notes.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = customer_notes.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id()));
