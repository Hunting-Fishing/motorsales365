-- Power Washing Service Types
CREATE TABLE public.power_washing_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'residential', -- residential, commercial, specialty
  base_price_per_sqft DECIMAL(10,2),
  minimum_price DECIMAL(10,2),
  estimated_time_minutes INTEGER,
  requires_chemicals BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Power Washing Equipment
CREATE TABLE public.power_washing_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  equipment_type TEXT NOT NULL, -- pressure_washer, surface_cleaner, hose, nozzle, pump
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  psi_rating INTEGER,
  gpm_rating DECIMAL(5,2),
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  condition TEXT DEFAULT 'good', -- excellent, good, fair, poor
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Power Washing Chemicals/Supplies
CREATE TABLE public.power_washing_chemicals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  chemical_type TEXT NOT NULL, -- detergent, degreaser, sanitizer, surfactant, specialty
  brand TEXT,
  dilution_ratio TEXT,
  current_quantity DECIMAL(10,2) DEFAULT 0,
  unit_of_measure TEXT DEFAULT 'gallons',
  reorder_level DECIMAL(10,2),
  cost_per_unit DECIMAL(10,2),
  supplier TEXT,
  safety_notes TEXT,
  sds_url TEXT, -- Safety Data Sheet
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Power Washing Jobs
CREATE TABLE public.power_washing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  job_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  service_id UUID REFERENCES public.power_washing_services(id),
  status TEXT DEFAULT 'pending', -- pending, scheduled, in_progress, completed, cancelled
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  
  -- Property Details
  property_type TEXT, -- house, driveway, deck, roof, commercial, other
  property_address TEXT,
  property_city TEXT,
  property_state TEXT,
  property_zip TEXT,
  square_footage DECIMAL(10,2),
  
  -- Scheduling
  scheduled_date DATE,
  scheduled_time_start TIME,
  scheduled_time_end TIME,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  assigned_crew TEXT[],
  
  -- Pricing
  quoted_price DECIMAL(10,2),
  final_price DECIMAL(10,2),
  deposit_amount DECIMAL(10,2),
  deposit_paid BOOLEAN DEFAULT false,
  
  -- Photos
  before_photos TEXT[],
  after_photos TEXT[],
  
  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,
  special_instructions TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Power Washing Quote Requests (Customer Intake)
CREATE TABLE public.power_washing_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  quote_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, contacted, quoted, accepted, declined
  
  -- Customer Info
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  
  -- Property Details
  property_type TEXT NOT NULL,
  property_address TEXT NOT NULL,
  property_city TEXT,
  property_state TEXT,
  property_zip TEXT,
  estimated_sqft DECIMAL(10,2),
  
  -- Service Request
  services_requested TEXT[],
  preferred_date DATE,
  flexibility TEXT, -- specific_date, flexible, asap
  additional_details TEXT,
  
  -- Photos from customer
  property_photos TEXT[],
  
  -- Quote Response
  quoted_price DECIMAL(10,2),
  quote_notes TEXT,
  quoted_by UUID REFERENCES auth.users(id),
  quoted_at TIMESTAMPTZ,
  valid_until DATE,
  
  -- Conversion
  converted_to_job_id UUID REFERENCES public.power_washing_jobs(id),
  
  source TEXT DEFAULT 'manual', -- manual, website, phone, referral
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.power_washing_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_chemicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for services
CREATE POLICY "Users can view their shop's power washing services"
  ON public.power_washing_services FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their shop's power washing services"
  ON public.power_washing_services FOR ALL
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for equipment
CREATE POLICY "Users can view their shop's power washing equipment"
  ON public.power_washing_equipment FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their shop's power washing equipment"
  ON public.power_washing_equipment FOR ALL
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for chemicals
CREATE POLICY "Users can view their shop's power washing chemicals"
  ON public.power_washing_chemicals FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their shop's power washing chemicals"
  ON public.power_washing_chemicals FOR ALL
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for jobs
CREATE POLICY "Users can view their shop's power washing jobs"
  ON public.power_washing_jobs FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their shop's power washing jobs"
  ON public.power_washing_jobs FOR ALL
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for quotes - allow public insert for website form
CREATE POLICY "Users can view their shop's power washing quotes"
  ON public.power_washing_quotes FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their shop's power washing quotes"
  ON public.power_washing_quotes FOR ALL
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Anyone can submit a quote request"
  ON public.power_washing_quotes FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_pw_jobs_shop_status ON public.power_washing_jobs(shop_id, status);
CREATE INDEX idx_pw_jobs_scheduled_date ON public.power_washing_jobs(scheduled_date);
CREATE INDEX idx_pw_quotes_shop_status ON public.power_washing_quotes(shop_id, status);
CREATE INDEX idx_pw_equipment_shop ON public.power_washing_equipment(shop_id);
CREATE INDEX idx_pw_chemicals_shop ON public.power_washing_chemicals(shop_id);

-- Triggers for updated_at
CREATE TRIGGER update_power_washing_services_updated_at
  BEFORE UPDATE ON public.power_washing_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_power_washing_equipment_updated_at
  BEFORE UPDATE ON public.power_washing_equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_power_washing_chemicals_updated_at
  BEFORE UPDATE ON public.power_washing_chemicals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_power_washing_jobs_updated_at
  BEFORE UPDATE ON public.power_washing_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_power_washing_quotes_updated_at
  BEFORE UPDATE ON public.power_washing_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();