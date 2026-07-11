
-- =============================================
-- SEPTIC MODULE: Full Table Build (All Phases)
-- Modeled after fuel_delivery & power_washing
-- =============================================

-- Phase 1: Core Operations

-- Vacuum/Pump Trucks
CREATE TABLE public.septic_trucks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  truck_number TEXT NOT NULL,
  truck_name TEXT,
  vin TEXT,
  license_plate TEXT,
  year INTEGER,
  make TEXT,
  model TEXT,
  tank_capacity_gallons INTEGER,
  current_load_gallons INTEGER DEFAULT 0,
  pump_type TEXT, -- centrifugal, vacuum, positive_displacement
  pump_capacity_gpm NUMERIC,
  hose_length_ft NUMERIC,
  dot_number TEXT,
  insurance_policy TEXT,
  insurance_expiry DATE,
  last_inspection_date DATE,
  next_inspection_due DATE,
  odometer_reading NUMERIC,
  status TEXT DEFAULT 'active', -- active, maintenance, out_of_service
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Truck Compartments (for multi-compartment vacuum trucks)
CREATE TABLE public.septic_truck_compartments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  truck_id UUID NOT NULL REFERENCES public.septic_trucks(id) ON DELETE CASCADE,
  compartment_name TEXT NOT NULL,
  capacity_gallons INTEGER NOT NULL,
  current_gallons INTEGER DEFAULT 0,
  waste_type TEXT, -- sewage, grease, septage, industrial
  status TEXT DEFAULT 'empty', -- empty, partial, full
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Drivers
CREATE TABLE public.septic_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
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
  tanker_endorsement BOOLEAN DEFAULT false,
  hazmat_endorsement BOOLEAN DEFAULT false,
  hazmat_expiry DATE,
  medical_card_expiry DATE,
  hire_date DATE,
  hourly_rate NUMERIC,
  commission_rate NUMERIC,
  status TEXT DEFAULT 'active',
  notes TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  home_address TEXT,
  home_latitude DOUBLE PRECISION,
  home_longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Routes
CREATE TABLE public.septic_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  route_name TEXT NOT NULL,
  route_date DATE NOT NULL,
  driver_id UUID REFERENCES public.septic_drivers(id),
  truck_id UUID REFERENCES public.septic_trucks(id),
  status TEXT DEFAULT 'planned', -- planned, in_progress, completed, cancelled
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_distance_miles NUMERIC,
  total_gallons_pumped INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Route Stops
CREATE TABLE public.septic_route_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  route_id UUID NOT NULL REFERENCES public.septic_routes(id) ON DELETE CASCADE,
  service_order_id UUID REFERENCES public.septic_service_orders(id),
  stop_order INTEGER NOT NULL DEFAULT 0,
  customer_id UUID REFERENCES public.customers(id),
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  estimated_arrival TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  estimated_duration_minutes INTEGER DEFAULT 60,
  actual_duration_minutes INTEGER,
  status TEXT DEFAULT 'pending', -- pending, en_route, arrived, completed, skipped
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service Products / Pricing
CREATE TABLE public.septic_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  product_name TEXT NOT NULL,
  product_code TEXT,
  category TEXT, -- pumping, inspection, repair, installation, maintenance
  description TEXT,
  unit_price NUMERIC DEFAULT 0,
  unit_type TEXT DEFAULT 'each', -- each, gallon, hour, flat
  is_taxable BOOLEAN DEFAULT true,
  tax_rate NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quotes
