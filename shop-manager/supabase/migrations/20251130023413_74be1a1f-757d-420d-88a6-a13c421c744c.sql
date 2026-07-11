
-- Add DELETE policy for vehicle_inspections (uses technician_id, not shop_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicle_inspections' 
    AND policyname = 'Technicians can delete own vehicle inspections'
  ) THEN
    CREATE POLICY "Technicians can delete own vehicle inspections"
    ON public.vehicle_inspections FOR DELETE TO authenticated
    USING (technician_id = auth.uid());
  END IF;
END $$;

-- Add DELETE policy for equipment_inspections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'equipment_inspections' 
    AND policyname = 'Authenticated users can delete equipment inspections'
  ) THEN
    CREATE POLICY "Authenticated users can delete equipment inspections"
    ON public.equipment_inspections FOR DELETE TO authenticated
    USING (true);
  END IF;
END $$;

-- Insert safety permissions if they don't exist
INSERT INTO public.permissions (name, description, module, action)
SELECT 'safety.view', 'View safety records and inspections', 'safety', 'view'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'safety' AND action = 'view');

INSERT INTO public.permissions (name, description, module, action)
SELECT 'safety.create', 'Create safety records and inspections', 'safety', 'create'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'safety' AND action = 'create');

INSERT INTO public.permissions (name, description, module, action)
SELECT 'safety.edit', 'Edit safety records and inspections', 'safety', 'edit'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'safety' AND action = 'edit');

INSERT INTO public.permissions (name, description, module, action)
SELECT 'safety.delete', 'Delete safety records and inspections', 'safety', 'delete'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'safety' AND action = 'delete');

-- Add shop_role_permissions for safety module (for all relevant roles)
INSERT INTO public.shop_role_permissions (shop_id, role_name, module, actions)
SELECT s.id, 'owner', 'safety', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_role_permissions 
  WHERE shop_id = s.id AND role_name = 'owner' AND module = 'safety'
);

INSERT INTO public.shop_role_permissions (shop_id, role_name, module, actions)
SELECT s.id, 'admin', 'safety', '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_role_permissions 
  WHERE shop_id = s.id AND role_name = 'admin' AND module = 'safety'
);

INSERT INTO public.shop_role_permissions (shop_id, role_name, module, actions)
SELECT s.id, 'manager', 'safety', '{"view": true, "create": true, "edit": true, "delete": false}'::jsonb
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_role_permissions 
  WHERE shop_id = s.id AND role_name = 'manager' AND module = 'safety'
);

INSERT INTO public.shop_role_permissions (shop_id, role_name, module, actions)
SELECT s.id, 'technician', 'safety', '{"view": true, "create": true, "edit": true, "delete": false}'::jsonb
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_role_permissions 
  WHERE shop_id = s.id AND role_name = 'technician' AND module = 'safety'
);

INSERT INTO public.shop_role_permissions (shop_id, role_name, module, actions)
SELECT s.id, 'service_advisor', 'safety', '{"view": true, "create": true, "edit": false, "delete": false}'::jsonb
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_role_permissions 
  WHERE shop_id = s.id AND role_name = 'service_advisor' AND module = 'safety'
);

INSERT INTO public.shop_role_permissions (shop_id, role_name, module, actions)
SELECT s.id, 'employee', 'safety', '{"view": true, "create": false, "edit": false, "delete": false}'::jsonb
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_role_permissions 
  WHERE shop_id = s.id AND role_name = 'employee' AND module = 'safety'
);
