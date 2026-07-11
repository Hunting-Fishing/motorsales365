-- =============================================
-- WATER DELIVERY MODULE - COMPLETE DATABASE SCHEMA
-- Duplicates fuel_delivery_* structure with water-specific adjustments
-- =============================================

-- 1. Water Delivery Products (water types instead of fuel types)
CREATE TABLE public.water_delivery_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_code TEXT,
  water_type TEXT NOT NULL CHECK (water_type IN ('potable', 'non_potable', 'reclaimed', 'distilled', 'industrial', 'spring', 'purified', 'alkaline')),
  unit_of_measure TEXT DEFAULT 'gallon',
  base_price_per_unit NUMERIC,
  cost_per_unit NUMERIC,
  tax_rate NUMERIC DEFAULT 0,
  is_taxable BOOLEAN DEFAULT true,
  minimum_order_quantity NUMERIC,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  -- Water-specific fields (replacing octane_rating)
  ph_level NUMERIC,
  tds_ppm NUMERIC, -- Total Dissolved Solids
  source_location TEXT,
  treatment_method TEXT,
  certification TEXT, -- NSF, FDA, etc.
  grade TEXT,
  category TEXT DEFAULT 'water',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water products for their shop" ON public.water_delivery_products FOR SELECT USING (true);
CREATE POLICY "Users can insert water products for their shop" ON public.water_delivery_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water products for their shop" ON public.water_delivery_products FOR UPDATE USING (true);
CREATE POLICY "Users can delete water products for their shop" ON public.water_delivery_products FOR DELETE USING (true);

-- 2. Water Delivery Trucks (tanker trucks)
CREATE TABLE public.water_delivery_trucks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  truck_number TEXT NOT NULL,
  license_plate TEXT,
  vin TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  tank_capacity_gallons NUMERIC,
  current_water_load NUMERIC DEFAULT 0,
  compartments INTEGER DEFAULT 1,
  compartment_capacities JSONB,
  meter_number TEXT,
  last_calibration_date DATE,
  next_calibration_due DATE,
  insurance_expiry DATE,
  registration_expiry DATE,
  dot_inspection_due DATE,
  status TEXT DEFAULT 'available',
  current_odometer NUMERIC,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  -- Water-specific fields
  last_sanitized_date DATE,
  next_sanitization_due DATE,
  sanitization_certificate_url TEXT,
  tank_material TEXT, -- stainless steel, food-grade plastic, etc.
  is_potable_certified BOOLEAN DEFAULT false,
  nfs_certification_expiry DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_trucks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water trucks for their shop" ON public.water_delivery_trucks FOR SELECT USING (true);
CREATE POLICY "Users can insert water trucks for their shop" ON public.water_delivery_trucks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water trucks for their shop" ON public.water_delivery_trucks FOR UPDATE USING (true);
CREATE POLICY "Users can delete water trucks for their shop" ON public.water_delivery_trucks FOR DELETE USING (true);

-- 3. Water Delivery Truck Compartments
CREATE TABLE public.water_delivery_truck_compartments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  truck_id UUID NOT NULL REFERENCES public.water_delivery_trucks(id) ON DELETE CASCADE,
  compartment_number INTEGER NOT NULL,
  compartment_name TEXT,
  product_id UUID REFERENCES public.water_delivery_products(id),
  capacity_gallons NUMERIC NOT NULL DEFAULT 0,
  current_level_gallons NUMERIC NOT NULL DEFAULT 0,
  material TEXT,
  -- Water-specific fields
  last_sanitized_date DATE,
  is_potable_certified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.water_delivery_truck_compartments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water truck compartments" ON public.water_delivery_truck_compartments FOR SELECT USING (true);
CREATE POLICY "Users can insert water truck compartments" ON public.water_delivery_truck_compartments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water truck compartments" ON public.water_delivery_truck_compartments FOR UPDATE USING (true);
CREATE POLICY "Users can delete water truck compartments" ON public.water_delivery_truck_compartments FOR DELETE USING (true);

