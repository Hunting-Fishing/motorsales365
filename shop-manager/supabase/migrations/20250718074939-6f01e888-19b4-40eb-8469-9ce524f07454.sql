-- CRITICAL SECURITY REPAIR: Phase 1 - RLS Policy Creation for Unprotected Tables
-- This migration addresses the 60 tables with RLS enabled but no policies

-- Enable RLS and create policies for critical business tables
ALTER TABLE public.business_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for business types" ON public.business_types FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage business types" ON public.business_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view calendar events" ON public.calendar_events FOR SELECT TO authenticated USING (
  created_by = auth.uid() OR 
  technician_id::text = auth.uid()::text OR
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);
CREATE POLICY "Users can create calendar events" ON public.calendar_events FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);
CREATE POLICY "Users can update their calendar events" ON public.calendar_events FOR UPDATE TO authenticated USING (
  created_by = auth.uid() OR 
  technician_id::text = auth.uid()::text OR
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);
CREATE POLICY "Users can delete their calendar events" ON public.calendar_events FOR DELETE TO authenticated USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);

ALTER TABLE public.calendar_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their calendar preferences" ON public.calendar_preferences FOR ALL TO authenticated USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view all call logs" ON public.call_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'reception'))
);
CREATE POLICY "Staff can create call logs" ON public.call_logs FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'reception'))
);
CREATE POLICY "Staff can update call logs" ON public.call_logs FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'reception'))
);

ALTER TABLE public.campaign_segment_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Marketing staff can manage campaign performance" ON public.campaign_segment_performance FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'marketing'))
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their cart items" ON public.cart_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM shopping_carts sc WHERE sc.id = cart_items.cart_id AND sc.customer_id::text = auth.uid()::text)
) WITH CHECK (
  EXISTS (SELECT 1 FROM shopping_carts sc WHERE sc.id = cart_items.cart_id AND sc.customer_id::text = auth.uid()::text)
);

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their reactions" ON public.chat_message_reactions FOR ALL TO authenticated USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

ALTER TABLE public.chat_message_read_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their read receipts" ON public.chat_message_read_receipts FOR ALL TO authenticated USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view chat participants" ON public.chat_participants FOR SELECT TO authenticated USING (
  user_id::text = auth.uid()::text OR
  EXISTS (SELECT 1 FROM chat_participants cp WHERE cp.room_id = chat_participants.room_id AND cp.user_id::text = auth.uid()::text)
);
CREATE POLICY "Users can join chat rooms" ON public.chat_participants FOR INSERT TO authenticated WITH CHECK (user_id::text = auth.uid()::text);

ALTER TABLE public.chat_typing_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view typing indicators in their rooms" ON public.chat_typing_indicators FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM chat_participants cp WHERE cp.room_id = chat_typing_indicators.room_id AND cp.user_id::text = auth.uid()::text)
);
CREATE POLICY "Users can create their typing indicators" ON public.chat_typing_indicators FOR INSERT TO authenticated WITH CHECK (user_id::text = auth.uid()::text);
CREATE POLICY "Users can update their typing indicators" ON public.chat_typing_indicators FOR UPDATE TO authenticated USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users can delete their typing indicators" ON public.chat_typing_indicators FOR DELETE TO authenticated USING (user_id::text = auth.uid()::text);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view checklist items" ON public.checklist_items FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM work_order_checklists woc 
    JOIN work_orders wo ON wo.id = woc.work_order_id 
    WHERE woc.id = checklist_items.checklist_id AND 
    (wo.technician_id::text = auth.uid()::text OR wo.advisor_id::text = auth.uid()::text OR
     EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager')))
  )
);
CREATE POLICY "Staff can manage checklist items" ON public.checklist_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'technician'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager', 'technician'))
);

ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view communication templates from their shop" ON public.communication_templates FOR SELECT TO authenticated USING (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid())
);
CREATE POLICY "Staff can manage communication templates" ON public.communication_templates FOR ALL TO authenticated USING (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()) AND
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
) WITH CHECK (
  shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()) AND
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'manager'))
);

-- Continue with more critical tables
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
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

-- Fix function search paths for security (addressing 66 mutable search path functions)
DO $$
DECLARE
    func_rec RECORD;
    func_count INTEGER := 0;
    func_signature TEXT;
BEGIN
    -- Fix all remaining functions with mutable search paths
    FOR func_rec IN 
        SELECT 
            n.nspname as schema_name, 
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as func_args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname NOT LIKE 'pg_%'
        AND p.proname NOT LIKE 'information_schema%'
        AND p.prosrc IS NOT NULL
        -- Check if search_path is not already set in proconfig
        AND NOT (
            p.proconfig IS NOT NULL 
            AND EXISTS (
                SELECT 1 
                FROM unnest(p.proconfig) AS config 
                WHERE config LIKE 'search_path=%'
            )
        )
        ORDER BY p.proname
    LOOP
        BEGIN
            -- Build function signature
            IF func_rec.func_args = '' THEN
                func_signature := format('%I.%I()', func_rec.schema_name, func_rec.function_name);
            ELSE
                func_signature := format('%I.%I(%s)', func_rec.schema_name, func_rec.function_name, func_rec.func_args);
            END IF;
            
            -- Set search_path for the function
            EXECUTE format('ALTER FUNCTION %s SET search_path = public', func_signature);
            func_count := func_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log errors but continue with other functions
            RAISE NOTICE 'Could not set search_path for function %: %', func_rec.function_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Fixed search_path for % functions in security repair', func_count;
END
$$;

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
END;
$$;

-- Log this security repair
SELECT public.log_security_event(
  'security_repair_phase_1',
  'Applied critical RLS policies and function security fixes',
  auth.uid(),
  '{"phase": 1, "tables_secured": "business_types,calendar_events,calendar_preferences,call_logs,campaign_segment_performance,cart_items,chat_*,checklist_items,communication_templates,company_settings", "functions_fixed": "all_with_mutable_search_path"}'::jsonb
);