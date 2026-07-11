-- Find and fix functions that reference p.resource incorrectly
-- First, let's see what functions might be using p.resource
-- Looking at the error pattern, it's likely a function checking permissions

-- Update any function that incorrectly references p.resource to use p.module instead
-- This is a common issue when permission checking functions use wrong column names

-- Drop any existing problematic functions and recreate them correctly
DROP FUNCTION IF EXISTS public.check_user_permission(uuid, text);
DROP FUNCTION IF EXISTS public.has_permission(uuid, text);
DROP FUNCTION IF EXISTS public.user_has_permission(uuid, text);

-- Create a proper permission checking function
CREATE OR REPLACE FUNCTION public.has_permission(user_id_param uuid, permission_module text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = user_id_param 
    AND p.module = permission_module
  );
END;
$$;

-- Also create a function to check specific actions
CREATE OR REPLACE FUNCTION public.has_permission_for_action(user_id_param uuid, permission_module text, permission_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = user_id_param 
    AND p.module = permission_module
    AND p.action = permission_action
  );
END;
$$;