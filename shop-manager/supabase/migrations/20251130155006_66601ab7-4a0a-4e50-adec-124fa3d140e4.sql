-- Insert missing navigation items into the database
-- This migration adds comprehensive navigation coverage for all routes

-- First, create the Marketing section if it doesn't exist
INSERT INTO navigation_sections (title, description, display_order, is_active)
SELECT 'Marketing', 'Email and SMS marketing tools', 7, true
WHERE NOT EXISTS (SELECT 1 FROM navigation_sections WHERE title = 'Marketing');

-- Insert missing items into existing sections

-- Operations Section Items
INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Service Board', '/service-board', 'ClipboardCheck', 'Visual service workflow board', 2, ARRAY['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Operations'
ON CONFLICT DO NOTHING;

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Payments', '/payments', 'DollarSign', 'Payment processing', 6, ARRAY['admin', 'manager', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Operations'
ON CONFLICT DO NOTHING;

-- Scheduling Section Items
INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Staff Scheduling', '/scheduling', 'CalendarDays', 'Manage staff schedules', 2, ARRAY['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Scheduling'
ON CONFLICT DO NOTHING;

-- Communications Section Items
INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Call Logger', '/call-logger', 'Phone', 'Log phone calls', 3, ARRAY['admin', 'manager', 'service_advisor', 'reception', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Communications'
ON CONFLICT DO NOTHING;

-- Marketing Section Items
INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Email Campaigns', '/email-campaigns', 'Mail', 'Manage email campaigns', 1, ARRAY['admin', 'manager', 'service_advisor', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Marketing'
ON CONFLICT DO NOTHING;

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Email Sequences', '/email-sequences', 'Send', 'Automated email flows', 2, ARRAY['admin', 'manager', 'service_advisor', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Marketing'
ON CONFLICT DO NOTHING;

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Email Templates', '/email-templates', 'FileText', 'Email template library', 3, ARRAY['admin', 'manager', 'service_advisor', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Marketing'
ON CONFLICT DO NOTHING;

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'SMS Management', '/sms-management', 'MessageCircle', 'SMS campaigns', 4, ARRAY['admin', 'manager', 'service_advisor', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Marketing'
ON CONFLICT DO NOTHING;

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'SMS Templates', '/sms-templates', 'MessageSquare', 'SMS template library', 5, ARRAY['admin', 'manager', 'service_advisor', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Marketing'
ON CONFLICT DO NOTHING;

-- Tools Section Items
INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Reports', '/reports', 'BarChart3', 'Analytics and reports', 4, ARRAY['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Tools'
ON CONFLICT DO NOTHING;

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Forms', '/forms', 'FormInput', 'Custom forms', 5, ARRAY['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Tools'
ON CONFLICT DO NOTHING;

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Feedback', '/feedback', 'ThumbsUp', 'Customer feedback', 6, ARRAY['admin', 'manager', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Tools'
ON CONFLICT DO NOTHING;

-- Equipment & Tools Section Items
INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Equipment', '/equipment', 'Package', 'Equipment list', 1, ARRAY['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Equipment & Tools'
ON CONFLICT DO NOTHING;

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Maintenance Requests', '/maintenance-requests', 'Wrench', 'Track maintenance requests', 4, ARRAY['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Equipment & Tools'
ON CONFLICT DO NOTHING;

-- Company Section Items
INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Training', '/training-overview', 'GraduationCap', 'Staff training overview', 4, ARRAY['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Company'
ON CONFLICT DO NOTHING;

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Documents', '/documents', 'FolderOpen', 'Document management', 6, ARRAY['admin', 'manager', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Company'
ON CONFLICT DO NOTHING;

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Profile', '/profile', 'User', 'Your profile', 7, ARRAY[]::text[], true
FROM navigation_sections ns WHERE ns.title = 'Company'
ON CONFLICT DO NOTHING;

-- Support Section (create if needed and add items)
INSERT INTO navigation_sections (title, description, display_order, is_active)
SELECT 'Support', 'Help and support resources', 11, true
WHERE NOT EXISTS (SELECT 1 FROM navigation_sections WHERE title = 'Support');

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Help', '/help', 'HelpCircle', 'Help and support', 1, ARRAY[]::text[], true
FROM navigation_sections ns WHERE ns.title = 'Support'
ON CONFLICT DO NOTHING;

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Feature Requests', '/feature-requests', 'Lightbulb', 'Request new features', 2, ARRAY[]::text[], true
FROM navigation_sections ns WHERE ns.title = 'Support'
ON CONFLICT DO NOTHING;

-- Services Section (create if needed and add items)
INSERT INTO navigation_sections (title, description, display_order, is_active)
SELECT 'Services', 'Service management', 6, true
WHERE NOT EXISTS (SELECT 1 FROM navigation_sections WHERE title = 'Services');

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Service Library', '/services', 'Library', 'Service catalog', 1, ARRAY['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Services'
ON CONFLICT DO NOTHING;

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Service Editor', '/service-editor', 'Edit3', 'Edit service definitions', 2, ARRAY['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Services'
ON CONFLICT DO NOTHING;

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Repair Plans', '/repair-plans', 'ClipboardCopy', 'Repair plan templates', 3, ARRAY['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner'], true
FROM navigation_sections ns WHERE ns.title = 'Services'
ON CONFLICT DO NOTHING;

-- Store Section (create if needed and add items)
INSERT INTO navigation_sections (title, description, display_order, is_active)
SELECT 'Store', 'Shop and ordering', 10, true
WHERE NOT EXISTS (SELECT 1 FROM navigation_sections WHERE title = 'Store');

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Shopping', '/shopping', 'ShoppingCart', 'Browse products', 1, ARRAY[]::text[], true
FROM navigation_sections ns WHERE ns.title = 'Store'
ON CONFLICT DO NOTHING;

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'Wishlist', '/wishlist', 'Heart', 'Saved items', 2, ARRAY[]::text[], true
FROM navigation_sections ns WHERE ns.title = 'Store'
ON CONFLICT DO NOTHING;

INSERT INTO navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
SELECT ns.id, 'My Orders', '/orders', 'ShoppingBag', 'Order history', 3, ARRAY[]::text[], true
FROM navigation_sections ns WHERE ns.title = 'Store'
ON CONFLICT DO NOTHING;