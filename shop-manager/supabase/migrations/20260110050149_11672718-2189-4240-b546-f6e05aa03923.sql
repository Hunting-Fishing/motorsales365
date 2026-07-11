-- Add new columns to fuel_delivery_zones for location-based zones
ALTER TABLE fuel_delivery_zones 
ADD COLUMN IF NOT EXISTS origin_type text DEFAULT 'business',
ADD COLUMN IF NOT EXISTS origin_id uuid,
ADD COLUMN IF NOT EXISTS center_latitude double precision,
ADD COLUMN IF NOT EXISTS center_longitude double precision,
ADD COLUMN IF NOT EXISTS zone_color text DEFAULT '#f97316';

-- Create fuel_delivery_yards table for vehicle staging locations
CREATE TABLE IF NOT EXISTS fuel_delivery_yards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  latitude double precision,
  longitude double precision,
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create fuel_delivery_vehicles table for delivery fleet
CREATE TABLE IF NOT EXISTS fuel_delivery_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  yard_id uuid REFERENCES fuel_delivery_yards(id) ON DELETE SET NULL,
  name text NOT NULL,
  license_plate text,
  vehicle_type text DEFAULT 'tanker',
  fuel_capacity_gallons numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add business location columns to fuel_delivery_settings if not exists
ALTER TABLE fuel_delivery_settings
ADD COLUMN IF NOT EXISTS business_latitude double precision,
ADD COLUMN IF NOT EXISTS business_longitude double precision;

-- Enable RLS on new tables
ALTER TABLE fuel_delivery_yards ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_delivery_vehicles ENABLE ROW LEVEL SECURITY;

-- RLS policies for fuel_delivery_yards
CREATE POLICY "Users can view yards for their shops" 
ON fuel_delivery_yards FOR SELECT 
USING (
  shop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert yards for their shops" 
ON fuel_delivery_yards FOR INSERT 
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update yards for their shops" 
ON fuel_delivery_yards FOR UPDATE 
USING (
  shop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete yards for their shops" 
ON fuel_delivery_yards FOR DELETE 
USING (
  shop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
  )
);

-- RLS policies for fuel_delivery_vehicles
CREATE POLICY "Users can view vehicles for their shops" 
ON fuel_delivery_vehicles FOR SELECT 
USING (
  shop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert vehicles for their shops" 
ON fuel_delivery_vehicles FOR INSERT 
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update vehicles for their shops" 
ON fuel_delivery_vehicles FOR UPDATE 
USING (
  shop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete vehicles for their shops" 
ON fuel_delivery_vehicles FOR DELETE 
USING (
  shop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fuel_delivery_yards_shop_id ON fuel_delivery_yards(shop_id);
CREATE INDEX IF NOT EXISTS idx_fuel_delivery_vehicles_shop_id ON fuel_delivery_vehicles(shop_id);
CREATE INDEX IF NOT EXISTS idx_fuel_delivery_vehicles_yard_id ON fuel_delivery_vehicles(yard_id);
CREATE INDEX IF NOT EXISTS idx_fuel_delivery_zones_origin ON fuel_delivery_zones(origin_type, origin_id);

-- Trigger for updated_at on yards
CREATE TRIGGER update_fuel_delivery_yards_updated_at
BEFORE UPDATE ON fuel_delivery_yards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on vehicles
CREATE TRIGGER update_fuel_delivery_vehicles_updated_at
BEFORE UPDATE ON fuel_delivery_vehicles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();