-- 4. Water Delivery Compartment History
CREATE TABLE public.water_delivery_compartment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  compartment_id UUID NOT NULL REFERENCES public.water_delivery_truck_compartments(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('fill', 'drain', 'delivery', 'adjustment', 'sanitization')),
  product_id UUID REFERENCES public.water_delivery_products(id),
  gallons_before NUMERIC NOT NULL,
  gallons_change NUMERIC NOT NULL,
  gallons_after NUMERIC NOT NULL,
  source TEXT,
  destination TEXT,
  notes TEXT,
  performed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_compartment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water compartment history" ON public.water_delivery_compartment_history FOR SELECT USING (true);
CREATE POLICY "Users can insert water compartment history" ON public.water_delivery_compartment_history FOR INSERT WITH CHECK (true);

-- 5. Water Delivery Drivers
CREATE TABLE public.water_delivery_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  license_number TEXT,
  license_class TEXT,
  license_expiry DATE,
  license_state TEXT,
  -- Water-specific certifications (no HAZMAT needed)
  water_quality_certified BOOLEAN DEFAULT false,
  water_quality_cert_expiry DATE,
  food_handler_certified BOOLEAN DEFAULT false,
  food_handler_cert_expiry DATE,
  tanker_endorsement BOOLEAN DEFAULT false,
  tanker_endorsement_expiry DATE,
  medical_card_expiry DATE,
  hire_date DATE,
  hourly_rate NUMERIC,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  photo_url TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  assigned_truck_id UUID REFERENCES public.water_delivery_trucks(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water drivers" ON public.water_delivery_drivers FOR SELECT USING (true);
CREATE POLICY "Users can insert water drivers" ON public.water_delivery_drivers FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water drivers" ON public.water_delivery_drivers FOR UPDATE USING (true);
CREATE POLICY "Users can delete water drivers" ON public.water_delivery_drivers FOR DELETE USING (true);

-- 6. Water Delivery Customers
CREATE TABLE public.water_delivery_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  company_name TEXT,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_zip TEXT,
  credit_limit NUMERIC,
  payment_terms TEXT DEFAULT 'net30',
  tax_exempt BOOLEAN DEFAULT false,
  tax_exempt_number TEXT,
  account_number TEXT,
  is_commercial BOOLEAN DEFAULT false,
  requires_po BOOLEAN DEFAULT false,
  default_product_id UUID REFERENCES public.water_delivery_products(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  portal_access_enabled BOOLEAN DEFAULT false,
  portal_pin TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water customers" ON public.water_delivery_customers FOR SELECT USING (true);
CREATE POLICY "Users can insert water customers" ON public.water_delivery_customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water customers" ON public.water_delivery_customers FOR UPDATE USING (true);
CREATE POLICY "Users can delete water customers" ON public.water_delivery_customers FOR DELETE USING (true);

-- 7. Water Delivery Locations
CREATE TABLE public.water_delivery_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.water_delivery_customers(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  access_instructions TEXT,
  gate_code TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  default_product_id UUID REFERENCES public.water_delivery_products(id),
  default_quantity NUMERIC,
  tank_id UUID,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  delivery_window_start TIME,
  delivery_window_end TIME,
  special_equipment_needed TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water locations" ON public.water_delivery_locations FOR SELECT USING (true);
CREATE POLICY "Users can insert water locations" ON public.water_delivery_locations FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water locations" ON public.water_delivery_locations FOR UPDATE USING (true);
CREATE POLICY "Users can delete water locations" ON public.water_delivery_locations FOR DELETE USING (true);

-- 8. Water Delivery Tanks (customer storage tanks)
CREATE TABLE public.water_delivery_tanks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.water_delivery_customers(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.water_delivery_locations(id) ON DELETE SET NULL,
  tank_number TEXT NOT NULL,
  tank_name TEXT,
  capacity_gallons NUMERIC NOT NULL,
  current_level_gallons NUMERIC DEFAULT 0,
  current_level_percent NUMERIC GENERATED ALWAYS AS (
    CASE WHEN capacity_gallons > 0 THEN (current_level_gallons / capacity_gallons * 100) ELSE 0 END
  ) STORED,
  reorder_level_percent NUMERIC DEFAULT 20,
  product_id UUID REFERENCES public.water_delivery_products(id),
  tank_type TEXT, -- above ground, underground, cistern, etc.
  material TEXT,
  install_date DATE,
  last_inspection_date DATE,
  next_inspection_due DATE,
  -- Water-specific fields
  last_sanitized_date DATE,
  next_sanitization_due DATE,
  is_potable_certified BOOLEAN DEFAULT false,
  has_filtration BOOLEAN DEFAULT false,
  has_uv_treatment BOOLEAN DEFAULT false,
  has_level_sensor BOOLEAN DEFAULT false,
  telemetry_device_id TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_tanks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water tanks" ON public.water_delivery_tanks FOR SELECT USING (true);
CREATE POLICY "Users can insert water tanks" ON public.water_delivery_tanks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water tanks" ON public.water_delivery_tanks FOR UPDATE USING (true);
CREATE POLICY "Users can delete water tanks" ON public.water_delivery_tanks FOR DELETE USING (true);

-- 9. Water Delivery Tank Fills
CREATE TABLE public.water_delivery_tank_fills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  tank_id UUID NOT NULL REFERENCES public.water_delivery_tanks(id) ON DELETE CASCADE,
  delivery_id UUID,
  driver_id UUID REFERENCES public.water_delivery_drivers(id),
  product_id UUID REFERENCES public.water_delivery_products(id),
  fill_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  level_before_gallons NUMERIC,
  level_before_percent NUMERIC,
  gallons_delivered NUMERIC NOT NULL,
  level_after_gallons NUMERIC,
  level_after_percent NUMERIC,
  meter_start NUMERIC,
  meter_end NUMERIC,
  price_per_gallon NUMERIC,
  total_amount NUMERIC,
  -- Water quality readings
  ph_level_reading NUMERIC,
  chlorine_level_reading NUMERIC,
  notes TEXT,
  signature_url TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_tank_fills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water tank fills" ON public.water_delivery_tank_fills FOR SELECT USING (true);
CREATE POLICY "Users can insert water tank fills" ON public.water_delivery_tank_fills FOR INSERT WITH CHECK (true);

-- 10. Water Delivery Tank Readings
CREATE TABLE public.water_delivery_tank_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  tank_id UUID NOT NULL REFERENCES public.water_delivery_tanks(id) ON DELETE CASCADE,
  reading_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  level_gallons NUMERIC NOT NULL,
  level_percent NUMERIC,
  reading_type TEXT DEFAULT 'manual' CHECK (reading_type IN ('manual', 'automatic', 'telemetry')),
  recorded_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_tank_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water tank readings" ON public.water_delivery_tank_readings FOR SELECT USING (true);
CREATE POLICY "Users can insert water tank readings" ON public.water_delivery_tank_readings FOR INSERT WITH CHECK (true);

-- 11. Water Delivery Tidy Tanks (portable tanks)
CREATE TABLE public.water_delivery_tidy_tanks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  tank_number TEXT NOT NULL,
  tank_name TEXT,
  capacity_gallons NUMERIC NOT NULL,
  current_level_gallons NUMERIC DEFAULT 0,
  product_id UUID REFERENCES public.water_delivery_products(id),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'deployed', 'maintenance', 'retired')),
  current_location_id UUID REFERENCES public.water_delivery_locations(id),
  current_customer_id UUID REFERENCES public.water_delivery_customers(id),
  deployed_date DATE,
  expected_return_date DATE,
  daily_rental_rate NUMERIC,
  -- Water-specific fields
  last_sanitized_date DATE,
  is_potable_certified BOOLEAN DEFAULT false,
  material TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_tidy_tanks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water tidy tanks" ON public.water_delivery_tidy_tanks FOR SELECT USING (true);
CREATE POLICY "Users can insert water tidy tanks" ON public.water_delivery_tidy_tanks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water tidy tanks" ON public.water_delivery_tidy_tanks FOR UPDATE USING (true);
CREATE POLICY "Users can delete water tidy tanks" ON public.water_delivery_tidy_tanks FOR DELETE USING (true);

-- 12. Water Delivery Orders
CREATE TABLE public.water_delivery_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.water_delivery_customers(id),
  location_id UUID REFERENCES public.water_delivery_locations(id),
  tank_id UUID REFERENCES public.water_delivery_tanks(id),
  product_id UUID REFERENCES public.water_delivery_products(id),
  quantity_gallons NUMERIC NOT NULL,
  price_per_gallon NUMERIC,
  subtotal NUMERIC,
  tax_amount NUMERIC DEFAULT 0,
  delivery_fee NUMERIC DEFAULT 0,
  total_amount NUMERIC,
  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  requested_date DATE,
  requested_time_window TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  assigned_driver_id UUID REFERENCES public.water_delivery_drivers(id),
  assigned_truck_id UUID REFERENCES public.water_delivery_trucks(id),
  route_id UUID,
  po_number TEXT,
  special_instructions TEXT,
  notes TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'phone', 'portal', 'auto', 'recurring')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water orders" ON public.water_delivery_orders FOR SELECT USING (true);
CREATE POLICY "Users can insert water orders" ON public.water_delivery_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water orders" ON public.water_delivery_orders FOR UPDATE USING (true);
CREATE POLICY "Users can delete water orders" ON public.water_delivery_orders FOR DELETE USING (true);

-- 13. Water Delivery Routes
CREATE TABLE public.water_delivery_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  route_name TEXT NOT NULL,
  route_date DATE NOT NULL,
  driver_id UUID REFERENCES public.water_delivery_drivers(id),
  truck_id UUID REFERENCES public.water_delivery_trucks(id),
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  total_stops INTEGER DEFAULT 0,
  completed_stops INTEGER DEFAULT 0,
  total_gallons NUMERIC DEFAULT 0,
  delivered_gallons NUMERIC DEFAULT 0,
  total_miles NUMERIC,
  start_odometer NUMERIC,
  end_odometer NUMERIC,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water routes" ON public.water_delivery_routes FOR SELECT USING (true);
CREATE POLICY "Users can insert water routes" ON public.water_delivery_routes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water routes" ON public.water_delivery_routes FOR UPDATE USING (true);
CREATE POLICY "Users can delete water routes" ON public.water_delivery_routes FOR DELETE USING (true);

-- 14. Water Delivery Route Stops
CREATE TABLE public.water_delivery_route_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.water_delivery_routes(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.water_delivery_orders(id),
  stop_number INTEGER NOT NULL,
  customer_id UUID REFERENCES public.water_delivery_customers(id),
  location_id UUID REFERENCES public.water_delivery_locations(id),
  tank_id UUID REFERENCES public.water_delivery_tanks(id),
  product_id UUID REFERENCES public.water_delivery_products(id),
  planned_gallons NUMERIC,
  actual_gallons NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'partial')),
  arrival_time TIMESTAMP WITH TIME ZONE,
  departure_time TIMESTAMP WITH TIME ZONE,
  skip_reason TEXT,
  notes TEXT,
  signature_url TEXT,
  photo_urls JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_route_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water route stops" ON public.water_delivery_route_stops FOR SELECT USING (true);
