
-- ============================================================
-- WELDING MODULE — COMPLETE DATABASE MIGRATION
-- ============================================================

-- ==================== ENUMS ====================
DO $$ BEGIN
  CREATE TYPE public.welding_quote_status AS ENUM ('new','reviewed','quoted','accepted','declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.welding_invoice_status AS ENUM ('draft','sent','unpaid','partial','paid','overdue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.welding_ap_status AS ENUM ('pending','partial','paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.welding_po_status AS ENUM ('draft','ordered','shipped','received','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.welding_schedule_entry_type AS ENUM ('day_off','vacation','install_day','on_site','shop_day','booking','measurement');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.welding_customer_interaction_type AS ENUM ('email','phone_call','site_visit','quote_request','deposit','payment','follow_up','conversation','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==================== TABLE 1: welding_company_settings ====================
CREATE TABLE IF NOT EXISTS public.welding_company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  company_name TEXT NOT NULL DEFAULT 'Welding Company',
  phone TEXT,
  email TEXT,
  address TEXT,
  logo_url TEXT,
  default_tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  default_invoice_terms TEXT,
  business_hours JSONB,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
  quote_prefix TEXT NOT NULL DEFAULT 'QUO-',
  po_prefix TEXT NOT NULL DEFAULT 'PO-',
  currency TEXT NOT NULL DEFAULT 'CAD',
  currency_symbol TEXT NOT NULL DEFAULT '$',
  enable_email_notifications BOOLEAN NOT NULL DEFAULT false,
  enable_customer_portal BOOLEAN NOT NULL DEFAULT true,
  require_deposit BOOLEAN NOT NULL DEFAULT false,
  deposit_percentage NUMERIC(5,2) NOT NULL DEFAULT 25,
  invoice_next_number INTEGER NOT NULL DEFAULT 1,
  quote_next_number INTEGER NOT NULL DEFAULT 1,
  po_next_number INTEGER NOT NULL DEFAULT 1,
  number_padding INTEGER NOT NULL DEFAULT 4,
  include_year BOOLEAN NOT NULL DEFAULT false,
  year_format TEXT NOT NULL DEFAULT 'full',
  travel_rate_per_km NUMERIC(6,2) NOT NULL DEFAULT 0.65,
  mobile_quick_links JSONB DEFAULT '["Overview","Gallery","Quotes","Invoices","Payments Due"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id)
);

ALTER TABLE public.welding_company_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_company_settings' AND policyname = 'welding_company_settings_shop_isolation') THEN
    CREATE POLICY "welding_company_settings_shop_isolation" ON public.welding_company_settings
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

CREATE TRIGGER update_welding_company_settings_updated_at
  BEFORE UPDATE ON public.welding_company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== TABLE 2: welding_customers ====================
CREATE TABLE IF NOT EXISTS public.welding_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  area_code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  deposit_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_customers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_customers' AND policyname = 'welding_customers_shop_isolation') THEN
    CREATE POLICY "welding_customers_shop_isolation" ON public.welding_customers
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

CREATE TRIGGER update_welding_customers_updated_at
  BEFORE UPDATE ON public.welding_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== TABLE 3: welding_customer_interactions ====================
CREATE TABLE IF NOT EXISTS public.welding_customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.welding_customers(id) ON DELETE CASCADE,
  interaction_type public.welding_customer_interaction_type NOT NULL DEFAULT 'other',
  description TEXT,
  interaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_customer_interactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_customer_interactions' AND policyname = 'welding_customer_interactions_shop_isolation') THEN
    CREATE POLICY "welding_customer_interactions_shop_isolation" ON public.welding_customer_interactions
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.welding_customers c WHERE c.id = customer_id AND c.shop_id = public.get_current_user_shop_id()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.welding_customers c WHERE c.id = customer_id AND c.shop_id = public.get_current_user_shop_id()));
  END IF;
END $$;

-- ==================== TABLE 4: welding_labour_rates ====================
CREATE TABLE IF NOT EXISTS public.welding_labour_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_labour_rates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_labour_rates' AND policyname = 'welding_labour_rates_shop_isolation') THEN
    CREATE POLICY "welding_labour_rates_shop_isolation" ON public.welding_labour_rates
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

CREATE TRIGGER update_welding_labour_rates_updated_at
  BEFORE UPDATE ON public.welding_labour_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== TABLE 5: welding_inventory ====================
