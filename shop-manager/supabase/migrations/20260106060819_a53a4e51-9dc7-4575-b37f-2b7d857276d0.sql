-- Bootstrap the first platform developer (you) so you can access the management UI
-- This is a one-time setup - future developers can be added via the UI

INSERT INTO public.platform_developers (user_id, email, display_name, notes)
VALUES (
  'd8a6d2d2-2e08-4c0e-9902-1e836e0f3d92',
  'jordilwbailey@gmail.com',
  'Jordi Bailey',
  'Initial platform developer - system owner'
)
ON CONFLICT (user_id) DO NOTHING;