-- Add hours_interval and equipment_id to safety_schedules table for hours-based scheduling
ALTER TABLE public.safety_schedules 
ADD COLUMN IF NOT EXISTS hours_interval INTEGER,
ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES public.equipment_assets(id),
ADD COLUMN IF NOT EXISTS inspection_type TEXT DEFAULT 'general';

-- Drop the duplicate inspection_schedules table and related tables
DROP TABLE IF EXISTS public.inspection_reminders CASCADE;
DROP TABLE IF EXISTS public.inspection_schedules CASCADE;