-- Phase 4: Advanced Analytics & Reporting Tables

-- Analytics tracking for nonprofit metrics
CREATE TABLE public.nonprofit_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  metric_type TEXT NOT NULL, -- 'donation', 'volunteer', 'program', 'impact', 'financial'
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant tracking and analytics
CREATE TABLE public.grant_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  grant_id UUID,
  grant_name TEXT NOT NULL,
  funding_source TEXT NOT NULL,
  amount_requested NUMERIC,
  amount_awarded NUMERIC,
  amount_spent NUMERIC DEFAULT 0,
  application_date DATE,
  award_date DATE,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'denied', 'active', 'completed'
  compliance_score NUMERIC DEFAULT 0,
  reporting_requirements JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Impact measurement and tracking
CREATE TABLE public.impact_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  program_id UUID,
  program_name TEXT NOT NULL,
  beneficiary_count INTEGER DEFAULT 0,
  outcome_metrics JSONB DEFAULT '{}', -- custom metrics per program
  success_rate NUMERIC DEFAULT 0,
  cost_per_beneficiary NUMERIC DEFAULT 0,
  measurement_period TEXT NOT NULL, -- 'monthly', 'quarterly', 'yearly'
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Donor analytics and segmentation
CREATE TABLE public.donor_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  donor_id UUID,
  donor_segment TEXT NOT NULL, -- 'major', 'regular', 'recurring', 'lapsed', 'new'
  lifetime_value NUMERIC DEFAULT 0,
  total_donations NUMERIC DEFAULT 0,
  donation_frequency TEXT, -- 'one-time', 'monthly', 'quarterly', 'yearly'
  first_donation_date DATE,
  last_donation_date DATE,
  engagement_score NUMERIC DEFAULT 0,
  retention_probability NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Financial health indicators
CREATE TABLE public.financial_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  reporting_period TEXT NOT NULL, -- 'monthly', 'quarterly', 'yearly'
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Revenue metrics
  total_revenue NUMERIC DEFAULT 0,
  donation_revenue NUMERIC DEFAULT 0,
  grant_revenue NUMERIC DEFAULT 0,
  program_revenue NUMERIC DEFAULT 0,
  other_revenue NUMERIC DEFAULT 0,
  
  -- Expense metrics
  total_expenses NUMERIC DEFAULT 0,
  program_expenses NUMERIC DEFAULT 0,
  administrative_expenses NUMERIC DEFAULT 0,
  fundraising_expenses NUMERIC DEFAULT 0,
  
  -- Ratios and indicators
  program_expense_ratio NUMERIC DEFAULT 0, -- program expenses / total expenses
  fundraising_efficiency NUMERIC DEFAULT 0, -- fundraising revenue / fundraising expenses
  administrative_ratio NUMERIC DEFAULT 0, -- admin expenses / total expenses
  revenue_diversification_score NUMERIC DEFAULT 0,
  financial_stability_score NUMERIC DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.nonprofit_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_health ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for nonprofit_analytics
CREATE POLICY "Users can view analytics from their shop"
ON public.nonprofit_analytics FOR SELECT
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert analytics into their shop"
ON public.nonprofit_analytics FOR INSERT
WITH CHECK (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update analytics in their shop"
ON public.nonprofit_analytics FOR UPDATE
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can delete analytics from their shop"
ON public.nonprofit_analytics FOR DELETE
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

-- Create RLS policies for grant_analytics
CREATE POLICY "Users can view grant analytics from their shop"
ON public.grant_analytics FOR SELECT
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert grant analytics into their shop"
ON public.grant_analytics FOR INSERT
WITH CHECK (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update grant analytics in their shop"
ON public.grant_analytics FOR UPDATE
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can delete grant analytics from their shop"
ON public.grant_analytics FOR DELETE
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

-- Create RLS policies for impact_metrics
CREATE POLICY "Users can view impact metrics from their shop"
ON public.impact_metrics FOR SELECT
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert impact metrics into their shop"
ON public.impact_metrics FOR INSERT
WITH CHECK (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update impact metrics in their shop"
ON public.impact_metrics FOR UPDATE
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can delete impact metrics from their shop"
ON public.impact_metrics FOR DELETE
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

-- Create RLS policies for donor_analytics
CREATE POLICY "Users can view donor analytics from their shop"
ON public.donor_analytics FOR SELECT
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert donor analytics into their shop"
ON public.donor_analytics FOR INSERT
WITH CHECK (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update donor analytics in their shop"
ON public.donor_analytics FOR UPDATE
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can delete donor analytics from their shop"
ON public.donor_analytics FOR DELETE
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

-- Create RLS policies for financial_health
CREATE POLICY "Users can view financial health from their shop"
ON public.financial_health FOR SELECT
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert financial health into their shop"
ON public.financial_health FOR INSERT
WITH CHECK (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update financial health in their shop"
ON public.financial_health FOR UPDATE
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can delete financial health from their shop"
ON public.financial_health FOR DELETE
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_nonprofit_analytics_shop_id ON public.nonprofit_analytics(shop_id);
CREATE INDEX idx_nonprofit_analytics_metric_type ON public.nonprofit_analytics(metric_type);
CREATE INDEX idx_nonprofit_analytics_period ON public.nonprofit_analytics(period_start, period_end);

CREATE INDEX idx_grant_analytics_shop_id ON public.grant_analytics(shop_id);
CREATE INDEX idx_grant_analytics_status ON public.grant_analytics(status);
CREATE INDEX idx_grant_analytics_dates ON public.grant_analytics(start_date, end_date);

CREATE INDEX idx_impact_metrics_shop_id ON public.impact_metrics(shop_id);
CREATE INDEX idx_impact_metrics_program ON public.impact_metrics(program_id);
CREATE INDEX idx_impact_metrics_period ON public.impact_metrics(period_start, period_end);

CREATE INDEX idx_donor_analytics_shop_id ON public.donor_analytics(shop_id);
CREATE INDEX idx_donor_analytics_segment ON public.donor_analytics(donor_segment);
CREATE INDEX idx_donor_analytics_donor ON public.donor_analytics(donor_id);

CREATE INDEX idx_financial_health_shop_id ON public.financial_health(shop_id);
CREATE INDEX idx_financial_health_period ON public.financial_health(period_start, period_end);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_nonprofit_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_grant_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_impact_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_donor_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_financial_health_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_nonprofit_analytics_updated_at
BEFORE UPDATE ON public.nonprofit_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_nonprofit_analytics_updated_at();

CREATE TRIGGER update_grant_analytics_updated_at
BEFORE UPDATE ON public.grant_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_grant_analytics_updated_at();

CREATE TRIGGER update_impact_metrics_updated_at
BEFORE UPDATE ON public.impact_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_impact_metrics_updated_at();

CREATE TRIGGER update_donor_analytics_updated_at
BEFORE UPDATE ON public.donor_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_donor_analytics_updated_at();

CREATE TRIGGER update_financial_health_updated_at
BEFORE UPDATE ON public.financial_health
FOR EACH ROW
EXECUTE FUNCTION public.update_financial_health_updated_at();