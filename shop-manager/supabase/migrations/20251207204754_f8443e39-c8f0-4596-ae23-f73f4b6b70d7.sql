-- Seed owner role permissions for Lisa's shop
INSERT INTO shop_role_permissions (shop_id, role_name, module, actions, created_by)
SELECT 
  '5f74a17c-8ed0-477b-a872-fa2d887fe7de'::uuid as shop_id,
  'owner' as role_name,
  module,
  '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb as actions,
  '8ca63b98-7a44-4f8a-8128-57787a149b75'::uuid as created_by
FROM unnest(ARRAY[
  'accounting', 'analytics', 'calendar', 'call_logger', 'customer_communications',
  'customers', 'developer_tools', 'documents', 'email_campaigns', 'equipment_tracking',
  'fleet_management', 'insurance', 'inventory', 'invoices', 'maintenance_requests',
  'marketing', 'orders', 'payments', 'quotes', 'reports', 'safety', 'security',
  'service_catalog', 'service_packages', 'service_reminders', 'settings', 'shopping',
  'sms_management', 'team', 'team_chat', 'work_orders'
]) as module
ON CONFLICT (shop_id, role_name, module) DO NOTHING;