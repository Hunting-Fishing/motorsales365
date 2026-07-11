-- Insert Projects navigation item into Operations section
INSERT INTO navigation_items (
  section_id, 
  title, 
  href, 
  icon, 
  description, 
  display_order, 
  required_roles, 
  is_active
) VALUES (
  '9ff96515-28ac-442b-be47-2414dc70c030',
  'Project Budgets',
  '/projects',
  'FolderKanban',
  'Large-scale project budgeting and tracking',
  7,
  ARRAY['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'],
  true
);