CREATE TABLE IF NOT EXISTS public.welding_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  specifications TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  min_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  location TEXT,
  cost_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0,
  sell_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_inventory ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_inventory' AND policyname = 'welding_inventory_shop_isolation') THEN
    CREATE POLICY "welding_inventory_shop_isolation" ON public.welding_inventory
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

CREATE TRIGGER update_welding_inventory_updated_at
  BEFORE UPDATE ON public.welding_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== TABLE 6: welding_quotes ====================
CREATE TABLE IF NOT EXISTS public.welding_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  quote_number TEXT,
  customer_id UUID REFERENCES public.welding_customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  project_type TEXT,
  description TEXT,
  timeline TEXT,
  status public.welding_quote_status NOT NULL DEFAULT 'new',
  estimated_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  labour_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  labour_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  travel_distance NUMERIC(10,2) NOT NULL DEFAULT 0,
  travel_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  quote_mode TEXT DEFAULT 'standard',
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  notes TEXT,
  valid_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_quotes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_quotes' AND policyname = 'welding_quotes_shop_isolation') THEN
    CREATE POLICY "welding_quotes_shop_isolation" ON public.welding_quotes
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

CREATE TRIGGER update_welding_quotes_updated_at
  BEFORE UPDATE ON public.welding_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== TABLE 7: welding_quote_materials ====================
CREATE TABLE IF NOT EXISTS public.welding_quote_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.welding_quotes(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.welding_inventory(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  category TEXT,
  measurements TEXT,
  notes TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sell_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_quote_materials ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_quote_materials' AND policyname = 'welding_quote_materials_shop_isolation') THEN
    CREATE POLICY "welding_quote_materials_shop_isolation" ON public.welding_quote_materials
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.welding_quotes q WHERE q.id = quote_id AND q.shop_id = public.get_current_user_shop_id()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.welding_quotes q WHERE q.id = quote_id AND q.shop_id = public.get_current_user_shop_id()));
  END IF;
END $$;

-- ==================== TABLE 8: welding_quote_attachments ====================
CREATE TABLE IF NOT EXISTS public.welding_quote_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.welding_quotes(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_quote_attachments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_quote_attachments' AND policyname = 'welding_quote_attachments_shop_isolation') THEN
    CREATE POLICY "welding_quote_attachments_shop_isolation" ON public.welding_quote_attachments
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.welding_quotes q WHERE q.id = quote_id AND q.shop_id = public.get_current_user_shop_id()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.welding_quotes q WHERE q.id = quote_id AND q.shop_id = public.get_current_user_shop_id()));
  END IF;
END $$;

-- ==================== TABLE 9: welding_quote_history ====================
CREATE TABLE IF NOT EXISTS public.welding_quote_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.welding_quotes(id) ON DELETE CASCADE,
  changed_by UUID,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  change_type TEXT DEFAULT 'update',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_quote_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_quote_history' AND policyname = 'welding_quote_history_shop_isolation') THEN
    CREATE POLICY "welding_quote_history_shop_isolation" ON public.welding_quote_history
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.welding_quotes q WHERE q.id = quote_id AND q.shop_id = public.get_current_user_shop_id()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.welding_quotes q WHERE q.id = quote_id AND q.shop_id = public.get_current_user_shop_id()));
  END IF;
END $$;

-- ==================== TABLE 10: welding_invoices ====================
CREATE TABLE IF NOT EXISTS public.welding_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.welding_customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  quote_id UUID REFERENCES public.welding_quotes(id) ON DELETE SET NULL,
  status public.welding_invoice_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE,
  notes TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_invoices' AND policyname = 'welding_invoices_shop_isolation') THEN
    CREATE POLICY "welding_invoices_shop_isolation" ON public.welding_invoices
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

CREATE TRIGGER update_welding_invoices_updated_at
  BEFORE UPDATE ON public.welding_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== TABLE 11: welding_invoice_items ====================
CREATE TABLE IF NOT EXISTS public.welding_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.welding_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_invoice_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_invoice_items' AND policyname = 'welding_invoice_items_shop_isolation') THEN
    CREATE POLICY "welding_invoice_items_shop_isolation" ON public.welding_invoice_items
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.welding_invoices i WHERE i.id = invoice_id AND i.shop_id = public.get_current_user_shop_id()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.welding_invoices i WHERE i.id = invoice_id AND i.shop_id = public.get_current_user_shop_id()));
  END IF;
