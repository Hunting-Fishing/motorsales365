-- Fix Store section navigation items to be accessible to all authenticated users, not just customers
-- Update Store navigation items to include all common roles
UPDATE navigation_items 
SET required_roles = ARRAY['owner','admin','manager','service_advisor','technician','reception','customer']
WHERE section_id = (SELECT id FROM navigation_sections WHERE title = 'Store');