-- Phase 8A: Advanced Integrations Foundation

-- Integration providers (CRM, accounting, etc.)
CREATE TABLE public.integration_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'crm', 'accounting', 'communication', 'analytics'
  logo_url TEXT,
  website_url TEXT,
  documentation_url TEXT,
  api_version TEXT,
  auth_type TEXT NOT NULL, -- 'oauth2', 'api_key', 'basic', 'custom'
  auth_config JSONB DEFAULT '{}',
  rate_limits JSONB DEFAULT '{}',
  webhook_support BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Shop integrations (specific integration instances)
CREATE TABLE public.shop_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.integration_providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  auth_credentials JSONB DEFAULT '{}', -- encrypted credentials
  configuration JSONB DEFAULT '{}',
  sync_settings JSONB DEFAULT '{}',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'active', 'error', 'disabled'
  error_details TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(shop_id, provider_id)
);

-- Integration sync jobs and logs
CREATE TABLE public.integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.shop_integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'full', 'incremental', 'manual'
  direction TEXT NOT NULL, -- 'import', 'export', 'bidirectional'
  entity_type TEXT, -- 'customers', 'invoices', 'work_orders'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
  records_processed INTEGER DEFAULT 0,
  records_successful INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  error_details JSONB,
  metadata JSONB DEFAULT '{}',
  created_by UUID
);

-- Webhook endpoints management
CREATE TABLE public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  integration_id UUID REFERENCES public.shop_integrations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret_key TEXT, -- for signature verification
  events TEXT[] NOT NULL, -- events this webhook subscribes to
  headers JSONB DEFAULT '{}',
  retry_config JSONB DEFAULT '{"max_retries": 3, "retry_delay": 60}',
  timeout_seconds INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Webhook delivery logs
CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_id UUID,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  response_headers JSONB,
  delivery_attempts INTEGER DEFAULT 1,
  delivered_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- API rate limiting tracking
CREATE TABLE public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.shop_integrations(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  requests_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  window_duration_minutes INTEGER DEFAULT 60,
  limit_per_window INTEGER NOT NULL,
  last_request_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(integration_id, endpoint, window_start)
);

-- External system mappings (field mapping between systems)
CREATE TABLE public.integration_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.shop_integrations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'customer', 'invoice', 'work_order'
  local_field TEXT NOT NULL,
  external_field TEXT NOT NULL,
  transformation_rule JSONB, -- rules for data transformation
  is_required BOOLEAN DEFAULT false,
  sync_direction TEXT DEFAULT 'bidirectional', -- 'import', 'export', 'bidirectional'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_integration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_integration_providers_updated_at
  BEFORE UPDATE ON public.integration_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_integration_updated_at();

CREATE TRIGGER update_shop_integrations_updated_at
  BEFORE UPDATE ON public.shop_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_integration_updated_at();

CREATE TRIGGER update_webhook_endpoints_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_integration_updated_at();

CREATE TRIGGER update_api_rate_limits_updated_at
  BEFORE UPDATE ON public.api_rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_integration_updated_at();

CREATE TRIGGER update_integration_field_mappings_updated_at
  BEFORE UPDATE ON public.integration_field_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_integration_updated_at();

-- Enable RLS on all tables
ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_field_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Integration providers are visible to all authenticated users
CREATE POLICY "Integration providers are viewable by authenticated users"
ON public.integration_providers FOR SELECT
TO authenticated
USING (is_active = true);

-- Shop integrations are only accessible by shop members
CREATE POLICY "Shop integrations are viewable by shop members"
ON public.shop_integrations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND shop_id = shop_integrations.shop_id
  )
);

-- Sync logs follow shop integration access
CREATE POLICY "Sync logs are viewable by shop members"
ON public.integration_sync_logs FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shop_integrations si
    JOIN public.profiles p ON p.shop_id = si.shop_id
    WHERE si.id = integration_sync_logs.integration_id AND p.id = auth.uid()
  )
);

-- Webhook endpoints follow shop access
CREATE POLICY "Webhook endpoints are viewable by shop members"
ON public.webhook_endpoints FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND shop_id = webhook_endpoints.shop_id
  )
);

-- Webhook deliveries follow endpoint access
CREATE POLICY "Webhook deliveries are viewable by shop members"
ON public.webhook_deliveries FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.webhook_endpoints we
    JOIN public.profiles p ON p.shop_id = we.shop_id
    WHERE we.id = webhook_deliveries.endpoint_id AND p.id = auth.uid()
  )
);

-- Rate limits follow integration access
CREATE POLICY "Rate limits are viewable by shop members"
ON public.api_rate_limits FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shop_integrations si
    JOIN public.profiles p ON p.shop_id = si.shop_id
    WHERE si.id = api_rate_limits.integration_id AND p.id = auth.uid()
  )
);

-- Field mappings follow integration access
CREATE POLICY "Field mappings are viewable by shop members"
ON public.integration_field_mappings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shop_integrations si
    JOIN public.profiles p ON p.shop_id = si.shop_id
    WHERE si.id = integration_field_mappings.integration_id AND p.id = auth.uid()
  )
);

-- Insert some sample integration providers
INSERT INTO public.integration_providers (name, slug, description, category, auth_type, webhook_support) VALUES
('QuickBooks Online', 'quickbooks', 'Sync customers, invoices, and payments with QuickBooks Online', 'accounting', 'oauth2', true),
('Salesforce', 'salesforce', 'Customer relationship management integration', 'crm', 'oauth2', true),
('Zapier', 'zapier', 'Connect to 5000+ apps through Zapier automation', 'automation', 'api_key', true),
('Mailchimp', 'mailchimp', 'Email marketing and customer communication', 'communication', 'oauth2', true),
('Stripe', 'stripe', 'Payment processing and subscription management', 'payment', 'api_key', true),
('Xero', 'xero', 'Cloud-based accounting software integration', 'accounting', 'oauth2', true),
('HubSpot', 'hubspot', 'Inbound marketing and sales platform', 'crm', 'oauth2', true),
('Slack', 'slack', 'Team communication and notifications', 'communication', 'oauth2', true);

-- Helper functions for integration management
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_integration_id UUID,
  p_endpoint TEXT,
  p_limit INTEGER,
  p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := date_trunc('hour', now()) + 
    INTERVAL '1 minute' * (EXTRACT(MINUTE FROM now())::INTEGER / p_window_minutes * p_window_minutes);
  
  SELECT COALESCE(requests_count, 0) INTO current_count
  FROM public.api_rate_limits
  WHERE integration_id = p_integration_id 
    AND endpoint = p_endpoint 
    AND window_start = window_start;
  
  RETURN COALESCE(current_count, 0) < p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_integration_id UUID,
  p_endpoint TEXT,
  p_limit INTEGER,
  p_window_minutes INTEGER DEFAULT 60
) RETURNS VOID AS $$
DECLARE
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := date_trunc('hour', now()) + 
    INTERVAL '1 minute' * (EXTRACT(MINUTE FROM now())::INTEGER / p_window_minutes * p_window_minutes);
  
  INSERT INTO public.api_rate_limits (
    integration_id, endpoint, requests_count, window_start, 
    window_duration_minutes, limit_per_window, last_request_at
  ) VALUES (
    p_integration_id, p_endpoint, 1, window_start, 
    p_window_minutes, p_limit, now()
  )
  ON CONFLICT (integration_id, endpoint, window_start)
  DO UPDATE SET 
    requests_count = api_rate_limits.requests_count + 1,
    last_request_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;