
-- ═══════════════════════════════════════════════════════════════
-- ENHANCE export_customers with B2B/B2C, credit, discounts, import requirements
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.export_customers
  ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'b2b',
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS state_province text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS incoterms text DEFAULT 'FOB',
  ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT 'Net 30',
  ADD COLUMN IF NOT EXISTS credit_limit numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outstanding_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS import_license_number text,
  ADD COLUMN IF NOT EXISTS import_license_expiry date,
  ADD COLUMN IF NOT EXISTS required_certifications text[],
  ADD COLUMN IF NOT EXISTS labeling_requirements text,
  ADD COLUMN IF NOT EXISTS customs_broker_name text,
  ADD COLUMN IF NOT EXISTS customs_broker_contact text,
  ADD COLUMN IF NOT EXISTS consignee_name text,
  ADD COLUMN IF NOT EXISTS notify_party text,
  ADD COLUMN IF NOT EXISTS preferred_shipping_line text,
  ADD COLUMN IF NOT EXISTS preferred_container_type text DEFAULT '20ft',
  ADD COLUMN IF NOT EXISTS total_orders integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_revenue numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_order_date timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reliability text DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS tags text[];

-- ═══════════════════════════════════════════════════════════════
-- Multiple contacts per client
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.export_client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.export_customers(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  role text,
  email text,
  phone text,
  whatsapp text,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.export_client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop isolation for export_client_contacts"
  ON public.export_client_contacts FOR ALL
  TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE INDEX idx_export_client_contacts_customer ON public.export_client_contacts(customer_id);
CREATE INDEX idx_export_client_contacts_shop ON public.export_client_contacts(shop_id);

-- ═══════════════════════════════════════════════════════════════
-- Export Requests (quotes, POs, samples, custom, recurring)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.export_customers(id) ON DELETE SET NULL,
  request_number text NOT NULL,
  request_type text NOT NULL DEFAULT 'quote',
  status text NOT NULL DEFAULT 'pending',
  priority text DEFAULT 'normal',
  
  -- Trade details
  destination_country text,
  destination_port text,
  incoterms text DEFAULT 'FOB',
  currency text DEFAULT 'USD',
  
  -- Pricing
  subtotal numeric DEFAULT 0,
  shipping_cost numeric DEFAULT 0,
  insurance_cost numeric DEFAULT 0,
  customs_cost numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  
  -- Dates
  requested_date timestamptz DEFAULT now(),
  required_by_date date,
  valid_until date,
  approved_date timestamptz,
  
  -- Recurring
  is_recurring boolean DEFAULT false,
  recurrence_interval text,
  recurrence_next_date date,
  parent_request_id uuid REFERENCES public.export_requests(id) ON DELETE SET NULL,
  
  -- Fulfillment
  assigned_to text,
  shipment_id uuid,
  order_id uuid,
  
  -- Extra
  special_instructions text,
  internal_notes text,
  notes text,
  
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop isolation for export_requests"
  ON public.export_requests FOR ALL
  TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE INDEX idx_export_requests_customer ON public.export_requests(customer_id);
CREATE INDEX idx_export_requests_shop ON public.export_requests(shop_id);
CREATE INDEX idx_export_requests_status ON public.export_requests(status);
CREATE INDEX idx_export_requests_type ON public.export_requests(request_type);

-- ═══════════════════════════════════════════════════════════════
-- Request line items linked to products/variants
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.export_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.export_requests(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.export_products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.export_product_variants(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'kg',
  unit_price numeric DEFAULT 0,
  total_price numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  discount_pct numeric DEFAULT 0,
  packaging_type text,
  special_requirements text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.export_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop isolation for export_request_items"
  ON public.export_request_items FOR ALL
  TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE INDEX idx_export_request_items_request ON public.export_request_items(request_id);

-- ═══════════════════════════════════════════════════════════════
-- Inventory reservations (stock allocated to specific orders/requests)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.export_inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  inventory_id uuid NOT NULL REFERENCES public.export_inventory(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.export_requests(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.export_orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.export_customers(id) ON DELETE SET NULL,
  quantity_reserved numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'reserved',
  reserved_by uuid,
  reserved_at timestamptz DEFAULT now(),
  released_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.export_inventory_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop isolation for export_inventory_reservations"
  ON public.export_inventory_reservations FOR ALL
  TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE INDEX idx_export_inv_res_inventory ON public.export_inventory_reservations(inventory_id);
CREATE INDEX idx_export_inv_res_request ON public.export_inventory_reservations(request_id);
CREATE INDEX idx_export_inv_res_order ON public.export_inventory_reservations(order_id);

-- ═══════════════════════════════════════════════════════════════
-- Container packing lists
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.export_container_packing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES public.export_shipments(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.export_orders(id) ON DELETE SET NULL,
  container_number text,
  seal_number text,
  container_type text DEFAULT '20ft',
  
  -- Product details
  product_id uuid REFERENCES public.export_products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.export_product_variants(id) ON DELETE SET NULL,
  inventory_id uuid REFERENCES public.export_inventory(id) ON DELETE SET NULL,
  lot_number text,
  batch_number text,
  
  -- Quantities
  quantity numeric NOT NULL DEFAULT 0,
  unit text DEFAULT 'kg',
  packages_count integer DEFAULT 0,
  gross_weight_kg numeric DEFAULT 0,
  net_weight_kg numeric DEFAULT 0,
  volume_cbm numeric DEFAULT 0,
  
  -- Tracking
  barcode text,
  qr_code_data text,
  position_in_container text,
  
  notes text,
  packed_by text,
  packed_at timestamptz DEFAULT now(),
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.export_container_packing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop isolation for export_container_packing"
  ON public.export_container_packing FOR ALL
  TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE INDEX idx_export_packing_shipment ON public.export_container_packing(shipment_id);
CREATE INDEX idx_export_packing_order ON public.export_container_packing(order_id);
CREATE INDEX idx_export_packing_container ON public.export_container_packing(container_number);

-- ═══════════════════════════════════════════════════════════════
-- Full traceability log (supplier → warehouse → container → client)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.export_traceability_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  
  -- What
  product_id uuid REFERENCES public.export_products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.export_product_variants(id) ON DELETE SET NULL,
  lot_number text,
  batch_number text,
  barcode text,
  qr_code_data text,
  
  -- Where
  event_type text NOT NULL,
  location text,
  warehouse_id uuid REFERENCES public.export_warehouses(id) ON DELETE SET NULL,
  
  -- Who
  customer_id uuid REFERENCES public.export_customers(id) ON DELETE SET NULL,
  performed_by text,
  
  -- Links
  request_id uuid REFERENCES public.export_requests(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.export_orders(id) ON DELETE SET NULL,
  shipment_id uuid REFERENCES public.export_shipments(id) ON DELETE SET NULL,
  container_packing_id uuid REFERENCES public.export_container_packing(id) ON DELETE SET NULL,
  inventory_id uuid REFERENCES public.export_inventory(id) ON DELETE SET NULL,
  
  -- Details
  quantity numeric,
  unit text,
  temperature_celsius numeric,
  humidity_pct numeric,
  quality_status text,
  
  notes text,
  metadata jsonb DEFAULT '{}',
  event_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.export_traceability_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop isolation for export_traceability_log"
  ON public.export_traceability_log FOR ALL
  TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE INDEX idx_export_trace_product ON public.export_traceability_log(product_id);
CREATE INDEX idx_export_trace_lot ON public.export_traceability_log(lot_number);
CREATE INDEX idx_export_trace_batch ON public.export_traceability_log(batch_number);
CREATE INDEX idx_export_trace_barcode ON public.export_traceability_log(barcode);
CREATE INDEX idx_export_trace_event ON public.export_traceability_log(event_type);
CREATE INDEX idx_export_trace_shop ON public.export_traceability_log(shop_id);
