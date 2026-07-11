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
  equipment_id UUID REFERENCES equipment(id),
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

-- Enable RLS on all tables
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_logs
CREATE POLICY "Users can view call logs from their shop" 
ON public.call_logs FOR SELECT 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
  OR work_order_id IN (
    SELECT id FROM work_orders WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can insert call logs for their shop" 
ON public.call_logs FOR INSERT 
WITH CHECK (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
  OR work_order_id IN (
    SELECT id FROM work_orders WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update call logs from their shop" 
ON public.call_logs FOR UPDATE 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
  OR work_order_id IN (
    SELECT id FROM work_orders WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

-- RLS Policies for repair_plans
CREATE POLICY "Users can view repair plans from their shop" 
ON public.repair_plans FOR SELECT 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert repair plans for their shop" 
ON public.repair_plans FOR INSERT 
WITH CHECK (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update repair plans from their shop" 
ON public.repair_plans FOR UPDATE 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete repair plans from their shop" 
ON public.repair_plans FOR DELETE 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- RLS Policies for repair_plan_tasks (inherit from repair_plans)
CREATE POLICY "Users can view repair plan tasks from their shop" 
ON public.repair_plan_tasks FOR SELECT 
USING (
  repair_plan_id IN (
    SELECT id FROM repair_plans WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can insert repair plan tasks for their shop" 
ON public.repair_plan_tasks FOR INSERT 
WITH CHECK (
  repair_plan_id IN (
    SELECT id FROM repair_plans WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update repair plan tasks from their shop" 
ON public.repair_plan_tasks FOR UPDATE 
USING (
  repair_plan_id IN (
    SELECT id FROM repair_plans WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete repair plan tasks from their shop" 
ON public.repair_plan_tasks FOR DELETE 
USING (
  repair_plan_id IN (
    SELECT id FROM repair_plans WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

-- RLS Policies for maintenance_schedules
CREATE POLICY "Users can view maintenance schedules from their shop" 
ON public.maintenance_schedules FOR SELECT 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert maintenance schedules for their shop" 
ON public.maintenance_schedules FOR INSERT 
WITH CHECK (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update maintenance schedules from their shop" 
ON public.maintenance_schedules FOR UPDATE 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete maintenance schedules from their shop" 
ON public.maintenance_schedules FOR DELETE 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- RLS Policies for work_order_checklists
CREATE POLICY "Users can view work order checklists from their shop" 
ON public.work_order_checklists FOR SELECT 
USING (
  work_order_id IN (
    SELECT id FROM work_orders WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can insert work order checklists for their shop" 
ON public.work_order_checklists FOR INSERT 
WITH CHECK (
  work_order_id IN (
    SELECT id FROM work_orders WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update work order checklists from their shop" 
ON public.work_order_checklists FOR UPDATE 
USING (
  work_order_id IN (
    SELECT id FROM work_orders WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete work order checklists from their shop" 
ON public.work_order_checklists FOR DELETE 
USING (
  work_order_id IN (
    SELECT id FROM work_orders WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

-- RLS Policies for checklist_items
CREATE POLICY "Users can view checklist items from their shop" 
ON public.checklist_items FOR SELECT 
USING (
  checklist_id IN (
    SELECT id FROM work_order_checklists WHERE work_order_id IN (
      SELECT id FROM work_orders WHERE customer_id IN (
        SELECT id FROM customers WHERE shop_id IN (
          SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can insert checklist items for their shop" 
ON public.checklist_items FOR INSERT 
WITH CHECK (
  checklist_id IN (
    SELECT id FROM work_order_checklists WHERE work_order_id IN (
      SELECT id FROM work_orders WHERE customer_id IN (
        SELECT id FROM customers WHERE shop_id IN (
          SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can update checklist items from their shop" 
ON public.checklist_items FOR UPDATE 
USING (
  checklist_id IN (
    SELECT id FROM work_order_checklists WHERE work_order_id IN (
      SELECT id FROM work_orders WHERE customer_id IN (
        SELECT id FROM customers WHERE shop_id IN (
          SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can delete checklist items from their shop" 
ON public.checklist_items FOR DELETE 
USING (
  checklist_id IN (
    SELECT id FROM work_order_checklists WHERE work_order_id IN (
      SELECT id FROM work_orders WHERE customer_id IN (
        SELECT id FROM customers WHERE shop_id IN (
          SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  )
);

-- Create update triggers
CREATE OR REPLACE FUNCTION public.update_call_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_call_logs_updated_at
  BEFORE UPDATE ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_call_logs_updated_at();

CREATE OR REPLACE FUNCTION public.update_repair_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_repair_plans_updated_at
  BEFORE UPDATE ON public.repair_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();

CREATE TRIGGER update_repair_plan_tasks_updated_at
  BEFORE UPDATE ON public.repair_plan_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();

CREATE TRIGGER update_maintenance_schedules_updated_at
  BEFORE UPDATE ON public.maintenance_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();

CREATE TRIGGER update_work_order_checklists_updated_at
  BEFORE UPDATE ON public.work_order_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();

CREATE TRIGGER update_checklist_items_updated_at
  BEFORE UPDATE ON public.checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();