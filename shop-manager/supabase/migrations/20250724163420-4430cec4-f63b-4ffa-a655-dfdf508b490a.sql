-- Security Fixes Migration (Fixed Version)
-- Fix critical RLS vulnerabilities and tighten security policies

-- 1. CRITICAL: Enable RLS on unified_settings table and add proper policies
ALTER TABLE public.unified_settings ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on unified_settings to start fresh
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'unified_settings' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.unified_settings';
    END LOOP;
END
$$;

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
-- Drop ALL existing policies on profiles to start fresh
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.profiles';
    END LOOP;
END
$$;

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
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on user_roles to start fresh
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'user_roles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.user_roles';
    END LOOP;
END
$$;

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

-- 4. Create security settings table if it doesn't exist
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

-- Drop existing policies and create new ones for security_settings
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'security_settings' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.security_settings';
    END LOOP;
END
$$;

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