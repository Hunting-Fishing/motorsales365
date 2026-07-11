-- Add RLS policies and remaining database setup

-- RLS Policies for admin access
CREATE POLICY "Admins can manage permissions" ON public.permissions FOR ALL TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role)) 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage role permissions" ON public.role_permissions FOR ALL TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role)) 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view audit trail" ON public.audit_trail FOR SELECT TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit trail" ON public.audit_trail FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Admins can view performance metrics" ON public.performance_metrics FOR ALL TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role)) 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view security events" ON public.security_events FOR ALL TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role)) 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage their own 2FA" ON public.user_2fa FOR ALL TO authenticated 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own API tokens" ON public.api_tokens FOR ALL TO authenticated 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage BI reports" ON public.bi_reports FOR ALL TO authenticated 
USING (created_by = auth.uid() OR is_public = true) 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view report executions" ON public.report_executions FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.bi_reports WHERE id = report_id AND (created_by = auth.uid() OR is_public = true)));

CREATE POLICY "Admins can manage system settings" ON public.system_settings FOR ALL TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_public = true) 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create audit logging function
CREATE OR REPLACE FUNCTION public.log_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_trail (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    ip_address,
    created_at
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    inet_client_addr(),
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to important tables (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
    DROP TRIGGER IF EXISTS audit_products ON public.products;
    CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
    DROP TRIGGER IF EXISTS audit_orders ON public.orders;
    CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
    DROP TRIGGER IF EXISTS audit_customers ON public.customers;
    CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;
END $$;

-- Performance optimization indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON public.audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON public.audit_trail(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_trail_resource_type ON public.audit_trail(resource_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at ON public.performance_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON public.api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON public.api_tokens(token_hash);