-- Create notification automation tables
CREATE TABLE notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'status_change', 'overdue', 'time_based', 'field_change'
  trigger_config JSONB NOT NULL DEFAULT '{}',
  target_audience TEXT NOT NULL, -- 'customer', 'technician', 'manager', 'all'
  channels TEXT[] NOT NULL DEFAULT ARRAY['email'], -- 'email', 'sms', 'in_app', 'push'
  template_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1, -- 1-5 priority levels
  delay_minutes INTEGER DEFAULT 0, -- Delay before sending
  conditions JSONB DEFAULT '[]', -- Additional conditions
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'email', 'sms', 'push', 'in_app'
  subject TEXT, -- For email templates
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]', -- Available template variables
  is_system_template BOOLEAN DEFAULT false,
  category TEXT NOT NULL, -- 'work_order', 'customer', 'technician', 'general'
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  rule_id UUID REFERENCES notification_rules(id),
  template_id UUID REFERENCES notification_templates(id),
  recipient_type TEXT NOT NULL, -- 'customer', 'technician', 'user'
  recipient_id UUID NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  channel TEXT NOT NULL, -- 'email', 'sms', 'in_app', 'push'
  subject TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  priority INTEGER NOT NULL DEFAULT 1,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES notification_queue(id),
  channel TEXT NOT NULL,
  status TEXT NOT NULL, -- 'delivered', 'bounced', 'opened', 'clicked', 'unsubscribed'
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  bounce_reason TEXT,
  external_id TEXT, -- Provider message ID
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_condition TEXT NOT NULL, -- 'overdue_work_order', 'status_stuck', 'no_response'
  trigger_config JSONB NOT NULL DEFAULT '{}',
  escalation_steps JSONB NOT NULL DEFAULT '[]', -- Array of escalation steps
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE escalation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_rule_id UUID REFERENCES escalation_rules(id),
  work_order_id UUID,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'resolved', 'cancelled'
  execution_data JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_notification_rules_shop_id ON notification_rules(shop_id);
CREATE INDEX idx_notification_rules_trigger_type ON notification_rules(trigger_type);
CREATE INDEX idx_notification_templates_shop_id ON notification_templates(shop_id);
CREATE INDEX idx_notification_templates_category ON notification_templates(category);
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled_for ON notification_queue(scheduled_for);
CREATE INDEX idx_notification_queue_recipient ON notification_queue(recipient_type, recipient_id);
CREATE INDEX idx_notification_deliveries_queue_id ON notification_deliveries(queue_id);
CREATE INDEX idx_escalation_rules_shop_id ON escalation_rules(shop_id);
CREATE INDEX idx_escalation_executions_work_order ON escalation_executions(work_order_id);

-- Create updated_at triggers
CREATE TRIGGER update_notification_rules_updated_at
  BEFORE UPDATE ON notification_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_queue_updated_at
  BEFORE UPDATE ON notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalation_rules_updated_at
  BEFORE UPDATE ON escalation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalation_executions_updated_at
  BEFORE UPDATE ON escalation_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert real notification templates
INSERT INTO notification_templates (shop_id, name, template_type, subject, content, variables, is_system_template, category, created_by) VALUES
-- Work Order Templates
((SELECT id FROM shops LIMIT 1), 'Work Order Assignment', 'email', 'New Work Order Assignment - {{work_order_number}}', 
'Hi {{technician_name}},

You have been assigned a new work order:

Work Order: {{work_order_number}}
Customer: {{customer_name}}
Vehicle: {{vehicle_year}} {{vehicle_make}} {{vehicle_model}}
Service Type: {{service_type}}
Scheduled: {{scheduled_date}}

Description:
{{work_order_description}}

Please review the details and confirm your availability.

Best regards,
{{shop_name}}', 
'["technician_name", "work_order_number", "customer_name", "vehicle_year", "vehicle_make", "vehicle_model", "service_type", "scheduled_date", "work_order_description", "shop_name"]'::jsonb, 
true, 'work_order', (SELECT auth.uid())),

