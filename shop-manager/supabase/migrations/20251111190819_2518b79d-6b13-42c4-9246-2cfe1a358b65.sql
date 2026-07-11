-- Create maintenance items table for tracking specific components and their maintenance schedules
CREATE TABLE IF NOT EXISTS public.equipment_maintenance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_category TEXT NOT NULL, -- engine, gearbox, hydraulics, transmission, life_vest, survival_suit, life_raft, etc
  description TEXT,
  
  -- Interval settings
  interval_type TEXT NOT NULL DEFAULT 'time', -- time, hours, mileage, engine_hours
  interval_value INTEGER NOT NULL, -- number of units
  interval_unit TEXT NOT NULL, -- days, weeks, months, years, hours, km, miles
  
  -- Quantity and units
  quantity DECIMAL,
  quantity_unit TEXT, -- litres, pieces, kg, etc
  
  -- Parts info
  part_numbers TEXT[], -- array of part numbers
  
  -- Tracking
  last_service_date TIMESTAMP WITH TIME ZONE,
  last_service_hours DECIMAL,
  next_service_date TIMESTAMP WITH TIME ZONE,
  next_service_hours DECIMAL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_maintenance_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view maintenance items"
  ON public.equipment_maintenance_items
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create maintenance items"
  ON public.equipment_maintenance_items
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update maintenance items"
  ON public.equipment_maintenance_items
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete maintenance items"
  ON public.equipment_maintenance_items
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create index for faster lookups
CREATE INDEX idx_maintenance_items_equipment ON public.equipment_maintenance_items(equipment_id);
CREATE INDEX idx_maintenance_items_next_service ON public.equipment_maintenance_items(next_service_date) WHERE is_active = true;

-- Create trigger for updated_at
CREATE TRIGGER update_equipment_maintenance_items_updated_at
  BEFORE UPDATE ON public.equipment_maintenance_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();