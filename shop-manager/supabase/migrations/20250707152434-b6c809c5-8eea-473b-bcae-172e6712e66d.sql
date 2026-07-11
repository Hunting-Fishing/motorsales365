-- Phase 3: Hybrid Model Support

-- Create dual-purpose activity tracking
CREATE TABLE IF NOT EXISTS public.hybrid_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_name text NOT NULL,
  activity_type text NOT NULL, -- 'for_profit', 'non_profit', 'mixed'
  description text,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active', -- active, completed, cancelled
  for_profit_percentage numeric(5,2) DEFAULT 0, -- 0-100
  non_profit_percentage numeric(5,2) DEFAULT 100, -- 0-100
  revenue_for_profit numeric(12,2) DEFAULT 0,
  revenue_non_profit numeric(12,2) DEFAULT 0,
  expenses_for_profit numeric(12,2) DEFAULT 0,
  expenses_non_profit numeric(12,2) DEFAULT 0,
  participants_count integer DEFAULT 0,
  beneficiaries_count integer DEFAULT 0,
  volunteer_hours numeric(8,2) DEFAULT 0,
  impact_metrics jsonb DEFAULT '{}',
  compliance_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create separate accounting streams table
CREATE TABLE IF NOT EXISTS public.accounting_streams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_type text NOT NULL, -- 'for_profit', 'non_profit'
  account_code text NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL, -- asset, liability, equity, revenue, expense
  parent_account_id uuid REFERENCES public.accounting_streams(id),
  is_active boolean DEFAULT true,
  requires_segregation boolean DEFAULT false, -- for hybrid tracking
  tax_treatment text, -- taxable, tax_exempt, mixed
  reporting_category text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  shop_id uuid NOT NULL
);

-- Create impact measurement table
CREATE TABLE IF NOT EXISTS public.impact_measurements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  measurement_name text NOT NULL,
  measurement_type text NOT NULL, -- quantitative, qualitative
  category text NOT NULL, -- social, environmental, economic
  unit_of_measure text, -- people, hours, dollars, etc.
  target_value numeric(12,2),
  current_value numeric(12,2) DEFAULT 0,
  measurement_period text, -- monthly, quarterly, annual
  data_source text,
  verification_method text,
  last_measured_date date,
  next_measurement_date date,
  baseline_value numeric(12,2),
  baseline_date date,
  notes text,
  is_active boolean DEFAULT true,
  related_activity_id uuid REFERENCES public.hybrid_activities(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create compliance tracking table
CREATE TABLE IF NOT EXISTS public.compliance_requirements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requirement_name text NOT NULL,
  requirement_type text NOT NULL, -- legal, regulatory, voluntary
  applicable_to text NOT NULL, -- for_profit, non_profit, both
  description text,
  frequency text NOT NULL, -- daily, weekly, monthly, quarterly, annual, one_time
  due_date date,
  completion_status text DEFAULT 'pending', -- pending, in_progress, completed, overdue
  responsible_person text,
  documentation_required text[],
  penalties_for_non_compliance text,
  cost_to_comply numeric(10,2),
  last_compliance_date date,
  next_due_date date,
  auto_renew boolean DEFAULT false,
  priority_level text DEFAULT 'medium', -- low, medium, high, critical
  notes text,
  attachments jsonb DEFAULT '[]',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  shop_id uuid NOT NULL
);

-- Create transaction allocation table for hybrid accounting
CREATE TABLE IF NOT EXISTS public.transaction_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL, -- references to invoices, work_orders, etc.
  transaction_type text NOT NULL, -- invoice, work_order, expense, donation
  for_profit_amount numeric(12,2) DEFAULT 0,
  non_profit_amount numeric(12,2) DEFAULT 0,
  allocation_method text NOT NULL, -- percentage, activity_based, time_based, direct
  allocation_percentage_profit numeric(5,2), -- 0-100
  allocation_percentage_nonprofit numeric(5,2), -- 0-100
  allocation_basis text, -- description of allocation method
  allocated_by text NOT NULL,
  allocation_date timestamp with time zone DEFAULT now(),
  notes text,
  is_final boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  shop_id uuid NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hybrid_activities_shop_id ON public.hybrid_activities(shop_id);
