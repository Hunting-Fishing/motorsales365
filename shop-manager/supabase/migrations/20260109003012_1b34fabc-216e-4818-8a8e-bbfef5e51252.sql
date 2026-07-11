-- Create enum for gunsmith roles
CREATE TYPE public.gunsmith_role_type AS ENUM (
  'shop_owner',
  'master_gunsmith', 
  'gunsmith',
  'apprentice',
  'counter_staff',
  'parts_manager'
);

-- Create gunsmith_roles table
CREATE TABLE public.gunsmith_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_type gunsmith_role_type,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create gunsmith_team_members table
CREATE TABLE public.gunsmith_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.gunsmith_roles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  hire_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, profile_id)
);

-- Create gunsmith_settings table
CREATE TABLE public.gunsmith_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT,
  ffl_number TEXT,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  default_labor_rate DECIMAL(10,2) DEFAULT 75.00,
  work_hours_start TIME DEFAULT '08:00',
  work_hours_end TIME DEFAULT '17:00',
  appointment_duration_minutes INTEGER DEFAULT 30,
  require_deposit BOOLEAN DEFAULT false,
  deposit_percentage DECIMAL(5,2) DEFAULT 50,
  auto_generate_invoice BOOLEAN DEFAULT true,
  compliance_reminder_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gunsmith_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_settings ENABLE ROW LEVEL SECURITY;

-- Create security definer function for checking gunsmith roles
CREATE OR REPLACE FUNCTION public.has_gunsmith_role(_user_id uuid, _role_type gunsmith_role_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gunsmith_team_members gtm
    JOIN public.gunsmith_roles gr ON gtm.role_id = gr.id
    WHERE gtm.profile_id = _user_id
      AND gr.role_type = _role_type
      AND gtm.is_active = true
  )
$$;

-- RLS Policies for gunsmith_roles
CREATE POLICY "Authenticated can read gunsmith_roles"
ON public.gunsmith_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Shop owners can manage gunsmith_roles"
ON public.gunsmith_roles FOR ALL TO authenticated
USING (public.has_gunsmith_role(auth.uid(), 'shop_owner') OR NOT is_system)
WITH CHECK (public.has_gunsmith_role(auth.uid(), 'shop_owner') OR NOT is_system);

-- RLS Policies for gunsmith_team_members
CREATE POLICY "Authenticated can read gunsmith_team_members"
ON public.gunsmith_team_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Shop owners can manage gunsmith_team_members"
ON public.gunsmith_team_members FOR ALL TO authenticated
USING (public.has_gunsmith_role(auth.uid(), 'shop_owner'))
WITH CHECK (public.has_gunsmith_role(auth.uid(), 'shop_owner'));

-- RLS Policies for gunsmith_settings
CREATE POLICY "Authenticated can read gunsmith_settings"
ON public.gunsmith_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Shop owners can manage gunsmith_settings"
ON public.gunsmith_settings FOR ALL TO authenticated
USING (public.has_gunsmith_role(auth.uid(), 'shop_owner'))
WITH CHECK (public.has_gunsmith_role(auth.uid(), 'shop_owner'));

-- Insert default system roles
INSERT INTO public.gunsmith_roles (name, role_type, description, permissions, is_system, display_order) VALUES
('Shop Owner', 'shop_owner', 'Full control over all settings, users, and operations', 
  '{"jobs": ["view", "create", "edit", "delete", "assign"], "customers": ["view", "create", "edit", "delete"], "parts": ["view", "create", "edit", "delete"], "invoices": ["view", "create", "edit", "delete"], "compliance": ["view", "create", "edit"], "settings": ["view", "edit"], "team": ["view", "manage"]}',
  true, 1),
('Master Gunsmith', 'master_gunsmith', 'Senior gunsmith with approval authority',
  '{"jobs": ["view", "create", "edit", "assign"], "customers": ["view", "create", "edit"], "parts": ["view", "create", "edit"], "invoices": ["view", "create", "edit"], "compliance": ["view", "create"], "settings": ["view"], "team": ["view"]}',
  true, 2),
('Gunsmith', 'gunsmith', 'Standard gunsmith technician',
  '{"jobs": ["view", "create", "edit"], "customers": ["view", "edit"], "parts": ["view", "edit"], "invoices": ["view"], "compliance": ["view"], "settings": [], "team": ["view"]}',
  true, 3),
('Apprentice', 'apprentice', 'Trainee with limited permissions',
  '{"jobs": ["view"], "customers": ["view"], "parts": ["view"], "invoices": [], "compliance": [], "settings": [], "team": []}',
  true, 4),
('Counter Staff', 'counter_staff', 'Customer-facing, handles intake and checkout',
  '{"jobs": ["view", "create"], "customers": ["view", "create", "edit"], "parts": ["view"], "invoices": ["view", "create", "edit"], "compliance": [], "settings": [], "team": []}',
  true, 5),
('Parts Manager', 'parts_manager', 'Manages parts inventory and ordering',
  '{"jobs": ["view"], "customers": ["view"], "parts": ["view", "create", "edit", "delete"], "invoices": ["view"], "compliance": [], "settings": [], "team": []}',
  true, 6);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_gunsmith_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_gunsmith_roles_updated_at
  BEFORE UPDATE ON public.gunsmith_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_gunsmith_updated_at();

CREATE TRIGGER update_gunsmith_team_members_updated_at
  BEFORE UPDATE ON public.gunsmith_team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_gunsmith_updated_at();

CREATE TRIGGER update_gunsmith_settings_updated_at
  BEFORE UPDATE ON public.gunsmith_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_gunsmith_updated_at();