-- Add missing permissions for Brian (yard_manager user)
-- User ID: a306082e-225e-41d5-bb9c-cae7406362ee
-- Shop ID: ec0d4aad-982a-42b2-9d71-04ba405e265d

INSERT INTO user_permissions (user_id, shop_id, module, actions, created_by)
VALUES 
  -- Payments access
  ('a306082e-225e-41d5-bb9c-cae7406362ee', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'payments', 
   '{"view": true, "create": true, "edit": true, "delete": false}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- Customer communications access
  ('a306082e-225e-41d5-bb9c-cae7406362ee', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'customer_communications', 
   '{"view": true, "create": true, "edit": true, "delete": false}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- Call logger access
  ('a306082e-225e-41d5-bb9c-cae7406362ee', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'call_logger', 
   '{"view": true, "create": true, "edit": true, "delete": false}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a')
ON CONFLICT (user_id, shop_id, module) DO UPDATE SET 
  actions = EXCLUDED.actions,
  updated_at = now();

-- Also create default yard_manager role permissions for the shop
INSERT INTO shop_role_permissions (shop_id, role_name, module, actions, created_by)
VALUES 
  -- inventory
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'inventory', 
   '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- work_orders
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'work_orders', 
   '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- equipment_tracking
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'equipment_tracking', 
   '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- maintenance_requests
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'maintenance_requests', 
   '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- fleet_management
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'fleet_management', 
   '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- service_packages
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'service_packages', 
   '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- calendar
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'calendar', 
   '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- customers
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'customers', 
   '{"view": true, "create": true, "edit": true, "delete": false}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- team
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'team', 
   '{"view": true, "create": false, "edit": false, "delete": false}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- team_chat
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'team_chat', 
   '{"view": true, "create": true, "edit": true, "delete": false}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- reports
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'reports', 
   '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- analytics
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'analytics', 
   '{"view": true, "create": false, "edit": false, "delete": false}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- service_catalog
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'service_catalog', 
   '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- documents
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'documents', 
   '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- invoices
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'invoices', 
   '{"view": true, "create": true, "edit": true, "delete": false}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- quotes
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'quotes', 
   '{"view": true, "create": true, "edit": true, "delete": false}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- payments
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'payments', 
   '{"view": true, "create": true, "edit": true, "delete": false}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- customer_communications
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'customer_communications', 
   '{"view": true, "create": true, "edit": true, "delete": false}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- call_logger
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'call_logger', 
   '{"view": true, "create": true, "edit": true, "delete": false}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- service_reminders
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'service_reminders', 
   '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- shopping
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'shopping', 
   '{"view": true, "create": true, "edit": true, "delete": false}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a'),
  -- orders
  ('ec0d4aad-982a-42b2-9d71-04ba405e265d', 'yard_manager', 'orders', 
   '{"view": true, "create": true, "edit": true, "delete": false}'::jsonb, 
   '50a9742e-7279-4031-abec-3d76ffc4b48a')
ON CONFLICT (shop_id, role_name, module) DO UPDATE SET 
  actions = EXCLUDED.actions,
  updated_at = now();