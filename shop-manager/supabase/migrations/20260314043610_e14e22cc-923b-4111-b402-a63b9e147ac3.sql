
-- Packaging options with full cost/dimension/manufacturer tracking
CREATE TABLE public.export_packaging_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  packaging_type text NOT NULL DEFAULT 'bag',
  size_label text,
  weight_capacity_kg numeric,
  length_cm numeric,
  width_cm numeric,
  height_cm numeric,
  volume_cm3 numeric GENERATED ALWAYS AS (COALESCE(length_cm,0) * COALESCE(width_cm,0) * COALESCE(height_cm,0)) STORED,
  tare_weight_kg numeric DEFAULT 0,
  material text,
  material_cost_per_unit numeric DEFAULT 0,
  labor_cost_per_unit numeric DEFAULT 0,
  total_cost_per_unit numeric GENERATED ALWAYS AS (COALESCE(material_cost_per_unit,0) + COALESCE(labor_cost_per_unit,0)) STORED,
  manufacturer_name text,
  manufacturer_country text,
  manufacturer_contact text,
  manufacturer_lead_time_days integer,
  shipping_cost_to_warehouse numeric DEFAULT 0,
  last_order_date timestamptz,
  last_order_qty integer,
  last_unit_price numeric,
  current_stock integer DEFAULT 0,
  reorder_point integer DEFAULT 0,
  preferred_supplier text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.export_packaging_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view packaging for their shop"
  ON public.export_packaging_options FOR SELECT TO authenticated
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can manage packaging for their shop"
  ON public.export_packaging_options FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- Packaging shipment/purchase log
CREATE TABLE public.export_packaging_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  packaging_id uuid NOT NULL REFERENCES public.export_packaging_options(id) ON DELETE CASCADE,
  shipment_date date NOT NULL,
  expected_arrival date,
  actual_arrival date,
  quantity integer NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric GENERATED ALWAYS AS (COALESCE(quantity,0) * COALESCE(unit_cost,0)) STORED,
  shipping_cost numeric DEFAULT 0,
  supplier_name text,
  supplier_country text,
  tracking_number text,
  status text DEFAULT 'ordered',
  invoice_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.export_packaging_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view packaging shipments for their shop"
  ON public.export_packaging_shipments FOR SELECT TO authenticated
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can manage packaging shipments for their shop"
  ON public.export_packaging_shipments FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- Link products to packaging options
ALTER TABLE public.export_products
  ADD COLUMN IF NOT EXISTS packaging_option_id uuid REFERENCES public.export_packaging_options(id),
  ADD COLUMN IF NOT EXISTS units_per_package integer DEFAULT 1;
