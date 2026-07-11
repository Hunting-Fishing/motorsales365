
-- ═══════════════════════════════════════════════════════════════
-- Export Suppliers / Vendors
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.export_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  website text,
  country text,
  city text,
  address text,
  
  -- Business details
  tax_id text,
  payment_terms text DEFAULT 'Net 30',
  currency text DEFAULT 'USD',
  
  -- Performance
  lead_time_days integer DEFAULT 0,
  reliability_rating numeric DEFAULT 0,
  quality_rating numeric DEFAULT 0,
  on_time_delivery_pct numeric DEFAULT 0,
  total_orders integer DEFAULT 0,
  total_spend numeric DEFAULT 0,
  
  -- Products supplied
  product_categories text[],
  
  -- Certifications
  certifications text[],
  certification_expiry date,
  
  -- Status
  is_active boolean DEFAULT true,
  is_preferred boolean DEFAULT false,
  notes text,
  tags text[],
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.export_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop isolation for export_suppliers"
  ON public.export_suppliers FOR ALL
  TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE INDEX idx_export_suppliers_shop ON public.export_suppliers(shop_id);

-- Link products to suppliers
ALTER TABLE public.export_products
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.export_suppliers(id) ON DELETE SET NULL;
