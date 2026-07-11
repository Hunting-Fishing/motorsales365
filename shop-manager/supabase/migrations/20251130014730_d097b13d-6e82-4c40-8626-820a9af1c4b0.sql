-- Create inspection assignments table for staff accountability
CREATE TABLE public.inspection_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  schedule_id UUID REFERENCES public.safety_schedules(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL,
  shift TEXT CHECK (shift IN ('morning', 'afternoon', 'night')),
  assignment_date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inspection_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view inspection assignments for their shop"
ON public.inspection_assignments FOR SELECT
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create inspection assignments for their shop"
ON public.inspection_assignments FOR INSERT
WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update inspection assignments for their shop"
ON public.inspection_assignments FOR UPDATE
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete inspection assignments for their shop"
ON public.inspection_assignments FOR DELETE
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Add vehicle_id to safety_schedules for vehicle-specific maintenance
ALTER TABLE public.safety_schedules 
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS equipment_id UUID,
ADD COLUMN IF NOT EXISTS mileage_interval INTEGER,
ADD COLUMN IF NOT EXISTS last_mileage INTEGER,
ADD COLUMN IF NOT EXISTS next_mileage INTEGER;

-- Create indexes
CREATE INDEX idx_inspection_assignments_shop ON public.inspection_assignments(shop_id);
CREATE INDEX idx_inspection_assignments_staff ON public.inspection_assignments(staff_id);
CREATE INDEX idx_inspection_assignments_date ON public.inspection_assignments(assignment_date);
CREATE INDEX idx_safety_schedules_vehicle ON public.safety_schedules(vehicle_id);