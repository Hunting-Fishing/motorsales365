-- Phase 4: Reporting and Compliance

-- Create non-profit reporting templates table
CREATE TABLE IF NOT EXISTS public.nonprofit_report_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name text NOT NULL,
  template_type text NOT NULL, -- annual_report, financial_statement, impact_report, tax_filing, grant_report
  description text,
  template_content jsonb NOT NULL DEFAULT '{}',
  required_fields text[] DEFAULT '{}',
  frequency text, -- annual, quarterly, monthly, as_needed
  due_date_calculation text, -- fiscal_year_end, calendar_year_end, custom
  auto_generate boolean DEFAULT false,
  is_active boolean DEFAULT true,
  regulatory_requirement boolean DEFAULT false,
  filing_authority text, -- IRS, state, local, funder_specific
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create donor acknowledgments and receipts table
CREATE TABLE IF NOT EXISTS public.donor_acknowledgments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donation_id uuid REFERENCES public.donations(id) ON DELETE CASCADE,
  donor_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  receipt_number text UNIQUE NOT NULL,
  acknowledgment_type text NOT NULL, -- receipt, thank_you, annual_summary
  template_used text,
  generated_content text,
  pdf_file_path text,
  email_sent boolean DEFAULT false,
  email_sent_at timestamp with time zone,
  mail_sent boolean DEFAULT false,
  mail_sent_at timestamp with time zone,
  tax_deductible_amount numeric(10,2),
  tax_year integer,
  goods_services_value numeric(10,2) DEFAULT 0,
  goods_services_description text,
  acknowledgment_date timestamp with time zone DEFAULT now(),
  personalization_data jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create board members and governance table
CREATE TABLE IF NOT EXISTS public.board_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  position text NOT NULL, -- chair, vice_chair, secretary, treasurer, member
  position_type text, -- executive, non_executive, advisory
  start_date date NOT NULL,
  end_date date,
  term_length integer, -- in months
  is_voting_member boolean DEFAULT true,
  is_active boolean DEFAULT true,
  committee_memberships text[],
  expertise_areas text[],
  background_summary text,
  compensation_amount numeric(10,2) DEFAULT 0,
  compensation_type text, -- none, stipend, expenses_only, consulting_fee
  conflicts_of_interest text,
  background_check_date date,
  orientation_completed boolean DEFAULT false,
  orientation_date date,
  emergency_contact_name text,
  emergency_contact_phone text,
  board_packet_preference text DEFAULT 'email', -- email, mail, portal
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create board meetings table
CREATE TABLE IF NOT EXISTS public.board_meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_type text NOT NULL, -- regular, special, annual, committee
  meeting_date timestamp with time zone NOT NULL,
  location text,
  is_virtual boolean DEFAULT false,
  agenda_items jsonb DEFAULT '[]',
  attendees uuid[] DEFAULT '{}', -- references to board_members
  absent_members uuid[] DEFAULT '{}',
  quorum_met boolean DEFAULT false,
  meeting_minutes text,
  action_items jsonb DEFAULT '[]',
  votes_taken jsonb DEFAULT '[]',
  next_meeting_date timestamp with time zone,
  meeting_packet_sent boolean DEFAULT false,
  minutes_approved boolean DEFAULT false,
  minutes_approved_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create annual filing reminders table
CREATE TABLE IF NOT EXISTS public.annual_filings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filing_name text NOT NULL,
  filing_type text NOT NULL, -- form_990, state_charity_registration, annual_report, tax_return
  filing_authority text NOT NULL, -- IRS, state_charity_office, secretary_of_state
  due_date date NOT NULL,
  extended_due_date date,
  filing_year integer NOT NULL,
  status text DEFAULT 'pending', -- pending, in_progress, filed, overdue, extended
  preparer_name text,
  preparer_contact text,
  cost_estimate numeric(10,2),
  actual_cost numeric(10,2),
  filing_number text,
  confirmation_number text,
  filed_date date,
  supporting_documents text[],
  notes text,
  reminder_schedule jsonb DEFAULT '[]', -- array of reminder dates/sent status
  auto_reminder boolean DEFAULT true,
  priority_level text DEFAULT 'medium', -- low, medium, high, critical
  penalties_for_late_filing text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create governance policies table
