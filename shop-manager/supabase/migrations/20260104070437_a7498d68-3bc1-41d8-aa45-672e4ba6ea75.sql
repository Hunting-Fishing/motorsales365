-- Fuel Delivery Module Tables

-- Fuel Delivery Customers (separate from main customers for delivery-specific data)
CREATE TABLE public.fuel_delivery_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  company_name TEXT,
  contact_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  billing_address TEXT,
  delivery_instructions TEXT,
  payment_terms TEXT DEFAULT 'net30',
  credit_limit NUMERIC(12,2) DEFAULT 0,
  current_balance NUMERIC(12,2) DEFAULT 0,
  tax_exempt BOOLEAN DEFAULT false,
  tax_exempt_number TEXT,
  preferred_fuel_type TEXT,
  auto_delivery BOOLEAN DEFAULT false,
  delivery_frequency TEXT,
  minimum_delivery_gallons NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fuel Delivery Locations (tanks/sites for each customer)
CREATE TABLE public.fuel_delivery_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  customer_id UUID REFERENCES public.fuel_delivery_customers(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  tank_capacity_gallons NUMERIC(10,2),
  current_level_gallons NUMERIC(10,2),
  tank_type TEXT,
  fuel_type TEXT NOT NULL,
  access_instructions TEXT,
  contact_on_site TEXT,
  contact_phone TEXT,
  requires_appointment BOOLEAN DEFAULT false,
  special_equipment_needed TEXT,
  last_delivery_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fuel Products/Types
CREATE TABLE public.fuel_delivery_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_code TEXT,
  fuel_type TEXT NOT NULL,
  unit_of_measure TEXT DEFAULT 'gallon',
  base_price_per_unit NUMERIC(10,4),
  cost_per_unit NUMERIC(10,4),
  tax_rate NUMERIC(5,2) DEFAULT 0,
  is_taxable BOOLEAN DEFAULT true,
  minimum_order_quantity NUMERIC(10,2),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fuel Delivery Orders
CREATE TABLE public.fuel_delivery_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  order_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.fuel_delivery_customers(id),
  location_id UUID REFERENCES public.fuel_delivery_locations(id),
  product_id UUID REFERENCES public.fuel_delivery_products(id),
  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  requested_date TIMESTAMP WITH TIME ZONE,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  quantity_ordered NUMERIC(10,2) NOT NULL,
  price_per_unit NUMERIC(10,4),
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  driver_id UUID,
  truck_id UUID,
  route_id UUID,
  special_instructions TEXT,
  internal_notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fuel Delivery Trucks/Vehicles
CREATE TABLE public.fuel_delivery_trucks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  truck_number TEXT NOT NULL,
  license_plate TEXT,
  vin TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  tank_capacity_gallons NUMERIC(10,2),
  current_fuel_load NUMERIC(10,2) DEFAULT 0,
  compartments INTEGER DEFAULT 1,
  compartment_capacities JSONB,
  meter_number TEXT,
  last_calibration_date DATE,
  next_calibration_due DATE,
  insurance_expiry DATE,
  registration_expiry DATE,
  dot_inspection_due DATE,
  status TEXT DEFAULT 'available',
  current_odometer NUMERIC(10,1),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fuel Delivery Drivers
CREATE TABLE public.fuel_delivery_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  profile_id UUID REFERENCES public.profiles(id),
  driver_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  cdl_number TEXT,
  cdl_class TEXT,
  cdl_state TEXT,
  cdl_expiry DATE,
  hazmat_endorsement BOOLEAN DEFAULT false,
  hazmat_expiry DATE,
  tanker_endorsement BOOLEAN DEFAULT false,
  medical_card_expiry DATE,
  hire_date DATE,
  hourly_rate NUMERIC(10,2),
  commission_rate NUMERIC(5,2),
  status TEXT DEFAULT 'active',
  notes TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fuel Delivery Completions (actual deliveries)
CREATE TABLE public.fuel_delivery_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  order_id UUID REFERENCES public.fuel_delivery_orders(id),
  driver_id UUID REFERENCES public.fuel_delivery_drivers(id),
  truck_id UUID REFERENCES public.fuel_delivery_trucks(id),
  delivery_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  arrival_time TIMESTAMP WITH TIME ZONE,
  departure_time TIMESTAMP WITH TIME ZONE,
  gallons_delivered NUMERIC(10,2) NOT NULL,
  meter_start_reading NUMERIC(12,2),
  meter_end_reading NUMERIC(12,2),
  tank_level_before NUMERIC(10,2),
  tank_level_after NUMERIC(10,2),
  unit_price NUMERIC(10,4),
  subtotal NUMERIC(12,2),
  tax_amount NUMERIC(12,2),
  delivery_fee NUMERIC(10,2),
  total_amount NUMERIC(12,2),
  payment_method TEXT,
  payment_received BOOLEAN DEFAULT false,
  signature_url TEXT,
  delivery_photos JSONB,
  gps_latitude NUMERIC(10,7),
  gps_longitude NUMERIC(10,7),
  odometer_reading NUMERIC(10,1),
  customer_present BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fuel Delivery Routes
CREATE TABLE public.fuel_delivery_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  route_name TEXT NOT NULL,
  route_date DATE NOT NULL,
  driver_id UUID REFERENCES public.fuel_delivery_drivers(id),
  truck_id UUID REFERENCES public.fuel_delivery_trucks(id),
  status TEXT DEFAULT 'planned',
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  total_stops INTEGER DEFAULT 0,
  completed_stops INTEGER DEFAULT 0,
  total_gallons_planned NUMERIC(12,2) DEFAULT 0,
  total_gallons_delivered NUMERIC(12,2) DEFAULT 0,
  total_miles NUMERIC(10,1),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fuel Delivery Route Stops
CREATE TABLE public.fuel_delivery_route_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES public.fuel_delivery_routes(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.fuel_delivery_orders(id),
  stop_sequence INTEGER NOT NULL,
  estimated_arrival TIMESTAMP WITH TIME ZONE,
  actual_arrival TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  skip_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fuel Inventory (bulk storage)
CREATE TABLE public.fuel_delivery_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  product_id UUID REFERENCES public.fuel_delivery_products(id),
  storage_tank_name TEXT NOT NULL,
  tank_capacity NUMERIC(12,2),
  current_quantity NUMERIC(12,2) DEFAULT 0,
  minimum_level NUMERIC(12,2),
  reorder_level NUMERIC(12,2),
  last_reading_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fuel Delivery Invoices
CREATE TABLE public.fuel_delivery_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.fuel_delivery_customers(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  delivery_fees NUMERIC(12,2) DEFAULT 0,
  adjustments NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  balance_due NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  terms TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fuel Delivery Invoice Line Items
CREATE TABLE public.fuel_delivery_invoice_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.fuel_delivery_invoices(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES public.fuel_delivery_completions(id),
  description TEXT NOT NULL,
  quantity NUMERIC(10,2),
  unit_price NUMERIC(10,4),
  subtotal NUMERIC(12,2),
  tax_amount NUMERIC(12,2),
  total NUMERIC(12,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fuel Delivery Payments
CREATE TABLE public.fuel_delivery_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  customer_id UUID REFERENCES public.fuel_delivery_customers(id),
  invoice_id UUID REFERENCES public.fuel_delivery_invoices(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fuel Price History
CREATE TABLE public.fuel_delivery_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  product_id UUID REFERENCES public.fuel_delivery_products(id),
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  price_per_unit NUMERIC(10,4) NOT NULL,
  cost_per_unit NUMERIC(10,4),
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.fuel_delivery_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fuel_delivery_customers
CREATE POLICY "Users can view fuel delivery customers in their shop" ON public.fuel_delivery_customers
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create fuel delivery customers in their shop" ON public.fuel_delivery_customers
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update fuel delivery customers in their shop" ON public.fuel_delivery_customers
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete fuel delivery customers in their shop" ON public.fuel_delivery_customers
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for fuel_delivery_locations
CREATE POLICY "Users can view fuel delivery locations in their shop" ON public.fuel_delivery_locations
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create fuel delivery locations in their shop" ON public.fuel_delivery_locations
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update fuel delivery locations in their shop" ON public.fuel_delivery_locations
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete fuel delivery locations in their shop" ON public.fuel_delivery_locations
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for fuel_delivery_products
CREATE POLICY "Users can view fuel delivery products in their shop" ON public.fuel_delivery_products
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create fuel delivery products in their shop" ON public.fuel_delivery_products
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update fuel delivery products in their shop" ON public.fuel_delivery_products
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete fuel delivery products in their shop" ON public.fuel_delivery_products
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for fuel_delivery_orders
CREATE POLICY "Users can view fuel delivery orders in their shop" ON public.fuel_delivery_orders
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create fuel delivery orders in their shop" ON public.fuel_delivery_orders
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update fuel delivery orders in their shop" ON public.fuel_delivery_orders
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete fuel delivery orders in their shop" ON public.fuel_delivery_orders
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for fuel_delivery_trucks
CREATE POLICY "Users can view fuel delivery trucks in their shop" ON public.fuel_delivery_trucks
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create fuel delivery trucks in their shop" ON public.fuel_delivery_trucks
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update fuel delivery trucks in their shop" ON public.fuel_delivery_trucks
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete fuel delivery trucks in their shop" ON public.fuel_delivery_trucks
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for fuel_delivery_drivers
CREATE POLICY "Users can view fuel delivery drivers in their shop" ON public.fuel_delivery_drivers
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create fuel delivery drivers in their shop" ON public.fuel_delivery_drivers
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update fuel delivery drivers in their shop" ON public.fuel_delivery_drivers
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete fuel delivery drivers in their shop" ON public.fuel_delivery_drivers
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for fuel_delivery_completions
CREATE POLICY "Users can view fuel delivery completions in their shop" ON public.fuel_delivery_completions
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create fuel delivery completions in their shop" ON public.fuel_delivery_completions
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update fuel delivery completions in their shop" ON public.fuel_delivery_completions
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for fuel_delivery_routes
CREATE POLICY "Users can view fuel delivery routes in their shop" ON public.fuel_delivery_routes
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create fuel delivery routes in their shop" ON public.fuel_delivery_routes
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update fuel delivery routes in their shop" ON public.fuel_delivery_routes
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete fuel delivery routes in their shop" ON public.fuel_delivery_routes
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for fuel_delivery_route_stops
CREATE POLICY "Users can view fuel delivery route stops" ON public.fuel_delivery_route_stops
  FOR SELECT USING (route_id IN (SELECT id FROM public.fuel_delivery_routes WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can create fuel delivery route stops" ON public.fuel_delivery_route_stops
  FOR INSERT WITH CHECK (route_id IN (SELECT id FROM public.fuel_delivery_routes WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can update fuel delivery route stops" ON public.fuel_delivery_route_stops
  FOR UPDATE USING (route_id IN (SELECT id FROM public.fuel_delivery_routes WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can delete fuel delivery route stops" ON public.fuel_delivery_route_stops
  FOR DELETE USING (route_id IN (SELECT id FROM public.fuel_delivery_routes WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())));

-- RLS Policies for fuel_delivery_inventory
CREATE POLICY "Users can view fuel delivery inventory in their shop" ON public.fuel_delivery_inventory
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create fuel delivery inventory in their shop" ON public.fuel_delivery_inventory
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update fuel delivery inventory in their shop" ON public.fuel_delivery_inventory
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for fuel_delivery_invoices
CREATE POLICY "Users can view fuel delivery invoices in their shop" ON public.fuel_delivery_invoices
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create fuel delivery invoices in their shop" ON public.fuel_delivery_invoices
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update fuel delivery invoices in their shop" ON public.fuel_delivery_invoices
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for fuel_delivery_invoice_lines
CREATE POLICY "Users can view fuel delivery invoice lines" ON public.fuel_delivery_invoice_lines
  FOR SELECT USING (invoice_id IN (SELECT id FROM public.fuel_delivery_invoices WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can create fuel delivery invoice lines" ON public.fuel_delivery_invoice_lines
  FOR INSERT WITH CHECK (invoice_id IN (SELECT id FROM public.fuel_delivery_invoices WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can update fuel delivery invoice lines" ON public.fuel_delivery_invoice_lines
  FOR UPDATE USING (invoice_id IN (SELECT id FROM public.fuel_delivery_invoices WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can delete fuel delivery invoice lines" ON public.fuel_delivery_invoice_lines
  FOR DELETE USING (invoice_id IN (SELECT id FROM public.fuel_delivery_invoices WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())));

-- RLS Policies for fuel_delivery_payments
CREATE POLICY "Users can view fuel delivery payments in their shop" ON public.fuel_delivery_payments
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create fuel delivery payments in their shop" ON public.fuel_delivery_payments
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for fuel_delivery_price_history
CREATE POLICY "Users can view fuel delivery price history in their shop" ON public.fuel_delivery_price_history
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create fuel delivery price history in their shop" ON public.fuel_delivery_price_history
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_fuel_delivery_orders_shop_id ON public.fuel_delivery_orders(shop_id);
CREATE INDEX idx_fuel_delivery_orders_customer_id ON public.fuel_delivery_orders(customer_id);
CREATE INDEX idx_fuel_delivery_orders_status ON public.fuel_delivery_orders(status);
CREATE INDEX idx_fuel_delivery_orders_scheduled_date ON public.fuel_delivery_orders(scheduled_date);
CREATE INDEX idx_fuel_delivery_completions_shop_id ON public.fuel_delivery_completions(shop_id);
CREATE INDEX idx_fuel_delivery_completions_delivery_date ON public.fuel_delivery_completions(delivery_date);
CREATE INDEX idx_fuel_delivery_routes_shop_id ON public.fuel_delivery_routes(shop_id);
CREATE INDEX idx_fuel_delivery_routes_route_date ON public.fuel_delivery_routes(route_date);
CREATE INDEX idx_fuel_delivery_invoices_shop_id ON public.fuel_delivery_invoices(shop_id);
CREATE INDEX idx_fuel_delivery_invoices_customer_id ON public.fuel_delivery_invoices(customer_id);