END $$;

-- ==================== TABLE 12: welding_invoice_history ====================
CREATE TABLE IF NOT EXISTS public.welding_invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.welding_invoices(id) ON DELETE CASCADE,
  changed_by UUID,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  change_type TEXT DEFAULT 'update',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_invoice_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_invoice_history' AND policyname = 'welding_invoice_history_shop_isolation') THEN
    CREATE POLICY "welding_invoice_history_shop_isolation" ON public.welding_invoice_history
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.welding_invoices i WHERE i.id = invoice_id AND i.shop_id = public.get_current_user_shop_id()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.welding_invoices i WHERE i.id = invoice_id AND i.shop_id = public.get_current_user_shop_id()));
  END IF;
END $$;

-- ==================== TABLE 13: welding_payments ====================
CREATE TABLE IF NOT EXISTS public.welding_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.welding_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_payments' AND policyname = 'welding_payments_shop_isolation') THEN
    CREATE POLICY "welding_payments_shop_isolation" ON public.welding_payments
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.welding_invoices i WHERE i.id = invoice_id AND i.shop_id = public.get_current_user_shop_id()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.welding_invoices i WHERE i.id = invoice_id AND i.shop_id = public.get_current_user_shop_id()));
  END IF;
END $$;

-- ==================== TABLE 14: welding_vendors ====================
CREATE TABLE IF NOT EXISTS public.welding_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_vendors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_vendors' AND policyname = 'welding_vendors_shop_isolation') THEN
    CREATE POLICY "welding_vendors_shop_isolation" ON public.welding_vendors
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

CREATE TRIGGER update_welding_vendors_updated_at
  BEFORE UPDATE ON public.welding_vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== TABLE 15: welding_accounts_payable ====================
CREATE TABLE IF NOT EXISTS public.welding_accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  vendor_id UUID REFERENCES public.welding_vendors(id) ON DELETE SET NULL,
  vendor_name TEXT,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.welding_ap_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_accounts_payable ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_accounts_payable' AND policyname = 'welding_accounts_payable_shop_isolation') THEN
    CREATE POLICY "welding_accounts_payable_shop_isolation" ON public.welding_accounts_payable
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

CREATE TRIGGER update_welding_accounts_payable_updated_at
  BEFORE UPDATE ON public.welding_accounts_payable
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== TABLE 16: welding_inventory_purchase_history ====================
CREATE TABLE IF NOT EXISTS public.welding_inventory_purchase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES public.welding_inventory(id) ON DELETE CASCADE,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  vendor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_inventory_purchase_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_inventory_purchase_history' AND policyname = 'welding_inventory_purchase_history_shop_isolation') THEN
    CREATE POLICY "welding_inventory_purchase_history_shop_isolation" ON public.welding_inventory_purchase_history
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.welding_inventory i WHERE i.id = inventory_item_id AND i.shop_id = public.get_current_user_shop_id()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.welding_inventory i WHERE i.id = inventory_item_id AND i.shop_id = public.get_current_user_shop_id()));
  END IF;
END $$;

-- ==================== TABLE 17: welding_purchase_orders ====================
CREATE TABLE IF NOT EXISTS public.welding_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  po_number TEXT NOT NULL,
  vendor_id UUID REFERENCES public.welding_vendors(id) ON DELETE SET NULL,
  vendor_name TEXT,
  status public.welding_po_status NOT NULL DEFAULT 'draft',
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_purchase_orders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_purchase_orders' AND policyname = 'welding_purchase_orders_shop_isolation') THEN
    CREATE POLICY "welding_purchase_orders_shop_isolation" ON public.welding_purchase_orders
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

CREATE TRIGGER update_welding_purchase_orders_updated_at
  BEFORE UPDATE ON public.welding_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== TABLE 18: welding_purchase_order_items ====================