CREATE POLICY "Users can insert water route stops" ON public.water_delivery_route_stops FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water route stops" ON public.water_delivery_route_stops FOR UPDATE USING (true);
CREATE POLICY "Users can delete water route stops" ON public.water_delivery_route_stops FOR DELETE USING (true);

-- 15. Water Delivery Completions
CREATE TABLE public.water_delivery_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.water_delivery_orders(id),
  route_stop_id UUID REFERENCES public.water_delivery_route_stops(id),
  customer_id UUID REFERENCES public.water_delivery_customers(id),
  location_id UUID REFERENCES public.water_delivery_locations(id),
  tank_id UUID REFERENCES public.water_delivery_tanks(id),
  driver_id UUID REFERENCES public.water_delivery_drivers(id),
  truck_id UUID REFERENCES public.water_delivery_trucks(id),
  compartment_id UUID REFERENCES public.water_delivery_truck_compartments(id),
  product_id UUID REFERENCES public.water_delivery_products(id),
  delivery_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  gallons_delivered NUMERIC NOT NULL,
  meter_start NUMERIC,
  meter_end NUMERIC,
  tank_level_before NUMERIC,
  tank_level_after NUMERIC,
  price_per_gallon NUMERIC,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  delivery_fee NUMERIC,
  total_amount NUMERIC,
  payment_method TEXT,
  payment_received BOOLEAN DEFAULT false,
  signature_url TEXT,
  photo_urls JSONB,
  -- Water quality readings
  ph_level_reading NUMERIC,
  chlorine_level_reading NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water completions" ON public.water_delivery_completions FOR SELECT USING (true);
