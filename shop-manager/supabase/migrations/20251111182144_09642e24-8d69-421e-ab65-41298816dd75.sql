-- Add unit_number and maintenance_intervals columns to equipment_assets table
ALTER TABLE equipment_assets
ADD COLUMN IF NOT EXISTS unit_number TEXT,
ADD COLUMN IF NOT EXISTS maintenance_intervals JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN equipment_assets.unit_number IS 'Internal unit number for equipment tracking (e.g., UNIT-001)';
COMMENT ON COLUMN equipment_assets.maintenance_intervals IS 'Array of maintenance interval configurations with hours, miles, months, and engine numbers';