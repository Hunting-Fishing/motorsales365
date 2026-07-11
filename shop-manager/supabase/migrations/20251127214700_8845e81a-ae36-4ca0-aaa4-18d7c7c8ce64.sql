-- Brian's profile_id: 386db180-5c4b-4983-8327-e7a3c5dbfa12
-- Endogamer's profile_id: 50a9742e-7279-4031-abec-3d76ffc4b48a
-- Shop ID: ec0d4aad-982a-42b2-9d71-04ba405e265d

-- Step 1: Delete ALL Brian's permissions first
DELETE FROM public.user_permissions 
WHERE user_id = '386db180-5c4b-4983-8327-e7a3c5dbfa12';

-- Step 2: Insert Brian's specific permissions (Yard Manager)
INSERT INTO public.user_permissions (user_id, shop_id, module, actions)
VALUES 
  ('386db180-5c4b-4983-8327-e7a3c5dbfa12', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'equipment_tracking', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('386db180-5c4b-4983-8327-e7a3c5dbfa12', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'fleet_management', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('386db180-5c4b-4983-8327-e7a3c5dbfa12', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'calendar', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('386db180-5c4b-4983-8327-e7a3c5dbfa12', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'invoices', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('386db180-5c4b-4983-8327-e7a3c5dbfa12', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'inventory', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('386db180-5c4b-4983-8327-e7a3c5dbfa12', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'team', '{"view": true, "create": false, "edit": false, "delete": false}'::jsonb);

-- Step 3: Delete Endogamer's existing permissions (if any)
DELETE FROM public.user_permissions 
WHERE user_id = '50a9742e-7279-4031-abec-3d76ffc4b48a';

-- Step 4: Insert Endogamer's full access permissions (Owner) for all 29 modules
INSERT INTO public.user_permissions (user_id, shop_id, module, actions)
VALUES 
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'accounting', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'analytics', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'calendar', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'call_logger', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'customer_communications', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'customers', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'developer_tools', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'documents', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'email_campaigns', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'equipment_tracking', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'fleet_management', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'inventory', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'invoices', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'maintenance_requests', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'marketing', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'orders', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'payments', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'quotes', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'reports', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'security', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'service_catalog', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'service_packages', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'service_reminders', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'settings', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'shopping', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'sms_management', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'team', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'team_chat', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb),
  ('50a9742e-7279-4031-abec-3d76ffc4b48a', 'ec0d4aad-982a-42b2-9d71-04ba405e265d', 'work_orders', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb);