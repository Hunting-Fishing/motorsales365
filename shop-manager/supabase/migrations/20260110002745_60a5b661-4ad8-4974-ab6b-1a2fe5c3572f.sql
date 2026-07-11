-- Add home base location to drivers
ALTER TABLE fuel_delivery_drivers 
ADD COLUMN IF NOT EXISTS home_address text,
ADD COLUMN IF NOT EXISTS home_latitude double precision,
ADD COLUMN IF NOT EXISTS home_longitude double precision;

-- Add scheduling fields to customers
ALTER TABLE fuel_delivery_customers
ADD COLUMN IF NOT EXISTS delivery_days integer[],
ADD COLUMN IF NOT EXISTS preferred_delivery_time text,
ADD COLUMN IF NOT EXISTS delivery_frequency text DEFAULT 'on_demand';