-- CRITICAL SECURITY FIXES

-- 1. Fix Function Security Paths (prevents SQL injection via search path manipulation)
-- Adding SET search_path TO 'public' to all functions that don't have it

-- Fix update_navigation_updated_at function
CREATE OR REPLACE FUNCTION public.update_navigation_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix get_user_shop_id function
CREATE OR REPLACE FUNCTION public.get_user_shop_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT shop_id 
  FROM public.profiles 
  WHERE id = auth.uid();
$function$;

-- Fix migrate_company_settings_to_unified function
CREATE OR REPLACE FUNCTION public.migrate_company_settings_to_unified()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  setting_record RECORD;
  migrated_count INTEGER := 0;
BEGIN
  -- Migrate existing company_settings without conflicts
  FOR setting_record IN 
    SELECT cs.shop_id, cs.settings_key, cs.settings_value, cs.updated_at
    FROM company_settings cs
    LEFT JOIN unified_settings us ON (
      us.shop_id = cs.shop_id 
      AND us.category = 'company' 
      AND us.key = cs.settings_key
    )
    WHERE us.id IS NULL -- Only migrate if not already exists
  LOOP
    BEGIN
      INSERT INTO unified_settings (
        shop_id, 
        category, 
        key, 
        value, 
        migrated_from,
        created_at,
        updated_at
      ) VALUES (
        setting_record.shop_id,
        'company',
        setting_record.settings_key,
        setting_record.settings_value,
        'company_settings',
        setting_record.updated_at,
        setting_record.updated_at
      );
      
      migrated_count := migrated_count + 1;
      
    EXCEPTION WHEN unique_violation THEN
      -- Skip duplicates, this is safe
      CONTINUE;
    END;
  END LOOP;
  
  RETURN migrated_count;
END;
$function$;

-- Fix user_has_role function
CREATE OR REPLACE FUNCTION public.user_has_role(user_id_param uuid, role_name_param text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_id_param AND r.name::text = role_name_param
  );
$function$;

-- Fix user_has_any_role function
CREATE OR REPLACE FUNCTION public.user_has_any_role(user_id_param uuid, role_names text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_id_param AND r.name::text = ANY(role_names)
  );
$function$;

-- Fix is_admin_or_owner function
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name::text IN ('owner', 'admin')
  );
$function$;

-- Fix get_setting_safe function
CREATE OR REPLACE FUNCTION public.get_setting_safe(p_shop_id uuid, p_category text, p_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  setting_value JSONB;
BEGIN
  -- First try unified_settings
  SELECT value INTO setting_value
  FROM public.unified_settings
  WHERE shop_id = p_shop_id
    AND category = p_category
    AND key = p_key;
  
  -- If not found and category is 'company', try legacy company_settings
  IF setting_value IS NULL AND p_category = 'company' THEN
    SELECT settings_value INTO setting_value
    FROM public.company_settings
    WHERE shop_id = p_shop_id
      AND settings_key = p_key;
  END IF;
  
  RETURN COALESCE(setting_value, 'null'::jsonb);
END;
$function$;

-- Fix remove_role_from_user function
CREATE OR REPLACE FUNCTION public.remove_role_from_user(user_role_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  caller_is_admin BOOLEAN;
  target_user_id UUID;
BEGIN
  -- Get the user_id for the role we're removing
  SELECT user_id INTO target_user_id
  FROM public.user_roles
  WHERE id = user_role_id_param;
  
  -- Check if the current user is an admin or owner
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND (r.name = 'admin' OR r.name = 'owner')
  ) INTO caller_is_admin;
  
  -- Only allow admins/owners to remove roles
  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Only admins and owners can remove roles';
  END IF;
  
  -- Delete the role assignment
  DELETE FROM public.user_roles
  WHERE id = user_role_id_param;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to remove role: %', SQLERRM;
    RETURN FALSE;
END;
$function$;

-- Fix set_setting_safe function
CREATE OR REPLACE FUNCTION public.set_setting_safe(p_shop_id uuid, p_category text, p_key text, p_value jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  setting_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user safely
  current_user_id := auth.uid();
  
  -- Update/insert into unified_settings
  INSERT INTO public.unified_settings (
    shop_id, category, key, value, 
    created_by, updated_by
  ) VALUES (
    p_shop_id, p_category, p_key, p_value,
    current_user_id, current_user_id
  )
  ON CONFLICT (shop_id, category, key)
  DO UPDATE SET
    value = EXCLUDED.value,
    updated_by = current_user_id,
    updated_at = now()
  RETURNING id INTO setting_id;
  
  -- Also update legacy table if category is 'company' (for backward compatibility)
  IF p_category = 'company' THEN
    INSERT INTO public.company_settings (
      shop_id, settings_key, settings_value, updated_at
    ) VALUES (
      p_shop_id, p_key, p_value, now()
    )
    ON CONFLICT (shop_id, settings_key)
    DO UPDATE SET
      settings_value = EXCLUDED.settings_value,
      updated_at = now();
  END IF;
  
  RETURN setting_id;
END;
$function$;

-- Fix assign_role_to_user function
CREATE OR REPLACE FUNCTION public.assign_role_to_user(user_id_param uuid, role_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  caller_is_admin BOOLEAN;
  target_role_name TEXT;
  caller_role_name TEXT;
BEGIN
  -- Get the role being assigned
  SELECT name INTO target_role_name
  FROM public.roles
  WHERE id = role_id_param;
  
  -- Get the caller's highest role
  SELECT r.name INTO caller_role_name
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  ORDER BY CASE r.name
    WHEN 'owner' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'manager' THEN 3
    ELSE 4
  END
  LIMIT 1;
  
  -- Check if the current user is an admin or owner
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND (r.name = 'admin' OR r.name = 'owner')
  ) INTO caller_is_admin;
  
  -- Only allow admins/owners to assign roles
  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Only admins and owners can assign roles';
  END IF;
  
  -- Prevent role escalation: admins cannot assign owner roles
  IF caller_role_name = 'admin' AND target_role_name = 'owner' THEN
    RAISE EXCEPTION 'Admins cannot assign owner roles';
  END IF;
  
  -- Prevent self-escalation to owner
  IF user_id_param = auth.uid() AND target_role_name = 'owner' THEN
    RAISE EXCEPTION 'Cannot escalate own role to owner';
  END IF;
  
  -- Insert the new role assignment
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (user_id_param, role_id_param)
  ON CONFLICT (user_id, role_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to assign role: %', SQLERRM;
    RETURN FALSE;
END;
$function$;

-- 2. Fix RLS Policies - Shop Isolation for Profiles
-- Replace overly permissive profile access with shop-scoped access

DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;

CREATE POLICY "Users can read profiles from their shop"
ON public.profiles FOR SELECT TO authenticated 
USING (
  shop_id IN (
    SELECT shop_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Ensure profile updates are restricted to same shop
DROP POLICY IF EXISTS "Owners and admins can update profiles" ON public.profiles;

CREATE POLICY "Owners and admins can update profiles in their shop"
ON public.profiles FOR UPDATE TO authenticated 
USING (
  shop_id IN (
    SELECT p.shop_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  ) AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
  )
);

-- Create a function to check if user can access a specific shop (prevents privilege escalation)
CREATE OR REPLACE FUNCTION public.user_can_access_shop(target_shop_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() AND shop_id = target_shop_id
  );
$function$;

-- 3. Add additional security logging for role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Log role assignments and removals
  INSERT INTO public.audit_trail (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    TG_OP,
    'user_roles',
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger for role change logging
DROP TRIGGER IF EXISTS log_role_changes ON public.user_roles;
CREATE TRIGGER log_role_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();