
-- Time Card Disputes (referencing correct table)
CREATE TABLE IF NOT EXISTS public.time_card_disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL DEFAULT public.get_current_user_shop_id(),
  time_card_id UUID NOT NULL REFERENCES public.time_card_entries(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  dispute_type TEXT NOT NULL, -- 'hours', 'clock_in', 'clock_out', 'break', 'other'
  original_value TEXT,
  requested_value TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'denied', 'under_review'
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payroll Audit Trail
CREATE TABLE IF NOT EXISTS public.payroll_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL DEFAULT public.get_current_user_shop_id(),
  entity_type TEXT NOT NULL, -- 'time_card', 'pay_period', 'payroll_run', 'deduction', 'addition', 'dispute'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'approve', 'reject', 'process'
  old_values JSONB,
  new_values JSONB,
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  changed_by_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_card_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for disputes
CREATE POLICY "Users can view time card disputes in their shop" ON public.time_card_disputes
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can manage time card disputes in their shop" ON public.time_card_disputes
  FOR ALL USING (shop_id = public.get_current_user_shop_id());

-- RLS Policies for audit log
CREATE POLICY "Users can view payroll audit logs in their shop" ON public.payroll_audit_log
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can create payroll audit logs in their shop" ON public.payroll_audit_log
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_card_disputes_time_card ON public.time_card_disputes(time_card_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_log_entity ON public.payroll_audit_log(entity_type, entity_id);
