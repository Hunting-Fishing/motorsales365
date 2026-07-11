-- Create fuel_delivery_customer_vehicles table for vehicles, boats, tanks, equipment
CREATE TABLE public.fuel_delivery_customer_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.fuel_delivery_customers(id) ON DELETE CASCADE,
  equipment_type text NOT NULL DEFAULT 'vehicle', -- vehicle, boat, fuel_tank, generator, farm_equipment, other
  name text, -- For tanks/equipment: "Home Fuel Tank", "Backup Generator"
  vin text,
  year integer,
  make text,
  model text,
  fuel_type text,
  license_plate text,
  color text,
  tank_capacity_gallons numeric,
  body_style text,
  location_notes text, -- Where is this equipment located
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add first_name and last_name to fuel_delivery_customers
ALTER TABLE public.fuel_delivery_customers 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Migrate existing contact_name data to first/last name
UPDATE public.fuel_delivery_customers 
SET 
  first_name = COALESCE(split_part(contact_name, ' ', 1), ''),
  last_name = COALESCE(
    CASE 
      WHEN position(' ' in contact_name) > 0 
      THEN substring(contact_name from position(' ' in contact_name) + 1)
      ELSE ''
    END, 
    ''
  )
WHERE first_name IS NULL OR last_name IS NULL;

-- Enable RLS
ALTER TABLE public.fuel_delivery_customer_vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fuel_delivery_customer_vehicles
CREATE POLICY "Customers can view own vehicles" 
ON public.fuel_delivery_customer_vehicles 
FOR SELECT 
USING (
  customer_id IN (
    SELECT id FROM public.fuel_delivery_customers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Customers can insert own vehicles" 
ON public.fuel_delivery_customer_vehicles 
FOR INSERT 
WITH CHECK (
  customer_id IN (
    SELECT id FROM public.fuel_delivery_customers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Customers can update own vehicles" 
ON public.fuel_delivery_customer_vehicles 
FOR UPDATE 
USING (
  customer_id IN (
    SELECT id FROM public.fuel_delivery_customers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Customers can delete own vehicles" 
ON public.fuel_delivery_customer_vehicles 
FOR DELETE 
USING (
  customer_id IN (
    SELECT id FROM public.fuel_delivery_customers WHERE user_id = auth.uid()
  )
);

-- Staff policies - check shop membership
CREATE POLICY "Staff can view all shop vehicles" 
ON public.fuel_delivery_customer_vehicles 
FOR SELECT 
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Staff can manage all shop vehicles" 
ON public.fuel_delivery_customer_vehicles 
FOR ALL 
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Update trigger for updated_at
CREATE TRIGGER update_fuel_delivery_customer_vehicles_updated_at
  BEFORE UPDATE ON public.fuel_delivery_customer_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();