CREATE TABLE public.septic_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  quote_number TEXT,
  customer_id UUID REFERENCES public.customers(id),
  service_type TEXT DEFAULT 'pump_out',
  status TEXT DEFAULT 'draft', -- draft, sent, viewed, accepted, declined, expired, converted
  issue_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  location_address TEXT,
  location_latitude DOUBLE PRECISION,
  location_longitude DOUBLE PRECISION,
  tank_id UUID REFERENCES public.septic_tanks(id),
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  notes TEXT,
  internal_notes TEXT,
  converted_order_id UUID REFERENCES public.septic_service_orders(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quote Lines
CREATE TABLE public.septic_quote_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.septic_quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.septic_products(id),
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE public.septic_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  service_order_id UUID REFERENCES public.septic_service_orders(id),
  quote_id UUID REFERENCES public.septic_quotes(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT DEFAULT 'draft', -- draft, sent, viewed, paid, partial, overdue, void
  subtotal NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  payment_terms TEXT,
  notes TEXT,
  internal_notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoice Lines
CREATE TABLE public.septic_invoice_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.septic_invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.septic_products(id),
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE public.septic_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  invoice_id UUID REFERENCES public.septic_invoices(id),
  customer_id UUID REFERENCES public.customers(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT, -- cash, check, card, ach, online
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings
CREATE TABLE public.septic_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) UNIQUE,
  default_tax_rate NUMERIC DEFAULT 0,
  quote_prefix TEXT DEFAULT 'SQ-',
  quote_next_number INTEGER DEFAULT 1001,
  invoice_prefix TEXT DEFAULT 'SI-',
  invoice_next_number INTEGER DEFAULT 1001,
  order_prefix TEXT DEFAULT 'SO-',
  order_next_number INTEGER DEFAULT 1001,
  default_payment_terms TEXT DEFAULT 'Net 30',
  default_service_duration_minutes INTEGER DEFAULT 60,
  pump_out_base_price NUMERIC DEFAULT 0,
  price_per_gallon NUMERIC DEFAULT 0,
  inspection_base_price NUMERIC DEFAULT 0,
  emergency_surcharge_percent NUMERIC DEFAULT 50,
  mileage_rate NUMERIC DEFAULT 0,
  disposal_fee_per_gallon NUMERIC DEFAULT 0,
  enable_recurring_reminders BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 30,
  enable_customer_portal BOOLEAN DEFAULT false,
  company_license_number TEXT,
  disposal_site_name TEXT,
  disposal_site_address TEXT,
  disposal_site_permit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 2: Supporting Infrastructure

-- Equipment
CREATE TABLE public.septic_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  equipment_name TEXT NOT NULL,
  equipment_type TEXT NOT NULL, -- pump, camera, locator, jetter, hose, fitting
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  purchase_date DATE,
  purchase_price NUMERIC,
  location TEXT,
  assigned_truck_id UUID REFERENCES public.septic_trucks(id),
  status TEXT DEFAULT 'available', -- available, in_use, maintenance, retired
  notes TEXT,
  specifications JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory (parts, supplies, chemicals)
CREATE TABLE public.septic_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  item_name TEXT NOT NULL,
  item_code TEXT,
  category TEXT, -- part, supply, chemical, filter, riser, lid
  description TEXT,
  unit_of_measure TEXT DEFAULT 'each',
  current_quantity NUMERIC DEFAULT 0,
  minimum_quantity NUMERIC DEFAULT 0,
  reorder_quantity NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  supplier TEXT,
  supplier_part_number TEXT,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Labor Rates
CREATE TABLE public.septic_labor_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  rate_name TEXT NOT NULL,
  rate_type TEXT DEFAULT 'hourly', -- hourly, flat, per_gallon
  rate_amount NUMERIC NOT NULL DEFAULT 0,
  overtime_multiplier NUMERIC DEFAULT 1.5,
  weekend_multiplier NUMERIC DEFAULT 1.5,
  emergency_multiplier NUMERIC DEFAULT 2.0,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchases
CREATE TABLE public.septic_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  po_number TEXT,
  vendor_name TEXT NOT NULL,
  vendor_contact TEXT,
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  received_date DATE,
  status TEXT DEFAULT 'pending', -- pending, ordered, partial, received, cancelled
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  shipping_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 3: Advanced Features

-- Recurring Schedules (pump-out reminders)
CREATE TABLE public.septic_recurring_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  customer_id UUID REFERENCES public.customers(id),
  tank_id UUID REFERENCES public.septic_tanks(id),
  service_type TEXT DEFAULT 'pump_out',
  frequency_months INTEGER DEFAULT 36, -- typical 3-year cycle
  last_service_date DATE,
  next_service_date DATE,
  auto_create_order BOOLEAN DEFAULT false,
  reminder_days_before INTEGER DEFAULT 30,
  reminder_sent BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Communications (emails, SMS, notifications)
CREATE TABLE public.septic_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  customer_id UUID REFERENCES public.customers(id),
  service_order_id UUID REFERENCES public.septic_service_orders(id),
  invoice_id UUID REFERENCES public.septic_invoices(id),
  type TEXT NOT NULL, -- email, sms, notification, reminder
  subject TEXT,
  body TEXT,
  recipient TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed, bounced
  sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Completions (detailed records of completed services)
CREATE TABLE public.septic_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  service_order_id UUID REFERENCES public.septic_service_orders(id),
  driver_id UUID REFERENCES public.septic_drivers(id),
  truck_id UUID REFERENCES public.septic_trucks(id),
  customer_id UUID REFERENCES public.customers(id),
  tank_id UUID REFERENCES public.septic_tanks(id),
  completion_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  gallons_pumped INTEGER,
  waste_type TEXT, -- sewage, grease, septage
  disposal_site TEXT,
  disposal_manifest_number TEXT,
  sludge_depth_before TEXT,
  sludge_depth_after TEXT,
  tank_condition_notes TEXT,
  photos JSONB DEFAULT '[]',
  customer_signature_url TEXT,
  driver_notes TEXT,
  labor_hours NUMERIC,
  labor_cost NUMERIC,
  material_cost NUMERIC,
  disposal_cost NUMERIC,
  total_cost NUMERIC,
  customer_rating INTEGER,
  customer_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disposal Records (EPA/state compliance)
CREATE TABLE public.septic_disposal_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  truck_id UUID REFERENCES public.septic_trucks(id),
  driver_id UUID REFERENCES public.septic_drivers(id),
  disposal_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  disposal_site_name TEXT NOT NULL,
  disposal_site_address TEXT,
  disposal_site_permit TEXT,
  manifest_number TEXT,
  gallons_disposed INTEGER NOT NULL,
  waste_type TEXT NOT NULL, -- sewage, grease, septage, industrial
  source_address TEXT,
  source_customer_id UUID REFERENCES public.customers(id),
  ph_level NUMERIC,
  solids_percent NUMERIC,
  regulatory_body TEXT,
  compliance_notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chemicals / Treatment Products
CREATE TABLE public.septic_chemicals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  chemical_name TEXT NOT NULL,
  chemical_type TEXT, -- bacteria_additive, degreaser, root_killer, odor_control
  manufacturer TEXT,
  sds_url TEXT,
  unit_of_measure TEXT DEFAULT 'gallon',
  current_stock NUMERIC DEFAULT 0,
  minimum_stock NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  is_hazardous BOOLEAN DEFAULT false,
  storage_requirements TEXT,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Enable RLS on all new tables
-- =============================================
ALTER TABLE public.septic_trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_truck_compartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_disposal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.septic_chemicals ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Shop-scoped RLS policies for all tables
-- =============================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'septic_trucks','septic_truck_compartments','septic_drivers','septic_routes',
    'septic_route_stops','septic_products','septic_quotes','septic_quote_lines',
    'septic_invoices','septic_invoice_lines','septic_payments','septic_settings',
    'septic_equipment','septic_inventory','septic_labor_rates','septic_purchases',
    'septic_recurring_schedules','septic_communications','septic_completions',
    'septic_disposal_records','septic_chemicals'
  ] LOOP
    -- Tables with direct shop_id
    IF tbl NOT IN ('septic_quote_lines','septic_invoice_lines') THEN
      EXECUTE format('CREATE POLICY "shop_select_%s" ON public.%I FOR SELECT USING (shop_id = public.get_current_user_shop_id())', tbl, tbl);
      EXECUTE format('CREATE POLICY "shop_insert_%s" ON public.%I FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id())', tbl, tbl);
      EXECUTE format('CREATE POLICY "shop_update_%s" ON public.%I FOR UPDATE USING (shop_id = public.get_current_user_shop_id())', tbl, tbl);
      EXECUTE format('CREATE POLICY "shop_delete_%s" ON public.%I FOR DELETE USING (shop_id = public.get_current_user_shop_id())', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- Quote lines: access via parent quote's shop
CREATE POLICY "shop_select_septic_quote_lines" ON public.septic_quote_lines
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.septic_quotes q WHERE q.id = quote_id AND q.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "shop_insert_septic_quote_lines" ON public.septic_quote_lines
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.septic_quotes q WHERE q.id = quote_id AND q.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "shop_update_septic_quote_lines" ON public.septic_quote_lines
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.septic_quotes q WHERE q.id = quote_id AND q.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "shop_delete_septic_quote_lines" ON public.septic_quote_lines
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.septic_quotes q WHERE q.id = quote_id AND q.shop_id = public.get_current_user_shop_id()));

