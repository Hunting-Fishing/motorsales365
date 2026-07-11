-- CRITICAL SECURITY REPAIR: Phase 1 - Essential RLS Policies Only
-- Fixed version addressing core security vulnerabilities

-- Add missing app_role enum values safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'marketing' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE app_role ADD VALUE 'marketing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'reception' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE app_role ADD VALUE 'reception';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'service_advisor' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE app_role ADD VALUE 'service_advisor';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add enum values: %', SQLERRM;
END;
$$;

-- Secure business reference tables
CREATE POLICY "Public read access for business types" ON public.business_types FOR SELECT USING (true);

-- Secure calendar system
CREATE POLICY "Users can view calendar events" ON public.calendar_events FOR SELECT TO authenticated USING (
  created_by = auth.uid() OR 
  technician_id::text = auth.uid()::text OR
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);
CREATE POLICY "Staff can manage calendar events" ON public.calendar_events FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'technician'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'technician'))
);

CREATE POLICY "Users can manage their calendar preferences" ON public.calendar_preferences FOR ALL TO authenticated USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- Secure call logs (staff only)
CREATE POLICY "Staff can view call logs" ON public.call_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'reception'))
);
CREATE POLICY "Staff can manage call logs" ON public.call_logs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'reception'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'reception'))
);

-- Secure campaign performance (admin only for now)
CREATE POLICY "Admins can manage campaign performance" ON public.campaign_segment_performance FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner'))
);

-- Secure shopping cart items (authenticated users only for now - will need refinement)
CREATE POLICY "Authenticated users can manage cart items" ON public.cart_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Secure chat system - users can only manage their own interactions
CREATE POLICY "Users can manage their reactions" ON public.chat_message_reactions FOR ALL TO authenticated USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can manage their read receipts" ON public.chat_message_read_receipts FOR ALL TO authenticated USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can participate in chats" ON public.chat_participants FOR ALL TO authenticated USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can manage their typing indicators" ON public.chat_typing_indicators FOR ALL TO authenticated USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- Secure checklist items (work order related)
CREATE POLICY "Staff can manage checklist items" ON public.checklist_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'technician'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'technician'))
);

-- Secure communication templates (shop-based)
CREATE POLICY "Users can view communication templates from their shop" ON public.communication_templates FOR SELECT TO authenticated USING (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid())
);
CREATE POLICY "Admins can manage communication templates" ON public.communication_templates FOR ALL TO authenticated USING (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()) AND
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner'))
) WITH CHECK (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()) AND
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner'))
);

-- Secure company settings (shop-based, admin managed)
CREATE POLICY "Users can view their shop settings" ON public.company_settings FOR SELECT TO authenticated USING (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid())
);
CREATE POLICY "Admins can manage shop settings" ON public.company_settings FOR ALL TO authenticated USING (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()) AND
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner'))
) WITH CHECK (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()) AND
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner'))
);

-- Create security logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  event_description TEXT,
  user_id UUID DEFAULT auth.uid(),
  metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    resource,
    details,
    ip_address,
    created_at
  ) VALUES (
    user_id,
    event_type,
    'security_event',
    jsonb_build_object(
      'description', event_description,
      'metadata', metadata,
      'timestamp', now()
    ),
    inet_client_addr()::text,
    now()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently if audit_logs table doesn't exist or has issues
    RAISE NOTICE 'Could not log security event: %', SQLERRM;
END;
$$;

-- Log this security repair attempt
SELECT log_security_event(
  'security_repair_phase_1_essential',
  'Applied essential RLS policies for critical unprotected tables',
  auth.uid(),
  '{"phase": 1, "status": "essential_policies_applied"}'::jsonb
);