CREATE INDEX IF NOT EXISTS idx_hybrid_activities_type ON public.hybrid_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_accounting_streams_shop_id ON public.accounting_streams(shop_id);
CREATE INDEX IF NOT EXISTS idx_accounting_streams_type ON public.accounting_streams(stream_type);
CREATE INDEX IF NOT EXISTS idx_impact_measurements_shop_id ON public.impact_measurements(shop_id);
CREATE INDEX IF NOT EXISTS idx_impact_measurements_activity ON public.impact_measurements(related_activity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_shop_id ON public.compliance_requirements(shop_id);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_due_date ON public.compliance_requirements(due_date);
CREATE INDEX IF NOT EXISTS idx_transaction_allocations_shop_id ON public.transaction_allocations(shop_id);
CREATE INDEX IF NOT EXISTS idx_transaction_allocations_transaction ON public.transaction_allocations(transaction_id, transaction_type);

-- Add updated_at triggers
CREATE TRIGGER update_hybrid_activities_updated_at
  BEFORE UPDATE ON public.hybrid_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounting_streams_updated_at
  BEFORE UPDATE ON public.accounting_streams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_impact_measurements_updated_at
  BEFORE UPDATE ON public.impact_measurements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_requirements_updated_at
  BEFORE UPDATE ON public.compliance_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transaction_allocations_updated_at
  BEFORE UPDATE ON public.transaction_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.hybrid_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hybrid_activities
CREATE POLICY "Users can view hybrid activities from their shop" ON public.hybrid_activities
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert hybrid activities into their shop" ON public.hybrid_activities
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update hybrid activities in their shop" ON public.hybrid_activities
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete hybrid activities from their shop" ON public.hybrid_activities
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for accounting_streams
CREATE POLICY "Users can view accounting streams from their shop" ON public.accounting_streams
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert accounting streams into their shop" ON public.accounting_streams
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update accounting streams in their shop" ON public.accounting_streams
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete accounting streams from their shop" ON public.accounting_streams
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for impact_measurements
CREATE POLICY "Users can view impact measurements from their shop" ON public.impact_measurements
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert impact measurements into their shop" ON public.impact_measurements
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update impact measurements in their shop" ON public.impact_measurements
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete impact measurements from their shop" ON public.impact_measurements
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for compliance_requirements
CREATE POLICY "Users can view compliance requirements from their shop" ON public.compliance_requirements
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert compliance requirements into their shop" ON public.compliance_requirements
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update compliance requirements in their shop" ON public.compliance_requirements
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete compliance requirements from their shop" ON public.compliance_requirements
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for transaction_allocations
CREATE POLICY "Users can view transaction allocations from their shop" ON public.transaction_allocations
  FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert transaction allocations into their shop" ON public.transaction_allocations
  FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update transaction allocations in their shop" ON public.transaction_allocations
  FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete transaction allocations from their shop" ON public.transaction_allocations
  FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Create helpful functions for hybrid model calculations
CREATE OR REPLACE FUNCTION public.calculate_allocation_percentages(
  for_profit_amount numeric,
  non_profit_amount numeric
) RETURNS TABLE (
  for_profit_percentage numeric,
  non_profit_percentage numeric
) 
LANGUAGE plpgsql
AS $$
DECLARE
  total_amount numeric;
BEGIN
  total_amount := for_profit_amount + non_profit_amount;
  
  IF total_amount = 0 THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric;
  ELSE
    RETURN QUERY SELECT 
      ROUND((for_profit_amount / total_amount) * 100, 2),
      ROUND((non_profit_amount / total_amount) * 100, 2);
  END IF;
END;
$$;

-- Function to validate allocation percentages
CREATE OR REPLACE FUNCTION public.validate_allocation_percentages()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure percentages add up to 100% (with small tolerance for rounding)
  IF ABS((COALESCE(NEW.for_profit_percentage, 0) + COALESCE(NEW.allocation_percentage_nonprofit, 0)) - 100) > 0.01 THEN
    RAISE EXCEPTION 'Allocation percentages must add up to 100%%';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add validation triggers
CREATE TRIGGER validate_hybrid_activity_allocation
  BEFORE INSERT OR UPDATE ON public.hybrid_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_allocation_percentages();