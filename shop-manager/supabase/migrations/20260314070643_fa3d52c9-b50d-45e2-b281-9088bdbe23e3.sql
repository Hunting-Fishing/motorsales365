
-- 1. Sample Management
CREATE TABLE public.export_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  sample_number TEXT NOT NULL,
  customer_id UUID,
  product_id UUID,
  product_name TEXT,
  customer_name TEXT,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  status TEXT NOT NULL DEFAULT 'pending',
  sent_date DATE,
  received_date DATE,
  feedback TEXT,
  feedback_rating INTEGER,
  converted_to_order BOOLEAN DEFAULT false,
  order_id UUID,
  shipping_method TEXT,
  tracking_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_isolation" ON public.export_samples FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 2. Booking & Vessel Scheduling
CREATE TABLE public.export_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  booking_number TEXT NOT NULL,
  carrier_name TEXT NOT NULL,
  vessel_name TEXT,
  voyage_number TEXT,
  transport_mode TEXT NOT NULL DEFAULT 'ocean',
  origin_port TEXT,
  destination_port TEXT,
  booking_date DATE,
  etd DATE,
  eta DATE,
  atd DATE,
  ata DATE,
  container_type TEXT,
  container_count INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  demurrage_days INTEGER DEFAULT 0,
  demurrage_cost NUMERIC(12,2) DEFAULT 0,
  freight_cost NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_isolation" ON public.export_bookings FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 3. Country Import Requirements
CREATE TABLE public.export_country_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  product_category TEXT,
  required_documents TEXT[] DEFAULT '{}',
  restricted_items TEXT[] DEFAULT '{}',
  labeling_rules TEXT,
  packaging_requirements TEXT,
  import_duties_info TEXT,
  quarantine_requirements TEXT,
  certification_needed TEXT[] DEFAULT '{}',
  special_notes TEXT,
  last_verified DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_country_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_isolation" ON public.export_country_requirements FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 4. Commission & Agent Management
CREATE TABLE public.export_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  country TEXT,
  region TEXT,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  commission_type TEXT DEFAULT 'percentage',
  total_sales NUMERIC(14,2) DEFAULT 0,
  total_commission_earned NUMERIC(14,2) DEFAULT 0,
  total_commission_paid NUMERIC(14,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  contract_start DATE,
  contract_end DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_isolation" ON public.export_agents FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 5. Bank Guarantees & Bonds
CREATE TABLE public.export_bank_guarantees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  guarantee_number TEXT NOT NULL,
  guarantee_type TEXT NOT NULL DEFAULT 'performance',
  issuing_bank TEXT NOT NULL,
  beneficiary TEXT,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  related_contract TEXT,
  margin_percentage NUMERIC(5,2),
  margin_amount NUMERIC(14,2),
  auto_renewal BOOLEAN DEFAULT false,
  claim_amount NUMERIC(14,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_bank_guarantees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_isolation" ON public.export_bank_guarantees FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 6. Credit Management
CREATE TABLE public.export_credit_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID,
  customer_name TEXT NOT NULL,
  credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_exposure NUMERIC(14,2) DEFAULT 0,
  credit_score INTEGER,
  credit_rating TEXT,
  payment_terms_days INTEGER DEFAULT 30,
  average_payment_days INTEGER,
  overdue_amount NUMERIC(14,2) DEFAULT 0,
  overdue_invoices INTEGER DEFAULT 0,
  credit_status TEXT NOT NULL DEFAULT 'approved',
  last_review_date DATE,
  next_review_date DATE,
  credit_insurance BOOLEAN DEFAULT false,
  insurance_provider TEXT,
  insurance_coverage NUMERIC(14,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_credit_management ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_isolation" ON public.export_credit_management FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 7. Certificate Lifecycle
CREATE TABLE public.export_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  certificate_type TEXT NOT NULL,
  certificate_number TEXT,
  issuing_authority TEXT NOT NULL,
  product_category TEXT,
  country_of_destination TEXT,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  renewal_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  renewal_cost NUMERIC(10,2),
  document_url TEXT,
  auto_renew BOOLEAN DEFAULT false,
  reminder_days INTEGER DEFAULT 30,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_isolation" ON public.export_certificates FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 8. HS Code / Tariff Database
CREATE TABLE public.export_hs_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  hs_code TEXT NOT NULL,
  description TEXT NOT NULL,
  product_category TEXT,
  chapter TEXT,
  heading TEXT,
  subheading TEXT,
  destination_country TEXT,
  import_duty_rate NUMERIC(6,2),
  vat_rate NUMERIC(6,2),
  excise_rate NUMERIC(6,2),
  preferential_rate NUMERIC(6,2),
  trade_agreement TEXT,
  requires_license BOOLEAN DEFAULT false,
  requires_inspection BOOLEAN DEFAULT false,
  restricted BOOLEAN DEFAULT false,
  notes TEXT,
  last_verified DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_hs_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_isolation" ON public.export_hs_codes FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());
