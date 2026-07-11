-- Assign Brian the yard_manager role (yard_manager already exists)
INSERT INTO public.user_roles (user_id, role_id)
SELECT 
  'a306082e-225e-41d5-bb9c-cae7406362ee',
  id
FROM public.roles 
WHERE name = 'yard_manager'
ON CONFLICT (user_id, role_id) DO NOTHING;