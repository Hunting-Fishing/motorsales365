-- Create donations table for tracking financial contributions
CREATE TABLE public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT,
  amount NUMERIC(10,2) NOT NULL,
  donation_type TEXT NOT NULL DEFAULT 'one-time', -- 'one-time', 'monthly', 'yearly'
  payment_method TEXT, -- 'credit_card', 'bank_transfer', 'cash', 'check'
  campaign_id UUID,
  program_id UUID,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  message TEXT,
  donation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  shop_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Create policies for donations
CREATE POLICY "Users can view donations from their shop" 
ON public.donations 
FOR SELECT 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can create donations for their shop" 
ON public.donations 
FOR INSERT 
WITH CHECK (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update donations in their shop" 
ON public.donations 
FOR UPDATE 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete donations from their shop" 
ON public.donations 
FOR DELETE 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create grant_analytics table
CREATE TABLE public.grant_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grant_name TEXT NOT NULL,
  grant_amount NUMERIC(10,2) NOT NULL,
  awarded_date DATE,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'applied', -- 'applied', 'awarded', 'rejected', 'completed'
  funding_organization TEXT,
  purpose TEXT,
  compliance_status TEXT DEFAULT 'on-track', -- 'on-track', 'at-risk', 'non-compliant'
  funds_received NUMERIC(10,2) DEFAULT 0,
  funds_spent NUMERIC(10,2) DEFAULT 0,
  reporting_requirements JSONB DEFAULT '[]'::jsonb,
  next_report_due DATE,
  shop_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grant_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for grant_analytics
CREATE POLICY "Users can view grant analytics from their shop" 
ON public.grant_analytics 
FOR SELECT 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can create grant analytics for their shop" 
ON public.grant_analytics 
FOR INSERT 
WITH CHECK (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update grant analytics in their shop" 
ON public.grant_analytics 
FOR UPDATE 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete grant analytics from their shop" 
ON public.grant_analytics 
FOR DELETE 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create donor_analytics table
CREATE TABLE public.donor_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_name TEXT NOT NULL,
  donor_email TEXT UNIQUE,
  donor_phone TEXT,
  total_donated NUMERIC(10,2) NOT NULL DEFAULT 0,
  donation_count INTEGER NOT NULL DEFAULT 0,
  first_donation_date TIMESTAMP WITH TIME ZONE,
  last_donation_date TIMESTAMP WITH TIME ZONE,
  average_donation NUMERIC(10,2) DEFAULT 0,
  donor_segment TEXT DEFAULT 'new', -- 'new', 'regular', 'major', 'lapsed'
  preferred_communication TEXT DEFAULT 'email', -- 'email', 'phone', 'mail', 'none'
  notes TEXT,
  shop_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donor_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for donor_analytics
CREATE POLICY "Users can view donor analytics from their shop" 
ON public.donor_analytics 
FOR SELECT 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can create donor analytics for their shop" 
ON public.donor_analytics 
FOR INSERT 
WITH CHECK (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update donor analytics in their shop" 
ON public.donor_analytics 
FOR UPDATE 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete donor analytics from their shop" 
ON public.donor_analytics 
FOR DELETE 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create financial_health table
CREATE TABLE public.financial_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_expenses NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_income NUMERIC(10,2) NOT NULL DEFAULT 0,
  operating_ratio NUMERIC(5,4) DEFAULT 0, -- operating expenses / total revenue
  program_expense_ratio NUMERIC(5,4) DEFAULT 0, -- program expenses / total expenses
  fundraising_efficiency NUMERIC(5,4) DEFAULT 0, -- fundraising costs / donations raised
  months_of_operating_reserve INTEGER DEFAULT 0,
  debt_to_asset_ratio NUMERIC(5,4) DEFAULT 0,
  current_assets NUMERIC(10,2) DEFAULT 0,
  current_liabilities NUMERIC(10,2) DEFAULT 0,
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  shop_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_health ENABLE ROW LEVEL SECURITY;

-- Create policies for financial_health
CREATE POLICY "Users can view financial health from their shop" 
ON public.financial_health 
FOR SELECT 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can create financial health for their shop" 
ON public.financial_health 
FOR INSERT 
WITH CHECK (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update financial health in their shop" 
ON public.financial_health 
FOR UPDATE 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete financial health from their shop" 
ON public.financial_health 
FOR DELETE 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create success_stories table
CREATE TABLE public.success_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  beneficiary_name TEXT,
  program_id UUID,
  impact_measurement_id UUID,
  image_url TEXT,
  date_achieved DATE NOT NULL DEFAULT CURRENT_DATE,
  metrics JSONB DEFAULT '{}'::jsonb,
  is_featured BOOLEAN DEFAULT false,
  shop_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;

-- Create policies for success_stories
CREATE POLICY "Users can view success stories from their shop" 
ON public.success_stories 
FOR SELECT 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can create success stories for their shop" 
ON public.success_stories 
FOR INSERT 
WITH CHECK (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update success stories in their shop" 
ON public.success_stories 
FOR UPDATE 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete success stories from their shop" 
ON public.success_stories 
FOR DELETE 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON public.donations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_grant_analytics_updated_at BEFORE UPDATE ON public.grant_analytics FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_donor_analytics_updated_at BEFORE UPDATE ON public.donor_analytics FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_financial_health_updated_at BEFORE UPDATE ON public.financial_health FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_success_stories_updated_at BEFORE UPDATE ON public.success_stories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();