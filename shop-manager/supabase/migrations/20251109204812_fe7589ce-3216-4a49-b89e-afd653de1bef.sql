-- Create maintenance_schedule_versions table for rollback capability
CREATE TABLE IF NOT EXISTS public.maintenance_schedule_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.maintenance_schedules(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  changed_by UUID NOT NULL,
  changed_by_name TEXT NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.maintenance_schedule_versions ENABLE ROW LEVEL SECURITY;

-- Create simple policies - anyone authenticated can view and create versions
CREATE POLICY "Authenticated users can view schedule versions" 
ON public.maintenance_schedule_versions 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create schedule versions" 
ON public.maintenance_schedule_versions 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_schedule_versions_schedule_id ON public.maintenance_schedule_versions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_versions_created_at ON public.maintenance_schedule_versions(created_at DESC);