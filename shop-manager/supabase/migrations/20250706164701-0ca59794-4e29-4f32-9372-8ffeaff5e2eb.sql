-- Add vehicle_damages column to work_orders table to store damage assessment data
ALTER TABLE work_orders ADD COLUMN vehicle_damages JSONB DEFAULT '[]'::jsonb;

-- Add comment to describe the structure
COMMENT ON COLUMN work_orders.vehicle_damages IS 'Array of damage areas with properties: id, x, y, type (dent|scratch|rust|paint_damage|collision|wear|other), severity (minor|moderate|severe), description, notes, photos, estimatedCost, createdAt, updatedAt';