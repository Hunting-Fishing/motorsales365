-- Phase 2: Non-Profit Specific Features

-- Add tax-exempt status to company settings
INSERT INTO public.company_settings (shop_id, settings_key, settings_value) 
SELECT id, 'tax_exempt_status', jsonb_build_object(
  'is_tax_exempt', false,
  'tax_exempt_number', '',
  'exemption_type', '',
  'effective_date', null,
  'expiry_date', null
) FROM shops 
ON CONFLICT (shop_id, settings_key) DO NOTHING;

-- Create donations table
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  donor_name text NOT NULL,
  donor_email text,
  donor_phone text,
  amount numeric(10,2) NOT NULL,
  donation_type text NOT NULL DEFAULT 'monetary', -- monetary, in_kind, volunteer_time
  campaign_id uuid,
  campaign_name text,
  designation text, -- specific program or general fund
  payment_method text,
  transaction_id text,
  receipt_number text UNIQUE,
  is_recurring boolean DEFAULT false,
  recurrence_frequency text, -- monthly, quarterly, annual
  tax_deductible boolean DEFAULT true,
  acknowledgment_sent boolean DEFAULT false,
  acknowledgment_date timestamp with time zone,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create members table (extends customer concept for non-profits)
CREATE TABLE IF NOT EXISTS public.members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  membership_number text UNIQUE,
  membership_type text NOT NULL, -- individual, family, corporate, lifetime
  membership_level text, -- basic, premium, patron
  join_date date NOT NULL DEFAULT CURRENT_DATE,
  renewal_date date,
  expiry_date date,
  status text NOT NULL DEFAULT 'active', -- active, expired, suspended, cancelled
  dues_amount numeric(10,2),
  dues_frequency text, -- annual, monthly, quarterly
  voting_rights boolean DEFAULT true,
  committee_memberships text[],
  volunteer_interests text[],
  skills_offered text[],
  emergency_contact_name text,
  emergency_contact_phone text,
  membership_benefits jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create volunteer hours tracking table
CREATE TABLE IF NOT EXISTS public.volunteer_hours (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  volunteer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  volunteer_name text NOT NULL,
  activity_type text NOT NULL,
  activity_description text,
  program_area text,
  supervisor_name text,
  date_worked date NOT NULL,
  hours_worked numeric(4,2) NOT NULL,
  location text,
  skills_used text[],
  impact_description text,
  verification_status text DEFAULT 'pending', -- pending, verified, rejected
  verified_by text,
  verified_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create grants and funding sources table
CREATE TABLE IF NOT EXISTS public.funding_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name text NOT NULL,
  source_type text NOT NULL, -- grant, donation, government, corporate, foundation
  contact_person text,
  contact_email text,
  contact_phone text,
  amount_awarded numeric(12,2),
  amount_received numeric(12,2) DEFAULT 0,
  award_date date,
  start_date date,
  end_date date,
  reporting_requirements text,
  restrictions text,
  purpose text,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, completed
  application_deadline date,
  reporting_deadline date,
  next_report_due date,
  program_area text,
  notes text,
  documents_required text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_shop_id ON public.donations(shop_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON public.donations(created_at);
CREATE INDEX IF NOT EXISTS idx_members_customer_id ON public.members(customer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_volunteer_id ON public.volunteer_hours(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_shop_id ON public.volunteer_hours(shop_id);
CREATE INDEX IF NOT EXISTS idx_funding_sources_shop_id ON public.funding_sources(shop_id);

-- Add updated_at triggers
CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_volunteer_hours_updated_at
  BEFORE UPDATE ON public.volunteer_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funding_sources_updated_at
  BEFORE UPDATE ON public.funding_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for donations
CREATE POLICY "Users can view donations from their shop" ON public.donations
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert donations into their shop" ON public.donations
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update donations in their shop" ON public.donations
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete donations from their shop" ON public.donations
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for members (same pattern for all tables)
CREATE POLICY "Users can view members from their shop" ON public.members
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can insert members" ON public.members
  FOR INSERT WITH CHECK (customer_id IN (SELECT id FROM customers WHERE shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can update members" ON public.members
  FOR UPDATE USING (customer_id IN (SELECT id FROM customers WHERE shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can delete members" ON public.members
  FOR DELETE USING (customer_id IN (SELECT id FROM customers WHERE shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())));

-- RLS Policies for volunteer hours
CREATE POLICY "Users can view volunteer hours from their shop" ON public.volunteer_hours
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert volunteer hours into their shop" ON public.volunteer_hours
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update volunteer hours in their shop" ON public.volunteer_hours
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete volunteer hours from their shop" ON public.volunteer_hours
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for funding sources
CREATE POLICY "Users can view funding sources from their shop" ON public.funding_sources
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert funding sources into their shop" ON public.funding_sources
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update funding sources in their shop" ON public.funding_sources
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete funding sources from their shop" ON public.funding_sources
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));