
-- Create vehicle inspections table for storing real inspection data
CREATE TABLE public.vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id),
  technician_id UUID REFERENCES auth.users(id),
  inspection_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  vehicle_body_style TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  damage_areas JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies to secure the table
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all inspections
CREATE POLICY "Users can view vehicle inspections" 
  ON public.vehicle_inspections FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert their own inspections
CREATE POLICY "Users can create vehicle inspections" 
  ON public.vehicle_inspections FOR INSERT 
  WITH CHECK (auth.uid() = technician_id);

-- Allow authenticated users to update their own inspections
CREATE POLICY "Users can update their own inspections" 
  ON public.vehicle_inspections FOR UPDATE 
  USING (auth.uid() = technician_id);

-- Add trigger to automatically update the updated_at column
CREATE TRIGGER update_vehicle_inspections_updated_at
  BEFORE UPDATE ON public.vehicle_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp();