((SELECT id FROM shops LIMIT 1), 'Work Order Status Update', 'email', 'Work Order Update - {{work_order_number}}', 
'Hello {{customer_name}},

Your service has been updated:

Work Order: {{work_order_number}}
Vehicle: {{vehicle_year}} {{vehicle_make}} {{vehicle_model}}
Status: {{new_status}}
Updated: {{update_date}}

{{status_message}}

{{#if estimated_completion}}
Estimated Completion: {{estimated_completion}}
{{/if}}

Thank you for choosing {{shop_name}}.

Best regards,
Service Team', 
'["customer_name", "work_order_number", "vehicle_year", "vehicle_make", "vehicle_model", "new_status", "update_date", "status_message", "estimated_completion", "shop_name"]'::jsonb, 
true, 'work_order', (SELECT auth.uid())),

((SELECT id FROM shops LIMIT 1), 'Work Order Completion', 'email', 'Service Completed - {{work_order_number}}', 
'Dear {{customer_name}},

Great news! Your service has been completed:

Work Order: {{work_order_number}}
Vehicle: {{vehicle_year}} {{vehicle_make}} {{vehicle_model}}
Completion Date: {{completion_date}}
Total Cost: ${{total_cost}}

Services Performed:
{{services_list}}

{{#if invoice_available}}
Your invoice is ready for pickup. You can view it online or we can email it to you.
{{/if}}

Thank you for your business!

{{shop_name}}', 
'["customer_name", "work_order_number", "vehicle_year", "vehicle_make", "vehicle_model", "completion_date", "total_cost", "services_list", "invoice_available", "shop_name"]'::jsonb, 
true, 'work_order', (SELECT auth.uid())),

-- SMS Templates
((SELECT id FROM shops LIMIT 1), 'Work Order Assignment SMS', 'sms', null, 
'{{technician_name}}: New work order {{work_order_number}} assigned. Customer: {{customer_name}}, Vehicle: {{vehicle_year}} {{vehicle_make}} {{vehicle_model}}. Scheduled: {{scheduled_date}}. Check app for details.', 
'["technician_name", "work_order_number", "customer_name", "vehicle_year", "vehicle_make", "vehicle_model", "scheduled_date"]'::jsonb, 
true, 'work_order', (SELECT auth.uid())),

((SELECT id FROM shops LIMIT 1), 'Customer Status Update SMS', 'sms', null, 
'{{customer_name}}: Your {{vehicle_year}} {{vehicle_make}} {{vehicle_model}} service ({{work_order_number}}) is now {{new_status}}. {{status_message}} - {{shop_name}}', 
'["customer_name", "vehicle_year", "vehicle_make", "vehicle_model", "work_order_number", "new_status", "status_message", "shop_name"]'::jsonb, 
true, 'work_order', (SELECT auth.uid())),

-- Overdue/Escalation Templates
((SELECT id FROM shops LIMIT 1), 'Overdue Work Order Alert', 'email', 'URGENT: Overdue Work Order - {{work_order_number}}', 
'ATTENTION: Work Order Overdue

Work Order: {{work_order_number}}
Customer: {{customer_name}}
Vehicle: {{vehicle_year}} {{vehicle_make}} {{vehicle_model}}
Original Due Date: {{due_date}}
Days Overdue: {{days_overdue}}
Assigned Technician: {{technician_name}}

This work order requires immediate attention. Please review and take appropriate action.

Manager: {{manager_name}}', 
'["work_order_number", "customer_name", "vehicle_year", "vehicle_make", "vehicle_model", "due_date", "days_overdue", "technician_name", "manager_name"]'::jsonb, 
true, 'work_order', (SELECT auth.uid()));

-- Insert real notification rules
INSERT INTO notification_rules (shop_id, name, description, trigger_type, trigger_config, target_audience, channels, template_id, is_active, priority, delay_minutes, conditions, created_by) VALUES
-- Work Order Assignment Notifications
((SELECT id FROM shops LIMIT 1), 'Technician Assignment Email', 'Notify technician when work order is assigned', 'status_change', 
'{"from_status": null, "to_status": "assigned", "field": "technician_id"}'::jsonb, 
'technician', ARRAY['email'], 
(SELECT id FROM notification_templates WHERE name = 'Work Order Assignment' LIMIT 1), 
true, 1, 0, '[]'::jsonb, (SELECT auth.uid())),

((SELECT id FROM shops LIMIT 1), 'Technician Assignment SMS', 'SMS notification for urgent work order assignments', 'status_change', 
'{"from_status": null, "to_status": "assigned", "field": "technician_id"}'::jsonb, 
'technician', ARRAY['sms'], 
(SELECT id FROM notification_templates WHERE name = 'Work Order Assignment SMS' LIMIT 1), 
true, 2, 5, '[{"field": "priority", "operator": "equals", "value": "urgent"}]'::jsonb, (SELECT auth.uid())),

-- Customer Status Updates
((SELECT id FROM shops LIMIT 1), 'Customer Status Updates', 'Notify customers of work order progress', 'status_change', 
'{"from_status": ["assigned", "in_progress"], "to_status": ["in_progress", "completed", "ready_for_pickup"]}'::jsonb, 
'customer', ARRAY['email', 'sms'], 
(SELECT id FROM notification_templates WHERE name = 'Work Order Status Update' LIMIT 1), 
true, 1, 15, '[]'::jsonb, (SELECT auth.uid())),

-- Completion Notifications
((SELECT id FROM shops LIMIT 1), 'Work Order Completion', 'Notify customers when service is completed', 'status_change', 
'{"from_status": ["in_progress", "quality_check"], "to_status": "completed"}'::jsonb, 
'customer', ARRAY['email'], 
(SELECT id FROM notification_templates WHERE name = 'Work Order Completion' LIMIT 1), 
true, 1, 30, '[]'::jsonb, (SELECT auth.uid())),

-- Overdue Alerts
((SELECT id FROM shops LIMIT 1), 'Overdue Work Order Alert', 'Alert managers when work orders become overdue', 'overdue', 
'{"hours_overdue": 24, "check_interval": 60}'::jsonb, 
'manager', ARRAY['email', 'in_app'], 
(SELECT id FROM notification_templates WHERE name = 'Overdue Work Order Alert' LIMIT 1), 
true, 3, 0, '[]'::jsonb, (SELECT auth.uid()));

-- Insert real escalation rules
INSERT INTO escalation_rules (shop_id, name, description, trigger_condition, trigger_config, escalation_steps, is_active, created_by) VALUES
((SELECT id FROM shops LIMIT 1), 'Overdue Work Order Escalation', 'Escalate overdue work orders through management chain', 'overdue_work_order',
'{"initial_hours": 24, "check_interval": 60}'::jsonb,
'[
  {
    "step": 1,
    "delay_hours": 0,
    "action": "notify",
    "recipients": ["assigned_technician"],
    "message": "Work order {{work_order_number}} is overdue. Please provide status update.",
    "channels": ["email", "sms"]
  },
  {
    "step": 2,
    "delay_hours": 4,
    "action": "notify",
    "recipients": ["supervisor"],
    "message": "Work order {{work_order_number}} is {{hours_overdue}} hours overdue. Technician: {{technician_name}}",
    "channels": ["email", "in_app"]
  },
  {
    "step": 3,
    "delay_hours": 8,
    "action": "notify",
    "recipients": ["manager", "supervisor"],
    "message": "URGENT: Work order {{work_order_number}} is {{hours_overdue}} hours overdue. Immediate action required.",
    "channels": ["email", "sms", "in_app"]
  },
  {
    "step": 4,
    "delay_hours": 24,
    "action": "reassign",
    "recipients": ["manager"],
    "message": "Work order {{work_order_number}} automatically reassigned due to extended overdue status.",
    "channels": ["email", "in_app"]
  }
]'::jsonb,
true, (SELECT auth.uid())),

((SELECT id FROM shops LIMIT 1), 'Customer No Response Escalation', 'Escalate when customer does not respond to communications', 'no_response',
'{"hours_no_response": 48, "communication_types": ["approval_request", "pickup_ready"]}'::jsonb,
'[
  {
    "step": 1,
    "delay_hours": 0,
    "action": "notify",
    "recipients": ["service_advisor"],
    "message": "Customer {{customer_name}} has not responded to communications for {{hours_no_response}} hours.",
    "channels": ["in_app"]
  },
  {
    "step": 2,
    "delay_hours": 12,
    "action": "call",
    "recipients": ["service_advisor"],
    "message": "Follow up call required for {{customer_name}} - Work Order {{work_order_number}}",
    "channels": ["in_app", "email"]
  },
  {
    "step": 3,
    "delay_hours": 24,
    "action": "notify",
    "recipients": ["manager"],
    "message": "Customer {{customer_name}} unresponsive for {{hours_no_response}} hours. Manager intervention required.",
    "channels": ["email", "in_app"]
  }
]'::jsonb,
true, (SELECT auth.uid()));

-- Enable RLS on all tables
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage notification rules in their shop"
ON notification_rules FOR ALL
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage notification templates in their shop"
ON notification_templates FOR ALL
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view notification queue in their shop"
ON notification_queue FOR ALL
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view notification deliveries in their shop"
ON notification_deliveries FOR SELECT
USING (EXISTS (
  SELECT 1 FROM notification_queue nq 
  JOIN profiles p ON p.shop_id = nq.shop_id 
  WHERE nq.id = notification_deliveries.queue_id AND p.id = auth.uid()
));

CREATE POLICY "Users can manage escalation rules in their shop"
ON escalation_rules FOR ALL
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view escalation executions in their shop"
ON escalation_executions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM escalation_rules er 
  JOIN profiles p ON p.shop_id = er.shop_id 
  WHERE er.id = escalation_executions.escalation_rule_id AND p.id = auth.uid()
));