-- Add priority field to water_delivery_routes table
ALTER TABLE water_delivery_routes 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('emergency', 'high', 'normal', 'low'));

-- Add index for faster priority queries
CREATE INDEX IF NOT EXISTS idx_water_delivery_routes_priority ON water_delivery_routes(priority);

-- Add index for date-based calendar queries
CREATE INDEX IF NOT EXISTS idx_water_delivery_routes_route_date ON water_delivery_routes(route_date);