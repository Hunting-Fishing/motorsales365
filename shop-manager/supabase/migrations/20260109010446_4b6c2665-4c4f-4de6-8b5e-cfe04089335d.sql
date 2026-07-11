-- Update Counter Staff to Sales Associate
UPDATE public.gunsmith_roles 
SET name = 'Sales Associate', 
    role_type = 'sales',
    description = 'Handles firearm sales, accessories, customer consultations, and store transactions',
    updated_at = now()
WHERE id = '09d626db-c3cf-4402-b9d1-703a061689b7';

-- Insert Manager role
INSERT INTO public.gunsmith_roles (name, role_type, description, permissions, is_system, display_order)
VALUES ('Manager', 'manager', 'Day-to-day operations management, staff scheduling, customer escalations', 
  '{"jobs": ["view", "create", "edit", "delete", "assign"], "customers": ["view", "create", "edit", "delete"], "parts": ["view", "create", "edit"], "invoices": ["view", "create", "edit", "delete"], "compliance": ["view", "create"], "settings": ["view"], "team": ["view", "manage"]}',
  true, 2);

-- Insert Receptionist role
INSERT INTO public.gunsmith_roles (name, role_type, description, permissions, is_system, display_order)
VALUES ('Receptionist', 'reception', 'Front desk, phone calls, appointment scheduling, customer check-in/out',
  '{"jobs": ["view", "create"], "customers": ["view", "create", "edit"], "parts": ["view"], "invoices": ["view"], "compliance": [], "settings": [], "team": ["view"]}',
  true, 7);

-- Insert Shipping Clerk role
INSERT INTO public.gunsmith_roles (name, role_type, description, permissions, is_system, display_order)
VALUES ('Shipping Clerk', 'shipping', 'Handles FFL transfers, receiving shipments, inventory receiving',
  '{"jobs": ["view"], "customers": ["view"], "parts": ["view", "create", "edit"], "invoices": ["view"], "compliance": ["view", "create"], "settings": [], "team": []}',
  true, 8);

-- Update display order for all roles
UPDATE public.gunsmith_roles SET display_order = 1 WHERE role_type = 'shop_owner';
UPDATE public.gunsmith_roles SET display_order = 2 WHERE role_type = 'manager';
UPDATE public.gunsmith_roles SET display_order = 3 WHERE role_type = 'master_gunsmith';
UPDATE public.gunsmith_roles SET display_order = 4 WHERE role_type = 'gunsmith';
UPDATE public.gunsmith_roles SET display_order = 5 WHERE role_type = 'apprentice';
UPDATE public.gunsmith_roles SET display_order = 6 WHERE role_type = 'sales';
UPDATE public.gunsmith_roles SET display_order = 7 WHERE role_type = 'reception';
UPDATE public.gunsmith_roles SET display_order = 8 WHERE role_type = 'shipping';
UPDATE public.gunsmith_roles SET display_order = 9 WHERE role_type = 'parts_manager';