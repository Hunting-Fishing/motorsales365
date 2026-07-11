-- Create security definer functions to prevent infinite recursion in RLS policies

-- Function to safely get user's shop_id
CREATE OR REPLACE FUNCTION public.get_user_shop_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shop_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Function to check if user belongs to a specific shop
CREATE OR REPLACE FUNCTION public.is_shop_member(shop_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND shop_id = shop_uuid
  );
$$;

-- Function to get user profile data safely
CREATE OR REPLACE FUNCTION public.get_user_profile_data()
RETURNS TABLE(
  user_id UUID,
  shop_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  role TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, shop_id, first_name, last_name, email, role::TEXT
  FROM public.profiles 
  WHERE id = auth.uid() 
  LIMIT 1;
$$;

-- Drop existing problematic policies on profiles table
DROP POLICY IF EXISTS "Users can view profiles in their shop" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create new non-recursive policies for profiles table
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- Create policy for viewing other profiles in same shop (using auth.uid() directly)
CREATE POLICY "Users can view profiles in their shop"
ON public.profiles
FOR SELECT
USING (
  shop_id IN (
    SELECT p.shop_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

-- Update work_orders policies to use the new security definer functions
DROP POLICY IF EXISTS "Users can view work orders from their shop" ON public.work_orders;
DROP POLICY IF EXISTS "Users can insert work orders into their shop" ON public.work_orders;
DROP POLICY IF EXISTS "Users can update work orders in their shop" ON public.work_orders;
DROP POLICY IF EXISTS "Users can delete work orders from their shop" ON public.work_orders;

CREATE POLICY "Users can view work orders from their shop"
ON public.work_orders
FOR SELECT
USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can insert work orders into their shop"
ON public.work_orders
FOR INSERT
WITH CHECK (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can update work orders in their shop"
ON public.work_orders
FOR UPDATE
USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can delete work orders from their shop"
ON public.work_orders
FOR DELETE
USING (shop_id = public.get_user_shop_id());

-- Update customers policies to use the new security definer functions
DROP POLICY IF EXISTS "Users can view customers from their shop" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers into their shop" ON public.customers;
DROP POLICY IF EXISTS "Users can update customers in their shop" ON public.customers;
DROP POLICY IF EXISTS "Users can delete customers from their shop" ON public.customers;

CREATE POLICY "Users can view customers from their shop"
ON public.customers
FOR SELECT
USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can insert customers into their shop"
ON public.customers
FOR INSERT
WITH CHECK (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can update customers in their shop"
ON public.customers
FOR UPDATE
USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can delete customers from their shop"
ON public.customers
FOR DELETE
USING (shop_id = public.get_user_shop_id());

-- Update vehicles policies to use the new security definer functions
DROP POLICY IF EXISTS "Users can view vehicles from their shop" ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert vehicles into their shop" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update vehicles in their shop" ON public.vehicles;
DROP POLICY IF EXISTS "Users can delete vehicles from their shop" ON public.vehicles;

CREATE POLICY "Users can view vehicles from their shop"
ON public.vehicles
FOR SELECT
USING (
  CASE 
    WHEN owner_type = 'company' THEN shop_id = public.get_user_shop_id()
    WHEN owner_type = 'customer' THEN public.is_shop_member(
      (SELECT shop_id FROM public.customers WHERE id = customer_id LIMIT 1)
    )
    ELSE false
  END
);

CREATE POLICY "Users can insert vehicles into their shop"
ON public.vehicles
FOR INSERT
WITH CHECK (
  CASE 
    WHEN owner_type = 'company' THEN shop_id = public.get_user_shop_id()
    WHEN owner_type = 'customer' THEN public.is_shop_member(
      (SELECT shop_id FROM public.customers WHERE id = customer_id LIMIT 1)
    )
    ELSE false
  END
);

CREATE POLICY "Users can update vehicles in their shop"
ON public.vehicles
FOR UPDATE
USING (
  CASE 
    WHEN owner_type = 'company' THEN shop_id = public.get_user_shop_id()
    WHEN owner_type = 'customer' THEN public.is_shop_member(
      (SELECT shop_id FROM public.customers WHERE id = customer_id LIMIT 1)
    )
    ELSE false
  END
);

CREATE POLICY "Users can delete vehicles from their shop"
ON public.vehicles
FOR DELETE
USING (
  CASE 
    WHEN owner_type = 'company' THEN shop_id = public.get_user_shop_id()
    WHEN owner_type = 'customer' THEN public.is_shop_member(
      (SELECT shop_id FROM public.customers WHERE id = customer_id LIMIT 1)
    )
    ELSE false
  END
);