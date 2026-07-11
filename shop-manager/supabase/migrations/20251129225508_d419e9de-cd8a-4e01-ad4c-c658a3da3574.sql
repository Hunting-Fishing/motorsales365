-- Create maintenance_budgets table for budget management
CREATE TABLE public.maintenance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_name TEXT NOT NULL,
  description TEXT,
  budget_period TEXT NOT NULL DEFAULT 'quarterly',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_budget NUMERIC(12,2) DEFAULT 0,
  parts_budget NUMERIC(12,2) DEFAULT 0,
  labor_budget NUMERIC(12,2) DEFAULT 0,
  external_services_budget NUMERIC(12,2) DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0,
  parts_spent NUMERIC(12,2) DEFAULT 0,
  labor_spent NUMERIC(12,2) DEFAULT 0,
  external_services_spent NUMERIC(12,2) DEFAULT 0,
  forecasted_total NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  shop_id UUID REFERENCES public.shops(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_budgets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view maintenance budgets"
  ON public.maintenance_budgets
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create maintenance budgets"
  ON public.maintenance_budgets
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update maintenance budgets"
  ON public.maintenance_budgets
  FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete maintenance budgets"
  ON public.maintenance_budgets
  FOR DELETE
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_maintenance_budgets_updated_at
  BEFORE UPDATE ON public.maintenance_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();