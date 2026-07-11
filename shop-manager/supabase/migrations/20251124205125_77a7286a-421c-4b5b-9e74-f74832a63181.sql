-- Phase 4: Fix tables and insert data

-- Ensure unique constraint exists on permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'permissions_module_action_key'
  ) THEN
    ALTER TABLE permissions ADD CONSTRAINT permissions_module_action_key UNIQUE (module, action);
  END IF;
END $$;

-- Now safely insert permissions
INSERT INTO permissions (name, description, module, action) VALUES
  ('View Work Orders', 'Can view work orders', 'workOrders', 'view'),
  ('Create Work Orders', 'Can create work orders', 'workOrders', 'create'),
  ('Edit Work Orders', 'Can edit work orders', 'workOrders', 'edit'),
  ('Delete Work Orders', 'Can delete work orders', 'workOrders', 'delete'),
  ('Assign Work Orders', 'Can assign work orders to technicians', 'workOrders', 'assign'),
  ('View Inventory', 'Can view inventory', 'inventory', 'view'),
  ('Create Inventory', 'Can create inventory items', 'inventory', 'create'),
  ('Edit Inventory', 'Can edit inventory items', 'inventory', 'edit'),
  ('Delete Inventory', 'Can delete inventory items', 'inventory', 'delete'),
  ('View Invoices', 'Can view invoices', 'invoices', 'view'),
  ('Create Invoices', 'Can create invoices', 'invoices', 'create'),
  ('Edit Invoices', 'Can edit invoices', 'invoices', 'edit'),
  ('Delete Invoices', 'Can delete invoices', 'invoices', 'delete'),
  ('View Customers', 'Can view customers', 'customers', 'view'),
  ('Create Customers', 'Can create customers', 'customers', 'create'),
  ('Edit Customers', 'Can edit customers', 'customers', 'edit'),
  ('Delete Customers', 'Can delete customers', 'customers', 'delete'),
  ('View Team', 'Can view team members', 'team', 'view'),
  ('Create Team', 'Can create team members', 'team', 'create'),
  ('Edit Team', 'Can edit team members', 'team', 'edit'),
  ('Delete Team', 'Can delete team members', 'team', 'delete'),
  ('View Reports', 'Can view reports', 'reports', 'view'),
  ('Generate Reports', 'Can generate reports', 'reports', 'generate'),
  ('View Settings', 'Can view settings', 'settings', 'view'),
  ('Edit Settings', 'Can edit settings', 'settings', 'edit')
ON CONFLICT ON CONSTRAINT permissions_module_action_key DO NOTHING;