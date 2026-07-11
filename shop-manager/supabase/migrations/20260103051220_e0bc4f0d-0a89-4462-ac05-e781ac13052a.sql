-- Create business_modules table - Master list of available modules
CREATE TABLE public.business_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT NOT NULL DEFAULT 'industry',
  is_premium BOOLEAN DEFAULT false,
  default_enabled BOOLEAN DEFAULT false,
  related_industries TEXT[],
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create shop_enabled_modules table - Tracks which modules each shop has unlocked
CREATE TABLE public.shop_enabled_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES public.business_modules(id) ON DELETE CASCADE NOT NULL,
  enabled_at TIMESTAMPTZ DEFAULT now(),
  enabled_by UUID,
  UNIQUE(shop_id, module_id)
);

-- Enable RLS
ALTER TABLE public.business_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_enabled_modules ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_modules (read-only for all authenticated users)
CREATE POLICY "Anyone can view business modules"
ON public.business_modules
FOR SELECT
TO authenticated
USING (true);

-- RLS policies for shop_enabled_modules
CREATE POLICY "Users can view their shop's enabled modules"
ON public.shop_enabled_modules
FOR SELECT
TO authenticated
USING (
  shop_id IN (
    SELECT p.shop_id FROM public.profiles p 
    WHERE p.id = auth.uid() OR p.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage their shop's modules"
ON public.shop_enabled_modules
FOR ALL
TO authenticated
USING (
  shop_id IN (
    SELECT p.shop_id FROM public.profiles p 
    WHERE (p.id = auth.uid() OR p.user_id = auth.uid())
  )
  AND public.has_role(auth.uid(), 'owner')
)
WITH CHECK (
  shop_id IN (
    SELECT p.shop_id FROM public.profiles p 
    WHERE (p.id = auth.uid() OR p.user_id = auth.uid())
  )
  AND public.has_role(auth.uid(), 'owner')
);

-- Seed initial business modules
INSERT INTO public.business_modules (name, slug, description, icon, category, default_enabled, related_industries, display_order) VALUES
-- Industry Modules
('Automotive Services', 'automotive', 'Vehicle repair, maintenance, and diagnostic services', 'Car', 'industry', true, ARRAY['automotive', 'repair'], 1),
('Gunsmith Services', 'gunsmith', 'Firearm repair, customization, cleaning, and maintenance', 'Target', 'industry', false, ARRAY['gunsmith'], 2),
('Power Washing', 'power_washing', 'Residential and commercial pressure washing services', 'Droplets', 'industry', false, ARRAY['power_washing', 'cleaning'], 3),
('Marine Services', 'marine', 'Boat repair, maintenance, and marine equipment services', 'Anchor', 'industry', false, ARRAY['marine', 'boating'], 4),
('HVAC Services', 'hvac', 'Heating, ventilation, and air conditioning services', 'Wind', 'industry', false, ARRAY['hvac', 'climate'], 5),
('Electrical Services', 'electrical', 'Electrical installation, repair, and maintenance', 'Zap', 'industry', false, ARRAY['electrical'], 6),
('Plumbing Services', 'plumbing', 'Plumbing installation, repair, and maintenance', 'Pipette', 'industry', false, ARRAY['plumbing'], 7),

-- Operations Modules
('Fleet Management', 'fleet', 'Manage company vehicles, fuel tracking, and fleet operations', 'Truck', 'operations', false, ARRAY['transportation', 'fleet', 'automotive'], 10),
('Equipment Tracking', 'equipment', 'Track tools, equipment, and asset management', 'Wrench', 'operations', true, NULL, 11),
('Safety & Compliance', 'safety', 'Safety protocols, compliance tracking, and certifications', 'ShieldCheck', 'operations', false, NULL, 12),
('Marketing & Campaigns', 'marketing', 'Customer marketing, campaigns, and promotions', 'Megaphone', 'operations', false, NULL, 13),
('Non-Profit Tools', 'nonprofit', 'Donor management, grants, and nonprofit-specific features', 'Heart', 'operations', false, ARRAY['nonprofit'], 14),
('Inventory Management', 'inventory', 'Parts and supplies inventory tracking', 'Package', 'operations', true, NULL, 15),
('Customer Portal', 'customer_portal', 'Self-service portal for customers', 'Users', 'operations', false, NULL, 16);

-- Create trigger for updated_at
CREATE TRIGGER update_business_modules_updated_at
BEFORE UPDATE ON public.business_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();