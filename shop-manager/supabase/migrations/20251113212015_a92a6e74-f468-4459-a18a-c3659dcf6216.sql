-- Create equipment parts replacement history table
CREATE TABLE IF NOT EXISTS public.equipment_parts_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment_assets(id) ON DELETE CASCADE,
  part_number TEXT NOT NULL,
  part_name TEXT NOT NULL,
  replacement_date DATE NOT NULL,
  next_replacement_date DATE,
  replacement_interval_days INTEGER,
  replacement_interval_hours INTEGER,
  replacement_interval_mileage INTEGER,
  hours_at_replacement NUMERIC,
  mileage_at_replacement NUMERIC,
  cost NUMERIC,
  warranty_expiry_date DATE,
  warranty_months INTEGER,
  supplier_name TEXT,
  invoice_number TEXT,
  installed_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_equipment_parts_history_equipment_id 
ON public.equipment_parts_history(equipment_id);

CREATE INDEX IF NOT EXISTS idx_equipment_parts_history_part_number 
ON public.equipment_parts_history(part_number);

-- Enable RLS
ALTER TABLE public.equipment_parts_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view equipment parts history"
ON public.equipment_parts_history
FOR SELECT
USING (true);

CREATE POLICY "Users can insert equipment parts history"
ON public.equipment_parts_history
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update equipment parts history"
ON public.equipment_parts_history
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete equipment parts history"
ON public.equipment_parts_history
FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_equipment_parts_history_updated_at
BEFORE UPDATE ON public.equipment_parts_history
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();