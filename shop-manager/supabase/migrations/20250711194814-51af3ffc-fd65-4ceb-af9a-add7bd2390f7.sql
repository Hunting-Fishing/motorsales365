-- Create API endpoints table for integration system
CREATE TABLE public.api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.shop_integrations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  headers JSONB DEFAULT '{}',
  parameters JSONB DEFAULT '{}',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  last_called_at TIMESTAMP WITH TIME ZONE,
  response_time_ms INTEGER,
  success_rate NUMERIC(5,2) DEFAULT 100.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;

-- API endpoints policies
CREATE POLICY "Shop members can view API endpoints" ON public.api_endpoints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shop_integrations si
      JOIN public.profiles p ON p.shop_id = si.shop_id
      WHERE si.id = api_endpoints.integration_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "Shop admins can manage API endpoints" ON public.api_endpoints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shop_integrations si
      JOIN public.profiles p ON p.shop_id = si.shop_id
      JOIN public.user_roles ur ON ur.user_id = p.id
      JOIN public.roles r ON r.id = ur.role_id
      WHERE si.id = api_endpoints.integration_id 
      AND p.id = auth.uid() 
      AND r.name IN ('admin', 'owner')
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_api_endpoints_updated_at
  BEFORE UPDATE ON public.api_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();