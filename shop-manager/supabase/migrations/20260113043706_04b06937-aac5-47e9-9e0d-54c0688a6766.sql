-- Sync existing owners/admins from profiles to water_delivery_staff
INSERT INTO water_delivery_staff (
  shop_id, first_name, last_name, email, phone, 
  profile_id, is_active, job_title, created_by
)
SELECT 
  p.shop_id,
  COALESCE(p.first_name, 'Owner'),
  COALESCE(p.last_name, ''),
  p.email,
  p.phone,
  p.id as profile_id,
  true,
  'Owner',
  p.id
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name IN ('owner', 'admin')
AND p.shop_id IS NOT NULL
AND p.email IS NOT NULL
ON CONFLICT (shop_id, email) DO NOTHING;

-- Then sync their roles to water_delivery_staff_roles
INSERT INTO water_delivery_staff_roles (staff_id, role_id, assigned_by)
SELECT 
  wds.id,
  ur.role_id,
  wds.profile_id
FROM water_delivery_staff wds
JOIN user_roles ur ON wds.profile_id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name IN ('owner', 'admin')
ON CONFLICT DO NOTHING;