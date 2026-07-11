-- Add default permissions for all roles
-- This migration populates the permissions system with sensible defaults

-- Insert permissions for Operations area
INSERT INTO permissions (id, name, module, action, description) 
VALUES 
  (gen_random_uuid(), 'View Operations', 'operations', 'view', 'View work orders and scheduling'),
  (gen_random_uuid(), 'Create Operations', 'operations', 'create', 'Create new work orders'),
  (gen_random_uuid(), 'Edit Operations', 'operations', 'edit', 'Edit existing work orders'),
  (gen_random_uuid(), 'Delete Operations', 'operations', 'delete', 'Delete work orders'),
  (gen_random_uuid(), 'Assign Operations', 'operations', 'assign', 'Assign work orders to team members')
ON CONFLICT (module, action) DO UPDATE 
  SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Insert permissions for Assets area
INSERT INTO permissions (id, name, module, action, description) 
VALUES 
  (gen_random_uuid(), 'View Assets', 'assets', 'view', 'View equipment and inventory'),
  (gen_random_uuid(), 'Create Assets', 'assets', 'create', 'Add new equipment or inventory items'),
  (gen_random_uuid(), 'Edit Assets', 'assets', 'edit', 'Modify equipment and inventory'),
  (gen_random_uuid(), 'Delete Assets', 'assets', 'delete', 'Remove equipment or inventory items')
ON CONFLICT (module, action) DO UPDATE 
  SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Insert permissions for Financial area
INSERT INTO permissions (id, name, module, action, description) 
VALUES 
  (gen_random_uuid(), 'View Financial', 'financial', 'view', 'View invoices and financial reports'),
  (gen_random_uuid(), 'Create Financial', 'financial', 'create', 'Create invoices and payments'),
  (gen_random_uuid(), 'Edit Financial', 'financial', 'edit', 'Edit financial records'),
  (gen_random_uuid(), 'Delete Financial', 'financial', 'delete', 'Delete financial records')
ON CONFLICT (module, action) DO UPDATE 
  SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Insert permissions for Customers area
INSERT INTO permissions (id, name, module, action, description) 
VALUES 
  (gen_random_uuid(), 'View Customers', 'customers', 'view', 'View customer information'),
  (gen_random_uuid(), 'Create Customers', 'customers', 'create', 'Add new customers'),
  (gen_random_uuid(), 'Edit Customers', 'customers', 'edit', 'Edit customer information'),
  (gen_random_uuid(), 'Delete Customers', 'customers', 'delete', 'Delete customer records')
ON CONFLICT (module, action) DO UPDATE 
  SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Insert permissions for Admin area
INSERT INTO permissions (id, name, module, action, description) 
VALUES 
  (gen_random_uuid(), 'View Admin', 'admin', 'view', 'View team and settings'),
  (gen_random_uuid(), 'Create Admin', 'admin', 'create', 'Create team members'),
  (gen_random_uuid(), 'Edit Admin', 'admin', 'edit', 'Edit settings and configurations'),
  (gen_random_uuid(), 'Delete Admin', 'admin', 'delete', 'Delete team members and sensitive data')
ON CONFLICT (module, action) DO UPDATE 
  SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Assign permissions to roles based on the permission templates

-- Owner: Full access to everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'owner'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin: Full operations, assets, customers; standard financial; limited admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND (
    (p.module = 'operations') OR
    (p.module = 'assets') OR
    (p.module = 'customers') OR
    (p.module = 'financial' AND p.action IN ('view', 'create', 'edit')) OR
    (p.module = 'admin' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: Full operations; standard assets, customers; view financial; limited admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager'
  AND (
    (p.module = 'operations') OR
    (p.module = 'assets' AND p.action IN ('view', 'edit')) OR
    (p.module = 'customers' AND p.action IN ('view', 'edit')) OR
    (p.module = 'financial' AND p.action = 'view') OR
    (p.module = 'admin' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Captain, Mate, Chief Engineer, Marine Engineer, Boson, Deckhand
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'captain' AND (
  (p.module = 'operations' AND p.action IN ('view', 'create', 'edit')) OR
  (p.module = 'assets' AND p.action IN ('view', 'edit')) OR
  (p.module = 'customers' AND p.action = 'view')
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'mate' AND (
  (p.module = 'operations' AND p.action IN ('view', 'edit')) OR
  (p.module = 'assets' AND p.action = 'view')
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'chief_engineer' AND (
  (p.module = 'operations') OR (p.module = 'assets')
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'marine_engineer' AND (
  (p.module = 'operations' AND p.action IN ('view', 'edit')) OR
  (p.module = 'assets' AND p.action IN ('view', 'edit'))
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'boson' AND (
  (p.module = 'operations' AND p.action IN ('view', 'edit')) OR
  (p.module = 'assets' AND p.action = 'view')
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'deckhand' AND (
  (p.module = 'operations' AND p.action = 'view') OR
  (p.module = 'assets' AND p.action = 'view')
) ON CONFLICT DO NOTHING;

-- Technician, Service Advisor, Reception, Parts Manager, Other Staff
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'technician' AND (
  (p.module = 'operations' AND p.action IN ('view', 'edit')) OR
  (p.module = 'assets' AND p.action = 'view') OR
  (p.module = 'customers' AND p.action = 'view')
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'service_advisor' AND (
  (p.module = 'operations') OR
  (p.module = 'customers') OR
  (p.module = 'assets' AND p.action = 'view') OR
  (p.module = 'financial' AND p.action IN ('view', 'create'))
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'reception' AND (
  (p.module = 'operations' AND p.action = 'view') OR
  (p.module = 'customers' AND p.action IN ('view', 'edit'))
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'parts_manager' AND (
  (p.module = 'assets') OR
  (p.module = 'operations' AND p.action IN ('view', 'edit')) OR
  (p.module = 'financial' AND p.action IN ('view', 'create')) OR
  (p.module = 'customers' AND p.action = 'view')
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'other_staff' AND (
  (p.module = 'operations' AND p.action = 'view') OR
  (p.module = 'assets' AND p.action = 'view') OR
  (p.module = 'customers' AND p.action = 'view')
) ON CONFLICT DO NOTHING;