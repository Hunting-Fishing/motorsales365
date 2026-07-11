-- Phase 1: Database Foundation - Create Missing Core Tables for Nonprofit System

-- Create nonprofit_programs table
CREATE TABLE public.nonprofit_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  program_type TEXT NOT NULL CHECK (program_type IN ('education', 'health', 'environment', 'community', 'youth', 'seniors', 'other')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'planned')),
  start_date DATE,
  end_date DATE,
  budget_allocated NUMERIC DEFAULT 0,
  budget_spent NUMERIC DEFAULT 0,
  target_participants INTEGER DEFAULT 0,
  current_participants INTEGER DEFAULT 0,
  location TEXT,
  coordinator_id UUID,
  shop_id UUID NOT NULL,
  grant_funded BOOLEAN DEFAULT false,
  funding_sources TEXT[] DEFAULT '{}',
  success_metrics TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create program_beneficiaries table
CREATE TABLE public.program_beneficiaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.nonprofit_programs(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  participant_email TEXT,
  participant_phone TEXT,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_date DATE,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'active', 'completed', 'dropped', 'suspended')),
  progress_notes TEXT,
  outcome_data JSONB DEFAULT '{}',
  demographics JSONB DEFAULT '{}',
  shop_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create nonprofit_program_volunteers table (many-to-many relationship)
CREATE TABLE public.nonprofit_program_volunteers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  volunteer_id UUID NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.nonprofit_programs(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  hours_committed INTEGER DEFAULT 0,
  hours_completed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  shop_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(volunteer_id, program_id)
);

-- Create nonprofit_members table
CREATE TABLE public.nonprofit_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  membership_type TEXT NOT NULL DEFAULT 'regular' CHECK (membership_type IN ('regular', 'premium', 'lifetime', 'board', 'honorary')),
  membership_status TEXT NOT NULL DEFAULT 'active' CHECK (membership_status IN ('active', 'inactive', 'suspended', 'expired')),
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  renewal_date DATE,
  annual_dues NUMERIC DEFAULT 0,
  dues_paid BOOLEAN DEFAULT false,
  committee_memberships TEXT[] DEFAULT '{}',
  volunteer_interests TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  notes TEXT,
  shop_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create donation_transactions table
CREATE TABLE public.donation_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT,
  donor_address TEXT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  donation_type TEXT NOT NULL DEFAULT 'monetary' CHECK (donation_type IN ('monetary', 'in_kind', 'goods', 'services')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'check', 'credit_card', 'bank_transfer', 'paypal', 'other')),
  transaction_id TEXT,
  program_id UUID REFERENCES public.nonprofit_programs(id),
  designation TEXT, -- specific fund or purpose
  is_recurring BOOLEAN DEFAULT false,
  recurrence_frequency TEXT CHECK (recurrence_frequency IN ('weekly', 'monthly', 'quarterly', 'annually')),
  tax_deductible BOOLEAN DEFAULT true,
  receipt_sent BOOLEAN DEFAULT false,
  receipt_number TEXT,
  anonymous BOOLEAN DEFAULT false,
  notes TEXT,
  donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shop_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create impact_measurements table for tracking program outcomes