CREATE TABLE IF NOT EXISTS public.welding_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.welding_purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.welding_inventory(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_purchase_order_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_purchase_order_items' AND policyname = 'welding_purchase_order_items_shop_isolation') THEN
    CREATE POLICY "welding_purchase_order_items_shop_isolation" ON public.welding_purchase_order_items
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.welding_purchase_orders po WHERE po.id = purchase_order_id AND po.shop_id = public.get_current_user_shop_id()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.welding_purchase_orders po WHERE po.id = purchase_order_id AND po.shop_id = public.get_current_user_shop_id()));
  END IF;
END $$;

-- ==================== TABLE 19: welding_gallery_projects ====================
CREATE TABLE IF NOT EXISTS public.welding_gallery_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  image_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[],
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_gallery_projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_gallery_projects' AND policyname = 'welding_gallery_projects_shop_isolation') THEN
    CREATE POLICY "welding_gallery_projects_shop_isolation" ON public.welding_gallery_projects
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

-- Public read for gallery
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_gallery_projects' AND policyname = 'welding_gallery_projects_public_read') THEN
    CREATE POLICY "welding_gallery_projects_public_read" ON public.welding_gallery_projects
      FOR SELECT TO anon
      USING (true);
  END IF;
END $$;

CREATE TRIGGER update_welding_gallery_projects_updated_at
  BEFORE UPDATE ON public.welding_gallery_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== TABLE 20: welding_contact_messages ====================
CREATE TABLE IF NOT EXISTS public.welding_contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_contact_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_contact_messages' AND policyname = 'welding_contact_messages_shop_isolation') THEN
    CREATE POLICY "welding_contact_messages_shop_isolation" ON public.welding_contact_messages
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

-- Public insert for contact form
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_contact_messages' AND policyname = 'welding_contact_messages_public_insert') THEN
    CREATE POLICY "welding_contact_messages_public_insert" ON public.welding_contact_messages
      FOR INSERT TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- ==================== TABLE 21: welding_schedule_entries ====================
