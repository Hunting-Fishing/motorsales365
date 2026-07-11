-- Create maintenance_activities table for tracking all maintenance-related actions
CREATE TABLE IF NOT EXISTS public.maintenance_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  schedule_id UUID REFERENCES public.maintenance_schedules(id) ON DELETE CASCADE,
  equipment_id UUID,
  action TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  details JSONB,
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.maintenance_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for maintenance activities
CREATE POLICY "Users can view maintenance activities for their shop" 
ON public.maintenance_activities 
FOR SELECT 
USING (
  shop_id IN (
    SELECT shop_id FROM public.team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create maintenance activities for their shop" 
ON public.maintenance_activities 
FOR INSERT 
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM public.team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update maintenance activities for their shop" 
ON public.maintenance_activities 
FOR UPDATE 
USING (
  shop_id IN (
    SELECT shop_id FROM public.team_members 
    WHERE user_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_activities_shop_id ON public.maintenance_activities(shop_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_activities_schedule_id ON public.maintenance_activities(schedule_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_activities_timestamp ON public.maintenance_activities(timestamp DESC);