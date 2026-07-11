-- Add missing columns for backward compatibility with MaintenanceIntervals component
ALTER TABLE equipment_maintenance_items
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS interval_type TEXT,
ADD COLUMN IF NOT EXISTS interval_value INTEGER,
ADD COLUMN IF NOT EXISTS interval_unit TEXT,
ADD COLUMN IF NOT EXISTS quantity_unit TEXT,
ADD COLUMN IF NOT EXISTS part_numbers TEXT[],
ADD COLUMN IF NOT EXISTS last_service_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_service_hours INTEGER,
ADD COLUMN IF NOT EXISTS next_service_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_service_hours INTEGER,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;