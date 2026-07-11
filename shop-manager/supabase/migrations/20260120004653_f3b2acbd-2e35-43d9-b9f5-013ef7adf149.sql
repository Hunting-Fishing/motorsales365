-- Power Washing Team & Roles Management System

-- 1. Create power_washing_roles table
CREATE TABLE public.power_washing_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create power_washing_team_members table
CREATE TABLE public.power_washing_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES public.power_washing_roles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  hire_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, profile_id)
);

-- 3. Create power_washing_team_member_roles for multi-role support
CREATE TABLE public.power_washing_team_member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES public.power_washing_team_members(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES public.power_washing_roles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_member_id, role_id)
);

-- 4. Create power_washing_certificate_types table
CREATE TABLE public.power_washing_certificate_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  requires_renewal BOOLEAN DEFAULT true,
  default_validity_months INTEGER DEFAULT 12,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create power_washing_team_certificates table
CREATE TABLE public.power_washing_team_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES public.power_washing_team_members(id) ON DELETE CASCADE NOT NULL,
  certificate_type_id UUID REFERENCES public.power_washing_certificate_types(id) ON DELETE CASCADE NOT NULL,
  issued_date DATE NOT NULL,
  expiry_date DATE,
  certificate_number TEXT,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.power_washing_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_team_member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_certificate_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_team_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for power_washing_roles
CREATE POLICY "Users can view roles for their shop"
ON public.power_washing_roles FOR SELECT
TO authenticated
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage roles for their shop"
ON public.power_washing_roles FOR ALL
TO authenticated
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for power_washing_team_members
CREATE POLICY "Users can view team members for their shop"
ON public.power_washing_team_members FOR SELECT
TO authenticated
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage team members for their shop"
ON public.power_washing_team_members FOR ALL
TO authenticated
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for power_washing_team_member_roles
CREATE POLICY "Users can view team member roles for their shop"
ON public.power_washing_team_member_roles FOR SELECT
TO authenticated
USING (team_member_id IN (
  SELECT id FROM public.power_washing_team_members 
  WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
));

CREATE POLICY "Users can manage team member roles for their shop"
ON public.power_washing_team_member_roles FOR ALL
TO authenticated
USING (team_member_id IN (
  SELECT id FROM public.power_washing_team_members 
  WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
))
WITH CHECK (team_member_id IN (
  SELECT id FROM public.power_washing_team_members 
  WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
));

-- RLS Policies for power_washing_certificate_types
CREATE POLICY "Users can view certificate types for their shop or global"
ON public.power_washing_certificate_types FOR SELECT
TO authenticated
USING (shop_id IS NULL OR shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage certificate types for their shop"
ON public.power_washing_certificate_types FOR ALL
TO authenticated
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for power_washing_team_certificates
CREATE POLICY "Users can view certificates for their shop"
ON public.power_washing_team_certificates FOR SELECT
TO authenticated
USING (team_member_id IN (
  SELECT id FROM public.power_washing_team_members 
  WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
));

CREATE POLICY "Users can manage certificates for their shop"
ON public.power_washing_team_certificates FOR ALL
TO authenticated
USING (team_member_id IN (
  SELECT id FROM public.power_washing_team_members 
  WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
))
WITH CHECK (team_member_id IN (
  SELECT id FROM public.power_washing_team_members 
  WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
));

-- Insert default global certificate types
INSERT INTO public.power_washing_certificate_types (shop_id, name, description, requires_renewal, default_validity_months, is_required) VALUES
(NULL, 'Pressure Washer Safety', 'Basic pressure washer operation and safety training', true, 24, true),
(NULL, 'Chemical Handling (SDS)', 'Safety Data Sheet and chemical handling certification', true, 12, true),
(NULL, 'Height/Ladder Safety', 'Working at heights and ladder safety certification', true, 12, false),
(NULL, 'Water Reclamation', 'Environmental compliance for water reclamation', true, 24, false),
(NULL, 'CDL/Vehicle Operation', 'Commercial driving or trailer operation license', true, 48, false);

-- Create function to seed default roles for a shop
CREATE OR REPLACE FUNCTION public.seed_power_washing_roles_for_shop(p_shop_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.power_washing_roles (shop_id, name, description, is_system, display_order, permissions)
  VALUES
    (p_shop_id, 'Owner', 'Full access to all power washing features', true, 1, 
     '{"jobs": ["view","create","edit","delete","assign"], "customers": ["view","create","edit","delete"], "equipment": ["view","create","edit","delete"], "chemicals": ["view","create","edit","delete"], "routes": ["view","create","edit","delete"], "invoices": ["view","create","edit","delete"], "team": ["view","manage"], "settings": ["view","edit"]}'::jsonb),
    (p_shop_id, 'Crew Lead', 'Manages crews and job assignments', true, 2,
     '{"jobs": ["view","create","edit","assign"], "customers": ["view"], "equipment": ["view","edit"], "chemicals": ["view"], "routes": ["view"], "invoices": ["view"], "team": ["view"]}'::jsonb),
    (p_shop_id, 'Technician', 'Standard crew member', true, 3,
     '{"jobs": ["view"], "customers": ["view"], "equipment": ["view"], "chemicals": ["view"], "routes": ["view"]}'::jsonb),
    (p_shop_id, 'Trainee', 'New crew member with limited access', true, 4,
     '{"jobs": ["view"]}'::jsonb)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Create updated_at triggers
CREATE TRIGGER update_power_washing_roles_updated_at
  BEFORE UPDATE ON public.power_washing_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_power_washing_team_members_updated_at
  BEFORE UPDATE ON public.power_washing_team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_power_washing_certificate_types_updated_at
  BEFORE UPDATE ON public.power_washing_certificate_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_power_washing_team_certificates_updated_at
  BEFORE UPDATE ON public.power_washing_team_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();