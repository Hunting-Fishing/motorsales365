
-- Export Payments & Collections
CREATE TABLE public.export_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.export_invoices(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.export_orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.export_customers(id) ON DELETE SET NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_method text NOT NULL DEFAULT 'wire_transfer',
  payment_type text NOT NULL DEFAULT 'standard',
  reference_number text,
  bank_name text,
  swift_code text,
  lc_number text,
  lc_issuing_bank text,
  lc_expiry_date date,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.export_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage export_payments in their shop" ON public.export_payments FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());

-- Export Customs Documents
CREATE TABLE public.export_customs_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.export_orders(id) ON DELETE SET NULL,
  shipment_id uuid REFERENCES public.export_shipments(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.export_customers(id) ON DELETE SET NULL,
  document_type text NOT NULL,
  document_number text,
  issuing_authority text,
  issue_date date,
  expiry_date date,
  hs_code text,
  country_of_origin text,
  destination_country text,
  status text NOT NULL DEFAULT 'draft',
  inspection_date date,
  inspector_name text,
  inspection_result text,
  notes text,
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.export_customs_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage export_customs_documents in their shop" ON public.export_customs_documents FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());

-- Import Purchase Orders
CREATE TABLE public.import_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  supplier_id uuid REFERENCES public.export_suppliers(id) ON DELETE SET NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery date,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_terms text,
  incoterm text DEFAULT 'FOB',
  origin_country text,
  port_of_loading text,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.import_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage import_purchase_orders in their shop" ON public.import_purchase_orders FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());

-- Import Purchase Order Items
CREATE TABLE public.import_purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES public.import_purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.export_products(id) ON DELETE SET NULL,
  description text,
  quantity numeric NOT NULL DEFAULT 0,
  unit text DEFAULT 'kg',
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  received_quantity numeric NOT NULL DEFAULT 0,
  hs_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.import_purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage import_purchase_order_items in their shop" ON public.import_purchase_order_items FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());

-- Import Receiving Log
CREATE TABLE public.import_receiving (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES public.import_purchase_orders(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.export_products(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES public.export_warehouses(id) ON DELETE SET NULL,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity_received numeric NOT NULL DEFAULT 0,
  unit text DEFAULT 'kg',
  lot_number text,
  batch_number text,
  expiry_date date,
  condition_on_arrival text DEFAULT 'good',
  inspection_passed boolean DEFAULT true,
  inspection_notes text,
  received_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.import_receiving ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage import_receiving in their shop" ON public.import_receiving FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());

-- Import Customs Clearance
CREATE TABLE public.import_customs_clearance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES public.import_purchase_orders(id) ON DELETE SET NULL,
  declaration_number text,
  customs_broker text,
  broker_contact text,
  entry_port text,
  arrival_date date,
  clearance_date date,
  duty_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_charges numeric GENERATED ALWAYS AS (COALESCE(duty_amount, 0) + COALESCE(tax_amount, 0)) STORED,
  status text NOT NULL DEFAULT 'pending',
  inspection_required boolean DEFAULT false,
  inspection_date date,
  inspection_result text,
  release_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.import_customs_clearance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage import_customs_clearance in their shop" ON public.import_customs_clearance FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
