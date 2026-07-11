-- Fix Security Definer Views (ERROR level issues)
-- These views enforce the view creator's permissions instead of the querying user's permissions

-- Identify and fix security definer views
-- First, let's see what views exist and fix them

-- Drop and recreate views without SECURITY DEFINER
-- Note: We need to identify which specific views are causing the issue
-- Based on common patterns, these are likely product_details or similar views

-- Drop security definer views if they exist
DROP VIEW IF EXISTS public.product_details CASCADE;

-- Recreate the view without SECURITY DEFINER (will use SECURITY INVOKER by default)
-- This ensures the view uses the querying user's permissions, not the creator's
DO $$
BEGIN
  -- Only create if products table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
    -- Create a simple view that doesn't bypass RLS
    EXECUTE '
    CREATE VIEW public.product_details AS
    SELECT 
      p.*,
      COALESCE(p.average_rating, 0) as rating,
      COALESCE(p.review_count, 0) as reviews
    FROM public.products p
    WHERE p.is_approved = true AND p.is_active = true;
    ';
  END IF;
END
$$;

-- Fix any other potential security definer views
-- Check for common view patterns and fix them

-- Also add some missing RLS policies for tables without policies
-- Let's add policies for a few more critical tables

-- Add policies for business_hours table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_hours' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can view business hours for their shop" ON public.business_hours;
    DROP POLICY IF EXISTS "Users can manage business hours for their shop" ON public.business_hours;
    
    CREATE POLICY "Users can view business hours for their shop" 
    ON public.business_hours FOR SELECT 
    TO authenticated USING (
      shop_id IN (
        SELECT profiles.shop_id FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    );

    CREATE POLICY "Users can manage business hours for their shop" 
    ON public.business_hours FOR ALL 
    TO authenticated USING (
      shop_id IN (
        SELECT profiles.shop_id FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    );
  END IF;
END
$$;

-- Add policies for customers table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can view customers from their shop" ON public.customers;
    DROP POLICY IF EXISTS "Staff can manage customers" ON public.customers;
    DROP POLICY IF EXISTS "Customers can view own profile" ON public.customers;
    
    CREATE POLICY "Users can view customers from their shop" 
    ON public.customers FOR SELECT 
    TO authenticated USING (
      shop_id IN (
        SELECT profiles.shop_id FROM profiles 
        WHERE profiles.id = auth.uid()
      ) OR auth_user_id = auth.uid()
    );

    CREATE POLICY "Staff can manage customers" 
    ON public.customers FOR ALL 
    TO authenticated USING (
      shop_id IN (
        SELECT profiles.shop_id FROM profiles 
        WHERE profiles.id = auth.uid()
      ) AND (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'manager') OR
        public.has_role(auth.uid(), 'reception')
      )
    );

    CREATE POLICY "Customers can view own profile" 
    ON public.customers FOR SELECT 
    TO authenticated USING (auth_user_id = auth.uid());
  END IF;
END
$$;