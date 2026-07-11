-- Fuel Storage Tanks (fixed tanks at customer locations)
CREATE TABLE public.fuel_delivery_tanks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  customer_id UUID REFERENCES public.fuel_delivery_customers(id),
  location_id UUID REFERENCES public.fuel_delivery_locations(id),
  tank_name VARCHAR(255) NOT NULL,
  tank_number VARCHAR(100),
  tank_type VARCHAR(50) DEFAULT 'fixed', -- fixed, underground, above_ground
  capacity_liters NUMERIC(12,2) NOT NULL,
  current_level_liters NUMERIC(12,2) DEFAULT 0,
  minimum_level_liters NUMERIC(12,2) DEFAULT 0,
  product_id UUID REFERENCES public.fuel_delivery_products(id),
  last_filled_date TIMESTAMPTZ,
  last_reading_date TIMESTAMPTZ,
  installation_date DATE,
  last_inspection_date DATE,
  next_inspection_date DATE,
  gps_latitude NUMERIC(10,7),
  gps_longitude NUMERIC(10,7),
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tidy Tanks (portable/mobile tanks)
CREATE TABLE public.fuel_delivery_tidy_tanks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  tank_name VARCHAR(255) NOT NULL,
  tank_number VARCHAR(100) UNIQUE,
  capacity_liters NUMERIC(12,2) NOT NULL,
  current_level_liters NUMERIC(12,2) DEFAULT 0,
  product_id UUID REFERENCES public.fuel_delivery_products(id),
  current_location VARCHAR(255),
  assigned_customer_id UUID REFERENCES public.fuel_delivery_customers(id),
  assigned_date DATE,
  return_date DATE,
  last_filled_date TIMESTAMPTZ,
  condition VARCHAR(50) DEFAULT 'good', -- good, fair, needs_maintenance, retired
  last_inspection_date DATE,
  next_inspection_date DATE,
  status VARCHAR(50) DEFAULT 'available', -- available, assigned, in_transit, maintenance
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tank Fill Records (tracks every fill/delivery to a tank)
CREATE TABLE public.fuel_delivery_tank_fills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  tank_id UUID REFERENCES public.fuel_delivery_tanks(id),
  tidy_tank_id UUID REFERENCES public.fuel_delivery_tidy_tanks(id),
  order_id UUID REFERENCES public.fuel_delivery_orders(id),
  delivery_id UUID REFERENCES public.fuel_delivery_completions(id),
  driver_id UUID REFERENCES public.fuel_delivery_drivers(id),
  truck_id UUID REFERENCES public.fuel_delivery_trucks(id),
  product_id UUID REFERENCES public.fuel_delivery_products(id),
  customer_id UUID REFERENCES public.fuel_delivery_customers(id),
  fill_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  liters_before NUMERIC(12,2),
  liters_delivered NUMERIC(12,2) NOT NULL,
  liters_after NUMERIC(12,2),
  price_per_liter NUMERIC(10,4),
  total_amount NUMERIC(12,2),
  meter_reading_start NUMERIC(12,2),
  meter_reading_end NUMERIC(12,2),
  fill_type VARCHAR(50) DEFAULT 'delivery', -- delivery, top_up, initial_fill
  verification_method VARCHAR(50), -- dip_stick, gauge, meter
  notes TEXT,
  signature_url TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_tank_reference CHECK (
    (tank_id IS NOT NULL AND tidy_tank_id IS NULL) OR
    (tank_id IS NULL AND tidy_tank_id IS NOT NULL)
  )
);

-- Tank Reading History (for tracking levels over time)
CREATE TABLE public.fuel_delivery_tank_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  tank_id UUID REFERENCES public.fuel_delivery_tanks(id),
  tidy_tank_id UUID REFERENCES public.fuel_delivery_tidy_tanks(id),
  reading_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  level_liters NUMERIC(12,2) NOT NULL,
  reading_type VARCHAR(50) DEFAULT 'manual', -- manual, automatic, delivery
  recorded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fuel_delivery_tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_tidy_tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_tank_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_tank_readings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tanks
CREATE POLICY "Users can view tanks" ON public.fuel_delivery_tanks FOR SELECT USING (true);
CREATE POLICY "Users can create tanks" ON public.fuel_delivery_tanks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update tanks" ON public.fuel_delivery_tanks FOR UPDATE USING (true);
CREATE POLICY "Users can delete tanks" ON public.fuel_delivery_tanks FOR DELETE USING (true);

-- RLS Policies for tidy tanks
CREATE POLICY "Users can view tidy tanks" ON public.fuel_delivery_tidy_tanks FOR SELECT USING (true);
CREATE POLICY "Users can create tidy tanks" ON public.fuel_delivery_tidy_tanks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update tidy tanks" ON public.fuel_delivery_tidy_tanks FOR UPDATE USING (true);
CREATE POLICY "Users can delete tidy tanks" ON public.fuel_delivery_tidy_tanks FOR DELETE USING (true);

-- RLS Policies for tank fills
CREATE POLICY "Users can view tank fills" ON public.fuel_delivery_tank_fills FOR SELECT USING (true);
CREATE POLICY "Users can create tank fills" ON public.fuel_delivery_tank_fills FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update tank fills" ON public.fuel_delivery_tank_fills FOR UPDATE USING (true);
CREATE POLICY "Users can delete tank fills" ON public.fuel_delivery_tank_fills FOR DELETE USING (true);

-- RLS Policies for tank readings
CREATE POLICY "Users can view tank readings" ON public.fuel_delivery_tank_readings FOR SELECT USING (true);
CREATE POLICY "Users can create tank readings" ON public.fuel_delivery_tank_readings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update tank readings" ON public.fuel_delivery_tank_readings FOR UPDATE USING (true);
CREATE POLICY "Users can delete tank readings" ON public.fuel_delivery_tank_readings FOR DELETE USING (true);

-- Indexes for performance
CREATE INDEX idx_fuel_tanks_customer ON public.fuel_delivery_tanks(customer_id);
CREATE INDEX idx_fuel_tanks_location ON public.fuel_delivery_tanks(location_id);
CREATE INDEX idx_fuel_tanks_product ON public.fuel_delivery_tanks(product_id);
CREATE INDEX idx_tidy_tanks_customer ON public.fuel_delivery_tidy_tanks(assigned_customer_id);
CREATE INDEX idx_tank_fills_tank ON public.fuel_delivery_tank_fills(tank_id);
CREATE INDEX idx_tank_fills_tidy_tank ON public.fuel_delivery_tank_fills(tidy_tank_id);
CREATE INDEX idx_tank_fills_date ON public.fuel_delivery_tank_fills(fill_date);
CREATE INDEX idx_tank_fills_customer ON public.fuel_delivery_tank_fills(customer_id);
CREATE INDEX idx_tank_readings_tank ON public.fuel_delivery_tank_readings(tank_id);
CREATE INDEX idx_tank_readings_date ON public.fuel_delivery_tank_readings(reading_date);