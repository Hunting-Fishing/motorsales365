-- Phase 1.1: Communication & Messaging Tables
-- Call logs for voice communication tracking
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  work_order_id UUID REFERENCES work_orders(id),
  caller_id TEXT NOT NULL,
  caller_name TEXT NOT NULL,
  recipient_id TEXT,
  recipient_name TEXT,
  call_type TEXT NOT NULL CHECK (call_type IN ('incoming', 'outgoing', 'missed')),
  call_direction TEXT NOT NULL CHECK (call_direction IN ('inbound', 'outbound')),
  phone_number TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  call_status TEXT NOT NULL CHECK (call_status IN ('completed', 'missed', 'busy', 'failed', 'voicemail')),
  notes TEXT,
  recording_url TEXT,
  call_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  call_ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Phase 1.2: Maintenance & Repair Tables
-- Repair plans for systematic repair workflows
CREATE TABLE public.repair_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID REFERENCES work_orders(id),
  vehicle_id UUID REFERENCES vehicles(id),
  customer_id UUID REFERENCES customers(id),
  plan_name TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled', 'on_hold')),
  estimated_duration_hours NUMERIC(10,2),
  estimated_cost NUMERIC(10,2),
  actual_duration_hours NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  assigned_technician_id UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Repair plan tasks for detailed repair steps
CREATE TABLE public.repair_plan_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_plan_id UUID REFERENCES repair_plans(id) ON DELETE CASCADE NOT NULL,
  task_name TEXT NOT NULL,
  description TEXT,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  required_tools TEXT[],
  required_parts TEXT[],
  instructions TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES profiles(id),
  completed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Maintenance schedules for equipment/vehicle maintenance
CREATE TABLE public.maintenance_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id),
  equipment_id TEXT REFERENCES equipment(id),
  customer_id UUID REFERENCES customers(id),
  maintenance_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  frequency_type TEXT NOT NULL CHECK (frequency_type IN ('mileage', 'time', 'hours', 'cycles')),
  frequency_interval INTEGER NOT NULL,
  frequency_unit TEXT NOT NULL,
  last_maintenance_date DATE,
  next_due_date DATE NOT NULL,
  mileage_interval INTEGER,
  current_mileage INTEGER,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'paused')),
  estimated_cost NUMERIC(10,2),
  assigned_technician_id UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Work order checklists for standardized procedures
CREATE TABLE public.work_order_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE NOT NULL,
  checklist_name TEXT NOT NULL,
  checklist_type TEXT NOT NULL DEFAULT 'general' CHECK (checklist_type IN ('general', 'safety', 'quality', 'inspection', 'delivery')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  assigned_to UUID REFERENCES profiles(id),
  completed_by UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Checklist items for individual checklist tasks
CREATE TABLE public.checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID REFERENCES work_order_checklists(id) ON DELETE CASCADE NOT NULL,
  item_text TEXT NOT NULL,
  description TEXT,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  item_type TEXT NOT NULL DEFAULT 'checkbox' CHECK (item_type IN ('checkbox', 'text', 'number', 'photo', 'signature')),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completion_value TEXT,
  completion_notes TEXT,
  photo_urls TEXT[],
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Phase 1.3: Team Management Tables
-- Team departments for organizational structure
CREATE TABLE public.team_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_department_id UUID REFERENCES team_departments(id),
  department_head_id UUID REFERENCES profiles(id),
  budget_limit NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id, name)
);

-- Team locations for physical workspaces
CREATE TABLE public.team_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  location_type TEXT NOT NULL DEFAULT 'office' CHECK (location_type IN ('office', 'warehouse', 'garage', 'field', 'remote')),
  capacity INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id, name)
);

-- Team certifications for skill tracking
CREATE TABLE public.team_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) NOT NULL,
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  certification_name TEXT NOT NULL,
  certification_authority TEXT NOT NULL,
  certification_number TEXT,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'revoked')),
  attachment_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Phase 1.4: Forms & Feedback Tables
-- Feedback categories for better organization
CREATE TABLE public.feedback_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id, name)
);

-- Phase 1.5: Notifications & Alerts
-- System alerts for operational monitoring
CREATE TABLE public.system_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('system', 'maintenance', 'security', 'performance', 'business')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  source_table TEXT,
  source_id TEXT,
  metadata JSONB DEFAULT '{}',
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Alert rules for automated monitoring
CREATE TABLE public.alert_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) NOT NULL,
  rule_name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('threshold', 'anomaly', 'schedule', 'event')),
  target_table TEXT NOT NULL,
  condition_field TEXT NOT NULL,
  condition_operator TEXT NOT NULL CHECK (condition_operator IN ('>', '<', '>=', '<=', '=', '!=', 'contains', 'not_contains')),
  condition_value TEXT NOT NULL,
  alert_severity TEXT NOT NULL DEFAULT 'medium' CHECK (alert_severity IN ('low', 'medium', 'high', 'critical')),
  notification_channels TEXT[] DEFAULT '{"email"}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id, rule_name)
);

-- Phase 1.6: Tool Categories (without affiliate tools dependency for now)
CREATE TABLE public.tool_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name)
);

-- Enable RLS on all tables
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_categories ENABLE ROW LEVEL SECURITY;