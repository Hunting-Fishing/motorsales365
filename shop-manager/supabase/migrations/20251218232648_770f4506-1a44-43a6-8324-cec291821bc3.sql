-- Insert safety module permissions for owner role
INSERT INTO shop_role_permissions (shop_id, role_name, module, actions, created_at, updated_at)
SELECT DISTINCT
  shop_id,
  'owner' as role_name,
  'safety' as module,
  '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb as actions,
  now() as created_at,
  now() as updated_at
FROM shop_role_permissions
WHERE role_name = 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM shop_role_permissions srp 
    WHERE srp.shop_id = shop_role_permissions.shop_id 
      AND srp.role_name = 'owner' 
      AND srp.module = 'safety'
  );