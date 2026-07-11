-- Insert missing navigation items into the database

-- First, get the section IDs we need
-- We'll use a CTE to handle the inserts properly

-- Insert Technician Portal into Tools section
INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT 
  ns.id,
  'Technician Portal',
  '/technician-portal',
  'HardHat',
  'Mobile-first technician interface',
  1,
  ARRAY['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner'],
  true
FROM navigation_sections ns
WHERE ns.title = 'Tools'
ON CONFLICT DO NOTHING;

-- Insert Daily Logs into Operations section
INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT 
  ns.id,
  'Daily Logs',
  '/daily-logs',
  'FileText',
  'Daily operational logs',
  3,
  ARRAY['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner'],
  true
FROM navigation_sections ns
WHERE ns.title = 'Operations'
ON CONFLICT DO NOTHING;

-- Insert Timesheet into Company section
INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT 
  ns.id,
  'Timesheet',
  '/timesheet',
  'Clock',
  'Track work hours and attendance',
  3,
  ARRAY[]::text[],
  true
FROM navigation_sections ns
WHERE ns.title = 'Company'
ON CONFLICT DO NOTHING;

-- Insert Insurance into Company section
INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT 
  ns.id,
  'Insurance',
  '/insurance',
  'Shield',
  'Fleet and equipment insurance',
  5,
  ARRAY['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'],
  true
FROM navigation_sections ns
WHERE ns.title = 'Company'
ON CONFLICT DO NOTHING;

-- Insert Fleet Management into Equipment & Tools section
INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT 
  ns.id,
  'Fleet Management',
  '/fleet-management',
  'Truck',
  'Manage company vehicles and fleet',
  2,
  ARRAY['admin', 'manager', 'captain', 'yard_manager', 'mechanic_manager', 'owner'],
  true
FROM navigation_sections ns
WHERE ns.title = 'Equipment & Tools'
ON CONFLICT DO NOTHING;

-- Insert Equipment Tracking into Equipment & Tools section
INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT 
  ns.id,
  'Equipment Tracking',
  '/equipment-tracking',
  'MapPin',
  'Track equipment location and status',
  3,
  ARRAY['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner'],
  true
FROM navigation_sections ns
WHERE ns.title = 'Equipment & Tools'
ON CONFLICT DO NOTHING;

-- Insert Analytics into Tools section
INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT 
  ns.id,
  'Analytics',
  '/analytics',
  'BarChart3',
  'Business analytics and insights',
  3,
  ARRAY['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'],
  true
FROM navigation_sections ns
WHERE ns.title = 'Tools'
ON CONFLICT DO NOTHING;

-- Update Safety & Compliance section display_order to avoid conflicts
UPDATE navigation_sections 
SET display_order = 9 
WHERE title = 'Safety & Compliance';