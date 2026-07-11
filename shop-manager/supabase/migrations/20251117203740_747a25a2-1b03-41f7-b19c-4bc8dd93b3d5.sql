-- Create equipment future plans table
CREATE TABLE IF NOT EXISTS public.equipment_future_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  planned_date DATE,
  estimated_cost DECIMAL(10,2),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'approved', 'in-progress', 'completed', 'cancelled')),
  parts_list JSONB DEFAULT '[]'::jsonb,
  modifications TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_future_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view equipment future plans"
  ON public.equipment_future_plans
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create equipment future plans"
  ON public.equipment_future_plans
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update equipment future plans"
  ON public.equipment_future_plans
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete equipment future plans"
  ON public.equipment_future_plans
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create index for better query performance
CREATE INDEX idx_equipment_future_plans_equipment_id ON public.equipment_future_plans(equipment_id);
CREATE INDEX idx_equipment_future_plans_status ON public.equipment_future_plans(status);
CREATE INDEX idx_equipment_future_plans_planned_date ON public.equipment_future_plans(planned_date);

-- Create trigger for updated_at
CREATE TRIGGER set_equipment_future_plans_updated_at
  BEFORE UPDATE ON public.equipment_future_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();