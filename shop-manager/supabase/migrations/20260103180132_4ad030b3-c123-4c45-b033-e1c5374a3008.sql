-- Create storage bucket for power washing photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('power-washing-photos', 'power-washing-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for power-washing-photos bucket
CREATE POLICY "Users can view power washing photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'power-washing-photos');

CREATE POLICY "Authenticated users can upload power washing photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'power-washing-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own power washing photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'power-washing-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete power washing photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'power-washing-photos' AND auth.role() = 'authenticated');

-- Time entries for clock in/out per job
CREATE TABLE public.power_washing_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.power_washing_jobs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  shop_id UUID REFERENCES public.shops(id),
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out TIMESTAMP WITH TIME ZONE,
  break_minutes INTEGER DEFAULT 0,
  notes TEXT,
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chemical usage tracking per job
CREATE TABLE public.power_washing_job_chemicals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.power_washing_jobs(id) ON DELETE CASCADE,
  chemical_id UUID NOT NULL REFERENCES public.power_washing_chemicals(id),
  shop_id UUID REFERENCES public.shops(id),
  quantity_used DECIMAL(10, 2) NOT NULL,
  unit_of_measure TEXT NOT NULL DEFAULT 'gallons',
  cost_at_use DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Equipment maintenance history
CREATE TABLE public.power_washing_maintenance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.power_washing_equipment(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES public.shops(id),
  maintenance_type TEXT NOT NULL,
  performed_by UUID REFERENCES public.profiles(id),
  performed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cost DECIMAL(10, 2),
  parts_used TEXT[],
  notes TEXT,
  next_due_date DATE,
  next_due_hours DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Equipment assignment per job
CREATE TABLE public.power_washing_job_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.power_washing_jobs(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.power_washing_equipment(id),
  shop_id UUID REFERENCES public.shops(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(job_id, equipment_id)
);

-- Add photos column to jobs if not exists
ALTER TABLE public.power_washing_jobs 
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Enable RLS on new tables
ALTER TABLE public.power_washing_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_job_chemicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_job_equipment ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time entries
CREATE POLICY "Users can view time entries in their shop"
ON public.power_washing_time_entries FOR SELECT
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can insert time entries in their shop"
ON public.power_washing_time_entries FOR INSERT
WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can update time entries in their shop"
ON public.power_washing_time_entries FOR UPDATE
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can delete time entries in their shop"
ON public.power_washing_time_entries FOR DELETE
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

-- RLS Policies for job chemicals
CREATE POLICY "Users can view job chemicals in their shop"
ON public.power_washing_job_chemicals FOR SELECT
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can insert job chemicals in their shop"
ON public.power_washing_job_chemicals FOR INSERT
WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can update job chemicals in their shop"
ON public.power_washing_job_chemicals FOR UPDATE
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can delete job chemicals in their shop"
ON public.power_washing_job_chemicals FOR DELETE
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

-- RLS Policies for maintenance logs
CREATE POLICY "Users can view maintenance logs in their shop"
ON public.power_washing_maintenance_logs FOR SELECT
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can insert maintenance logs in their shop"
ON public.power_washing_maintenance_logs FOR INSERT
WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can update maintenance logs in their shop"
ON public.power_washing_maintenance_logs FOR UPDATE
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can delete maintenance logs in their shop"
ON public.power_washing_maintenance_logs FOR DELETE
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

-- RLS Policies for job equipment
CREATE POLICY "Users can view job equipment in their shop"
ON public.power_washing_job_equipment FOR SELECT
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can insert job equipment in their shop"
ON public.power_washing_job_equipment FOR INSERT
WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can update job equipment in their shop"
ON public.power_washing_job_equipment FOR UPDATE
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can delete job equipment in their shop"
ON public.power_washing_job_equipment FOR DELETE
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

-- Update timestamp trigger for time entries
CREATE TRIGGER update_power_washing_time_entries_updated_at
BEFORE UPDATE ON public.power_washing_time_entries
FOR EACH ROW EXECUTE FUNCTION public.update_booking_tables_updated_at();