CREATE TABLE IF NOT EXISTS public.welding_schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  user_id UUID,
  entry_date DATE NOT NULL,
  entry_type public.welding_schedule_entry_type NOT NULL DEFAULT 'shop_day',
  title TEXT,
  notes TEXT,
  color TEXT,
  customer_id UUID REFERENCES public.welding_customers(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.welding_quotes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_schedule_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_schedule_entries' AND policyname = 'welding_schedule_entries_shop_isolation') THEN
    CREATE POLICY "welding_schedule_entries_shop_isolation" ON public.welding_schedule_entries
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

CREATE TRIGGER update_welding_schedule_entries_updated_at
  BEFORE UPDATE ON public.welding_schedule_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== TABLE 22: welding_sales_activities ====================
CREATE TABLE IF NOT EXISTS public.welding_sales_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  user_id UUID,
  activity_type TEXT NOT NULL DEFAULT 'general',
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  notes TEXT,
  follow_up_date DATE,
  status TEXT NOT NULL DEFAULT 'open',
  quote_id UUID REFERENCES public.welding_quotes(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.welding_customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_sales_activities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_sales_activities' AND policyname = 'welding_sales_activities_shop_isolation') THEN
    CREATE POLICY "welding_sales_activities_shop_isolation" ON public.welding_sales_activities
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

CREATE TRIGGER update_welding_sales_activities_updated_at
  BEFORE UPDATE ON public.welding_sales_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== TABLE 23: welding_quick_links ====================
CREATE TABLE IF NOT EXISTS public.welding_quick_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_quick_links ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'welding_quick_links' AND policyname = 'welding_quick_links_shop_isolation') THEN
    CREATE POLICY "welding_quick_links_shop_isolation" ON public.welding_quick_links
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_welding_customers_shop ON public.welding_customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_welding_quotes_shop ON public.welding_quotes(shop_id);
CREATE INDEX IF NOT EXISTS idx_welding_quotes_customer ON public.welding_quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_welding_quotes_status ON public.welding_quotes(status);
CREATE INDEX IF NOT EXISTS idx_welding_invoices_shop ON public.welding_invoices(shop_id);
CREATE INDEX IF NOT EXISTS idx_welding_invoices_customer ON public.welding_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_welding_invoices_status ON public.welding_invoices(status);
CREATE INDEX IF NOT EXISTS idx_welding_inventory_shop ON public.welding_inventory(shop_id);
CREATE INDEX IF NOT EXISTS idx_welding_vendors_shop ON public.welding_vendors(shop_id);
CREATE INDEX IF NOT EXISTS idx_welding_schedule_shop ON public.welding_schedule_entries(shop_id);
CREATE INDEX IF NOT EXISTS idx_welding_schedule_date ON public.welding_schedule_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_welding_sales_shop ON public.welding_sales_activities(shop_id);
CREATE INDEX IF NOT EXISTS idx_welding_ap_shop ON public.welding_accounts_payable(shop_id);
CREATE INDEX IF NOT EXISTS idx_welding_po_shop ON public.welding_purchase_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_welding_gallery_shop ON public.welding_gallery_projects(shop_id);

-- ==================== FUNCTIONS ====================

-- Generate welding quote number
CREATE OR REPLACE FUNCTION public.generate_welding_quote_number(shop_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  padding INTEGER;
  inc_year BOOLEAN;
  yr_format TEXT;
  result TEXT;
BEGIN
  SELECT quote_prefix, quote_next_number, number_padding, include_year, year_format
    INTO prefix, next_num, padding, inc_year, yr_format
    FROM public.welding_company_settings
    WHERE shop_id = shop_uuid;

  IF prefix IS NULL THEN
    prefix := 'QUO-'; next_num := 1; padding := 4; inc_year := false; yr_format := 'full';
  END IF;

  result := prefix;
  IF inc_year THEN
    IF yr_format = 'short' THEN
      result := result || to_char(now(), 'YY') || '-';
    ELSE
      result := result || to_char(now(), 'YYYY') || '-';
    END IF;
  END IF;
  result := result || lpad(next_num::text, GREATEST(padding, length(next_num::text)), '0');

  UPDATE public.welding_company_settings
    SET quote_next_number = next_num + 1
    WHERE shop_id = shop_uuid;

  RETURN result;
END;
$$;

-- Generate welding invoice number
CREATE OR REPLACE FUNCTION public.generate_welding_invoice_number(shop_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  padding INTEGER;
  inc_year BOOLEAN;
  yr_format TEXT;
  result TEXT;
BEGIN
  SELECT invoice_prefix, invoice_next_number, number_padding, include_year, year_format
    INTO prefix, next_num, padding, inc_year, yr_format
    FROM public.welding_company_settings
    WHERE shop_id = shop_uuid;

  IF prefix IS NULL THEN
    prefix := 'INV-'; next_num := 1; padding := 4; inc_year := false; yr_format := 'full';
  END IF;

  result := prefix;
  IF inc_year THEN
    IF yr_format = 'short' THEN
      result := result || to_char(now(), 'YY') || '-';
    ELSE
      result := result || to_char(now(), 'YYYY') || '-';
    END IF;
  END IF;
  result := result || lpad(next_num::text, GREATEST(padding, length(next_num::text)), '0');

  UPDATE public.welding_company_settings
    SET invoice_next_number = next_num + 1
    WHERE shop_id = shop_uuid;

  RETURN result;
END;
$$;

-- Generate welding PO number
CREATE OR REPLACE FUNCTION public.generate_welding_po_number(shop_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  padding INTEGER;
  inc_year BOOLEAN;
  yr_format TEXT;
  result TEXT;
BEGIN
  SELECT po_prefix, po_next_number, number_padding, include_year, year_format
    INTO prefix, next_num, padding, inc_year, yr_format
    FROM public.welding_company_settings
    WHERE shop_id = shop_uuid;

  IF prefix IS NULL THEN
    prefix := 'PO-'; next_num := 1; padding := 4; inc_year := false; yr_format := 'full';
  END IF;

  result := prefix;
  IF inc_year THEN
    IF yr_format = 'short' THEN
      result := result || to_char(now(), 'YY') || '-';
    ELSE
      result := result || to_char(now(), 'YYYY') || '-';
    END IF;
  END IF;
  result := result || lpad(next_num::text, GREATEST(padding, length(next_num::text)), '0');

  UPDATE public.welding_company_settings
    SET po_next_number = next_num + 1
    WHERE shop_id = shop_uuid;

  RETURN result;
END;
$$;

-- ==================== STORAGE BUCKET ====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('welding-photos', 'welding-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "welding_photos_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'welding-photos');

CREATE POLICY "welding_photos_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'welding-photos');

CREATE POLICY "welding_photos_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'welding-photos');

CREATE POLICY "welding_photos_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'welding-photos');
