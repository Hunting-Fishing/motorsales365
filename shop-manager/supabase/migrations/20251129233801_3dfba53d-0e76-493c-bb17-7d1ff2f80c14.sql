-- Create activity_types table for timesheet categorization
CREATE TABLE public.activity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_types
CREATE POLICY "Users can view activity types for their shop"
ON public.activity_types FOR SELECT
USING (true);

CREATE POLICY "Users can manage activity types for their shop"
ON public.activity_types FOR ALL
USING (true);

-- Add activity_type_id to timesheet_entries if it doesn't exist
ALTER TABLE public.timesheet_entries 
ADD COLUMN IF NOT EXISTS activity_type_id UUID REFERENCES public.activity_types(id);

-- Add location/comments fields if missing
ALTER TABLE public.timesheet_entries 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS comments TEXT;

-- Seed default activity types (shop_id NULL = global defaults)
INSERT INTO public.activity_types (name, code, description, display_order) VALUES
('Float', 'FLT', 'Float/Transit operations', 1),
('Leave/Travel', 'LV', 'Leave or travel time', 2),
('Maintenance', 'MAINT', 'Maintenance and repair work', 3),
('Utility Vessel', 'UV', 'Utility vessel operations', 4),
('Yard Work', 'YARD', 'Yard and dock work', 5),
('Other', 'OTHER', 'Other activities', 6);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_activity_type ON public.timesheet_entries(activity_type_id);
CREATE INDEX IF NOT EXISTS idx_activity_types_shop ON public.activity_types(shop_id);
CREATE INDEX IF NOT EXISTS idx_activity_types_active ON public.activity_types(is_active) WHERE is_active = true;