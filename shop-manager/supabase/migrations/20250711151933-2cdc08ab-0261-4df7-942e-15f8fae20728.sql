-- Phase 1: Create missing database tables to replace mock data

-- Teams and team members (replaces mock data in TeamMembersList, AddTeamMemberDialog)
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  hire_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  skills TEXT[],
  certifications TEXT[],
  notes TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Affiliate tools (replaces mock data in toolService.ts)
CREATE TABLE IF NOT EXISTS public.affiliate_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  price DECIMAL(10,2),
  commission_rate DECIMAL(5,2),
  image_url TEXT,
  rating DECIMAL(2,1),
  reviews_count INTEGER DEFAULT 0,
  features TEXT[],
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Equipment management (replaces Equipment placeholder page)
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  model TEXT,
  manufacturer TEXT,
  serial_number TEXT,
  equipment_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'operational',
  location TEXT,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  warranty_expiry DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_interval_days INTEGER,
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Forms management (replaces Forms placeholder page)
CREATE TABLE IF NOT EXISTS public.custom_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  form_type TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Form submissions
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES public.custom_forms(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  submission_data JSONB NOT NULL,
  submitted_by UUID,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Equipment maintenance records
CREATE TABLE IF NOT EXISTS public.equipment_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL,
  description TEXT NOT NULL,
  performed_date DATE NOT NULL,
  performed_by UUID,
  cost DECIMAL(10,2),
  notes TEXT,
  next_maintenance_date DATE,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Feedback management (replaces Feedback placeholder page)
CREATE TABLE IF NOT EXISTS public.customer_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- System analytics (replaces mock analytics data)
CREATE TABLE IF NOT EXISTS public.system_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(15,2) NOT NULL,
  metric_unit TEXT,
  period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Performance metrics (replaces mock performance data)
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  technician_id UUID,
  metric_type TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  target_value DECIMAL(10,2),
  measurement_date DATE NOT NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shop-based access
CREATE POLICY "Users can access team members from their shop" ON public.team_members
  FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access affiliate tools from their shop" ON public.affiliate_tools
  FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access equipment from their shop" ON public.equipment
  FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access forms from their shop" ON public.custom_forms
  FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access form submissions from their shop" ON public.form_submissions
  FOR ALL USING (form_id IN (SELECT id FROM custom_forms WHERE shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can access equipment maintenance from their shop" ON public.equipment_maintenance
  FOR ALL USING (equipment_id IN (SELECT id FROM equipment WHERE shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can access feedback from their shop" ON public.customer_feedback
  FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access analytics from their shop" ON public.system_analytics
  FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access performance metrics from their shop" ON public.performance_metrics
  FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_affiliate_tools_updated_at BEFORE UPDATE ON public.affiliate_tools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_forms_updated_at BEFORE UPDATE ON public.custom_forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_feedback_updated_at BEFORE UPDATE ON public.customer_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();