-- Create workflow automation tables
CREATE TABLE workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'status_change', 'time_based', 'field_change', 'customer_action'
  trigger_config JSONB NOT NULL DEFAULT '{}', -- Configuration for the trigger
  is_active BOOLEAN DEFAULT true,
  shop_id UUID NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE workflow_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID REFERENCES workflow_triggers(id) ON DELETE CASCADE,
  condition_type TEXT NOT NULL, -- 'field_equals', 'field_contains', 'time_range', 'custom'
  field_name TEXT,
  operator TEXT NOT NULL, -- 'equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'between'
  condition_value JSONB NOT NULL,
  logical_operator TEXT DEFAULT 'AND', -- 'AND', 'OR' for chaining conditions
  condition_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID REFERENCES workflow_triggers(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'assign_technician', 'change_status', 'send_notification', 'update_field', 'create_task'
  action_config JSONB NOT NULL DEFAULT '{}',
  action_order INTEGER DEFAULT 0,
  delay_minutes INTEGER DEFAULT 0, -- Delay before executing this action
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID REFERENCES workflow_triggers(id),
  work_order_id UUID,
  execution_status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  execution_log JSONB DEFAULT '[]',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- Triggers RLS policies
CREATE POLICY "Users can manage workflow triggers in their shop" ON workflow_triggers
FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Conditions RLS policies  
CREATE POLICY "Users can manage workflow conditions in their shop" ON workflow_conditions
FOR ALL USING (trigger_id IN (
  SELECT id FROM workflow_triggers WHERE shop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
  )
));

-- Actions RLS policies
CREATE POLICY "Users can manage workflow actions in their shop" ON workflow_actions
FOR ALL USING (trigger_id IN (
  SELECT id FROM workflow_triggers WHERE shop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
  )
));

-- Executions RLS policies
CREATE POLICY "Users can view workflow executions in their shop" ON workflow_executions
FOR ALL USING (trigger_id IN (
  SELECT id FROM workflow_triggers WHERE shop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
  )
));

-- Create indexes for performance
CREATE INDEX idx_workflow_triggers_shop_id ON workflow_triggers(shop_id);
CREATE INDEX idx_workflow_triggers_active ON workflow_triggers(is_active) WHERE is_active = true;
CREATE INDEX idx_workflow_conditions_trigger_id ON workflow_conditions(trigger_id);
CREATE INDEX idx_workflow_actions_trigger_id ON workflow_actions(trigger_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(execution_status);
CREATE INDEX idx_workflow_executions_work_order ON workflow_executions(work_order_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_workflow_triggers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_workflow_triggers_updated_at
BEFORE UPDATE ON workflow_triggers
FOR EACH ROW
EXECUTE FUNCTION update_workflow_triggers_updated_at();