CREATE TABLE public.impact_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.nonprofit_programs(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  measurement_unit TEXT,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  measurement_period TEXT, -- e.g., 'Q1 2024', 'Monthly', etc.
  notes TEXT,
  verified_by UUID,
  verification_date DATE,
  shop_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.nonprofit_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nonprofit_program_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nonprofit_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_measurements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for nonprofit_programs
CREATE POLICY "Users can view programs from their shop" ON public.nonprofit_programs
  FOR SELECT USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert programs into their shop" ON public.nonprofit_programs
  FOR INSERT WITH CHECK (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update programs in their shop" ON public.nonprofit_programs
  FOR UPDATE USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete programs from their shop" ON public.nonprofit_programs
  FOR DELETE USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create RLS policies for program_beneficiaries
CREATE POLICY "Users can view beneficiaries from their shop" ON public.program_beneficiaries
  FOR SELECT USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert beneficiaries into their shop" ON public.program_beneficiaries
  FOR INSERT WITH CHECK (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update beneficiaries in their shop" ON public.program_beneficiaries
  FOR UPDATE USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete beneficiaries from their shop" ON public.program_beneficiaries
  FOR DELETE USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create RLS policies for nonprofit_program_volunteers
CREATE POLICY "Users can view program volunteers from their shop" ON public.nonprofit_program_volunteers
  FOR SELECT USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert program volunteers into their shop" ON public.nonprofit_program_volunteers
  FOR INSERT WITH CHECK (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update program volunteers in their shop" ON public.nonprofit_program_volunteers
  FOR UPDATE USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete program volunteers from their shop" ON public.nonprofit_program_volunteers
  FOR DELETE USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create RLS policies for nonprofit_members
CREATE POLICY "Users can view members from their shop" ON public.nonprofit_members
  FOR SELECT USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert members into their shop" ON public.nonprofit_members
  FOR INSERT WITH CHECK (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update members in their shop" ON public.nonprofit_members
  FOR UPDATE USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete members from their shop" ON public.nonprofit_members
  FOR DELETE USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create RLS policies for donation_transactions
CREATE POLICY "Users can view donations from their shop" ON public.donation_transactions
  FOR SELECT USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert donations into their shop" ON public.donation_transactions
  FOR INSERT WITH CHECK (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update donations in their shop" ON public.donation_transactions
  FOR UPDATE USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete donations from their shop" ON public.donation_transactions
  FOR DELETE USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create RLS policies for impact_measurements
CREATE POLICY "Users can view impact measurements from their shop" ON public.impact_measurements
  FOR SELECT USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert impact measurements into their shop" ON public.impact_measurements
  FOR INSERT WITH CHECK (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update impact measurements in their shop" ON public.impact_measurements
  FOR UPDATE USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete impact measurements from their shop" ON public.impact_measurements
  FOR DELETE USING (shop_id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_nonprofit_programs_shop_id ON public.nonprofit_programs(shop_id);
CREATE INDEX idx_nonprofit_programs_status ON public.nonprofit_programs(status);
CREATE INDEX idx_nonprofit_programs_program_type ON public.nonprofit_programs(program_type);

CREATE INDEX idx_program_beneficiaries_program_id ON public.program_beneficiaries(program_id);
CREATE INDEX idx_program_beneficiaries_shop_id ON public.program_beneficiaries(shop_id);
CREATE INDEX idx_program_beneficiaries_status ON public.program_beneficiaries(status);

CREATE INDEX idx_nonprofit_program_volunteers_volunteer_id ON public.nonprofit_program_volunteers(volunteer_id);
CREATE INDEX idx_nonprofit_program_volunteers_program_id ON public.nonprofit_program_volunteers(program_id);
CREATE INDEX idx_nonprofit_program_volunteers_shop_id ON public.nonprofit_program_volunteers(shop_id);

CREATE INDEX idx_nonprofit_members_shop_id ON public.nonprofit_members(shop_id);
CREATE INDEX idx_nonprofit_members_membership_status ON public.nonprofit_members(membership_status);
CREATE INDEX idx_nonprofit_members_email ON public.nonprofit_members(email);

CREATE INDEX idx_donation_transactions_shop_id ON public.donation_transactions(shop_id);
CREATE INDEX idx_donation_transactions_program_id ON public.donation_transactions(program_id);
CREATE INDEX idx_donation_transactions_donation_date ON public.donation_transactions(donation_date);
CREATE INDEX idx_donation_transactions_amount ON public.donation_transactions(amount);

CREATE INDEX idx_impact_measurements_program_id ON public.impact_measurements(program_id);
CREATE INDEX idx_impact_measurements_shop_id ON public.impact_measurements(shop_id);
CREATE INDEX idx_impact_measurements_measurement_date ON public.impact_measurements(measurement_date);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_nonprofit_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nonprofit_programs_updated_at
  BEFORE UPDATE ON public.nonprofit_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nonprofit_tables_updated_at();

CREATE TRIGGER update_program_beneficiaries_updated_at
  BEFORE UPDATE ON public.program_beneficiaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nonprofit_tables_updated_at();

CREATE TRIGGER update_nonprofit_program_volunteers_updated_at
  BEFORE UPDATE ON public.nonprofit_program_volunteers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nonprofit_tables_updated_at();

CREATE TRIGGER update_nonprofit_members_updated_at
  BEFORE UPDATE ON public.nonprofit_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nonprofit_tables_updated_at();

CREATE TRIGGER update_donation_transactions_updated_at
  BEFORE UPDATE ON public.donation_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nonprofit_tables_updated_at();

CREATE TRIGGER update_impact_measurements_updated_at
  BEFORE UPDATE ON public.impact_measurements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nonprofit_tables_updated_at();