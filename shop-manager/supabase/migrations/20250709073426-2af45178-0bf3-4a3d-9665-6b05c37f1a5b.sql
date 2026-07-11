-- Phase 8B: Advanced Integration Features and Automation (Clean)

-- Integration automation workflows
CREATE TABLE IF NOT EXISTS public.integration_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  integration_id uuid REFERENCES public.shop_integrations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL CHECK (trigger_type IN ('webhook', 'schedule', 'manual', 'data_change')),
  trigger_config jsonb DEFAULT '{}',
  actions jsonb DEFAULT '[]',
  conditions jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  last_run_at timestamp with time zone,
  next_run_at timestamp with time zone,
  run_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  created_by text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Workflow execution logs
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.integration_workflows(id) ON DELETE CASCADE,
  trigger_data jsonb DEFAULT '{}',
  execution_status text NOT NULL CHECK (execution_status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  error_message text,
  execution_log jsonb DEFAULT '[]',
  execution_time_ms integer,
  retry_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Data sync mappings for field mapping between systems
CREATE TABLE IF NOT EXISTS public.integration_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.shop_integrations(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- 'customer', 'work_order', 'invoice', etc.
  source_field text NOT NULL,
  target_field text NOT NULL,
  transformation_rule jsonb DEFAULT '{}',
  field_type text DEFAULT 'string',
  is_required boolean DEFAULT false,
  default_value text,
  validation_rules jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Integration analytics and metrics
CREATE TABLE IF NOT EXISTS public.integration_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.shop_integrations(id) ON DELETE CASCADE,
  metric_type text NOT NULL, -- 'sync_success', 'sync_failure', 'api_call', 'webhook_received', etc.
  metric_value numeric DEFAULT 0,
  metric_metadata jsonb DEFAULT '{}',
  recorded_at timestamp with time zone DEFAULT now(),
  time_bucket timestamp with time zone, -- For time-series aggregation
  created_at timestamp with time zone DEFAULT now()
);

-- Data sync queue for batch operations
CREATE TABLE IF NOT EXISTS public.sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.shop_integrations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  operation_type text NOT NULL CHECK (operation_type IN ('create', 'update', 'delete')),
  sync_direction text NOT NULL CHECK (sync_direction IN ('inbound', 'outbound', 'bidirectional')),
  entity_data jsonb DEFAULT '{}',
  priority integer DEFAULT 5,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  error_message text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Integration templates for common configurations
CREATE TABLE IF NOT EXISTS public.integration_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.integration_providers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  config_template jsonb DEFAULT '{}',
  field_mappings jsonb DEFAULT '{}',
  workflow_templates jsonb DEFAULT '[]',
  is_public boolean DEFAULT true,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_integration_workflows_shop_id ON public.integration_workflows(shop_id);
CREATE INDEX IF NOT EXISTS idx_integration_workflows_integration_id ON public.integration_workflows(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_workflows_trigger_type ON public.integration_workflows(trigger_type);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(execution_status);

CREATE INDEX IF NOT EXISTS idx_field_mappings_integration_id ON public.integration_field_mappings(integration_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_entity_type ON public.integration_field_mappings(entity_type);

CREATE INDEX IF NOT EXISTS idx_integration_analytics_integration_id ON public.integration_analytics(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_analytics_metric_type ON public.integration_analytics(metric_type);

CREATE INDEX IF NOT EXISTS idx_sync_queue_integration_id ON public.sync_queue(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.sync_queue(status);

-- Add RLS policies
ALTER TABLE public.integration_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integration_workflows
CREATE POLICY "Shop members can manage workflows" ON public.integration_workflows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.shop_id = integration_workflows.shop_id
    )
  );

-- RLS Policies for workflow_executions
CREATE POLICY "Shop members can view workflow executions" ON public.workflow_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.integration_workflows w
      JOIN public.profiles p ON p.shop_id = w.shop_id
      WHERE w.id = workflow_executions.workflow_id AND p.id = auth.uid()
    )
  );

-- RLS Policies for integration_field_mappings
CREATE POLICY "Shop members can manage field mappings" ON public.integration_field_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shop_integrations si
      JOIN public.profiles p ON p.shop_id = si.shop_id
      WHERE si.id = integration_field_mappings.integration_id AND p.id = auth.uid()
    )
  );