-- Invoice lines: access via parent invoice's shop
CREATE POLICY "shop_select_septic_invoice_lines" ON public.septic_invoice_lines
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.septic_invoices i WHERE i.id = invoice_id AND i.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "shop_insert_septic_invoice_lines" ON public.septic_invoice_lines
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.septic_invoices i WHERE i.id = invoice_id AND i.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "shop_update_septic_invoice_lines" ON public.septic_invoice_lines
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.septic_invoices i WHERE i.id = invoice_id AND i.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "shop_delete_septic_invoice_lines" ON public.septic_invoice_lines
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.septic_invoices i WHERE i.id = invoice_id AND i.shop_id = public.get_current_user_shop_id()));

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX idx_septic_trucks_shop ON public.septic_trucks(shop_id);
CREATE INDEX idx_septic_drivers_shop ON public.septic_drivers(shop_id);
CREATE INDEX idx_septic_routes_shop_date ON public.septic_routes(shop_id, route_date);
CREATE INDEX idx_septic_route_stops_route ON public.septic_route_stops(route_id);
CREATE INDEX idx_septic_quotes_shop ON public.septic_quotes(shop_id);
CREATE INDEX idx_septic_quotes_customer ON public.septic_quotes(customer_id);
CREATE INDEX idx_septic_invoices_shop ON public.septic_invoices(shop_id);
CREATE INDEX idx_septic_invoices_customer ON public.septic_invoices(customer_id);
CREATE INDEX idx_septic_payments_invoice ON public.septic_payments(invoice_id);
CREATE INDEX idx_septic_completions_shop ON public.septic_completions(shop_id);
CREATE INDEX idx_septic_completions_order ON public.septic_completions(service_order_id);
CREATE INDEX idx_septic_disposal_shop ON public.septic_disposal_records(shop_id);
CREATE INDEX idx_septic_recurring_shop ON public.septic_recurring_schedules(shop_id);
CREATE INDEX idx_septic_recurring_next ON public.septic_recurring_schedules(next_service_date);
CREATE INDEX idx_septic_communications_shop ON public.septic_communications(shop_id);
CREATE INDEX idx_septic_inventory_shop ON public.septic_inventory(shop_id);
CREATE INDEX idx_septic_chemicals_shop ON public.septic_chemicals(shop_id);