CREATE TABLE IF NOT EXISTS public.governance_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_name text NOT NULL,
  policy_type text NOT NULL, -- conflict_of_interest, whistleblower, document_retention, financial
  policy_content text,
  version_number text DEFAULT '1.0',
  effective_date date NOT NULL,
  review_due_date date,
  approval_date date,
  approved_by text,
  board_resolution_number text,
  is_current boolean DEFAULT true,
  requires_annual_acknowledgment boolean DEFAULT false,
  acknowledgment_tracking jsonb DEFAULT '{}', -- track who has acknowledged
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_nonprofit_report_templates_shop_id ON public.nonprofit_report_templates(shop_id);
CREATE INDEX IF NOT EXISTS idx_nonprofit_report_templates_type ON public.nonprofit_report_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_donor_acknowledgments_shop_id ON public.donor_acknowledgments(shop_id);
CREATE INDEX IF NOT EXISTS idx_donor_acknowledgments_donation_id ON public.donor_acknowledgments(donation_id);
CREATE INDEX IF NOT EXISTS idx_board_members_shop_id ON public.board_members(shop_id);
CREATE INDEX IF NOT EXISTS idx_board_members_active ON public.board_members(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_board_meetings_shop_id ON public.board_meetings(shop_id);
CREATE INDEX IF NOT EXISTS idx_board_meetings_date ON public.board_meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_annual_filings_shop_id ON public.annual_filings(shop_id);
CREATE INDEX IF NOT EXISTS idx_annual_filings_due_date ON public.annual_filings(due_date);
CREATE INDEX IF NOT EXISTS idx_annual_filings_status ON public.annual_filings(status);
CREATE INDEX IF NOT EXISTS idx_governance_policies_shop_id ON public.governance_policies(shop_id);
CREATE INDEX IF NOT EXISTS idx_governance_policies_current ON public.governance_policies(is_current) WHERE is_current = true;

-- Add updated_at triggers
CREATE TRIGGER update_nonprofit_report_templates_updated_at
  BEFORE UPDATE ON public.nonprofit_report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_donor_acknowledgments_updated_at
  BEFORE UPDATE ON public.donor_acknowledgments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_board_members_updated_at
  BEFORE UPDATE ON public.board_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_board_meetings_updated_at
  BEFORE UPDATE ON public.board_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_annual_filings_updated_at
  BEFORE UPDATE ON public.annual_filings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_governance_policies_updated_at
  BEFORE UPDATE ON public.governance_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.nonprofit_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for all tables (same pattern)
CREATE POLICY "Users can view nonprofit report templates from their shop" ON public.nonprofit_report_templates
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert nonprofit report templates into their shop" ON public.nonprofit_report_templates
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update nonprofit report templates in their shop" ON public.nonprofit_report_templates
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete nonprofit report templates from their shop" ON public.nonprofit_report_templates
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Similar policies for other tables
CREATE POLICY "Users can view donor acknowledgments from their shop" ON public.donor_acknowledgments
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert donor acknowledgments into their shop" ON public.donor_acknowledgments
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update donor acknowledgments in their shop" ON public.donor_acknowledgments
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete donor acknowledgments from their shop" ON public.donor_acknowledgments
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view board members from their shop" ON public.board_members
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert board members into their shop" ON public.board_members
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update board members in their shop" ON public.board_members
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete board members from their shop" ON public.board_members
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view board meetings from their shop" ON public.board_meetings
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert board meetings into their shop" ON public.board_meetings
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update board meetings in their shop" ON public.board_meetings
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete board meetings from their shop" ON public.board_meetings
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view annual filings from their shop" ON public.annual_filings
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert annual filings into their shop" ON public.annual_filings
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update annual filings in their shop" ON public.annual_filings
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete annual filings from their shop" ON public.annual_filings
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view governance policies from their shop" ON public.governance_policies
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert governance policies into their shop" ON public.governance_policies
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update governance policies in their shop" ON public.governance_policies
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete governance policies from their shop" ON public.governance_policies
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Create storage bucket for document storage
INSERT INTO storage.buckets (id, name, public) VALUES 
('nonprofit-documents', 'nonprofit-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for document uploads
CREATE POLICY "Users can view nonprofit documents from their organization" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'nonprofit-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload nonprofit documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'nonprofit-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their nonprofit documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'nonprofit-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their nonprofit documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'nonprofit-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create functions for automated reminders
CREATE OR REPLACE FUNCTION public.get_upcoming_filing_deadlines(days_ahead integer DEFAULT 30)
RETURNS TABLE (
  filing_id uuid,
  filing_name text,
  due_date date,
  days_until_due integer,
  priority_level text,
  shop_id uuid
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    af.id,
    af.filing_name,
    af.due_date,
    (af.due_date - CURRENT_DATE)::integer as days_until_due,
    af.priority_level,
    af.shop_id
  FROM public.annual_filings af
  WHERE af.status IN ('pending', 'in_progress')
    AND af.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + days_ahead)
  ORDER BY af.due_date ASC;
END;
$$;

-- Function to generate receipt numbers
CREATE OR REPLACE FUNCTION public.generate_receipt_number(shop_id_param uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  year_part text;
  sequence_num integer;
  receipt_num text;
BEGIN
  year_part := EXTRACT(YEAR FROM now())::text;
  
  -- Get next sequence number for this year and shop
  SELECT COALESCE(MAX(
    CASE 
      WHEN receipt_number ~ ('^' || year_part || '-[0-9]+$') 
      THEN CAST(SUBSTRING(receipt_number FROM '^' || year_part || '-([0-9]+)$') AS integer)
      ELSE 0 
    END
  ), 0) + 1
  INTO sequence_num
  FROM public.donor_acknowledgments
  WHERE shop_id = shop_id_param;
  
  receipt_num := year_part || '-' || LPAD(sequence_num::text, 6, '0');
  
  RETURN receipt_num;
END;
$$;