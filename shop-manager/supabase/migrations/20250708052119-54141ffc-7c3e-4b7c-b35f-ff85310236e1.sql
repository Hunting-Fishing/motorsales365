-- Update RLS policies for departments table to allow Owner, Manager, and Admin roles

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Only admins can modify departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can update departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can delete departments" ON public.departments;

-- Create new policies that allow Owner, Manager, and Admin roles to manage departments
CREATE POLICY "Owners, Managers, and Admins can insert departments" 
ON public.departments 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'manager', 'admin')
));

CREATE POLICY "Owners, Managers, and Admins can update departments" 
ON public.departments 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'manager', 'admin')
));

CREATE POLICY "Owners, Managers, and Admins can delete departments" 
ON public.departments 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'manager', 'admin')
));