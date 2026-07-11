-- Contractor Safety Management
CREATE TABLE public.safety_contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  trade_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'expired', 'suspended')),
  insurance_expiry DATE,
  insurance_policy_number TEXT,
  insurance_provider TEXT,
  liability_coverage_amount NUMERIC,
  workers_comp_expiry DATE,
  safety_rating INTEGER CHECK (safety_rating >= 1 AND safety_rating <= 5),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.contractor_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.safety_contractors(id) ON DELETE CASCADE,
  certification_name TEXT NOT NULL,
  certification_number TEXT,
  issuing_authority TEXT,
  issue_date DATE,
  expiry_date DATE,
  document_url TEXT,
  status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'expired', 'pending_renewal')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.contractor_site_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.safety_contractors(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL,
  access_date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  work_area TEXT,
  work_description TEXT,
  supervised_by UUID REFERENCES public.profiles(id),
  safety_briefing_completed BOOLEAN DEFAULT false,
  ppe_verified BOOLEAN DEFAULT false,
  jsa_completed BOOLEAN DEFAULT false,
  jsa_id UUID REFERENCES public.job_safety_analyses(id),
  incidents_reported INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Safety Gamification
CREATE TABLE public.safety_points_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  points_value INTEGER NOT NULL DEFAULT 10,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, action_type)
);

CREATE TABLE public.safety_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  action_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  awarded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.safety_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  reward_name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  reward_type TEXT DEFAULT 'badge' CHECK (reward_type IN ('badge', 'prize', 'recognition', 'time_off')),
  image_url TEXT,
  quantity_available INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.safety_reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID REFERENCES public.safety_rewards(id),
  employee_id UUID REFERENCES public.profiles(id),
  points_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'denied')),
  approved_by UUID REFERENCES public.profiles(id),
  fulfilled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.safety_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_site_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_points_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_reward_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Contractor Safety
CREATE POLICY "Users can view contractors in their shop" ON public.safety_contractors FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can create contractors in their shop" ON public.safety_contractors FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can update contractors in their shop" ON public.safety_contractors FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can delete contractors in their shop" ON public.safety_contractors FOR DELETE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can view contractor certs" ON public.contractor_certifications FOR SELECT USING (EXISTS (SELECT 1 FROM public.safety_contractors sc WHERE sc.id = contractor_id AND sc.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "Users can manage contractor certs" ON public.contractor_certifications FOR ALL USING (EXISTS (SELECT 1 FROM public.safety_contractors sc WHERE sc.id = contractor_id AND sc.shop_id = public.get_current_user_shop_id()));

CREATE POLICY "Users can view site access in their shop" ON public.contractor_site_access FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can manage site access in their shop" ON public.contractor_site_access FOR ALL USING (shop_id = public.get_current_user_shop_id());

-- RLS Policies for Gamification
CREATE POLICY "Users can view points config in their shop" ON public.safety_points_config FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can manage points config in their shop" ON public.safety_points_config FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can view points ledger in their shop" ON public.safety_points_ledger FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can create points in their shop" ON public.safety_points_ledger FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can view rewards in their shop" ON public.safety_rewards FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can manage rewards in their shop" ON public.safety_rewards FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can view redemptions in their shop" ON public.safety_reward_redemptions FOR SELECT USING (EXISTS (SELECT 1 FROM public.safety_rewards sr WHERE sr.id = reward_id AND sr.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "Users can create redemptions" ON public.safety_reward_redemptions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.safety_rewards sr WHERE sr.id = reward_id AND sr.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "Users can update redemptions" ON public.safety_reward_redemptions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.safety_rewards sr WHERE sr.id = reward_id AND sr.shop_id = public.get_current_user_shop_id()));

-- Indexes
CREATE INDEX idx_safety_contractors_shop ON public.safety_contractors(shop_id);
CREATE INDEX idx_contractor_certs_contractor ON public.contractor_certifications(contractor_id);
CREATE INDEX idx_contractor_access_shop ON public.contractor_site_access(shop_id);
CREATE INDEX idx_safety_points_ledger_employee ON public.safety_points_ledger(employee_id);
CREATE INDEX idx_safety_points_ledger_shop ON public.safety_points_ledger(shop_id);

-- Insert default points configuration
INSERT INTO public.safety_points_config (shop_id, action_type, points_value, description) 
SELECT id, 'near_miss_report', 25, 'Submitted a near-miss report' FROM public.shops
UNION ALL
SELECT id, 'inspection_completed', 10, 'Completed a safety inspection' FROM public.shops
UNION ALL
SELECT id, 'jsa_created', 20, 'Created a Job Safety Analysis' FROM public.shops
UNION ALL
SELECT id, 'training_completed', 30, 'Completed safety training' FROM public.shops
UNION ALL
SELECT id, 'hazard_identified', 15, 'Identified a workplace hazard' FROM public.shops
UNION ALL
SELECT id, 'safety_suggestion', 10, 'Submitted a safety improvement suggestion' FROM public.shops
ON CONFLICT DO NOTHING;