-- Add completion tracking fields to maintenance_logs
ALTER TABLE public.maintenance_logs 
ADD COLUMN IF NOT EXISTS completion_status TEXT CHECK (completion_status IN ('early', 'on_time', 'late', 'breakdown')),
ADD COLUMN IF NOT EXISTS interval_id UUID REFERENCES public.maintenance_interval_tracking(id),
ADD COLUMN IF NOT EXISTS hours_at_service NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS scheduled_hours NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS variance_hours NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES public.profiles(id);

-- Create equipment_breakdowns table for tracking repairs and failures
CREATE TABLE IF NOT EXISTS public.equipment_breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  breakdown_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reported_by UUID REFERENCES public.profiles(id),
  breakdown_type TEXT NOT NULL CHECK (breakdown_type IN ('mechanical', 'electrical', 'hydraulic', 'structural', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),
  description TEXT NOT NULL,
  cause TEXT,
  hours_at_breakdown NUMERIC(10,2),
  downtime_hours NUMERIC(10,2),
  repair_cost NUMERIC(10,2),
  parts_used JSONB DEFAULT '[]'::jsonb,
  repair_notes TEXT,
  repaired_by UUID REFERENCES public.profiles(id),
  repaired_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'diagnosed', 'in_repair', 'repaired', 'pending_parts')),
  related_work_order_id UUID,
  preventable BOOLEAN DEFAULT false,
  root_cause_category TEXT CHECK (root_cause_category IN ('wear', 'operator_error', 'lack_of_maintenance', 'manufacturing_defect', 'environmental', 'unknown')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_equipment_breakdowns_equipment ON public.equipment_breakdowns(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_breakdowns_date ON public.equipment_breakdowns(breakdown_date DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_breakdowns_status ON public.equipment_breakdowns(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_completion ON public.maintenance_logs(completion_status);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_performed_by ON public.maintenance_logs(performed_by);

-- Enable RLS
ALTER TABLE public.equipment_breakdowns ENABLE ROW LEVEL SECURITY;

-- RLS policies for equipment_breakdowns
CREATE POLICY "Users can view breakdowns" ON public.equipment_breakdowns
  FOR SELECT USING (true);

CREATE POLICY "Users can insert breakdowns" ON public.equipment_breakdowns
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update breakdowns" ON public.equipment_breakdowns
  FOR UPDATE USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_equipment_breakdowns_updated_at
  BEFORE UPDATE ON public.equipment_breakdowns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_logs_updated_at();

-- Function to calculate completion status when logging maintenance
CREATE OR REPLACE FUNCTION public.calculate_maintenance_completion_status(
  p_current_hours NUMERIC,
  p_scheduled_hours NUMERIC,
  p_tolerance_percent NUMERIC DEFAULT 5
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tolerance NUMERIC;
  variance NUMERIC;
BEGIN
  IF p_scheduled_hours IS NULL OR p_scheduled_hours = 0 THEN
    RETURN 'on_time';
  END IF;
  
  tolerance := p_scheduled_hours * (p_tolerance_percent / 100);
  variance := p_current_hours - p_scheduled_hours;
  
  IF variance < -tolerance THEN
    RETURN 'early';
  ELSIF variance > tolerance THEN
    RETURN 'late';
  ELSE
    RETURN 'on_time';
  END IF;
END;
$$;