CREATE POLICY "Users can insert water completions" ON public.water_delivery_completions FOR INSERT WITH CHECK (true);

-- 16. Water Delivery Purchases (BOL tracking)
CREATE TABLE public.water_delivery_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  vendor_account_number TEXT,
  bol_number TEXT NOT NULL,
  po_number TEXT,
  product_id UUID REFERENCES public.water_delivery_products(id),
  quantity_gallons NUMERIC NOT NULL,
  price_per_gallon NUMERIC NOT NULL,
  subtotal NUMERIC GENERATED ALWAYS AS (quantity_gallons * price_per_gallon) STORED,
  taxes NUMERIC DEFAULT 0,
  fees NUMERIC DEFAULT 0,
  total_cost NUMERIC,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_date TIMESTAMP WITH TIME ZONE,
  received_by UUID REFERENCES public.profiles(id),
  truck_id UUID REFERENCES public.water_delivery_trucks(id),
  compartment_id UUID REFERENCES public.water_delivery_truck_compartments(id),
  meter_start_reading NUMERIC,
  meter_end_reading NUMERIC,
  actual_gallons_received NUMERIC,
  variance_gallons NUMERIC GENERATED ALWAYS AS (actual_gallons_received - quantity_gallons) STORED,
  source_name TEXT, -- Water source/plant name
  source_location TEXT,
  -- Water quality at source
  source_ph_level NUMERIC,
  source_chlorine_level NUMERIC,
  source_tds_ppm NUMERIC,
  quality_certificate_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'received', 'reconciled', 'disputed')),
  bol_document_url TEXT,
  invoice_document_url TEXT,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  payment_due_date DATE,
  payment_date DATE,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.water_delivery_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water purchases" ON public.water_delivery_purchases FOR SELECT USING (true);
