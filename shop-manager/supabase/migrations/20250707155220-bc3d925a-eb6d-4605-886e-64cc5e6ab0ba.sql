-- Phase 5: Complete Non-Profit Management System - Tables Only

-- Create grants management table
CREATE TABLE IF NOT EXISTS public.grants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grant_name text NOT NULL,
  funder_name text NOT NULL,
  funder_contact_name text,
  funder_email text,
  funder_phone text,
  grant_type text NOT NULL, -- federal, state, foundation, corporate, individual
  program_area text, -- education, health, environment, etc
  grant_amount numeric(12,2) NOT NULL,
  awarded_amount numeric(12,2),
  application_deadline date,
  project_start_date date,
  project_end_date date,
  reporting_requirements text,
  status text NOT NULL DEFAULT 'prospect', -- prospect, applied, awarded, rejected, completed
  application_submitted_date date,
  award_notification_date date,
  grant_agreement_signed_date date,
  final_report_due_date date,
  matching_requirement numeric(10,2) DEFAULT 0,
  matching_secured numeric(10,2) DEFAULT 0,
  indirect_rate numeric(5,2) DEFAULT 0,
  restrictions text,
  purpose_description text,
  expected_outcomes text,
  reporting_schedule text, -- monthly, quarterly, annually
  contact_person text,
  notes text,
  attachments jsonb DEFAULT '[]',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create grant reports table
CREATE TABLE IF NOT EXISTS public.grant_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grant_id uuid NOT NULL REFERENCES public.grants(id) ON DELETE CASCADE,
  report_type text NOT NULL, -- progress, financial, final
  reporting_period_start date NOT NULL,
  reporting_period_end date NOT NULL,
  due_date date NOT NULL,
  submitted_date date,
  status text NOT NULL DEFAULT 'draft', -- draft, submitted, approved, revision_requested
  expenditures_amount numeric(10,2) DEFAULT 0,
  remaining_balance numeric(10,2),
  activities_summary text,
  outcomes_achieved text,
  challenges_encountered text,
  upcoming_activities text,
  attachments jsonb DEFAULT '[]',
  reviewer_comments text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create volunteers management table
CREATE TABLE IF NOT EXISTS public.volunteers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  date_of_birth date,
  skills text[],
  interests text[],
  availability text, -- weekdays, evenings, weekends, flexible
  preferred_roles text[],
  background_check_status text DEFAULT 'pending', -- pending, approved, denied, expired
  background_check_date date,
  orientation_completed boolean DEFAULT false,
  orientation_date date,
  volunteer_agreement_signed boolean DEFAULT false,
  volunteer_agreement_date date,
  status text NOT NULL DEFAULT 'active', -- active, inactive, suspended
  start_date date DEFAULT CURRENT_DATE,
  total_hours_logged numeric(8,2) DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create volunteer hours tracking table
