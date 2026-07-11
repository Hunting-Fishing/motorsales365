-- Create a SECURITY DEFINER function to check admin/owner status without RLS recursion
CREATE OR REPLACE FUNCTION public.check_user_is_admin_or_owner(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  is_admin_owner boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = check_user_id
    AND r.name IN ('owner', 'admin')
  ) INTO is_admin_owner;
  
  RETURN is_admin_owner;
END;
$$;

-- Drop existing problematic policies on user_roles
DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_shop_admin" ON public.user_roles;
DROP POLICY IF EXISTS "Owners and admins can manage user_roles" ON public.user_roles;

-- Create new policies using the secure SECURITY DEFINER function

-- Select policy: Authenticated users can read user_roles
CREATE POLICY "user_roles_select_authenticated" ON public.user_roles
FOR SELECT TO authenticated
USING (true);

-- Insert policy: Admins/Owners can assign roles
CREATE POLICY "user_roles_insert_admin" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  public.check_user_is_admin_or_owner(auth.uid())
);

-- Update policy: Admins/Owners can update roles
CREATE POLICY "user_roles_update_admin" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.check_user_is_admin_or_owner(auth.uid()))
WITH CHECK (public.check_user_is_admin_or_owner(auth.uid()));

-- Delete policy: Admins/Owners can remove roles
CREATE POLICY "user_roles_delete_admin" ON public.user_roles
FOR DELETE TO authenticated
USING (public.check_user_is_admin_or_owner(auth.uid()));