CREATE POLICY "Users can insert water purchases" ON public.water_delivery_purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water purchases" ON public.water_delivery_purchases FOR UPDATE USING (true);
CREATE POLICY "Users can delete water purchases" ON public.water_delivery_purchases FOR DELETE USING (true);

-- 17. Water Delivery Inventory
CREATE TABLE public.water_delivery_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.water_delivery_products(id),
  location_type TEXT NOT NULL CHECK (location_type IN ('yard', 'truck', 'storage')),
  location_id UUID,
  quantity_gallons NUMERIC NOT NULL DEFAULT 0,
  reorder_point NUMERIC,
  max_capacity NUMERIC,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water inventory" ON public.water_delivery_inventory FOR SELECT USING (true);
CREATE POLICY "Users can insert water inventory" ON public.water_delivery_inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water inventory" ON public.water_delivery_inventory FOR UPDATE USING (true);

-- 18. Water Delivery Equipment
CREATE TABLE public.water_delivery_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  equipment_type TEXT NOT NULL, -- pump, hose, meter, filter, etc.
  serial_number TEXT,
  model TEXT,
  manufacturer TEXT,
  purchase_date DATE,
  purchase_price NUMERIC,
  current_value NUMERIC,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
  assigned_truck_id UUID REFERENCES public.water_delivery_trucks(id),
  last_service_date DATE,
  next_service_due DATE,
  -- Water-specific fields
  last_sanitized_date DATE,
  flow_rate_gpm NUMERIC,
  is_potable_certified BOOLEAN DEFAULT false,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water equipment" ON public.water_delivery_equipment FOR SELECT USING (true);
CREATE POLICY "Users can insert water equipment" ON public.water_delivery_equipment FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water equipment" ON public.water_delivery_equipment FOR UPDATE USING (true);
CREATE POLICY "Users can delete water equipment" ON public.water_delivery_equipment FOR DELETE USING (true);

-- 19. Water Delivery Equipment Filters
CREATE TABLE public.water_delivery_equipment_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.water_delivery_equipment(id) ON DELETE CASCADE,
  truck_id UUID REFERENCES public.water_delivery_trucks(id) ON DELETE CASCADE,
  filter_type TEXT NOT NULL, -- sediment, carbon, UV, RO, etc.
  filter_model TEXT,
  manufacturer TEXT,
  install_date DATE NOT NULL,
  replacement_interval_days INTEGER,
  replacement_interval_gallons NUMERIC,
  gallons_since_install NUMERIC DEFAULT 0,
  next_replacement_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'needs_replacement', 'replaced')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_equipment_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water filters" ON public.water_delivery_equipment_filters FOR SELECT USING (true);
