-- Gunsmith Jobs/Work Orders
CREATE TABLE public.gunsmith_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  job_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  firearm_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  job_type TEXT NOT NULL,
  description TEXT,
  diagnosis TEXT,
  work_performed TEXT,
  parts_used JSONB,
  labor_hours DECIMAL(10,2),
  labor_rate DECIMAL(10,2),
  parts_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  estimated_completion DATE,
  actual_completion DATE,
  assigned_to UUID REFERENCES public.profiles(id),
  received_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer Firearms Registry
CREATE TABLE public.gunsmith_firearms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT,
  caliber TEXT,
  firearm_type TEXT NOT NULL,
  classification TEXT DEFAULT 'non-restricted',
  barrel_length DECIMAL(10,2),
  overall_length DECIMAL(10,2),
  finish TEXT,
  stock_material TEXT,
  registration_number TEXT,
  date_acquired DATE,
  acquisition_type TEXT,
  condition TEXT,
  notes TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update gunsmith_jobs foreign key
ALTER TABLE public.gunsmith_jobs 
ADD CONSTRAINT gunsmith_jobs_firearm_id_fkey 
FOREIGN KEY (firearm_id) REFERENCES public.gunsmith_firearms(id) ON DELETE SET NULL;

-- Parts & Inventory
CREATE TABLE public.gunsmith_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  part_number TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  manufacturer TEXT,
  compatible_firearms TEXT[],
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 0,
  unit_cost DECIMAL(10,2),
  retail_price DECIMAL(10,2),
  location TEXT,
  supplier TEXT,
  is_serialized BOOLEAN DEFAULT false,
  serial_numbers TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quotes
CREATE TABLE public.gunsmith_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  firearm_id UUID REFERENCES public.gunsmith_firearms(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  job_type TEXT,
  description TEXT,
  labor_estimate DECIMAL(10,2) DEFAULT 0,
  parts_estimate DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  valid_until DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE public.gunsmith_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  job_id UUID REFERENCES public.gunsmith_jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE public.gunsmith_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.gunsmith_invoices(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Appointments
CREATE TABLE public.gunsmith_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  firearm_id UUID REFERENCES public.gunsmith_firearms(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  appointment_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Canadian Compliance - PAL/RPAL Tracking
CREATE TABLE public.gunsmith_customer_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  license_type TEXT NOT NULL,
  license_number TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE NOT NULL,
  province TEXT,
  conditions TEXT[],
  verified BOOLEAN DEFAULT false,
  verified_date DATE,
  verified_by UUID REFERENCES public.profiles(id),
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Firearm Transfers (Canadian CFO)
CREATE TABLE public.gunsmith_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  transfer_type TEXT NOT NULL,
  firearm_id UUID REFERENCES public.gunsmith_firearms(id) ON DELETE SET NULL,
  from_customer_id UUID REFERENCES public.customers(id),
  to_customer_id UUID REFERENCES public.customers(id),
  transfer_date DATE DEFAULT CURRENT_DATE,
  cfo_reference_number TEXT,
  cfo_authorization_date DATE,
  cfo_expiry_date DATE,
  transfer_status TEXT DEFAULT 'pending',
  firearm_make TEXT,
  firearm_model TEXT,
  firearm_serial TEXT,
  firearm_classification TEXT,
  registration_certificate_number TEXT,
  from_license_number TEXT,
  to_license_number TEXT,
  from_license_verified BOOLEAN DEFAULT false,
  to_license_verified BOOLEAN DEFAULT false,
  sale_price DECIMAL(10,2),
  notes TEXT,
  completed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ATF 4473 Log (US) / Canadian Acquisition Records
CREATE TABLE public.gunsmith_acquisition_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL DEFAULT 'canadian',
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  firearm_id UUID REFERENCES public.gunsmith_firearms(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  firearm_make TEXT,
  firearm_model TEXT,
  firearm_serial TEXT,
  firearm_caliber TEXT,
  firearm_classification TEXT,
  pal_rpal_number TEXT,
  pal_rpal_expiry DATE,
  registration_number TEXT,
  cfo_reference TEXT,
  seller_name TEXT,
  seller_license TEXT,
  buyer_name TEXT,
  buyer_license TEXT,
  sale_price DECIMAL(10,2),
  verified_by UUID REFERENCES public.profiles(id),
  verification_date DATE,
  notes TEXT,
  document_urls TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consignment Inventory
CREATE TABLE public.gunsmith_consignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  firearm_id UUID REFERENCES public.gunsmith_firearms(id) ON DELETE SET NULL,
  consignment_date DATE DEFAULT CURRENT_DATE,
  asking_price DECIMAL(10,2),
  minimum_price DECIMAL(10,2),
  commission_rate DECIMAL(5,2) DEFAULT 15,
  status TEXT DEFAULT 'active',
  sold_date DATE,
  sold_price DECIMAL(10,2),
  commission_amount DECIMAL(10,2),
  payout_amount DECIMAL(10,2),
  payout_date DATE,
  agreement_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gunsmith_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_firearms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_customer_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_acquisition_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_consignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage gunsmith jobs in their shop" ON public.gunsmith_jobs FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage gunsmith firearms in their shop" ON public.gunsmith_firearms FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage gunsmith parts in their shop" ON public.gunsmith_parts FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage gunsmith quotes in their shop" ON public.gunsmith_quotes FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage gunsmith invoices in their shop" ON public.gunsmith_invoices FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage gunsmith payments in their shop" ON public.gunsmith_payments FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage gunsmith appointments in their shop" ON public.gunsmith_appointments FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage gunsmith licenses in their shop" ON public.gunsmith_customer_licenses FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage gunsmith transfers in their shop" ON public.gunsmith_transfers FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage gunsmith acquisition records in their shop" ON public.gunsmith_acquisition_records FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage gunsmith consignments in their shop" ON public.gunsmith_consignments FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));