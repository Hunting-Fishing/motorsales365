
-- Check if we have all necessary tables for work orders
-- Add missing tables for comprehensive work order management

-- Work order templates table (if not exists)
CREATE TABLE IF NOT EXISTS public.work_order_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  estimated_hours NUMERIC DEFAULT 0,
  default_status TEXT DEFAULT 'pending',
  default_priority TEXT DEFAULT 'medium',
  job_lines JSONB DEFAULT '[]'::jsonb,
  parts_list JSONB DEFAULT '[]'::jsonb,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  is_active BOOLEAN DEFAULT true
);

-- Work order status history table
CREATE TABLE IF NOT EXISTS public.work_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  changed_by_name TEXT NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
);

-- Work order assignments table (for tracking technician assignments)
CREATE TABLE IF NOT EXISTS public.work_order_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL,
  technician_id UUID,
  assigned_by UUID,
  assigned_by_name TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unassigned_at TIMESTAMP WITH TIME ZONE,
  assignment_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
);

-- Work order priority levels table
CREATE TABLE IF NOT EXISTS public.work_order_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  level INTEGER NOT NULL UNIQUE,
  color TEXT DEFAULT '#6B7280',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default priority levels
INSERT INTO public.work_order_priorities (name, level, color, description) 
VALUES 
  ('Low', 1, '#10B981', 'Non-urgent work that can be scheduled flexibly'),
  ('Medium', 2, '#F59E0B', 'Standard priority work'),
  ('High', 3, '#EF4444', 'Urgent work that needs prompt attention'),
  ('Critical', 4, '#DC2626', 'Emergency work requiring immediate attention')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.work_order_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_priorities ENABLE ROW LEVEL SECURITY;

-- RLS policies for work order templates
CREATE POLICY "Staff can view work order templates" 
ON public.work_order_templates FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name::text IN ('owner', 'admin', 'manager', 'service_advisor', 'technician')
  )
);

CREATE POLICY "Staff can manage work order templates" 
ON public.work_order_templates FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name::text IN ('owner', 'admin', 'manager', 'service_advisor')
  )
);

-- RLS policies for status history
CREATE POLICY "Staff can view work order status history" 
ON public.work_order_status_history FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name::text IN ('owner', 'admin', 'manager', 'service_advisor', 'technician')
  )
);

-- RLS policies for assignments
CREATE POLICY "Staff can view work order assignments" 
ON public.work_order_assignments FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name::text IN ('owner', 'admin', 'manager', 'service_advisor', 'technician')
  )
);

-- RLS policies for priorities (read-only for most users)
CREATE POLICY "All authenticated users can view priorities" 
ON public.work_order_priorities FOR SELECT 
TO authenticated
USING (true);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_work_order_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_work_order_templates_updated_at
  BEFORE UPDATE ON public.work_order_templates
  FOR EACH ROW
  EXECUTE PROCEDURE update_work_order_templates_updated_at();
