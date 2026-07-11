
-- Create navigation sections table
CREATE TABLE public.navigation_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create navigation items table
CREATE TABLE public.navigation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.navigation_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  href TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  required_roles TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user navigation preferences table
CREATE TABLE public.user_navigation_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  hidden_sections UUID[] DEFAULT '{}',
  hidden_items UUID[] DEFAULT '{}',
  custom_order JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.navigation_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_navigation_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for navigation_sections
CREATE POLICY "Anyone can view navigation sections" 
ON public.navigation_sections FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage navigation sections" 
ON public.navigation_sections FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('owner', 'admin')
  )
);

-- RLS policies for navigation_items
CREATE POLICY "Anyone can view navigation items" 
ON public.navigation_items FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage navigation items" 
ON public.navigation_items FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('owner', 'admin')
  )
);

-- RLS policies for user preferences
CREATE POLICY "Users can manage their own navigation preferences" 
ON public.user_navigation_preferences FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_navigation_items_section_id ON public.navigation_items(section_id);
CREATE INDEX idx_navigation_items_display_order ON public.navigation_items(display_order);
CREATE INDEX idx_navigation_sections_display_order ON public.navigation_sections(display_order);
CREATE INDEX idx_user_nav_prefs_user_id ON public.user_navigation_preferences(user_id);

-- Insert existing navigation structure
INSERT INTO public.navigation_sections (title, description, display_order) VALUES
('Dashboard', 'Main dashboard and overview', 1),
('Customers', 'Customer management', 2),
('Inventory', 'Inventory and parts management', 3),
('Scheduling', 'Appointments and scheduling', 4),
('Communications', 'Customer communications', 5),
('Operations', 'Work orders and quotes', 6),
('Company', 'Company and team management', 7),
('Services', 'Service management', 8),
('Settings', 'System settings', 9),
('Support', 'Help and support', 10);

-- Insert navigation items
WITH sections AS (
  SELECT id, title FROM public.navigation_sections
)
INSERT INTO public.navigation_items (section_id, title, href, icon, description, display_order, required_roles) 
SELECT 
  s.id,
  item.title,
  item.href,
  item.icon,
  item.description,
  item.display_order,
  item.required_roles
FROM sections s
CROSS JOIN LATERAL (
  VALUES 
    -- Dashboard section
    ('Dashboard', '/dashboard', 'LayoutDashboard', 'Main dashboard overview', 1, ARRAY['owner', 'admin', 'manager', 'service_advisor', 'technician', 'reception']),
    
    -- Customers section  
    ('Customers', '/customers', 'Users', 'Customer management', 1, ARRAY['owner', 'admin', 'manager', 'service_advisor', 'reception']),
    
    -- Inventory section
    ('Inventory', '/inventory', 'Package', 'Inventory management', 1, ARRAY['owner', 'admin', 'manager', 'parts_manager']),
    
    -- Scheduling section
    ('Calendar', '/calendar', 'Calendar', 'Appointment calendar', 1, ARRAY['owner', 'admin', 'manager', 'service_advisor', 'reception']),
    ('Service Reminders', '/service-reminders', 'Bell', 'Service reminder notifications', 2, ARRAY['owner', 'admin', 'manager', 'service_advisor']),
    
    -- Communications section
    ('Customer Comms', '/customer-comms', 'MessageSquare', 'Customer communications', 1, ARRAY['owner', 'admin', 'manager', 'service_advisor', 'reception']),
    ('Call Logger', '/call-logger', 'Phone', 'Call logging system', 2, ARRAY['owner', 'admin', 'manager', 'service_advisor', 'reception']),
    
    -- Operations section
    ('Quotes', '/quotes', 'FileText', 'Quote management', 1, ARRAY['owner', 'admin', 'manager', 'service_advisor']),
    ('Work Orders', '/work-orders', 'Wrench', 'Work order management', 2, ARRAY['owner', 'admin', 'manager', 'service_advisor', 'technician']),
    ('Invoices', '/invoices', 'Receipt', 'Invoice management', 3, ARRAY['owner', 'admin', 'manager', 'service_advisor']),
    ('Service Board', '/service-board', 'ClipboardList', 'Service board overview', 4, ARRAY['owner', 'admin', 'manager', 'service_advisor', 'technician']),
    
    -- Company section
    ('Company Profile', '/company-profile', 'Building', 'Company profile settings', 1, ARRAY['owner', 'admin', 'manager']),
    ('Team', '/team', 'UserCog', 'Team management', 2, ARRAY['owner', 'admin', 'manager']),
    ('Vehicles', '/vehicles', 'Truck', 'Company vehicles', 3, ARRAY['owner', 'admin', 'manager']),
    ('Documents', '/documents', 'FileBarChart', 'Document management', 4, ARRAY['owner', 'admin', 'manager']),
    
    -- Services section
    ('Service Editor', '/service-editor', 'Cog', 'Service editor', 1, ARRAY['owner', 'admin', 'manager']),
    ('Service Library', '/services', 'Star', 'Service library', 2, ARRAY['owner', 'admin', 'manager', 'service_advisor']),
    
    -- Settings section
    ('Settings', '/settings', 'Settings', 'System settings', 1, ARRAY['owner', 'admin']),
    
    -- Support section
    ('Help', '/help', 'HelpCircle', 'Help and documentation', 1, ARRAY['owner', 'admin', 'manager', 'service_advisor', 'technician', 'reception']),
    ('Security', '/security', 'Shield', 'Security settings', 2, ARRAY['owner', 'admin'])
) AS item(title, href, icon, description, display_order, required_roles)
WHERE s.title = CASE 
  WHEN item.title IN ('Dashboard') THEN 'Dashboard'
  WHEN item.title IN ('Customers') THEN 'Customers'
  WHEN item.title IN ('Inventory') THEN 'Inventory'
  WHEN item.title IN ('Calendar', 'Service Reminders') THEN 'Scheduling'
  WHEN item.title IN ('Customer Comms', 'Call Logger') THEN 'Communications'
  WHEN item.title IN ('Quotes', 'Work Orders', 'Invoices', 'Service Board') THEN 'Operations'
  WHEN item.title IN ('Company Profile', 'Team', 'Vehicles', 'Documents') THEN 'Company'
  WHEN item.title IN ('Service Editor', 'Service Library') THEN 'Services'
  WHEN item.title IN ('Settings') THEN 'Settings'
  WHEN item.title IN ('Help', 'Security') THEN 'Support'
END;

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_navigation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_navigation_sections_updated_at
  BEFORE UPDATE ON public.navigation_sections
  FOR EACH ROW
  EXECUTE PROCEDURE update_navigation_updated_at();

CREATE TRIGGER update_navigation_items_updated_at
  BEFORE UPDATE ON public.navigation_items
  FOR EACH ROW
  EXECUTE PROCEDURE update_navigation_updated_at();

CREATE TRIGGER update_user_navigation_preferences_updated_at
  BEFORE UPDATE ON public.user_navigation_preferences
  FOR EACH ROW
  EXECUTE PROCEDURE update_navigation_updated_at();
