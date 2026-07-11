-- Create asset_assignments table for scheduling equipment and vessels to employees
CREATE TABLE public.asset_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('equipment', 'vessel', 'vehicle')),
  asset_id UUID NOT NULL,
  assignment_start TIMESTAMP WITH TIME ZONE NOT NULL,
  assignment_end TIMESTAMP WITH TIME ZONE NOT NULL,
  purpose TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  assigned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (assignment_end > assignment_start)
);

-- Enable RLS
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for asset_assignments
CREATE POLICY "Users can view asset assignments in their shop"
ON public.asset_assignments
FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create asset assignments in their shop"
ON public.asset_assignments
FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update asset assignments in their shop"
ON public.asset_assignments
FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete asset assignments in their shop"
ON public.asset_assignments
FOR DELETE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create indexes for better query performance
CREATE INDEX idx_asset_assignments_shop_id ON public.asset_assignments(shop_id);
CREATE INDEX idx_asset_assignments_employee_id ON public.asset_assignments(employee_id);
CREATE INDEX idx_asset_assignments_asset_type ON public.asset_assignments(asset_type);
CREATE INDEX idx_asset_assignments_asset_id ON public.asset_assignments(asset_id);
CREATE INDEX idx_asset_assignments_dates ON public.asset_assignments(assignment_start, assignment_end);
CREATE INDEX idx_asset_assignments_status ON public.asset_assignments(status);

-- Create trigger for updating updated_at
CREATE TRIGGER update_asset_assignments_updated_at
BEFORE UPDATE ON public.asset_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();