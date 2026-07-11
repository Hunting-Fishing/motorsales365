-- Create PTO/Leave types table
CREATE TABLE public.leave_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  is_paid BOOLEAN DEFAULT true,
  accrual_rate NUMERIC(10,4) DEFAULT 0,
  accrual_period TEXT DEFAULT 'monthly',
  max_balance NUMERIC(10,2),
  requires_approval BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee leave balances table
CREATE TABLE public.employee_leave_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  balance_hours NUMERIC(10,2) DEFAULT 0,
  used_hours NUMERIC(10,2) DEFAULT 0,
  pending_hours NUMERIC(10,2) DEFAULT 0,
  accrued_ytd NUMERIC(10,2) DEFAULT 0,
  carry_over_hours NUMERIC(10,2) DEFAULT 0,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

-- Create leave requests table
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_hours NUMERIC(10,2) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payroll runs table
CREATE TABLE public.payroll_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  pay_period_id UUID NOT NULL,
  run_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft',
  total_gross_pay NUMERIC(12,2) DEFAULT 0,
  total_overtime_pay NUMERIC(12,2) DEFAULT 0,
  total_regular_pay NUMERIC(12,2) DEFAULT 0,
  total_deductions NUMERIC(12,2) DEFAULT 0,
  total_net_pay NUMERIC(12,2) DEFAULT 0,
  employee_count INTEGER DEFAULT 0,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payroll run details (per employee)
CREATE TABLE public.payroll_run_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  regular_hours NUMERIC(10,2) DEFAULT 0,
  overtime_hours NUMERIC(10,2) DEFAULT 0,
  hourly_rate NUMERIC(10,2),
  overtime_rate NUMERIC(10,2),
  gross_pay NUMERIC(12,2) DEFAULT 0,
  deductions NUMERIC(12,2) DEFAULT 0,
  net_pay NUMERIC(12,2) DEFAULT 0,
  pto_hours_used NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_run_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_types
CREATE POLICY "Users can view leave types for their shop" ON public.leave_types
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can insert leave types for their shop" ON public.leave_types
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update leave types for their shop" ON public.leave_types
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete leave types for their shop" ON public.leave_types
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- RLS Policies for employee_leave_balances
CREATE POLICY "Users can view leave balances for their shop" ON public.employee_leave_balances
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can insert leave balances for their shop" ON public.employee_leave_balances
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update leave balances for their shop" ON public.employee_leave_balances
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete leave balances for their shop" ON public.employee_leave_balances
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- RLS Policies for leave_requests
CREATE POLICY "Users can view leave requests for their shop" ON public.leave_requests
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can insert leave requests for their shop" ON public.leave_requests
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update leave requests for their shop" ON public.leave_requests
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete leave requests for their shop" ON public.leave_requests
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- RLS Policies for payroll_runs
CREATE POLICY "Users can view payroll runs for their shop" ON public.payroll_runs
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can insert payroll runs for their shop" ON public.payroll_runs
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update payroll runs for their shop" ON public.payroll_runs
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete payroll runs for their shop" ON public.payroll_runs
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- RLS Policies for payroll_run_details
CREATE POLICY "Users can view payroll run details" ON public.payroll_run_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.payroll_runs pr 
      WHERE pr.id = payroll_run_id 
      AND pr.shop_id = public.get_current_user_shop_id()
    )
  );

CREATE POLICY "Users can insert payroll run details" ON public.payroll_run_details
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.payroll_runs pr 
      WHERE pr.id = payroll_run_id 
      AND pr.shop_id = public.get_current_user_shop_id()
    )
  );

CREATE POLICY "Users can update payroll run details" ON public.payroll_run_details
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.payroll_runs pr 
      WHERE pr.id = payroll_run_id 
      AND pr.shop_id = public.get_current_user_shop_id()
    )
  );

CREATE POLICY "Users can delete payroll run details" ON public.payroll_run_details
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.payroll_runs pr 
      WHERE pr.id = payroll_run_id 
      AND pr.shop_id = public.get_current_user_shop_id()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_leave_types_shop_id ON public.leave_types(shop_id);
CREATE INDEX idx_employee_leave_balances_shop_employee ON public.employee_leave_balances(shop_id, employee_id);
CREATE INDEX idx_leave_requests_shop_employee ON public.leave_requests(shop_id, employee_id);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX idx_payroll_runs_shop_period ON public.payroll_runs(shop_id, pay_period_id);
CREATE INDEX idx_payroll_run_details_run ON public.payroll_run_details(payroll_run_id);