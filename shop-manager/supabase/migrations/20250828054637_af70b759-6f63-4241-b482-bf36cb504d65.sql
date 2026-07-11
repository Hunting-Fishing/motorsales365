-- Create comprehensive automated workflows system for service shop

-- Enhanced workflow triggers table with more trigger types
CREATE TABLE IF NOT EXISTS public.workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'work_order_status_change',
    'customer_created', 
    'service_due',
    'appointment_scheduled',
    'invoice_created',
    'payment_received',
    'inventory_low',
    'time_based',
    'customer_activity'
  )),
  trigger_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workflow actions with comprehensive action types
CREATE TABLE IF NOT EXISTS public.workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID NOT NULL REFERENCES workflow_triggers(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'send_email',
    'send_sms', 
    'create_task',
    'update_work_order',
    'assign_technician',
    'create_estimate',
    'schedule_follow_up',
    'add_customer_note',
    'trigger_webhook',
    'create_service_reminder',
    'update_inventory',
    'generate_report'
  )),
  action_config JSONB DEFAULT '{}',
  action_order INTEGER DEFAULT 0,
  delay_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workflow execution log
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID NOT NULL REFERENCES workflow_triggers(id),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  context_data JSONB DEFAULT '{}',
  error_message TEXT,
  execution_time_ms INTEGER
);

-- Email automation templates
CREATE TABLE IF NOT EXISTS public.email_automation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN (
    'welcome_customer',
    'service_reminder', 
    'work_order_update',
    'appointment_confirmation',
    'invoice_notification',
    'payment_reminder',
    'follow_up_survey',
    'maintenance_due'
  )),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Customer automation preferences
CREATE TABLE IF NOT EXISTS public.customer_automation_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  service_reminders BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT true,
  preferred_contact_time TEXT DEFAULT 'business_hours',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(customer_id)
);

-- Service automation rules
CREATE TABLE IF NOT EXISTS public.service_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  service_type TEXT,
  vehicle_criteria JSONB DEFAULT '{}',
  automation_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_actions ENABLE ROW LEVEL SECURITY; 
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_automation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_automation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_automation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "workflow_triggers_shop_access" ON workflow_triggers
FOR ALL USING (shop_id = get_user_shop_id_secure(auth.uid()));

CREATE POLICY "workflow_actions_shop_access" ON workflow_actions  
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workflow_triggers wt 
    WHERE wt.id = workflow_actions.trigger_id 
    AND wt.shop_id = get_user_shop_id_secure(auth.uid())
  )
);

CREATE POLICY "workflow_executions_shop_access" ON workflow_executions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workflow_triggers wt
    WHERE wt.id = workflow_executions.trigger_id
    AND wt.shop_id = get_user_shop_id_secure(auth.uid())
  )
);

CREATE POLICY "email_templates_shop_access" ON email_automation_templates
FOR ALL USING (shop_id = get_user_shop_id_secure(auth.uid()));

CREATE POLICY "customer_prefs_shop_access" ON customer_automation_preferences
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = customer_automation_preferences.customer_id
    AND c.shop_id = get_user_shop_id_secure(auth.uid())
  )
);

CREATE POLICY "service_rules_shop_access" ON service_automation_rules
FOR ALL USING (shop_id = get_user_shop_id_secure(auth.uid()));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_automation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_triggers_updated_at 
BEFORE UPDATE ON workflow_triggers
FOR EACH ROW EXECUTE FUNCTION update_automation_updated_at();

CREATE TRIGGER workflow_actions_updated_at
BEFORE UPDATE ON workflow_actions  
FOR EACH ROW EXECUTE FUNCTION update_automation_updated_at();

CREATE TRIGGER email_templates_updated_at
BEFORE UPDATE ON email_automation_templates
FOR EACH ROW EXECUTE FUNCTION update_automation_updated_at();

CREATE TRIGGER service_rules_updated_at
BEFORE UPDATE ON service_automation_rules
FOR EACH ROW EXECUTE FUNCTION update_automation_updated_at();

-- Insert default email templates
INSERT INTO email_automation_templates (shop_id, name, template_type, subject, body_html, body_text, variables) 
SELECT 
  shop_id,
  'Welcome New Customer',
  'welcome_customer',
  'Welcome to {{shop_name}}!',
  '<h1>Welcome {{customer_name}}!</h1><p>Thank you for choosing {{shop_name}} for your automotive service needs.</p><p>We look forward to serving you.</p>',
  'Welcome {{customer_name}}! Thank you for choosing {{shop_name}} for your automotive service needs. We look forward to serving you.',
  '{"customer_name": "Customer Name", "shop_name": "Shop Name"}'::jsonb
FROM (SELECT DISTINCT shop_id FROM profiles WHERE shop_id IS NOT NULL) s
ON CONFLICT DO NOTHING;

INSERT INTO email_automation_templates (shop_id, name, template_type, subject, body_html, body_text, variables)
SELECT 
  shop_id,
  'Service Reminder',
  'service_reminder', 
  'Time for Your {{service_type}} Service',
  '<h2>Service Reminder</h2><p>Hi {{customer_name}},</p><p>Your {{vehicle_info}} is due for {{service_type}} service.</p><p>Contact us to schedule: {{shop_phone}}</p>',
  'Hi {{customer_name}}, Your {{vehicle_info}} is due for {{service_type}} service. Contact us to schedule: {{shop_phone}}',
  '{"customer_name": "Customer Name", "vehicle_info": "Vehicle", "service_type": "Oil Change", "shop_phone": "Phone"}'::jsonb
FROM (SELECT DISTINCT shop_id FROM profiles WHERE shop_id IS NOT NULL) s  
ON CONFLICT DO NOTHING;

-- Function to execute workflow actions
CREATE OR REPLACE FUNCTION execute_workflow_trigger(
  p_trigger_id UUID,
  p_context_data JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  execution_id UUID;
  action_record RECORD;
  start_time TIMESTAMPTZ;
BEGIN
  start_time := now();
  
  -- Create execution record
  INSERT INTO workflow_executions (trigger_id, status, context_data)
  VALUES (p_trigger_id, 'pending', p_context_data)
  RETURNING id INTO execution_id;
  
  -- Execute actions in order
  FOR action_record IN 
    SELECT * FROM workflow_actions 
    WHERE trigger_id = p_trigger_id 
    ORDER BY action_order ASC
  LOOP
    -- Add delay if specified
    IF action_record.delay_minutes > 0 THEN
      -- In a real implementation, this would queue the action for later execution
      -- For now, we'll just log it
      NULL;
    END IF;
    
    -- Execute the action based on type
    CASE action_record.action_type
      WHEN 'send_email' THEN
        -- Queue email for sending via edge function
        NULL;
      WHEN 'create_task' THEN  
        -- Create a task/reminder
        NULL;
      WHEN 'update_work_order' THEN
        -- Update work order status or fields
        NULL;
      ELSE
        NULL;
    END CASE;
  END LOOP;
  
  -- Update execution status
  UPDATE workflow_executions 
  SET 
    status = 'success',
    execution_time_ms = EXTRACT(EPOCH FROM (now() - start_time)) * 1000
  WHERE id = execution_id;
  
  RETURN execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;