-- =============================================
-- Updated_at triggers
-- =============================================
CREATE TRIGGER update_septic_trucks_updated_at BEFORE UPDATE ON public.septic_trucks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_truck_compartments_updated_at BEFORE UPDATE ON public.septic_truck_compartments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_drivers_updated_at BEFORE UPDATE ON public.septic_drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_routes_updated_at BEFORE UPDATE ON public.septic_routes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_route_stops_updated_at BEFORE UPDATE ON public.septic_route_stops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_products_updated_at BEFORE UPDATE ON public.septic_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_quotes_updated_at BEFORE UPDATE ON public.septic_quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_invoices_updated_at BEFORE UPDATE ON public.septic_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_payments_updated_at BEFORE UPDATE ON public.septic_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_settings_updated_at BEFORE UPDATE ON public.septic_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_equipment_updated_at BEFORE UPDATE ON public.septic_equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_inventory_updated_at BEFORE UPDATE ON public.septic_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_labor_rates_updated_at BEFORE UPDATE ON public.septic_labor_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_purchases_updated_at BEFORE UPDATE ON public.septic_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_recurring_schedules_updated_at BEFORE UPDATE ON public.septic_recurring_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_completions_updated_at BEFORE UPDATE ON public.septic_completions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_disposal_records_updated_at BEFORE UPDATE ON public.septic_disposal_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_chemicals_updated_at BEFORE UPDATE ON public.septic_chemicals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