CREATE TABLE IF NOT EXISTS public.volunteer_hours (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  volunteer_id uuid NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  hours_worked numeric(4,2) NOT NULL,
  activity_description text NOT NULL,
  program_area text,
  supervisor_name text,
  location text,
  approved boolean DEFAULT false,
  approved_by text,
  approved_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create fundraising campaigns table
CREATE TABLE IF NOT EXISTS public.fundraising_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_name text NOT NULL,
  campaign_type text NOT NULL, -- annual_appeal, capital_campaign, special_event, peer_to_peer, crowdfunding
  description text,
  goal_amount numeric(12,2) NOT NULL,
  raised_amount numeric(12,2) DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'planning', -- planning, active, completed, cancelled
  campaign_manager text,
  target_audience text, -- board_members, major_donors, general_public, corporations
  marketing_channels text[], -- email, social_media, direct_mail, events, website
  budget_allocated numeric(10,2),
  expenses_incurred numeric(10,2) DEFAULT 0,
  donor_count integer DEFAULT 0,
  average_gift_amount numeric(8,2) DEFAULT 0,
  success_metrics jsonb DEFAULT '{}',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create program management table
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_name text NOT NULL,
  program_type text NOT NULL, -- direct_service, advocacy, education, research
  description text,
  mission_alignment text,
  target_population text,
  geographic_scope text, -- local, regional, national, international
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active', -- planning, active, completed, suspended
  program_manager text,
  annual_budget numeric(10,2),
  funding_sources text[],
  staff_count integer DEFAULT 0,
  volunteer_count integer DEFAULT 0,
  participants_served integer DEFAULT 0,
  outcomes_measured text[],
  success_metrics jsonb DEFAULT '{}',
  evaluation_methods text,
  reporting_requirements text,
  compliance_requirements text[],
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create program participants table
CREATE TABLE IF NOT EXISTS public.program_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  participant_name text NOT NULL,
  enrollment_date date NOT NULL DEFAULT CURRENT_DATE,
  completion_date date,
  status text NOT NULL DEFAULT 'enrolled', -- enrolled, active, completed, withdrawn
  demographic_data jsonb DEFAULT '{}',
  intake_notes text,
  progress_notes text,
  outcomes_achieved text[],
  satisfaction_score integer, -- 1-10 scale
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create impact measurement table
CREATE TABLE IF NOT EXISTS public.impact_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name text NOT NULL,
  metric_type text NOT NULL, -- output, outcome, impact
  description text,
  measurement_unit text NOT NULL, -- people_served, hours_provided, dollars_saved, etc
  target_value numeric(12,2),
  current_value numeric(12,2) DEFAULT 0,
  measurement_period text NOT NULL, -- monthly, quarterly, annually
  data_source text,
  collection_method text,
  responsible_person text,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  baseline_value numeric(12,2),
  baseline_date date,
  last_measured_date date,
  next_measurement_date date,
  trend_direction text, -- improving, declining, stable
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create events management table
CREATE TABLE IF NOT EXISTS public.nonprofit_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name text NOT NULL,
  event_type text NOT NULL, -- fundraising_gala, volunteer_appreciation, board_meeting, program_event, community_outreach
  description text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  location text,
  is_virtual boolean DEFAULT false,
  capacity integer,
  registered_count integer DEFAULT 0,
  attended_count integer DEFAULT 0,
  target_audience text,
  registration_required boolean DEFAULT true,
  registration_deadline date,
  registration_fee numeric(8,2) DEFAULT 0,
  total_revenue numeric(10,2) DEFAULT 0,
  total_expenses numeric(10,2) DEFAULT 0,
  event_manager text,
  volunteer_coordinator text,
  marketing_plan text,
  logistics_notes text,
  status text NOT NULL DEFAULT 'planning', -- planning, registration_open, in_progress, completed, cancelled
  follow_up_required boolean DEFAULT false,
  success_metrics jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_grants_shop_id ON public.grants(shop_id);
CREATE INDEX IF NOT EXISTS idx_grants_status ON public.grants(status);
CREATE INDEX IF NOT EXISTS idx_grants_deadline ON public.grants(application_deadline);
CREATE INDEX IF NOT EXISTS idx_grant_reports_grant_id ON public.grant_reports(grant_id);
CREATE INDEX IF NOT EXISTS idx_grant_reports_due_date ON public.grant_reports(due_date);
CREATE INDEX IF NOT EXISTS idx_volunteers_shop_id ON public.volunteers(shop_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON public.volunteers(status);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_volunteer_id ON public.volunteer_hours(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_date ON public.volunteer_hours(activity_date);
CREATE INDEX IF NOT EXISTS idx_fundraising_campaigns_shop_id ON public.fundraising_campaigns(shop_id);
CREATE INDEX IF NOT EXISTS idx_fundraising_campaigns_dates ON public.fundraising_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_programs_shop_id ON public.programs(shop_id);
CREATE INDEX IF NOT EXISTS idx_programs_status ON public.programs(status);
CREATE INDEX IF NOT EXISTS idx_program_participants_program_id ON public.program_participants(program_id);
CREATE INDEX IF NOT EXISTS idx_impact_metrics_shop_id ON public.impact_metrics(shop_id);
CREATE INDEX IF NOT EXISTS idx_impact_metrics_program_id ON public.impact_metrics(program_id);
CREATE INDEX IF NOT EXISTS idx_nonprofit_events_shop_id ON public.nonprofit_events(shop_id);
CREATE INDEX IF NOT EXISTS idx_nonprofit_events_dates ON public.nonprofit_events(start_date, end_date);

-- Add updated_at triggers
CREATE TRIGGER update_grants_updated_at
  BEFORE UPDATE ON public.grants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grant_reports_updated_at
  BEFORE UPDATE ON public.grant_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_volunteers_updated_at
  BEFORE UPDATE ON public.volunteers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_volunteer_hours_updated_at
  BEFORE UPDATE ON public.volunteer_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fundraising_campaigns_updated_at
  BEFORE UPDATE ON public.fundraising_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON public.programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_program_participants_updated_at
  BEFORE UPDATE ON public.program_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_impact_metrics_updated_at
  BEFORE UPDATE ON public.impact_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nonprofit_events_updated_at
  BEFORE UPDATE ON public.nonprofit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraising_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nonprofit_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grants
CREATE POLICY "Users can view grants from their shop" ON public.grants
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert grants into their shop" ON public.grants
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update grants in their shop" ON public.grants
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete grants from their shop" ON public.grants
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for grant_reports
CREATE POLICY "Users can view grant reports from their shop" ON public.grant_reports
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert grant reports into their shop" ON public.grant_reports
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update grant reports in their shop" ON public.grant_reports
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete grant reports from their shop" ON public.grant_reports
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for volunteers
CREATE POLICY "Users can view volunteers from their shop" ON public.volunteers
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert volunteers into their shop" ON public.volunteers
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update volunteers in their shop" ON public.volunteers
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete volunteers from their shop" ON public.volunteers
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for volunteer_hours
CREATE POLICY "Users can view volunteer hours from their shop" ON public.volunteer_hours
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert volunteer hours into their shop" ON public.volunteer_hours
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update volunteer hours in their shop" ON public.volunteer_hours
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete volunteer hours from their shop" ON public.volunteer_hours
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for fundraising_campaigns
CREATE POLICY "Users can view fundraising campaigns from their shop" ON public.fundraising_campaigns
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert fundraising campaigns into their shop" ON public.fundraising_campaigns
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update fundraising campaigns in their shop" ON public.fundraising_campaigns
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete fundraising campaigns from their shop" ON public.fundraising_campaigns
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for programs
CREATE POLICY "Users can view programs from their shop" ON public.programs
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert programs into their shop" ON public.programs
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update programs in their shop" ON public.programs
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete programs from their shop" ON public.programs
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for program_participants
CREATE POLICY "Users can view program participants from their shop" ON public.program_participants
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert program participants into their shop" ON public.program_participants
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update program participants in their shop" ON public.program_participants
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete program participants from their shop" ON public.program_participants
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for impact_metrics
CREATE POLICY "Users can view impact metrics from their shop" ON public.impact_metrics
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert impact metrics into their shop" ON public.impact_metrics
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update impact metrics in their shop" ON public.impact_metrics
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete impact metrics from their shop" ON public.impact_metrics
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for nonprofit_events
CREATE POLICY "Users can view nonprofit events from their shop" ON public.nonprofit_events
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert nonprofit events into their shop" ON public.nonprofit_events
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update nonprofit events in their shop" ON public.nonprofit_events
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete nonprofit events from their shop" ON public.nonprofit_events
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));