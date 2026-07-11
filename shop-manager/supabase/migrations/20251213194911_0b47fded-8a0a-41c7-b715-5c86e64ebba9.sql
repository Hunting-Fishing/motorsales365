-- Project Resource Assignments for Staff
CREATE TABLE IF NOT EXISTS public.project_resource_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('employee', 'equipment', 'vessel', 'vehicle')),
  resource_id UUID NOT NULL,
  resource_name TEXT, -- Denormalized for display
  role TEXT, -- e.g., 'lead', 'technician', 'operator'
  
  -- Planning hours
  planned_hours DECIMAL(10,2) DEFAULT 0,
  planned_cost DECIMAL(12,2) DEFAULT 0,
  hourly_rate DECIMAL(10,2),
  
  -- Actual tracking
  actual_hours DECIMAL(10,2) DEFAULT 0,
  actual_cost DECIMAL(12,2) DEFAULT 0,
  
  -- Scheduling
  start_date DATE,
  end_date DATE,
  is_full_time BOOLEAN DEFAULT false,
  allocation_percent INTEGER DEFAULT 100 CHECK (allocation_percent >= 0 AND allocation_percent <= 100),
  
  -- Status
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  notes TEXT,
  
  shop_id UUID,
  assigned_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_resource_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view project resource assignments in their shop"
  ON public.project_resource_assignments FOR SELECT
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can insert project resource assignments in their shop"
  ON public.project_resource_assignments FOR INSERT
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update project resource assignments in their shop"
  ON public.project_resource_assignments FOR UPDATE
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete project resource assignments in their shop"
  ON public.project_resource_assignments FOR DELETE
  USING (shop_id = public.get_current_user_shop_id());

-- Indexes for performance
CREATE INDEX idx_project_resource_assignments_project_id ON public.project_resource_assignments(project_id);
CREATE INDEX idx_project_resource_assignments_phase_id ON public.project_resource_assignments(phase_id);
CREATE INDEX idx_project_resource_assignments_resource ON public.project_resource_assignments(resource_type, resource_id);
CREATE INDEX idx_project_resource_assignments_dates ON public.project_resource_assignments(start_date, end_date);
CREATE INDEX idx_project_resource_assignments_shop_id ON public.project_resource_assignments(shop_id);

-- Trigger for updated_at
CREATE TRIGGER update_project_resource_assignments_updated_at
  BEFORE UPDATE ON public.project_resource_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_planner_updated_at();

-- Add Gantt/timeline metadata to project_phases for better visualization
ALTER TABLE public.project_phases 
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS milestone_date DATE;