CREATE POLICY "Users can insert water filters" ON public.water_delivery_equipment_filters FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water filters" ON public.water_delivery_equipment_filters FOR UPDATE USING (true);
CREATE POLICY "Users can delete water filters" ON public.water_delivery_equipment_filters FOR DELETE USING (true);

-- 20. Water Delivery Equipment Usage
CREATE TABLE public.water_delivery_equipment_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.water_delivery_equipment(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  hours_used NUMERIC,
  gallons_pumped NUMERIC,
  driver_id UUID REFERENCES public.water_delivery_drivers(id),
  truck_id UUID REFERENCES public.water_delivery_trucks(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_equipment_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water equipment usage" ON public.water_delivery_equipment_usage FOR SELECT USING (true);
CREATE POLICY "Users can insert water equipment usage" ON public.water_delivery_equipment_usage FOR INSERT WITH CHECK (true);

-- 21. Water Delivery Invoices
CREATE TABLE public.water_delivery_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.water_delivery_customers(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  delivery_fees NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled')),
  payment_terms TEXT,
  notes TEXT,
  internal_notes TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water invoices" ON public.water_delivery_invoices FOR SELECT USING (true);
CREATE POLICY "Users can insert water invoices" ON public.water_delivery_invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water invoices" ON public.water_delivery_invoices FOR UPDATE USING (true);
CREATE POLICY "Users can delete water invoices" ON public.water_delivery_invoices FOR DELETE USING (true);

-- 22. Water Delivery Invoice Lines
CREATE TABLE public.water_delivery_invoice_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.water_delivery_invoices(id) ON DELETE CASCADE,
  completion_id UUID REFERENCES public.water_delivery_completions(id),
  product_id UUID REFERENCES public.water_delivery_products(id),
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  line_total NUMERIC NOT NULL,
  delivery_date DATE,
  location_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water invoice lines" ON public.water_delivery_invoice_lines FOR SELECT USING (true);
CREATE POLICY "Users can insert water invoice lines" ON public.water_delivery_invoice_lines FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water invoice lines" ON public.water_delivery_invoice_lines FOR UPDATE USING (true);
CREATE POLICY "Users can delete water invoice lines" ON public.water_delivery_invoice_lines FOR DELETE USING (true);

-- 23. Water Delivery Payments
CREATE TABLE public.water_delivery_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.water_delivery_invoices(id),
  customer_id UUID REFERENCES public.water_delivery_customers(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water payments" ON public.water_delivery_payments FOR SELECT USING (true);
CREATE POLICY "Users can insert water payments" ON public.water_delivery_payments FOR INSERT WITH CHECK (true);

-- 24. Water Delivery Quotes
CREATE TABLE public.water_delivery_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.water_delivery_customers(id),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired')),
  notes TEXT,
  terms TEXT,
  converted_to_order_id UUID REFERENCES public.water_delivery_orders(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water quotes" ON public.water_delivery_quotes FOR SELECT USING (true);
CREATE POLICY "Users can insert water quotes" ON public.water_delivery_quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water quotes" ON public.water_delivery_quotes FOR UPDATE USING (true);
CREATE POLICY "Users can delete water quotes" ON public.water_delivery_quotes FOR DELETE USING (true);

-- 25. Water Delivery Quote Lines
CREATE TABLE public.water_delivery_quote_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.water_delivery_quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.water_delivery_products(id),
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  tax_rate NUMERIC DEFAULT 0,
  line_total NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_quote_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water quote lines" ON public.water_delivery_quote_lines FOR SELECT USING (true);
CREATE POLICY "Users can insert water quote lines" ON public.water_delivery_quote_lines FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water quote lines" ON public.water_delivery_quote_lines FOR UPDATE USING (true);
CREATE POLICY "Users can delete water quote lines" ON public.water_delivery_quote_lines FOR DELETE USING (true);

-- 26. Water Delivery Settings
CREATE TABLE public.water_delivery_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT,
  business_address TEXT,
  business_city TEXT,
  business_state TEXT,
  business_zip TEXT,
  business_phone TEXT,
  business_email TEXT,
  logo_url TEXT,
  default_tax_rate NUMERIC DEFAULT 0,
  default_payment_terms TEXT DEFAULT 'net30',
  invoice_prefix TEXT DEFAULT 'WI',
  order_prefix TEXT DEFAULT 'WO',
  quote_prefix TEXT DEFAULT 'WQ',
  enable_customer_portal BOOLEAN DEFAULT false,
  enable_online_payments BOOLEAN DEFAULT false,
  enable_auto_invoicing BOOLEAN DEFAULT false,
  enable_route_optimization BOOLEAN DEFAULT false,
  default_delivery_fee NUMERIC DEFAULT 0,
  minimum_order_gallons NUMERIC,
  -- Water-specific settings
  default_sanitization_interval_days INTEGER DEFAULT 30,
  require_quality_readings BOOLEAN DEFAULT false,
  potable_certification_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water settings" ON public.water_delivery_settings FOR SELECT USING (true);
CREATE POLICY "Users can insert water settings" ON public.water_delivery_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water settings" ON public.water_delivery_settings FOR UPDATE USING (true);

-- 27. Water Delivery Hours
CREATE TABLE public.water_delivery_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open BOOLEAN DEFAULT true,
  open_time TIME,
  close_time TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id, day_of_week)
);

ALTER TABLE public.water_delivery_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water hours" ON public.water_delivery_hours FOR SELECT USING (true);
CREATE POLICY "Users can insert water hours" ON public.water_delivery_hours FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water hours" ON public.water_delivery_hours FOR UPDATE USING (true);

-- 28. Water Delivery Zones
CREATE TABLE public.water_delivery_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  zone_code TEXT,
  description TEXT,
  delivery_fee NUMERIC DEFAULT 0,
  minimum_order NUMERIC,
  zip_codes TEXT[],
  cities TEXT[],
  polygon_coordinates JSONB,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water zones" ON public.water_delivery_zones FOR SELECT USING (true);
CREATE POLICY "Users can insert water zones" ON public.water_delivery_zones FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water zones" ON public.water_delivery_zones FOR UPDATE USING (true);
CREATE POLICY "Users can delete water zones" ON public.water_delivery_zones FOR DELETE USING (true);

-- 29. Water Delivery Yards (water depots/sources)
CREATE TABLE public.water_delivery_yards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  yard_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  contact_name TEXT,
  contact_phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  -- Water-specific fields
  water_source_type TEXT, -- municipal, well, spring, etc.
  treatment_capabilities TEXT[],
  storage_capacity_gallons NUMERIC,
  daily_capacity_gallons NUMERIC,
  certifications TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_yards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water yards" ON public.water_delivery_yards FOR SELECT USING (true);
CREATE POLICY "Users can insert water yards" ON public.water_delivery_yards FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water yards" ON public.water_delivery_yards FOR UPDATE USING (true);
CREATE POLICY "Users can delete water yards" ON public.water_delivery_yards FOR DELETE USING (true);

-- 30. Water Delivery Labor Rates
CREATE TABLE public.water_delivery_labor_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  rate_name TEXT NOT NULL,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('hourly', 'per_delivery', 'flat')),
  rate_amount NUMERIC NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_labor_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water labor rates" ON public.water_delivery_labor_rates FOR SELECT USING (true);
CREATE POLICY "Users can insert water labor rates" ON public.water_delivery_labor_rates FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water labor rates" ON public.water_delivery_labor_rates FOR UPDATE USING (true);
CREATE POLICY "Users can delete water labor rates" ON public.water_delivery_labor_rates FOR DELETE USING (true);

-- 31. Water Delivery Special Rates (customer-specific pricing)
CREATE TABLE public.water_delivery_special_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.water_delivery_customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.water_delivery_products(id),
  rate_type TEXT NOT NULL CHECK (rate_type IN ('fixed', 'discount_percent', 'discount_amount')),
  rate_value NUMERIC NOT NULL,
  minimum_quantity NUMERIC,
  effective_date DATE,
  expiration_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_special_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water special rates" ON public.water_delivery_special_rates FOR SELECT USING (true);
CREATE POLICY "Users can insert water special rates" ON public.water_delivery_special_rates FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water special rates" ON public.water_delivery_special_rates FOR UPDATE USING (true);
CREATE POLICY "Users can delete water special rates" ON public.water_delivery_special_rates FOR DELETE USING (true);

-- 32. Water Delivery Price History
CREATE TABLE public.water_delivery_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.water_delivery_products(id) ON DELETE CASCADE,
  old_price NUMERIC,
  new_price NUMERIC NOT NULL,
  change_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES public.profiles(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water price history" ON public.water_delivery_price_history FOR SELECT USING (true);
CREATE POLICY "Users can insert water price history" ON public.water_delivery_price_history FOR INSERT WITH CHECK (true);

-- 33. Water Delivery Vehicles (additional fleet vehicles)
CREATE TABLE public.water_delivery_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  vehicle_number TEXT NOT NULL,
  license_plate TEXT,
  vin TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  status TEXT DEFAULT 'available',
  current_odometer NUMERIC,
  insurance_expiry DATE,
  registration_expiry DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water vehicles" ON public.water_delivery_vehicles FOR SELECT USING (true);
CREATE POLICY "Users can insert water vehicles" ON public.water_delivery_vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water vehicles" ON public.water_delivery_vehicles FOR UPDATE USING (true);
CREATE POLICY "Users can delete water vehicles" ON public.water_delivery_vehicles FOR DELETE USING (true);

-- 34. Water Delivery Requests (customer portal requests)
CREATE TABLE public.water_delivery_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.water_delivery_customers(id),
  location_id UUID REFERENCES public.water_delivery_locations(id),
  tank_id UUID REFERENCES public.water_delivery_tanks(id),
  product_id UUID REFERENCES public.water_delivery_products(id),
  requested_gallons NUMERIC,
  requested_date DATE,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'emergency')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'converted', 'declined')),
  converted_to_order_id UUID REFERENCES public.water_delivery_orders(id),
  customer_notes TEXT,
  internal_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water requests" ON public.water_delivery_requests FOR SELECT USING (true);
