
-- Create discount types table for predefined discount categories
CREATE TABLE public.discount_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  default_value NUMERIC NOT NULL DEFAULT 0,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('labor', 'parts', 'work_order', 'any')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  max_discount_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  UNIQUE(name)
);

-- Create job line discounts table
CREATE TABLE public.job_line_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_line_id UUID NOT NULL,
  discount_type_id UUID,
  discount_name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC NOT NULL,
  discount_amount NUMERIC NOT NULL,
  reason TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  FOREIGN KEY (job_line_id) REFERENCES public.work_order_job_lines(id) ON DELETE CASCADE,
  FOREIGN KEY (discount_type_id) REFERENCES public.discount_types(id) ON DELETE SET NULL
);

-- Create part discounts table
CREATE TABLE public.part_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  part_id UUID NOT NULL,
  discount_type_id UUID,
  discount_name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC NOT NULL,
  discount_amount NUMERIC NOT NULL,
  reason TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  FOREIGN KEY (part_id) REFERENCES public.work_order_parts(id) ON DELETE CASCADE,
  FOREIGN KEY (discount_type_id) REFERENCES public.discount_types(id) ON DELETE SET NULL
);

-- Create work order level discounts table
CREATE TABLE public.work_order_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL,
  discount_type_id UUID,
  discount_name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC NOT NULL,
  discount_amount NUMERIC NOT NULL,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('labor', 'parts', 'total')),
  reason TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (discount_type_id) REFERENCES public.discount_types(id) ON DELETE SET NULL
);

-- Create discount audit trail table
CREATE TABLE public.discount_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_id UUID NOT NULL,
  discount_table TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'modified', 'deleted', 'approved', 'rejected')),
  old_values JSONB,
  new_values JSONB,
  performed_by TEXT NOT NULL,
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT
);

-- Add updated_at triggers for discount tables
CREATE OR REPLACE FUNCTION public.update_discount_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_discount_types_updated_at
  BEFORE UPDATE ON public.discount_types
  FOR EACH ROW EXECUTE FUNCTION public.update_discount_tables_updated_at();

-- Insert some default discount types
INSERT INTO public.discount_types (name, description, discount_type, default_value, applies_to, created_by) VALUES
('Vehicle Inspection Discount', 'Promotional discount for vehicle inspections', 'fixed_amount', 100.00, 'labor', 'system'),
('Senior Citizen Discount', '10% discount for senior citizens', 'percentage', 10.00, 'any', 'system'),
('Military Discount', '15% discount for military personnel', 'percentage', 15.00, 'any', 'system'),
('First Time Customer', '$50 off first service', 'fixed_amount', 50.00, 'work_order', 'system'),
('Parts Wholesale', 'Wholesale pricing for parts', 'percentage', 20.00, 'parts', 'system'),
('Labor Rate Adjustment', 'Custom labor rate adjustment', 'fixed_amount', 0.00, 'labor', 'system');

-- Create function to calculate job line total with discounts
CREATE OR REPLACE FUNCTION public.calculate_job_line_total_with_discounts(job_line_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  labor_total NUMERIC := 0;
  parts_total NUMERIC := 0;
  labor_discounts NUMERIC := 0;
  parts_discounts NUMERIC := 0;
  final_total NUMERIC := 0;
  result JSONB;
BEGIN
  -- Get labor total from job line
  SELECT COALESCE(total_amount, 0) INTO labor_total
  FROM work_order_job_lines
  WHERE id = job_line_id_param;
  
  -- Get labor discounts
  SELECT COALESCE(SUM(discount_amount), 0) INTO labor_discounts
  FROM job_line_discounts
  WHERE job_line_id = job_line_id_param;
  
  -- Get parts total
  SELECT COALESCE(SUM(customer_price * quantity), 0) INTO parts_total
  FROM work_order_parts
  WHERE job_line_id = job_line_id_param;
  
  -- Get parts discounts
  SELECT COALESCE(SUM(pd.discount_amount), 0) INTO parts_discounts
  FROM part_discounts pd
  JOIN work_order_parts wp ON pd.part_id = wp.id
  WHERE wp.job_line_id = job_line_id_param;
  
  final_total := (labor_total - labor_discounts) + (parts_total - parts_discounts);
  
  result := jsonb_build_object(
    'labor_subtotal', labor_total,
    'labor_discounts', labor_discounts,
    'labor_total', labor_total - labor_discounts,
    'parts_subtotal', parts_total,
    'parts_discounts', parts_discounts,
    'parts_total', parts_total - parts_discounts,
    'final_total', final_total
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate work order totals with all discounts
CREATE OR REPLACE FUNCTION public.calculate_work_order_totals_with_discounts(work_order_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  labor_subtotal NUMERIC := 0;
  parts_subtotal NUMERIC := 0;
  job_line_labor_discounts NUMERIC := 0;
  parts_discounts NUMERIC := 0;
  work_order_discounts NUMERIC := 0;
  final_total NUMERIC := 0;
  result JSONB;
BEGIN
  -- Get labor subtotal from all job lines
  SELECT COALESCE(SUM(total_amount), 0) INTO labor_subtotal
  FROM work_order_job_lines
  WHERE work_order_id = work_order_id_param;
  
  -- Get job line labor discounts
  SELECT COALESCE(SUM(jld.discount_amount), 0) INTO job_line_labor_discounts
  FROM job_line_discounts jld
  JOIN work_order_job_lines jl ON jld.job_line_id = jl.id
  WHERE jl.work_order_id = work_order_id_param;
  
  -- Get parts subtotal
  SELECT COALESCE(SUM(customer_price * quantity), 0) INTO parts_subtotal
  FROM work_order_parts
  WHERE work_order_id = work_order_id_param;
  
  -- Get parts discounts
  SELECT COALESCE(SUM(pd.discount_amount), 0) INTO parts_discounts
  FROM part_discounts pd
  JOIN work_order_parts wp ON pd.part_id = wp.id
  WHERE wp.work_order_id = work_order_id_param;
  
  -- Get work order level discounts
  SELECT COALESCE(SUM(discount_amount), 0) INTO work_order_discounts
  FROM work_order_discounts
  WHERE work_order_id = work_order_id_param;
  
  final_total := (labor_subtotal - job_line_labor_discounts) + (parts_subtotal - parts_discounts) - work_order_discounts;
  
  result := jsonb_build_object(
    'labor_subtotal', labor_subtotal,
    'labor_discounts', job_line_labor_discounts,
    'labor_total', labor_subtotal - job_line_labor_discounts,
    'parts_subtotal', parts_subtotal,
    'parts_discounts', parts_discounts,
    'parts_total', parts_subtotal - parts_discounts,
    'work_order_discounts', work_order_discounts,
    'subtotal_before_wo_discounts', (labor_subtotal - job_line_labor_discounts) + (parts_subtotal - parts_discounts),
    'total_discounts', job_line_labor_discounts + parts_discounts + work_order_discounts,
    'final_total', final_total
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for discount tables
ALTER TABLE public.discount_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_line_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_audit_log ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be adjusted based on your auth requirements)
CREATE POLICY "Allow all operations on discount_types" ON public.discount_types FOR ALL USING (true);
CREATE POLICY "Allow all operations on job_line_discounts" ON public.job_line_discounts FOR ALL USING (true);
CREATE POLICY "Allow all operations on part_discounts" ON public.part_discounts FOR ALL USING (true);
CREATE POLICY "Allow all operations on work_order_discounts" ON public.work_order_discounts FOR ALL USING (true);
CREATE POLICY "Allow all operations on discount_audit_log" ON public.discount_audit_log FOR ALL USING (true);
