
CREATE TABLE public.export_module_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  default_currency text DEFAULT 'USD',
  default_incoterm text DEFAULT 'FOB',
  default_origin_port text,
  default_origin_country text,
  default_payment_terms text DEFAULT 'Net 30',
  auto_generate_invoice_numbers boolean DEFAULT true,
  invoice_prefix text DEFAULT 'EXP-INV-',
  shipment_prefix text DEFAULT 'EXP-SHP-',
  order_prefix text DEFAULT 'EXP-ORD-',
  weight_unit text DEFAULT 'kg',
  dimension_unit text DEFAULT 'cm',
  enable_trade_alerts boolean DEFAULT true,
  enable_low_stock_alerts boolean DEFAULT true,
  low_stock_threshold integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shop_id)
);
ALTER TABLE public.export_module_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_export_module_settings" ON public.export_module_settings FOR SELECT TO authenticated USING (shop_id = get_current_user_shop_id());
CREATE POLICY "ins_export_module_settings" ON public.export_module_settings FOR INSERT TO authenticated WITH CHECK (shop_id = get_current_user_shop_id());
CREATE POLICY "upd_export_module_settings" ON public.export_module_settings FOR UPDATE TO authenticated USING (shop_id = get_current_user_shop_id());
CREATE TRIGGER set_export_module_settings_updated BEFORE UPDATE ON public.export_module_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.export_business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  company_name text,
  legal_name text,
  business_type text,
  registration_number text,
  tax_id text,
  vat_number text,
  address_line1 text,
  address_line2 text,
  city text,
  state_province text,
  postal_code text,
  country text,
  phone text,
  email text,
  website text,
  logo_url text,
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  bank_name text,
  bank_account_number text,
  bank_swift_code text,
  bank_iban text,
  certifications jsonb DEFAULT '[]'::jsonb,
  export_license_number text,
  export_license_expiry date,
  customs_broker_name text,
  customs_broker_contact text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shop_id)
);
ALTER TABLE public.export_business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_export_business_profiles" ON public.export_business_profiles FOR SELECT TO authenticated USING (shop_id = get_current_user_shop_id());
CREATE POLICY "ins_export_business_profiles" ON public.export_business_profiles FOR INSERT TO authenticated WITH CHECK (shop_id = get_current_user_shop_id());
CREATE POLICY "upd_export_business_profiles" ON public.export_business_profiles FOR UPDATE TO authenticated USING (shop_id = get_current_user_shop_id());
CREATE TRIGGER set_export_business_profiles_updated BEFORE UPDATE ON public.export_business_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.export_store_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  price numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  supplier_name text,
  supplier_url text,
  image_url text,
  affiliate_url text,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  rating numeric,
  review_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.export_store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_export_store_items" ON public.export_store_items FOR SELECT TO authenticated USING (shop_id = get_current_user_shop_id());
CREATE POLICY "ins_export_store_items" ON public.export_store_items FOR INSERT TO authenticated WITH CHECK (shop_id = get_current_user_shop_id());
CREATE POLICY "upd_export_store_items" ON public.export_store_items FOR UPDATE TO authenticated USING (shop_id = get_current_user_shop_id());
CREATE POLICY "del_export_store_items" ON public.export_store_items FOR DELETE TO authenticated USING (shop_id = get_current_user_shop_id());
CREATE TRIGGER set_export_store_items_updated BEFORE UPDATE ON public.export_store_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
