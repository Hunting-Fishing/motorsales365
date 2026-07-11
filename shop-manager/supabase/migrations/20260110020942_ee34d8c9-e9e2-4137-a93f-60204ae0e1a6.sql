-- Add customer_id column to fuel_delivery_route_stops to allow adding customers directly to routes
ALTER TABLE fuel_delivery_route_stops
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES fuel_delivery_customers(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fuel_delivery_route_stops_customer_id 
ON fuel_delivery_route_stops(customer_id);