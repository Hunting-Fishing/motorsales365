-- CRITICAL SECURITY REPAIR: Phase 2B - Additional Table Security (Safe Version)
-- Securing remaining unprotected tables with safe policy creation

-- First, create policies for tables that definitely don't have them yet
-- Secure email and marketing system
CREATE POLICY "Admins can manage email campaigns" ON public.email_campaigns FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner'))
);

CREATE POLICY "Staff can view email campaigns" ON public.email_campaigns FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'marketing'))
);

-- Secure email templates
CREATE POLICY "Staff can view email templates" ON public.email_templates FOR SELECT TO authenticated USING (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid())
);
CREATE POLICY "Admins can manage email templates" ON public.email_templates FOR ALL TO authenticated USING (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()) AND
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner'))
) WITH CHECK (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()) AND
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner'))
);

-- Secure customer loyalty system
CREATE POLICY "Staff can view customer loyalty" ON public.customer_loyalty FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'reception'))
);
CREATE POLICY "Customers can view their loyalty data" ON public.customer_loyalty FOR SELECT TO authenticated USING (
  customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Staff can manage customer loyalty" ON public.customer_loyalty FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);

-- Secure customer communications
CREATE POLICY "Staff can view customer communications" ON public.customer_communications FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'reception'))
);
CREATE POLICY "Customers can view their communications" ON public.customer_communications FOR SELECT TO authenticated USING (
  customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Staff can manage customer communications" ON public.customer_communications FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'reception'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'reception'))
);

-- Secure customer feedback
CREATE POLICY "Staff can view customer feedback" ON public.customer_feedback FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor'))
);
CREATE POLICY "Customers can create feedback" ON public.customer_feedback FOR INSERT TO authenticated WITH CHECK (
  customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Customers can view their feedback" ON public.customer_feedback FOR SELECT TO authenticated USING (
  customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
);

-- Secure customer notes
CREATE POLICY "Staff can view customer notes" ON public.customer_notes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'reception'))
);
CREATE POLICY "Staff can manage customer notes" ON public.customer_notes FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'reception'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'service_advisor', 'reception'))
);

-- Secure customer referrals
CREATE POLICY "Staff can view customer referrals" ON public.customer_referrals FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'reception'))
);
CREATE POLICY "Customers can view their referrals" ON public.customer_referrals FOR SELECT TO authenticated USING (
  referring_customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid()) OR
  referred_customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Staff can manage customer referrals" ON public.customer_referrals FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);

-- Secure customer segments
CREATE POLICY "Staff can view customer segments" ON public.customer_segments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);
CREATE POLICY "Managers can manage customer segments" ON public.customer_segments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);

-- Secure discounts system
CREATE POLICY "Authenticated users can view active discounts" ON public.discounts FOR SELECT TO authenticated USING (
  is_active = true AND start_date <= now() AND (end_date IS NULL OR end_date >= now())
);
CREATE POLICY "Staff can view all discounts" ON public.discounts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'reception'))
);
CREATE POLICY "Managers can manage discounts" ON public.discounts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);

-- Log this security repair phase
SELECT log_security_event(
  'security_repair_phase_2b',
  'Applied RLS policies for email, customer loyalty, communications, feedback, referrals, segments, and discounts systems',
  auth.uid(),
  '{"phase": "2b", "tables_secured": "email_campaigns,email_templates,customer_loyalty,customer_communications,customer_feedback,customer_notes,customer_referrals,customer_segments,discounts", "status": "customer_management_secured"}'::jsonb
);