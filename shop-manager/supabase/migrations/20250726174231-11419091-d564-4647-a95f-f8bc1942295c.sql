-- PHASE 2: Database Security Hardening
-- Fix security definer views and function search paths

-- 1. Fix functions with mutable search paths - Add explicit search_path setting
-- Note: We'll fix the most common security-sensitive functions first

-- Update functions that currently have mutable search paths
-- These functions need SET search_path = 'public' or appropriate schema

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = $1 AND r.name::text = $2
  );
$$;

-- Fix has_permission function
CREATE OR REPLACE FUNCTION public.has_permission(user_id_param uuid, permission_module text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
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

-- Fix has_permission_for_action function
CREATE OR REPLACE FUNCTION public.has_permission_for_action(user_id_param uuid, permission_module text, permission_action text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
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

-- Fix get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT r.name::text 
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

-- Fix is_customer function
CREATE OR REPLACE FUNCTION public.is_customer(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_id AND r.name::text = 'customer'
  );
$$;

-- Add a centralized role checking function to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.check_user_role_secure(check_user_id uuid, required_role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = check_user_id AND r.name::text = required_role
  );
$$;