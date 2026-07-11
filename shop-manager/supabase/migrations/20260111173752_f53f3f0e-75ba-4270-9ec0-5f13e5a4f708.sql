-- Add departure tracking and scheduling columns to route stops
ALTER TABLE fuel_delivery_route_stops 
ADD COLUMN IF NOT EXISTS actual_departure TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS preferred_time_window TEXT,
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER DEFAULT 15;

-- Add preferred delivery time to locations
ALTER TABLE fuel_delivery_locations
ADD COLUMN IF NOT EXISTS preferred_time_window TEXT DEFAULT 'any',
ADD COLUMN IF NOT EXISTS estimated_service_minutes INTEGER DEFAULT 15;

-- Add preferred delivery time to customers for on-demand
ALTER TABLE fuel_delivery_customers
ADD COLUMN IF NOT EXISTS preferred_time_window TEXT DEFAULT 'any';