-- CRITICAL SECURITY FIX: Add missing RLS policies for existing tables
-- First, fix the most critical ones that exist

-- Add policies for service_sectors if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_sectors' AND table_schema = 'public') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Authenticated users can read service_sectors" ON public.service_sectors;
    DROP POLICY IF EXISTS "Admins can manage service_sectors" ON public.service_sectors;
    
    CREATE POLICY "Authenticated users can read service_sectors" 
    ON public.service_sectors FOR SELECT 
    TO authenticated USING (true);

    CREATE POLICY "Admins can manage service_sectors" 
    ON public.service_sectors FOR ALL 
    TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
        AND r.name IN ('owner', 'admin', 'manager')
      )
    );
  END IF;
END
$$;

-- Add policies for company_settings if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_settings' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can view company settings in their shop" ON public.company_settings;
    DROP POLICY IF EXISTS "Admins can manage company settings" ON public.company_settings;
    
    CREATE POLICY "Users can view company settings in their shop" 
    ON public.company_settings FOR SELECT 
    TO authenticated USING (
      shop_id IN (
        SELECT profiles.shop_id FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    );

    CREATE POLICY "Admins can manage company settings" 
    ON public.company_settings FOR ALL 
    TO authenticated USING (
      shop_id IN (
        SELECT profiles.shop_id FROM profiles 
        WHERE profiles.id = auth.uid()
      ) AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
        AND r.name IN ('owner', 'admin')
      )
    );
  END IF;
END
$$;

-- Fix critical security definer functions to include search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
  SELECT r.name 
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_permission_for_action(user_id_param uuid, permission_module text, permission_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
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