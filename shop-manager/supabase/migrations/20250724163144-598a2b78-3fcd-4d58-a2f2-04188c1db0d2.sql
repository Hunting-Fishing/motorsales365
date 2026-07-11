-- Security Fixes Migration
-- Fix critical RLS vulnerabilities and tighten security policies

-- 1. CRITICAL: Enable RLS on unified_settings table and add proper policies
ALTER TABLE public.unified_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "Anyone can view unified settings" ON public.unified_settings;
DROP POLICY IF EXISTS "Anyone can manage unified settings" ON public.unified_settings;

-- Create secure policies for unified_settings
CREATE POLICY "Users can view settings from their shop"
ON public.unified_settings FOR SELECT
USING (shop_id IN (
  SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can insert settings for their shop"
ON public.unified_settings FOR INSERT
WITH CHECK (shop_id IN (
  SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can update settings in their shop"
ON public.unified_settings FOR UPDATE
USING (shop_id IN (
  SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can delete settings from their shop"
ON public.unified_settings FOR DELETE
USING (shop_id IN (
  SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
));

-- 2. CRITICAL: Fix overly permissive profiles table policies
-- Drop the dangerous "anyone can" policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;

-- Create secure policies for profiles table
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Owners and admins can view all profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
  )
);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  -- Prevent users from changing their shop_id or other critical fields
  shop_id = (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Owners and admins can update profiles in their shop"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.shop_id = profiles.shop_id
    )
  )
);

CREATE POLICY "Owners and admins can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
  )
);

-- 3. HIGH: Secure user_roles table to prevent privilege escalation
-- Enable RLS if not already enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can manage user roles" ON public.user_roles;

-- Create secure policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Owners and admins can view all user roles in their shop"
ON public.user_roles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
    AND EXISTS (
      SELECT 1 FROM public.profiles target_profile
      WHERE target_profile.id = user_roles.user_id 
      AND target_profile.shop_id = p.shop_id
    )
  )
);

CREATE POLICY "Only owners and admins can assign roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
    AND EXISTS (
      SELECT 1 FROM public.profiles target_profile
      WHERE target_profile.id = user_roles.user_id 
      AND target_profile.shop_id = p.shop_id
    )
  )
);

CREATE POLICY "Only owners and admins can remove roles"
ON public.user_roles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
    AND EXISTS (
      SELECT 1 FROM public.profiles target_profile
      WHERE target_profile.id = user_roles.user_id 
      AND target_profile.shop_id = p.shop_id
    )
  )
);

-- 4. MEDIUM: Add security to database functions
-- Update functions to have proper search_path settings
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = $1 AND r.name = $2::app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name 
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

-- 5. Add audit logging trigger to sensitive tables
CREATE OR REPLACE FUNCTION public.audit_sensitive_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource,
    resource_id,
    details,
    ip_address,
    created_at
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END,
    inet_client_addr()::text,
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

-- 6. Create security settings table for additional controls
CREATE TABLE IF NOT EXISTS public.security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  password_policy jsonb DEFAULT '{"min_length": 8, "require_numbers": true, "require_special": true}'::jsonb,
  session_timeout_minutes integer DEFAULT 480, -- 8 hours
  max_login_attempts integer DEFAULT 5,
  lockout_duration_minutes integer DEFAULT 30,
  require_2fa boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(shop_id)
);

ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view security settings from their shop"
ON public.security_settings FOR SELECT
USING (shop_id IN (
  SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Owners and admins can manage security settings"
ON public.security_settings FOR ALL
USING (
  shop_id IN (
    SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
  ) AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
  )
);

-- Insert default security settings for existing shops
INSERT INTO public.security_settings (shop_id)
SELECT DISTINCT shop_id FROM public.profiles
WHERE shop_id IS NOT NULL
ON CONFLICT (shop_id) DO NOTHING;