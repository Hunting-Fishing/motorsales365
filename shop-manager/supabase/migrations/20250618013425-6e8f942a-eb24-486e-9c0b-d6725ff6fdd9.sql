
-- First, let's make sure the inventory_categories table exists
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert the categories (this will be skipped if they already exist due to ON CONFLICT)
INSERT INTO inventory_categories (name) VALUES
('Engine Components'),
('Electrical'),
('Brakes'),
('Suspension'),
('Exhaust'),
('Filters'),
('Fluids'),
('Transmission'),
('Cooling System'),
('Fuel System'),
('Body Parts'),
('Interior'),
('Belts & Hoses'),
('Gaskets & Seals'),
('Spark Plugs'),
('Air Intake'),
('Ignition'),
('Fuel Injection'),
('Steering'),
('Tires & Wheels'),
('Batteries'),
('Alternators & Starters'),
('Lights & Bulbs'),
('Wipers'),
('Sensors'),
('Tools'),
('Chemicals'),
('Accessories')
ON CONFLICT (name) DO NOTHING;
