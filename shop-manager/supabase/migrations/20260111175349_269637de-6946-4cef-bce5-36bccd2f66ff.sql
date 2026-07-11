-- Create fuel_delivery_truck_compartments table
CREATE TABLE public.fuel_delivery_truck_compartments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  truck_id UUID NOT NULL REFERENCES fuel_delivery_trucks(id) ON DELETE CASCADE,
  compartment_number INTEGER NOT NULL,
  compartment_name TEXT,
  product_id UUID REFERENCES fuel_delivery_products(id),
  capacity_gallons NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_level_gallons NUMERIC(10,2) NOT NULL DEFAULT 0,
  material TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(truck_id, compartment_number)
);

-- Enable RLS
ALTER TABLE public.fuel_delivery_truck_compartments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view compartments for their shop"
ON public.fuel_delivery_truck_compartments FOR SELECT
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert compartments for their shop"
ON public.fuel_delivery_truck_compartments FOR INSERT
WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update compartments for their shop"
ON public.fuel_delivery_truck_compartments FOR UPDATE
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete compartments for their shop"
ON public.fuel_delivery_truck_compartments FOR DELETE
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Add columns to fuel_delivery_completions
ALTER TABLE public.fuel_delivery_completions
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES fuel_delivery_products(id),
ADD COLUMN IF NOT EXISTS compartment_id UUID REFERENCES fuel_delivery_truck_compartments(id),
ADD COLUMN IF NOT EXISTS custom_product_name TEXT,
ADD COLUMN IF NOT EXISTS custom_product_unit TEXT DEFAULT 'gallons',
ADD COLUMN IF NOT EXISTS meter_start_reading NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS meter_end_reading NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS customer_signature TEXT,
ADD COLUMN IF NOT EXISTS customer_present BOOLEAN DEFAULT true;

-- Seed default fuel products
INSERT INTO public.fuel_delivery_products (shop_id, product_name, product_code, fuel_type, unit_of_measure, base_price_per_unit, is_active)
SELECT 
  'd5c507f2-f9f9-4a44-a662-539d55199d2b'::uuid as shop_id,
  product_name,
  product_code,
  fuel_type,
  'gallon' as unit_of_measure,
  base_price,
  true as is_active
FROM (VALUES
  ('Regular Gasoline', 'REG', 'gasoline', 3.50),
  ('Premium Gasoline', 'PREM', 'gasoline', 4.00),
  ('Diesel', 'DSL', 'diesel', 3.75),
  ('Dyed Diesel', 'DDSL', 'diesel', 3.65),
  ('Heating Oil', 'HO', 'heating_oil', 3.25),
  ('Propane', 'PROP', 'propane', 2.50)
) AS t(product_name, product_code, fuel_type, base_price)
ON CONFLICT DO NOTHING;

-- Create default compartments for existing trucks
INSERT INTO public.fuel_delivery_truck_compartments (shop_id, truck_id, compartment_number, compartment_name, capacity_gallons, current_level_gallons)
SELECT 
  t.shop_id,
  t.id as truck_id,
  generate_series(1, COALESCE(t.compartments, 2)) as compartment_number,
  'Tank ' || generate_series(1, COALESCE(t.compartments, 2)) as compartment_name,
  500 as capacity_gallons,
  250 as current_level_gallons
FROM fuel_delivery_trucks t
ON CONFLICT DO NOTHING;