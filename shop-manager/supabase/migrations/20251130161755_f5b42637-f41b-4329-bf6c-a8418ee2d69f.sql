-- Phase 1: Update July originals with Nov 30 role improvements

UPDATE navigation_items 
SET required_roles = ARRAY['admin', 'manager', 'service_advisor', 'reception', 'owner']
WHERE id = '5e3b8f6a-7c2d-4e5f-9a1b-3d4e5f6a7b8c';

UPDATE navigation_items 
SET required_roles = ARRAY['admin', 'manager', 'service_advisor', 'technician', 'reception', 'owner']
WHERE id = 'b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e';

UPDATE navigation_items 
SET required_roles = ARRAY['admin', 'manager', 'service_advisor', 'reception', 'owner']
WHERE id = '4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a';

UPDATE navigation_items 
SET required_roles = ARRAY['admin', 'manager', 'service_advisor', 'reception', 'owner']
WHERE id = '5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b';

UPDATE navigation_items 
SET required_roles = ARRAY['admin', 'manager', 'service_advisor', 'technician', 'reception', 'owner']
WHERE id = '7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d';

UPDATE navigation_items 
SET required_roles = ARRAY['admin', 'manager', 'service_advisor', 'owner']
WHERE id = '8b9c0d1e-2f3a-4b5c-6d7e-8f9a0b1c2d3e';

UPDATE navigation_items 
SET required_roles = ARRAY['admin', 'manager', 'service_advisor', 'technician', 'reception', 'owner']
WHERE id = '9c0d1e2f-3a4b-5c6d-7e8f-9a0b1c2d3e4f';

UPDATE navigation_items 
SET required_roles = ARRAY['admin', 'manager', 'service_advisor', 'technician', 'reception', 'owner']
WHERE id = '0d1e2f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a';

-- Phase 2: Delete November 30th duplicates
DELETE FROM navigation_items WHERE id IN (
  '3f60f6f7-c1a3-4688-ac75-64f4a22d18b5',
  'f60aafb7-e4a5-48a7-9873-f88cdf37aa4d',
  '83b64c45-e2c2-4a42-96d9-eb84f20e6bdc',
  'b97a8bfc-c3f4-442f-a90b-42bc85a194b6',
  'b4f6a3fb-2dc9-4f9d-8b27-6fa3fb93ca8f',
  'ea459d3b-6f3d-4ea2-9da1-c53cc3f2f95a',
  'a5f2fa3e-fa24-460d-9bdd-cd89c6f9b5d4',
  '17d22b63-e6fc-49b6-8dd0-dd45a8f23dba',
  'bd8d28dc-f358-45e7-99b1-25fe2db41b4a',
  'a8a8c8cc-da8f-4c95-bf3d-b6e2e3f8dadc',
  '1a5c4d57-c7ce-4455-b2b4-eff16cc73e4f'
);

-- Phase 3: Create new navigation sections
INSERT INTO navigation_sections (id, title, description, display_order, is_active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Tools', 'Equipment and tool management', 60, true, now(), now()),
  (gen_random_uuid(), 'Equipment & Tools', 'Asset and equipment tracking', 70, true, now(), now())
ON CONFLICT DO NOTHING;

-- Phase 4: Add missing navigation items (using href column)
WITH sections AS (
  SELECT id, title FROM navigation_sections WHERE title IN (
    'Communication', 'Administration', 'Analytics & Reports', 'Operations', 
    'Tools', 'Equipment & Tools', 'Inventory', 'Customer Management'
  )
)
INSERT INTO navigation_items (id, section_id, title, href, icon, display_order, is_active, required_roles, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  s.id,
  items.title,
  items.href,
  items.icon,
  items.display_order,
  true,
  items.required_roles::text[],
  now(),
  now()
FROM (
  VALUES
    ('Communication', 'Team Chat', '/team-chat', 'MessageCircle', 10, ARRAY['admin', 'manager', 'service_advisor', 'technician', 'reception', 'owner']),
    ('Administration', 'Technician Portal', '/technician-portal', 'UserCog', 60, ARRAY['admin', 'manager', 'technician', 'owner']),
    ('Administration', 'AI Hub', '/ai-hub', 'Brain', 70, ARRAY['admin', 'manager', 'owner']),
    ('Analytics & Reports', 'Analytics', '/analytics', 'BarChart3', 10, ARRAY['admin', 'manager', 'owner']),
    ('Analytics & Reports', 'Reports', '/reports', 'FileText', 20, ARRAY['admin', 'manager', 'owner']),
    ('Analytics & Reports', 'Forms', '/forms', 'ClipboardList', 30, ARRAY['admin', 'manager', 'service_advisor', 'owner']),
    ('Analytics & Reports', 'Feedback', '/feedback', 'MessageSquare', 40, ARRAY['admin', 'manager', 'owner']),
    ('Analytics & Reports', 'Developer', '/developer', 'Code', 50, ARRAY['admin', 'owner']),
    ('Tools', 'Equipment Management', '/equipment-management', 'Settings2', 10, ARRAY['admin', 'manager', 'technician', 'owner']),
    ('Tools', 'Equipment', '/equipment', 'Wrench', 20, ARRAY['admin', 'manager', 'technician', 'owner']),
    ('Tools', 'Fleet Management', '/fleet-management', 'Truck', 30, ARRAY['admin', 'manager', 'owner']),
    ('Tools', 'Equipment Tracking', '/equipment-tracking', 'MapPin', 40, ARRAY['admin', 'manager', 'technician', 'owner']),
    ('Tools', 'Maintenance Requests', '/maintenance-requests', 'ClipboardCheck', 50, ARRAY['admin', 'manager', 'technician', 'owner']),
    ('Equipment & Tools', 'Service Packages', '/service-packages', 'Package', 10, ARRAY['admin', 'manager', 'owner']),
    ('Equipment & Tools', 'Asset Usage', '/asset-usage', 'Activity', 20, ARRAY['admin', 'manager', 'owner']),
    ('Equipment & Tools', 'Consumption Tracking', '/consumption-tracking', 'TrendingUp', 30, ARRAY['admin', 'manager', 'owner']),
    ('Equipment & Tools', 'Mobile Scanner', '/mobile-scanner', 'Scan', 40, ARRAY['admin', 'manager', 'technician', 'owner']),
    ('Equipment & Tools', 'Maintenance Planning', '/maintenance-planning', 'Calendar', 50, ARRAY['admin', 'manager', 'owner']),
    ('Inventory', 'Inventory Analytics', '/inventory-analytics', 'PieChart', 60, ARRAY['admin', 'manager', 'owner']),
    ('Customer Management', 'Customer Portal', '/customer-portal', 'Users', 50, ARRAY['admin', 'manager', 'service_advisor', 'owner']),
    ('Customer Management', 'Notifications', '/notifications', 'Bell', 60, ARRAY['admin', 'manager', 'service_advisor', 'reception', 'owner'])
) AS items(section_title, title, href, icon, display_order, required_roles)
JOIN sections s ON s.title = items.section_title
WHERE NOT EXISTS (
  SELECT 1 FROM navigation_items ni WHERE ni.href = items.href
);