-- CRITICAL SECURITY FIX: Add missing RLS policies for tables with no policies
-- This addresses the 61 tables that have RLS enabled but no policies

-- Fix for basic service tables
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

-- Fix for tax-related tables
CREATE POLICY "Users can view tax settings in their shop" 
ON public.tax_settings FOR SELECT 
TO authenticated USING (
  shop_id IN (
    SELECT profiles.shop_id FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Admins can manage tax settings" 
ON public.tax_settings FOR ALL 
TO authenticated USING (
  shop_id IN (
    SELECT profiles.shop_id FROM profiles 
    WHERE profiles.id = auth.uid()
  ) AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('owner', 'admin', 'manager')
  )
);

CREATE POLICY "Users can view tax rates in their shop" 
ON public.tax_rates FOR SELECT 
TO authenticated USING (
  shop_id IN (
    SELECT profiles.shop_id FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Admins can manage tax rates" 
ON public.tax_rates FOR ALL 
TO authenticated USING (
  shop_id IN (
    SELECT profiles.shop_id FROM profiles 
    WHERE profiles.id = auth.uid()
  ) AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('owner', 'admin', 'manager')
  )
);

-- Fix for customer request tables
CREATE POLICY "Anyone can create customer requests" 
ON public.customer_requests FOR INSERT 
TO authenticated WITH CHECK (true);

-- Fix for company settings
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

-- Fix function search_path security issues
-- Update the most critical functions to include proper search_path
CREATE OR REPLACE FUNCTION public.has_permission(user_id_param uuid, permission_module text)
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
  );
END;
$$;