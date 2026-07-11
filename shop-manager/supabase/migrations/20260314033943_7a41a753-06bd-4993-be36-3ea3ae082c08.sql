
-- Create all export tables in correct dependency order

CREATE TABLE public.export_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  country TEXT NOT NULL,
  city TEXT,
  address TEXT,
  port_of_destination TEXT,
  trade_terms TEXT DEFAULT 'FOB',
  currency TEXT DEFAULT 'USD',
  tax_id TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'dehydrated_food',
  sku TEXT,
  description TEXT,
  unit_of_measure TEXT DEFAULT 'kg',
  weight_per_unit NUMERIC,
  packaging_type TEXT,
  hs_code TEXT,
  country_of_origin TEXT,
  unit_price NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  vin TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  color TEXT,
  engine_type TEXT,
  mileage INTEGER,
  purchase_price NUMERIC,
  selling_price NUMERIC,
  customs_status TEXT DEFAULT 'pending',
  export_destination TEXT,
  title_status TEXT DEFAULT 'clean',
  location TEXT,
  photos TEXT[],
  notes TEXT,
  status TEXT DEFAULT 'in_stock',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.export_customers(id),
  status TEXT NOT NULL DEFAULT 'draft',
  destination_country TEXT,
  destination_port TEXT,
  incoterms TEXT DEFAULT 'FOB',
  currency TEXT DEFAULT 'USD',
  subtotal NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  shipping_cost NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  estimated_ship_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.export_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.export_products(id),
  vehicle_id UUID REFERENCES public.export_vehicles(id),
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_weight NUMERIC,
  total_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  shipment_number TEXT NOT NULL,
  order_id UUID REFERENCES public.export_orders(id),
  container_number TEXT,
  seal_number TEXT,
  bill_of_lading TEXT,
  vessel_name TEXT,
  shipping_line TEXT,
  port_of_origin TEXT,
  port_of_destination TEXT,
  etd DATE,
  eta DATE,
  actual_departure DATE,
  actual_arrival DATE,
  status TEXT DEFAULT 'pending',
  tracking_url TEXT,
  weight_kg NUMERIC,
  volume_cbm NUMERIC,
  freight_cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  order_id UUID REFERENCES public.export_orders(id),
  shipment_id UUID REFERENCES public.export_shipments(id),
  file_url TEXT,
  issue_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'active',
  issued_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  capacity_sqft NUMERIC,
  contact_name TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.export_products(id),
  warehouse_id UUID REFERENCES public.export_warehouses(id),
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'kg',
  lot_number TEXT,
  expiry_date DATE,
  reorder_level NUMERIC DEFAULT 0,
  last_restocked TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  vin TEXT,
  license_plate TEXT,
  truck_type TEXT DEFAULT 'flatbed',
  max_payload_kg NUMERIC,
  status TEXT DEFAULT 'active',
  current_mileage INTEGER,
  next_service_date DATE,
  insurance_expiry DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  license_number TEXT,
  license_class TEXT,
  license_expiry DATE,
  assigned_truck_id UUID REFERENCES public.export_trucks(id),
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  route_name TEXT NOT NULL,
  driver_id UUID REFERENCES public.export_drivers(id),
  truck_id UUID REFERENCES public.export_trucks(id),
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'planned',
  start_location TEXT,
  end_location TEXT,
  total_distance_km NUMERIC,
  estimated_duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.export_routes(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL,
  location_name TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  stop_type TEXT DEFAULT 'pickup',
  order_id UUID REFERENCES public.export_orders(id),
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_type TEXT DEFAULT 'commercial',
  customer_id UUID REFERENCES public.export_customers(id),
  order_id UUID REFERENCES public.export_orders(id),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  currency TEXT DEFAULT 'USD',
  subtotal NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  shipping NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  payment_terms TEXT,
  bank_details TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.export_customers(id),
  destination_country TEXT,
  destination_port TEXT,
  incoterms TEXT DEFAULT 'FOB',
  currency TEXT DEFAULT 'USD',
  subtotal NUMERIC DEFAULT 0,
  shipping_estimate NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  valid_until DATE,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'staff',
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.export_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  purchase_date DATE,
  purchase_price NUMERIC,
  condition TEXT DEFAULT 'good',
  location TEXT,
  assigned_to TEXT,
  next_maintenance DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.export_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_equipment ENABLE ROW LEVEL SECURITY;

-- RLS Policies for direct shop_id tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'export_customers','export_products','export_vehicles','export_orders',
    'export_shipments','export_documents','export_warehouses','export_inventory',
    'export_trucks','export_drivers','export_routes',
    'export_invoices','export_quotes','export_staff','export_equipment'
  ])
  LOOP
    EXECUTE format('
      CREATE POLICY "Users can view own shop %1$s" ON public.%1$s
        FOR SELECT USING (shop_id = public.get_current_user_shop_id());
      CREATE POLICY "Users can insert own shop %1$s" ON public.%1$s
        FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
      CREATE POLICY "Users can update own shop %1$s" ON public.%1$s
        FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
      CREATE POLICY "Users can delete own shop %1$s" ON public.%1$s
        FOR DELETE USING (shop_id = public.get_current_user_shop_id());
    ', tbl);
  END LOOP;
END $$;

-- RLS for export_order_items (join through order)
CREATE POLICY "Users can view own shop export_order_items" ON public.export_order_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.export_orders o WHERE o.id = order_id AND o.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "Users can insert own shop export_order_items" ON public.export_order_items
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.export_orders o WHERE o.id = order_id AND o.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "Users can update own shop export_order_items" ON public.export_order_items
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.export_orders o WHERE o.id = order_id AND o.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "Users can delete own shop export_order_items" ON public.export_order_items
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.export_orders o WHERE o.id = order_id AND o.shop_id = public.get_current_user_shop_id()));

-- RLS for export_route_stops (join through route)
CREATE POLICY "Users can view own shop export_route_stops" ON public.export_route_stops
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.export_routes r WHERE r.id = route_id AND r.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "Users can insert own shop export_route_stops" ON public.export_route_stops
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.export_routes r WHERE r.id = route_id AND r.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "Users can update own shop export_route_stops" ON public.export_route_stops
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.export_routes r WHERE r.id = route_id AND r.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "Users can delete own shop export_route_stops" ON public.export_route_stops
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.export_routes r WHERE r.id = route_id AND r.shop_id = public.get_current_user_shop_id()));
