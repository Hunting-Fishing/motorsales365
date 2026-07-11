
-- 1. Export Returns & Claims
CREATE TABLE public.export_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  return_number TEXT NOT NULL,
  order_id UUID,
  customer_name TEXT,
  return_type TEXT NOT NULL DEFAULT 'return', -- return, claim, dispute
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, resolved, credited
  items JSONB DEFAULT '[]',
  total_value NUMERIC(12,2) DEFAULT 0,
  credit_note_number TEXT,
  credit_note_amount NUMERIC(12,2),
  debit_note_number TEXT,
  debit_note_amount NUMERIC(12,2),
  resolution_notes TEXT,
  filed_date DATE DEFAULT CURRENT_DATE,
  resolved_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.export_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop isolation for export_returns" ON public.export_returns
  FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 2. Quality Inspections
CREATE TABLE public.export_quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  inspection_number TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'shipment', -- shipment, product, lot, container
  entity_id UUID,
  entity_label TEXT,
  inspector_name TEXT,
  inspection_date DATE DEFAULT CURRENT_DATE,
  inspection_type TEXT DEFAULT 'pre_shipment', -- pre_shipment, incoming, final, random
  overall_grade TEXT, -- A, B, C, D, F or pass/fail
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, passed, failed, conditional
  checklist JSONB DEFAULT '[]',
  findings TEXT,
  corrective_actions TEXT,
  photos JSONB DEFAULT '[]',
  certificate_number TEXT,
  next_inspection_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.export_quality_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop isolation for export_quality_inspections" ON public.export_quality_inspections
  FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 3. Freight Forwarders / 3PL Partners
CREATE TABLE public.export_freight_forwarders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  country TEXT,
  services JSONB DEFAULT '[]', -- ocean, air, road, customs_brokerage, warehousing
  license_number TEXT,
  rating NUMERIC(3,2) DEFAULT 0,
  total_shipments INTEGER DEFAULT 0,
  on_time_rate NUMERIC(5,2) DEFAULT 0,
  damage_rate NUMERIC(5,2) DEFAULT 0,
  preferred BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive, suspended
  contract_start DATE,
  contract_end DATE,
  payment_terms TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.export_freight_forwarders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop isolation for export_freight_forwarders" ON public.export_freight_forwarders
  FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 4. Letters of Credit
CREATE TABLE public.export_letters_of_credit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  lc_number TEXT NOT NULL,
  order_id UUID,
  customer_name TEXT,
  issuing_bank TEXT,
  advising_bank TEXT,
  beneficiary TEXT,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  issue_date DATE,
  expiry_date DATE,
  latest_shipment_date DATE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, issued, amended, presented, accepted, paid, expired, cancelled
  lc_type TEXT DEFAULT 'irrevocable', -- irrevocable, revocable, confirmed, standby
  payment_terms TEXT,
  required_documents JSONB DEFAULT '[]',
  amendments JSONB DEFAULT '[]',
  discrepancies JSONB DEFAULT '[]',
  presentation_date DATE,
  payment_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.export_letters_of_credit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop isolation for export_letters_of_credit" ON public.export_letters_of_credit
  FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 5. Duty Drawbacks
CREATE TABLE public.export_duty_drawbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL,
  import_entry_number TEXT,
  export_entry_number TEXT,
  product_description TEXT,
  import_date DATE,
  export_date DATE,
  duty_paid NUMERIC(12,2) DEFAULT 0,
  claim_amount NUMERIC(12,2) DEFAULT 0,
  refund_received NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, filed, under_review, approved, paid, denied
  filing_date DATE,
  approval_date DATE,
  payment_date DATE,
  customs_reference TEXT,
  supporting_docs JSONB DEFAULT '[]',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.export_duty_drawbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop isolation for export_duty_drawbacks" ON public.export_duty_drawbacks
  FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 6. Trade Compliance Calendar
CREATE TABLE public.export_compliance_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  compliance_type TEXT NOT NULL, -- license_renewal, certificate_expiry, filing_deadline, inspection, audit, permit
  entity_type TEXT, -- product, shipment, company
  entity_id UUID,
  entity_label TEXT,
  due_date DATE NOT NULL,
  reminder_days INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'upcoming', -- upcoming, due_soon, overdue, completed, cancelled
  priority TEXT DEFAULT 'medium', -- low, medium, high, critical
  authority TEXT,
  reference_number TEXT,
  notes TEXT,
  completed_date DATE,
  completed_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.export_compliance_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop isolation for export_compliance_calendar" ON public.export_compliance_calendar
  FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- 7. Sanctions Screening
CREATE TABLE public.export_sanctions_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  screened_entity TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'customer', -- customer, supplier, bank, individual, vessel
  entity_id UUID,
  screening_date TIMESTAMPTZ DEFAULT now(),
  screening_source TEXT, -- OFAC, EU, UN, BIS
  result TEXT NOT NULL DEFAULT 'clear', -- clear, potential_match, confirmed_match, escalated
  match_details JSONB DEFAULT '[]',
  risk_score NUMERIC(5,2) DEFAULT 0,
  reviewed_by TEXT,
  review_date TIMESTAMPTZ,
  review_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewed, cleared, blocked
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.export_sanctions_screenings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop isolation for export_sanctions_screenings" ON public.export_sanctions_screenings
  FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());
