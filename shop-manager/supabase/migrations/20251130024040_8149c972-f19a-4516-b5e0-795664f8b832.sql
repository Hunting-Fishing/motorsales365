-- Insert Safety & Compliance navigation section
INSERT INTO public.navigation_sections (id, title, description, display_order, is_active)
SELECT 
  gen_random_uuid(),
  'Safety & Compliance',
  'Safety compliance, inspections, and incident tracking',
  8,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.navigation_sections WHERE title = 'Safety & Compliance'
);

-- Get the section ID for inserting items
DO $$
DECLARE
  safety_section_id UUID;
BEGIN
  SELECT id INTO safety_section_id FROM public.navigation_sections WHERE title = 'Safety & Compliance';
  
  IF safety_section_id IS NOT NULL THEN
    -- Insert Safety Dashboard
    INSERT INTO public.navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
    SELECT safety_section_id, 'Safety Dashboard', '/safety', 'Shield', 'Safety overview and compliance status', 1, ARRAY['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner'], true
    WHERE NOT EXISTS (SELECT 1 FROM public.navigation_items WHERE href = '/safety');
    
    -- Insert Incidents
    INSERT INTO public.navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
    SELECT safety_section_id, 'Incidents', '/safety/incidents', 'AlertTriangle', 'Report and track safety incidents', 2, ARRAY['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner'], true
    WHERE NOT EXISTS (SELECT 1 FROM public.navigation_items WHERE href = '/safety/incidents');
    
    -- Insert Daily Inspections
    INSERT INTO public.navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
    SELECT safety_section_id, 'Daily Inspections', '/safety/inspections', 'ClipboardCheck', 'Daily shop safety inspections', 3, ARRAY['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner'], true
    WHERE NOT EXISTS (SELECT 1 FROM public.navigation_items WHERE href = '/safety/inspections');
    
    -- Insert DVIR Reports
    INSERT INTO public.navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
    SELECT safety_section_id, 'DVIR Reports', '/safety/dvir', 'Truck', 'Driver vehicle inspection reports', 4, ARRAY['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner'], true
    WHERE NOT EXISTS (SELECT 1 FROM public.navigation_items WHERE href = '/safety/dvir');
    
    -- Insert Lift Inspections
    INSERT INTO public.navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
    SELECT safety_section_id, 'Lift Inspections', '/safety/equipment', 'Package', 'Equipment and lift safety checks', 5, ARRAY['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner'], true
    WHERE NOT EXISTS (SELECT 1 FROM public.navigation_items WHERE href = '/safety/equipment');
    
    -- Insert Certifications
    INSERT INTO public.navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
    SELECT safety_section_id, 'Certifications', '/safety/certifications', 'Award', 'Staff safety certifications', 6, ARRAY['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'], true
    WHERE NOT EXISTS (SELECT 1 FROM public.navigation_items WHERE href = '/safety/certifications');
    
    -- Insert Safety Documents
    INSERT INTO public.navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
    SELECT safety_section_id, 'Safety Documents', '/safety/documents', 'FileText', 'Safety documentation and SDS', 7, ARRAY['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner'], true
    WHERE NOT EXISTS (SELECT 1 FROM public.navigation_items WHERE href = '/safety/documents');
    
    -- Insert Schedules & Reminders
    INSERT INTO public.navigation_items (section_id, title, href, icon, description, display_order, required_roles, is_active)
    SELECT safety_section_id, 'Schedules & Reminders', '/safety/schedules', 'CalendarClock', 'Safety inspection schedules', 8, ARRAY['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner'], true
    WHERE NOT EXISTS (SELECT 1 FROM public.navigation_items WHERE href = '/safety/schedules');
  END IF;
END $$;