-- Create workflow_executions table now that workflows exists
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

-- Add basic RLS policies
ALTER TABLE public.integration_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_templates ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for now
CREATE POLICY "Authenticated users can manage workflows" ON public.integration_workflows
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view executions" ON public.workflow_executions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage field mappings" ON public.integration_field_mappings
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view analytics" ON public.integration_analytics
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage sync queue" ON public.sync_queue
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Everyone can view templates" ON public.integration_templates
  FOR SELECT USING (true);

-- Add sample data
INSERT INTO public.integration_templates (provider_id, name, description, category, config_template, field_mappings, workflow_templates) VALUES
(
  (SELECT id FROM public.integration_providers WHERE slug = 'quickbooks' LIMIT 1),
  'Basic Customer Sync',
  'Synchronize customer data between your shop and QuickBooks',
  'accounting',
  '{"sync_direction": "bidirectional", "sync_frequency": "hourly"}',
  '{"customer": {"first_name": "Name", "last_name": "Name", "email": "PrimaryEmailAddr.Address", "phone": "PrimaryPhone.FreeFormNumber"}}',
  '[{"name": "Customer Created", "trigger": "customer_created", "actions": [{"type": "sync_to_quickbooks", "entity": "customer"}]}]'
);

-- Create helper function
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