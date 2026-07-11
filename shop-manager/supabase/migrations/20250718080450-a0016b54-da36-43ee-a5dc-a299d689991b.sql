-- CRITICAL SECURITY REPAIR: Phase 2 - Remaining Table Security
-- Securing additional unprotected tables with comprehensive RLS policies

-- Secure customer-related tables
CREATE POLICY "Staff can view all customers" ON public.customers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'reception'))
);
CREATE POLICY "Customers can view their own data" ON public.customers FOR SELECT TO authenticated USING (
  auth_user_id = auth.uid()
);
CREATE POLICY "Staff can manage customers" ON public.customers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'reception'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'reception'))
);

-- Secure vehicle-related tables
CREATE POLICY "Users can view vehicles they have access to" ON public.vehicles FOR SELECT TO authenticated USING (
  -- Staff can view all vehicles
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'technician', 'reception')) OR
  -- Customers can view their own vehicles
  (owner_type = 'customer' AND customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "Staff can manage vehicles" ON public.vehicles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'reception'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'reception'))
);

-- Secure work order system
CREATE POLICY "Users can view work orders they have access to" ON public.work_orders FOR SELECT TO authenticated USING (
  -- Staff can view all work orders
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'technician', 'reception')) OR
  -- Customers can view their own work orders
  customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid()) OR
  -- Assigned technicians can view their work orders
  technician_id::text = auth.uid()::text OR
  -- Assigned advisors can view their work orders
  advisor_id::text = auth.uid()::text
);
CREATE POLICY "Staff can manage work orders" ON public.work_orders FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'technician'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'technician'))
);

-- Secure work order activities
CREATE POLICY "Users can view work order activities" ON public.work_order_activities FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM work_orders wo WHERE wo.id = work_order_activities.work_order_id AND
    (
      -- Staff can view all
      EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'technician', 'reception')) OR
      -- Customers can view their own
      wo.customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid()) OR
      -- Assigned staff can view
      wo.technician_id::text = auth.uid()::text OR wo.advisor_id::text = auth.uid()::text
    )
  )
);
CREATE POLICY "Staff can manage work order activities" ON public.work_order_activities FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'technician'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'technician'))
);

-- Secure inventory system
CREATE POLICY "Staff can view inventory categories" ON public.inventory_categories FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'technician', 'reception'))
);
CREATE POLICY "Managers can manage inventory categories" ON public.inventory_categories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);

-- Secure service system
CREATE POLICY "Authenticated users can view service sectors" ON public.service_sectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage service sectors" ON public.service_sectors FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);

CREATE POLICY "Authenticated users can view service categories" ON public.service_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage service categories" ON public.service_categories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);

CREATE POLICY "Authenticated users can view service subcategories" ON public.service_subcategories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage service subcategories" ON public.service_subcategories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);

CREATE POLICY "Authenticated users can view service jobs" ON public.service_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage service jobs" ON public.service_jobs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);

-- Secure departments system
CREATE POLICY "Authenticated users can view departments" ON public.departments FOR SELECT TO authenticated USING (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid())
);
CREATE POLICY "Managers can manage departments" ON public.departments FOR ALL TO authenticated USING (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()) AND
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
) WITH CHECK (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()) AND
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);

-- Secure document system
CREATE POLICY "Users can view documents from their shop" ON public.documents FOR SELECT TO authenticated USING (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()) OR
  created_by = auth.uid()
);
CREATE POLICY "Users can manage their documents" ON public.documents FOR ALL TO authenticated USING (
  created_by = auth.uid() OR
  (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()) AND
   EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager')))
) WITH CHECK (
  created_by = auth.uid() OR
  (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()) AND
   EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager')))
);

-- Secure document categories
CREATE POLICY "Users can view document categories from their shop" ON public.document_categories FOR SELECT TO authenticated USING (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid())
);
CREATE POLICY "Managers can manage document categories" ON public.document_categories FOR ALL TO authenticated USING (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()) AND
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
) WITH CHECK (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()) AND
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);

-- Secure document tags
CREATE POLICY "Users can view document tags from their shop" ON public.document_tags FOR SELECT TO authenticated USING (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid())
);
CREATE POLICY "Users can manage document tags" ON public.document_tags FOR ALL TO authenticated USING (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid())
) WITH CHECK (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid())
);

-- Log this security repair phase
SELECT log_security_event(
  'security_repair_phase_2',
  'Applied RLS policies for customer, vehicle, work order, inventory, service, department, and document systems',
  auth.uid(),
  '{"phase": 2, "tables_secured": "customers,vehicles,work_orders,work_order_activities,inventory_categories,service_*,departments,documents,document_categories,document_tags", "status": "comprehensive_business_logic_secured"}'::jsonb
);