-- RLS Policies for integration_analytics
CREATE POLICY "Shop members can view analytics" ON public.integration_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shop_integrations si
      JOIN public.profiles p ON p.shop_id = si.shop_id
      WHERE si.id = integration_analytics.integration_id AND p.id = auth.uid()
    )
  );

-- RLS Policies for sync_queue
CREATE POLICY "Shop members can manage sync queue" ON public.sync_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shop_integrations si
      JOIN public.profiles p ON p.shop_id = si.shop_id
      WHERE si.id = sync_queue.integration_id AND p.id = auth.uid()
    )
  );

-- RLS Policies for integration_templates
CREATE POLICY "Everyone can view public templates" ON public.integration_templates
  FOR SELECT USING (is_public = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create templates" ON public.integration_templates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_integration_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_integration_workflows_updated_at
  BEFORE UPDATE ON public.integration_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_integration_workflows_updated_at();

CREATE TRIGGER update_integration_field_mappings_updated_at
  BEFORE UPDATE ON public.integration_field_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sync_queue_updated_at
  BEFORE UPDATE ON public.sync_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integration_templates_updated_at
  BEFORE UPDATE ON public.integration_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample integration templates
INSERT INTO public.integration_templates (provider_id, name, description, category, config_template, field_mappings, workflow_templates) VALUES
(
  (SELECT id FROM public.integration_providers WHERE slug = 'quickbooks' LIMIT 1),
  'Basic Customer Sync',
  'Synchronize customer data between your shop and QuickBooks',
  'accounting',
  '{"sync_direction": "bidirectional", "sync_frequency": "hourly"}',
  '{"customer": {"first_name": "Name", "last_name": "Name", "email": "PrimaryEmailAddr.Address", "phone": "PrimaryPhone.FreeFormNumber"}}',
  '[{"name": "Customer Created", "trigger": "customer_created", "actions": [{"type": "sync_to_quickbooks", "entity": "customer"}]}]'
),
(
  (SELECT id FROM public.integration_providers WHERE slug = 'mailchimp' LIMIT 1),
  'Customer Email Sync',
  'Add new customers to Mailchimp mailing lists',
  'marketing',
  '{"default_list_id": "", "tags": ["customer"], "double_optin": false}',
  '{"customer": {"email": "email_address", "first_name": "merge_fields.FNAME", "last_name": "merge_fields.LNAME"}}',
  '[{"name": "New Customer to Mailchimp", "trigger": "customer_created", "actions": [{"type": "add_to_mailchimp", "list_id": "default"}]}]'
);

-- Create functions for workflow automation
CREATE OR REPLACE FUNCTION public.trigger_integration_workflow(
  p_workflow_id uuid,
  p_trigger_data jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
  execution_id uuid;
BEGIN
  INSERT INTO public.workflow_executions (
    workflow_id,
    trigger_data,
    execution_status
  ) VALUES (
    p_workflow_id,
    p_trigger_data,
    'running'
  ) RETURNING id INTO execution_id;
  
  -- Update workflow run statistics
  UPDATE public.integration_workflows
  SET 
    last_run_at = now(),
    run_count = run_count + 1
  WHERE id = p_workflow_id;
  
  RETURN execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record integration metrics
CREATE OR REPLACE FUNCTION public.record_integration_metric(
  p_integration_id uuid,
  p_metric_type text,
  p_metric_value numeric DEFAULT 1,
  p_metadata jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
  metric_id uuid;
  time_bucket timestamp with time zone;
BEGIN
  -- Round to nearest hour for time-series aggregation
  time_bucket := date_trunc('hour', now());
  
  INSERT INTO public.integration_analytics (
    integration_id,
    metric_type,
    metric_value,
    metric_metadata,
    time_bucket
  ) VALUES (
    p_integration_id,
    p_metric_type,
    p_metric_value,
    p_metadata,
    time_bucket
  ) RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;