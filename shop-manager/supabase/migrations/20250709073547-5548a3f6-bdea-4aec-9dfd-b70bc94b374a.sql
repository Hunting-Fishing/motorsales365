-- Phase 8B: Advanced Integration Features (Step by Step)

-- Step 1: Create integration_workflows table
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

-- Step 2: Create workflow_executions table (depends on integration_workflows)
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

-- Step 3: Create other tables
CREATE TABLE IF NOT EXISTS public.integration_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.shop_integrations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.integration_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.shop_integrations(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  metric_value numeric DEFAULT 0,
  metric_metadata jsonb DEFAULT '{}',
  recorded_at timestamp with time zone DEFAULT now(),
  time_bucket timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

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

-- Add basic indexes
CREATE INDEX IF NOT EXISTS idx_integration_workflows_shop_id ON public.integration_workflows(shop_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_integration_id ON public.integration_field_mappings(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_analytics_integration_id ON public.integration_analytics(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_integration_id ON public.sync_queue(integration_id);