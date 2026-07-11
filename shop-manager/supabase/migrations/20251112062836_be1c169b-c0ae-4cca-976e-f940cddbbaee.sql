-- Drop existing table if it exists
DROP TABLE IF EXISTS equipment_maintenance_items CASCADE;

-- Create equipment_maintenance_items table
CREATE TABLE equipment_maintenance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment_assets(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_type TEXT,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  part_number TEXT,
  quantity DECIMAL(10,2) DEFAULT 1,
  hours_interval INTEGER,
  mileage_interval INTEGER,
  calendar_interval INTEGER,
  calendar_interval_unit TEXT DEFAULT 'days',
  item_category TEXT,
  position TEXT,
  notes TEXT,
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_equipment_maintenance_items_equipment ON equipment_maintenance_items(equipment_id);
CREATE INDEX idx_equipment_maintenance_items_inventory ON equipment_maintenance_items(inventory_id);
CREATE INDEX idx_equipment_maintenance_items_category ON equipment_maintenance_items(item_category);

-- Enable RLS
ALTER TABLE equipment_maintenance_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view equipment maintenance items"
ON equipment_maintenance_items FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert equipment maintenance items"
ON equipment_maintenance_items FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update equipment maintenance items"
ON equipment_maintenance_items FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete equipment maintenance items"
ON equipment_maintenance_items FOR DELETE
USING (auth.role() = 'authenticated');

-- Update trigger function
CREATE OR REPLACE FUNCTION update_equipment_maintenance_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update trigger
CREATE TRIGGER equipment_maintenance_items_updated_at
BEFORE UPDATE ON equipment_maintenance_items
FOR EACH ROW
EXECUTE FUNCTION update_equipment_maintenance_items_updated_at();