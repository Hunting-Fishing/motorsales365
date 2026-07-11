-- Create inspection schedules table for recurring inspections
CREATE TABLE public.inspection_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  equipment_id UUID REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL, -- 'vessel', 'forklift', 'dvir', 'daily_shop'
  schedule_name TEXT NOT NULL,
  frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'hours_based'
  frequency_value INTEGER DEFAULT 1, -- e.g., every 2 weeks
  hours_interval INTEGER, -- for hours-based schedules
  assigned_to UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT true,
  last_inspection_date TIMESTAMPTZ,
  next_due_date TIMESTAMPTZ,
  reminder_days_before INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT schedule_has_asset CHECK (equipment_id IS NOT NULL OR vehicle_id IS NOT NULL)
);

-- Create inspection reminders table
CREATE TABLE public.inspection_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.inspection_schedules(id) ON DELETE CASCADE,
  reminder_date TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create auto work order rules table
CREATE TABLE public.inspection_work_order_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  inspection_type TEXT NOT NULL,
  trigger_status TEXT NOT NULL, -- 'attention', 'bad', 'fail'
  auto_create_work_order BOOLEAN DEFAULT true,
  work_order_priority TEXT DEFAULT 'medium',
  assign_to_role TEXT, -- role to assign work order to
  include_photos BOOLEAN DEFAULT true,
  notes_template TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add QR code field to equipment_assets
ALTER TABLE public.equipment_assets 
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS qr_code_generated_at TIMESTAMPTZ;

-- Add QR code field to vehicles
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS qr_code_generated_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.inspection_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_work_order_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for inspection_schedules
CREATE POLICY "Users can view inspection schedules" 
ON public.inspection_schedules FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create inspection schedules" 
ON public.inspection_schedules FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update inspection schedules" 
ON public.inspection_schedules FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete inspection schedules" 
ON public.inspection_schedules FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- RLS policies for inspection_reminders
CREATE POLICY "Users can view inspection reminders" 
ON public.inspection_reminders FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage inspection reminders" 
ON public.inspection_reminders FOR ALL 
USING (auth.uid() IS NOT NULL);

-- RLS policies for inspection_work_order_rules
CREATE POLICY "Users can view work order rules" 
ON public.inspection_work_order_rules FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage work order rules" 
ON public.inspection_work_order_rules FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_inspection_schedules_equipment ON public.inspection_schedules(equipment_id);
CREATE INDEX idx_inspection_schedules_vehicle ON public.inspection_schedules(vehicle_id);
CREATE INDEX idx_inspection_schedules_next_due ON public.inspection_schedules(next_due_date);
CREATE INDEX idx_inspection_reminders_schedule ON public.inspection_reminders(schedule_id);
CREATE INDEX idx_inspection_reminders_date ON public.inspection_reminders(reminder_date);