-- Phase 6: Photo Documentation, Subscriptions, Communications

-- Power Washing Properties (for subscription linking)
CREATE TABLE public.power_washing_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  property_name TEXT,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  property_type TEXT,
  square_footage INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Power Washing Subscriptions (recurring service plans)
CREATE TABLE public.power_washing_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  property_id UUID REFERENCES public.power_washing_properties(id),
  plan_name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'biannual', 'annual')),
  services JSONB NOT NULL DEFAULT '[]',
  base_price DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  final_price DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  next_service_date DATE,
  last_service_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  auto_renew BOOLEAN DEFAULT true,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Power Washing Communications Log
CREATE TABLE public.power_washing_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  job_id UUID REFERENCES public.power_washing_jobs(id),
  quote_id UUID REFERENCES public.power_washing_quotes(id),
  communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'sms', 'phone', 'in_person', 'note')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  content TEXT,
  sent_by UUID REFERENCES public.profiles(id),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'delivered', 'read', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.power_washing_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage properties" ON public.power_washing_properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage subscriptions" ON public.power_washing_subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage communications" ON public.power_washing_communications FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_pw_properties_customer ON public.power_washing_properties(customer_id);
CREATE INDEX idx_pw_subscriptions_customer ON public.power_washing_subscriptions(customer_id);
CREATE INDEX idx_pw_subscriptions_status ON public.power_washing_subscriptions(status);
CREATE INDEX idx_pw_communications_customer ON public.power_washing_communications(customer_id);
CREATE INDEX idx_pw_communications_job ON public.power_washing_communications(job_id);

-- Update triggers
CREATE TRIGGER update_pw_properties_updated_at BEFORE UPDATE ON public.power_washing_properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pw_subscriptions_updated_at BEFORE UPDATE ON public.power_washing_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();