CREATE POLICY "Users can insert water requests" ON public.water_delivery_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water requests" ON public.water_delivery_requests FOR UPDATE USING (true);

-- 35. Water Delivery Customer Vehicles (if customers have water trucks/equipment)
CREATE TABLE public.water_delivery_customer_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.water_delivery_customers(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  vehicle_number TEXT,
  license_plate TEXT,
  tank_capacity_gallons NUMERIC,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_delivery_customer_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view water customer vehicles" ON public.water_delivery_customer_vehicles FOR SELECT USING (true);
CREATE POLICY "Users can insert water customer vehicles" ON public.water_delivery_customer_vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update water customer vehicles" ON public.water_delivery_customer_vehicles FOR UPDATE USING (true);
CREATE POLICY "Users can delete water customer vehicles" ON public.water_delivery_customer_vehicles FOR DELETE USING (true);

-- Create indexes for performance
CREATE INDEX idx_water_delivery_products_shop ON public.water_delivery_products(shop_id);
CREATE INDEX idx_water_delivery_trucks_shop ON public.water_delivery_trucks(shop_id);
CREATE INDEX idx_water_delivery_orders_shop ON public.water_delivery_orders(shop_id);
CREATE INDEX idx_water_delivery_orders_customer ON public.water_delivery_orders(customer_id);
CREATE INDEX idx_water_delivery_orders_status ON public.water_delivery_orders(status);
CREATE INDEX idx_water_delivery_routes_shop ON public.water_delivery_routes(shop_id);
CREATE INDEX idx_water_delivery_routes_date ON public.water_delivery_routes(route_date);
CREATE INDEX idx_water_delivery_completions_shop ON public.water_delivery_completions(shop_id);
CREATE INDEX idx_water_delivery_tanks_shop ON public.water_delivery_tanks(shop_id);
CREATE INDEX idx_water_delivery_tanks_customer ON public.water_delivery_tanks(customer_id);
CREATE INDEX idx_water_delivery_invoices_shop ON public.water_delivery_invoices(shop_id);
CREATE INDEX idx_water_delivery_invoices_customer ON public.water_delivery_invoices(customer_id);