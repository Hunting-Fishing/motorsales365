
-- 1. Contracts & Agreements
CREATE TABLE public.export_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.export_customers(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.export_suppliers(id) ON DELETE SET NULL,
  contract_number text NOT NULL,
  contract_type text NOT NULL DEFAULT 'supply',
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  auto_renew boolean DEFAULT false,
  renewal_notice_days integer DEFAULT 30,
  total_value numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  payment_terms text,
  incoterm text,
  terms_and_conditions text,
  status text NOT NULL DEFAULT 'draft',
  signed_date date,
  signed_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.export_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage export_contracts in their shop" ON public.export_contracts FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());

-- Contract line items (products/pricing commitments)
CREATE TABLE public.export_contract_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.export_contracts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.export_products(id) ON DELETE SET NULL,
  description text,
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'kg',
  unit_price numeric DEFAULT 0,
  total_price numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  delivery_schedule text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.export_contract_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage export_contract_items in their shop" ON public.export_contract_items FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 2. Currency & Exchange Rates
CREATE TABLE public.export_currency_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  base_currency text NOT NULL DEFAULT 'USD',
  target_currency text NOT NULL,
  rate numeric NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  source text DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.export_currency_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage export_currency_rates in their shop" ON public.export_currency_rates FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 3. Import Invoices (Accounts Payable)
CREATE TABLE public.import_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.export_suppliers(id) ON DELETE SET NULL,
  purchase_order_id uuid REFERENCES public.import_purchase_orders(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  currency text DEFAULT 'USD',
  subtotal numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  shipping numeric DEFAULT 0,
  duties numeric DEFAULT 0,
  total numeric GENERATED ALWAYS AS (COALESCE(subtotal,0) + COALESCE(tax,0) + COALESCE(shipping,0) + COALESCE(duties,0)) STORED,
  amount_paid numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_date date,
  payment_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.import_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage import_invoices in their shop" ON public.import_invoices FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 4. Shipping Insurance
CREATE TABLE public.export_shipping_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES public.export_shipments(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.export_orders(id) ON DELETE SET NULL,
  policy_number text,
  insurance_provider text NOT NULL,
  coverage_type text DEFAULT 'all_risk',
  insured_value numeric NOT NULL DEFAULT 0,
  premium numeric DEFAULT 0,
  deductible numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  effective_date date NOT NULL,
  expiry_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  claim_filed boolean DEFAULT false,
  claim_amount numeric DEFAULT 0,
  claim_status text,
  claim_date date,
  claim_description text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.export_shipping_insurance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage export_shipping_insurance in their shop" ON public.export_shipping_insurance FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 5. Module Activity Log
CREATE TABLE public.export_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_label text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.export_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage export_activity_log in their shop" ON public.export_activity_log FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
