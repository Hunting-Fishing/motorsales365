-- Create module_work_types table for module-specific work types
CREATE TABLE public.module_work_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id),
  module_type TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.module_work_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view module work types" ON public.module_work_types
FOR SELECT USING (true);

CREATE POLICY "Users can insert module work types" ON public.module_work_types
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update module work types" ON public.module_work_types
FOR UPDATE USING (true);

-- Seed Gunsmith-specific work types
INSERT INTO public.module_work_types (module_type, name, code, is_system, display_order) VALUES
('gunsmith', 'Cleaning & Maintenance', 'CLN', true, 1),
('gunsmith', 'Repair Work', 'RPR', true, 2),
('gunsmith', 'Trigger Work', 'TRG', true, 3),
('gunsmith', 'Barrel Work', 'BRL', true, 4),
('gunsmith', 'Stock Work', 'STK', true, 5),
('gunsmith', 'Sight Installation', 'SGT', true, 6),
('gunsmith', 'Custom Modifications', 'MOD', true, 7),
('gunsmith', 'Inspection/Safety Check', 'INS', true, 8),
('gunsmith', 'FFL Transfer', 'FFL', true, 9),
('gunsmith', 'Consignment Processing', 'CON', true, 10);

-- Create work_type_requests table for user requests
CREATE TABLE public.work_type_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id),
  requested_by UUID REFERENCES public.profiles(id),
  module_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_type_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view work type requests" ON public.work_type_requests
FOR SELECT USING (true);

CREATE POLICY "Users can insert work type requests" ON public.work_type_requests
FOR INSERT WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Users can update work type requests" ON public.work_type_requests
FOR UPDATE USING (true);

-- Add optional module columns to timesheet_entries
ALTER TABLE public.timesheet_entries 
ADD COLUMN IF NOT EXISTS module_type TEXT,
ADD COLUMN IF NOT EXISTS work_type_id UUID REFERENCES public.module_work_types(id),
ADD COLUMN IF NOT EXISTS gunsmith_job_id UUID REFERENCES public.gunsmith_jobs(id),
ADD COLUMN IF NOT EXISTS custom_work_type TEXT;