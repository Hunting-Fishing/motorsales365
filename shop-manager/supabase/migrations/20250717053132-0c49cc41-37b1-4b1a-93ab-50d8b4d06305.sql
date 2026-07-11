-- Check and fix RLS policies that might be using functions with p.resource
-- Let's look at the policies on tables involved in the role checking query

-- Check current policies on user_roles table
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('user_roles', 'roles', 'role_permissions', 'permissions')
ORDER BY tablename, policyname;

-- Drop any problematic policies that might be referencing incorrect functions
-- and recreate them with proper column references

-- Update RLS policies for roles table if they exist
DROP POLICY IF EXISTS "Users can view roles" ON public.roles;
CREATE POLICY "Users can view roles" 
ON public.roles 
FOR SELECT 
TO authenticated
USING (true);

-- Update RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can view their roles" ON public.user_roles;
CREATE POLICY "Users can view their roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.user_roles ur2 
  JOIN public.roles r ON r.id = ur2.role_id 
  WHERE ur2.user_id = auth.uid() AND r.name IN ('admin', 'owner')
));

-- Enable RLS on tables if not already enabled
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;