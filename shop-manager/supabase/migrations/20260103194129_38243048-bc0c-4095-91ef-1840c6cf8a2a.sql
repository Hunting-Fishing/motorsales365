-- Power Washing Payments
CREATE TABLE public.power_washing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.power_washing_invoices(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.power_washing_jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'completed',
  reference_number TEXT,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Power Washing Schedule Slots
CREATE TABLE public.power_washing_schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_type TEXT NOT NULL DEFAULT 'available',
  job_id UUID REFERENCES public.power_washing_jobs(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Power Washing Employee Availability
CREATE TABLE public.power_washing_employee_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Power Washing Leads
CREATE TABLE public.power_washing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  property_address TEXT,
  property_city TEXT,
  property_state TEXT,
  property_zip TEXT,
  lead_source TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES public.profiles(id),
  follow_up_date DATE,
  estimated_value DECIMAL(10,2),
  notes TEXT,
  converted_to_quote_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Power Washing Campaigns
CREATE TABLE public.power_washing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(10,2),
  actual_spend DECIMAL(10,2) DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Power Washing Vehicles
CREATE TABLE public.power_washing_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  vehicle_name TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  vin TEXT,
  license_plate TEXT,
  fuel_type TEXT DEFAULT 'gasoline',
  assigned_employee_id UUID REFERENCES public.profiles(id),
  current_odometer INTEGER,
  last_service_date DATE,
  next_service_due DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Power Washing Vehicle Logs
CREATE TABLE public.power_washing_vehicle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.power_washing_vehicles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  log_type TEXT NOT NULL DEFAULT 'mileage',
  odometer_reading INTEGER,
  gallons DECIMAL(10,2),
  fuel_cost DECIMAL(10,2),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.power_washing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_vehicle_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage power washing payments in their shop" ON public.power_washing_payments FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage schedule slots in their shop" ON public.power_washing_schedule_slots FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage employee availability in their shop" ON public.power_washing_employee_availability FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage leads in their shop" ON public.power_washing_leads FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage campaigns in their shop" ON public.power_washing_campaigns FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage vehicles in their shop" ON public.power_washing_vehicles FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage vehicle logs in their shop" ON public.power_washing_vehicle_logs FOR ALL USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));