
CREATE TABLE public.export_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.export_products(id) ON DELETE CASCADE,
  variant_name text NOT NULL,
  sku text,
  unit_of_measure text DEFAULT 'kg',
  weight_per_unit numeric,
  packaging_type text,
  packaging_option_id uuid REFERENCES public.export_packaging_options(id),
  units_per_package integer DEFAULT 1,
  unit_price numeric DEFAULT 0,
  purchase_cost_per_unit numeric DEFAULT 0,
  shipping_cost_per_unit numeric DEFAULT 0,
  customs_duty_per_unit numeric DEFAULT 0,
  insurance_cost_per_unit numeric DEFAULT 0,
  handling_fee_per_unit numeric DEFAULT 0,
  packaging_cost_per_unit numeric DEFAULT 0,
  inspection_cost_per_unit numeric DEFAULT 0,
  landed_cost_per_unit numeric GENERATED ALWAYS AS (
    COALESCE(purchase_cost_per_unit,0) + COALESCE(shipping_cost_per_unit,0) +
    COALESCE(customs_duty_per_unit,0) + COALESCE(insurance_cost_per_unit,0) +
    COALESCE(handling_fee_per_unit,0) + COALESCE(packaging_cost_per_unit,0) +
    COALESCE(inspection_cost_per_unit,0)
  ) STORED,
  profit_margin_pct numeric GENERATED ALWAYS AS (
    CASE WHEN COALESCE(unit_price,0) > 0 THEN
      ROUND(((COALESCE(unit_price,0) - (
        COALESCE(purchase_cost_per_unit,0) + COALESCE(shipping_cost_per_unit,0) +
        COALESCE(customs_duty_per_unit,0) + COALESCE(insurance_cost_per_unit,0) +
        COALESCE(handling_fee_per_unit,0) + COALESCE(packaging_cost_per_unit,0) +
        COALESCE(inspection_cost_per_unit,0)
      )) / COALESCE(unit_price,0)) * 100, 2)
    ELSE 0 END
  ) STORED,
  current_stock numeric DEFAULT 0,
  reorder_level numeric DEFAULT 0,
  batch_number text,
  lot_number text,
  manufacture_date date,
  expiry_date date,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.export_product_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.export_products(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  percentage numeric,
  cost_per_unit numeric DEFAULT 0,
  unit_of_measure text DEFAULT 'kg',
  supplier_name text,
  supplier_country text,
  supplier_contact text,
  country_of_origin text,
  grade text,
  is_allergen boolean DEFAULT false,
  is_organic boolean DEFAULT false,
  cas_number text,
  last_shipment_date date,
  last_shipment_qty numeric,
  last_shipment_cost numeric,
  avg_lead_time_days integer,
  current_stock numeric DEFAULT 0,
  reorder_level numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.export_ingredient_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.export_product_ingredients(id) ON DELETE CASCADE,
  shipment_date date NOT NULL,
  quantity numeric NOT NULL,
  unit_cost numeric DEFAULT 0,
  total_cost numeric GENERATED ALWAYS AS (COALESCE(quantity,0) * COALESCE(unit_cost,0)) STORED,
  shipping_cost numeric DEFAULT 0,
  supplier_name text,
  manufacturer_name text,
  manufacturer_country text,
  tracking_number text,
  batch_number text,
  lot_number text,
  expiry_date date,
  quality_grade text,
  status text DEFAULT 'ordered',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.export_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_ingredient_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage export variants" ON public.export_product_variants
  FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can manage export ingredients" ON public.export_product_ingredients
  FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can manage export ingredient shipments" ON public.export_ingredient_shipments
  FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id());

CREATE INDEX idx_export_product_variants_product ON public.export_product_variants(product_id);
CREATE INDEX idx_export_product_variants_shop ON public.export_product_variants(shop_id);
CREATE INDEX idx_export_product_ingredients_product ON public.export_product_ingredients(product_id);
CREATE INDEX idx_export_product_ingredients_shop ON public.export_product_ingredients(shop_id);
CREATE INDEX idx_export_ingredient_shipments_ingredient ON public.export_ingredient_shipments(ingredient_id);
