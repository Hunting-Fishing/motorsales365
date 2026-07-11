-- Create new role entries in the roles table
INSERT INTO public.roles (name, description, priority)
VALUES 
  ('mechanic_manager', 'Oversees mechanics, assigns work, approves repairs', 50),
  ('yard_manager_assistant', 'Assists yard manager with daily operations', 60),
  ('mechanic_manager_assistant', 'Assists mechanic manager with scheduling and coordination', 60)
ON CONFLICT (name) DO NOTHING;