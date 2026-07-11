-- Phase 3: Recurring Jobs & Invoices

-- Recurring job schedules
CREATE TABLE IF NOT EXISTS public.power_washing_recurring_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  service_id UUID REFERENCES public.power_washing_services(id),
  
  -- Schedule config
  schedule_name TEXT NOT NULL,
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')),
  day_of_week INTEGER, -- 0-6 for weekly/biweekly
  day_of_month INTEGER, -- 1-31 for monthly
  preferred_time_start TIME,
  preferred_time_end TIME,
  
  -- Property info (copied to jobs)
  property_type TEXT,
  property_address TEXT,
  property_city TEXT,
  property_state TEXT,
  property_zip TEXT,
  square_footage INTEGER,
  
  -- Pricing
  agreed_price NUMERIC(10,2),
  
  -- Assignment
  assigned_crew UUID[] DEFAULT '{}',
  special_instructions TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  next_scheduled_date DATE,
  last_job_id UUID,
  jobs_completed INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Power washing invoices
CREATE TABLE IF NOT EXISTS public.power_washing_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.power_washing_jobs(id),
  customer_id UUID REFERENCES public.customers(id),
  
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  
  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  
  -- Amounts
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax_rate NUMERIC(5,4) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  balance_due NUMERIC(10,2) DEFAULT 0,
  
  -- Payment
  payment_method TEXT,
  payment_reference TEXT,
  
  -- Content
  notes TEXT,
  terms TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS public.power_washing_invoice_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.power_washing_invoices(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(10,2) DEFAULT 0,
  total_price NUMERIC(10,2) DEFAULT 0,
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.power_washing_recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_invoice_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring schedules
CREATE POLICY "Users can view recurring schedules in their shop" 
ON public.power_washing_recurring_schedules FOR SELECT 
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create recurring schedules in their shop" 
ON public.power_washing_recurring_schedules FOR INSERT 
WITH CHECK (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update recurring schedules in their shop" 
ON public.power_washing_recurring_schedules FOR UPDATE 
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete recurring schedules in their shop" 
ON public.power_washing_recurring_schedules FOR DELETE 
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
);

-- RLS Policies for invoices
CREATE POLICY "Users can view invoices in their shop" 
ON public.power_washing_invoices FOR SELECT 
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create invoices in their shop" 
ON public.power_washing_invoices FOR INSERT 
WITH CHECK (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update invoices in their shop" 
ON public.power_washing_invoices FOR UPDATE 
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete invoices in their shop" 
ON public.power_washing_invoices FOR DELETE 
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
);

-- RLS Policies for invoice lines
CREATE POLICY "Users can view invoice lines for their invoices" 
ON public.power_washing_invoice_lines FOR SELECT 
USING (
  invoice_id IN (
    SELECT id FROM public.power_washing_invoices 
    WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can manage invoice lines for their invoices" 
ON public.power_washing_invoice_lines FOR ALL 
USING (
  invoice_id IN (
    SELECT id FROM public.power_washing_invoices 
    WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pw_recurring_shop ON public.power_washing_recurring_schedules(shop_id);
CREATE INDEX IF NOT EXISTS idx_pw_recurring_next_date ON public.power_washing_recurring_schedules(next_scheduled_date);
CREATE INDEX IF NOT EXISTS idx_pw_invoices_shop ON public.power_washing_invoices(shop_id);
CREATE INDEX IF NOT EXISTS idx_pw_invoices_job ON public.power_washing_invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_pw_invoices_status ON public.power_washing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_pw_invoice_lines_invoice ON public.power_washing_invoice_lines(invoice_id);

-- Update trigger for recurring schedules
CREATE TRIGGER update_pw_recurring_schedules_updated_at
  BEFORE UPDATE ON public.power_washing_recurring_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for invoices
CREATE TRIGGER update_pw_invoices_updated_at
  BEFORE UPDATE ON public.power_washing_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();