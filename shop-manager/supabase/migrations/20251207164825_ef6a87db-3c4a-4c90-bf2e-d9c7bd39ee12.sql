
-- CRITICAL SECURITY FIX: Multi-tenant data isolation
-- Phase 1: Fix RLS policies for tables WITH shop_id column

-- First, ensure get_user_shop_id function exists
CREATE OR REPLACE FUNCTION public.get_current_user_shop_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid() LIMIT 1;
$$;

-- INVENTORY_ITEMS: Fix the open SELECT policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow authenticated users to read inventory" ON public.inventory_items;
CREATE POLICY "Users can only view inventory in their shop"
ON public.inventory_items FOR SELECT TO authenticated
USING (shop_id = public.get_current_user_shop_id());

-- WORK_ORDERS: Fix open policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.work_orders;
DROP POLICY IF EXISTS "Allow authenticated users to read work orders" ON public.work_orders;
CREATE POLICY "Users can only view work orders in their shop"
ON public.work_orders FOR SELECT TO authenticated
USING (shop_id = public.get_current_user_shop_id());

-- CUSTOMERS: Fix open policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated users to read customers" ON public.customers;
CREATE POLICY "Users can only view customers in their shop"
ON public.customers FOR SELECT TO authenticated
USING (shop_id = public.get_current_user_shop_id());

-- CONTACTS: Fix open policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can read contacts" ON public.contacts;
CREATE POLICY "Users can only view contacts in their shop"
ON public.contacts FOR SELECT TO authenticated
USING (shop_id = public.get_current_user_shop_id());

-- CONTACT_CATEGORIES: Fix open policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.contact_categories;
DROP POLICY IF EXISTS "Authenticated users can read contact categories" ON public.contact_categories;
CREATE POLICY "Users can only view contact categories in their shop"
ON public.contact_categories FOR SELECT TO authenticated
USING (shop_id = public.get_current_user_shop_id());

-- RESOURCES: Fix open policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.resources;
DROP POLICY IF EXISTS "Authenticated users can read resources" ON public.resources;
CREATE POLICY "Users can only view resources in their shop"
ON public.resources FOR SELECT TO authenticated
USING (shop_id = public.get_current_user_shop_id());

-- EQUIPMENT_ASSETS: Fix open policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.equipment_assets;
DROP POLICY IF EXISTS "Allow authenticated users to read equipment" ON public.equipment_assets;
CREATE POLICY "Users can only view equipment in their shop"
ON public.equipment_assets FOR SELECT TO authenticated
USING (shop_id = public.get_current_user_shop_id());

-- VEHICLES: Uses customer_id, so filter through customers table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.vehicles;
DROP POLICY IF EXISTS "Allow authenticated users to read vehicles" ON public.vehicles;
CREATE POLICY "Users can only view vehicles in their shop"
ON public.vehicles FOR SELECT TO authenticated
USING (
  customer_id IN (SELECT id FROM public.customers WHERE shop_id = public.get_current_user_shop_id())
);

-- APPOINTMENTS: Uses customer_id
DROP POLICY IF EXISTS "Enable read access for all users" ON public.appointments;
DROP POLICY IF EXISTS "Allow authenticated users to read appointments" ON public.appointments;
CREATE POLICY "Users can only view appointments in their shop"
ON public.appointments FOR SELECT TO authenticated
USING (
  customer_id IN (SELECT id FROM public.customers WHERE shop_id = public.get_current_user_shop_id())
);

-- INVOICES: Uses customer_id
DROP POLICY IF EXISTS "Enable read access for all users" ON public.invoices;
DROP POLICY IF EXISTS "Allow authenticated users to read invoices" ON public.invoices;
CREATE POLICY "Users can only view invoices in their shop"
ON public.invoices FOR SELECT TO authenticated
USING (
  customer_id IN (SELECT id FROM public.customers WHERE shop_id = public.get_current_user_shop_id())
);

-- QUOTES: Uses customer_id
DROP POLICY IF EXISTS "Enable read access for all users" ON public.quotes;
CREATE POLICY "Users can only view quotes in their shop"
ON public.quotes FOR SELECT TO authenticated
USING (
  customer_id IN (SELECT id FROM public.customers WHERE shop_id = public.get_current_user_shop_id())
);

-- DEPARTMENTS: Fix open policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.departments;
DROP POLICY IF EXISTS "Authenticated users can read all departments" ON public.departments;
CREATE POLICY "Users can only view departments in their shop"
ON public.departments FOR SELECT TO authenticated
USING (shop_id = public.get_current_user_shop_id());

-- ACTIVITY_TYPES: Fix open policies (allow NULL for global types)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.activity_types;
CREATE POLICY "Users can only view activity types in their shop"
ON public.activity_types FOR SELECT TO authenticated
USING (shop_id IS NULL OR shop_id = public.get_current_user_shop_id());

-- PROFILES: Users can only see profiles in their shop (or their own)
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can only view profiles in their shop"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid() 
  OR user_id = auth.uid()
  OR shop_id = public.get_current_user_shop_id()
);

-- COMMUNICATION_TEMPLATES: Fix open policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.communication_templates;
CREATE POLICY "Users can only view templates in their shop"
ON public.communication_templates FOR SELECT TO authenticated
USING (shop_id = public.get_current_user_shop_id());

-- USER_ROLES: Users can only see roles for users in their shop
DROP POLICY IF EXISTS "Authenticated users can read user_roles" ON public.user_roles;
CREATE POLICY "Users can only view user_roles in their shop"
ON public.user_roles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR user_id IN (SELECT id FROM public.profiles WHERE shop_id = public.get_current_user_shop_id())
  OR user_id IN (SELECT user_id FROM public.profiles WHERE shop_id = public.get_current_user_shop_id() AND user_id IS NOT NULL)
);

-- Fix INSERT/UPDATE/DELETE policies for critical tables

-- INVENTORY_ITEMS: Secure write operations
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.inventory_items;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.inventory_items;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.inventory_items;

CREATE POLICY "Users can only insert inventory in their shop"
ON public.inventory_items FOR INSERT TO authenticated
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can only update inventory in their shop"
ON public.inventory_items FOR UPDATE TO authenticated
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can only delete inventory in their shop"
ON public.inventory_items FOR DELETE TO authenticated
USING (shop_id = public.get_current_user_shop_id());

-- WORK_ORDERS: Secure write operations
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.work_orders;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.work_orders;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.work_orders;

CREATE POLICY "Users can only insert work orders in their shop"
ON public.work_orders FOR INSERT TO authenticated
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can only update work orders in their shop"
ON public.work_orders FOR UPDATE TO authenticated
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can only delete work orders in their shop"
ON public.work_orders FOR DELETE TO authenticated
USING (shop_id = public.get_current_user_shop_id());

-- CUSTOMERS: Secure write operations
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.customers;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.customers;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.customers;

CREATE POLICY "Users can only insert customers in their shop"
ON public.customers FOR INSERT TO authenticated
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can only update customers in their shop"
ON public.customers FOR UPDATE TO authenticated
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can only delete customers in their shop"
ON public.customers FOR DELETE TO authenticated
USING (shop_id = public.get_current_user_shop_id());

-- CONTACTS: Secure write operations
DROP POLICY IF EXISTS "Authenticated users can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON public.contacts;

CREATE POLICY "Users can only insert contacts in their shop"
ON public.contacts FOR INSERT TO authenticated
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can only update contacts in their shop"
ON public.contacts FOR UPDATE TO authenticated
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can only delete contacts in their shop"
ON public.contacts FOR DELETE TO authenticated
USING (shop_id = public.get_current_user_shop_id());

-- EQUIPMENT_ASSETS: Secure write operations
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.equipment_assets;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.equipment_assets;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.equipment_assets;

CREATE POLICY "Users can only insert equipment in their shop"
ON public.equipment_assets FOR INSERT TO authenticated
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can only update equipment in their shop"
ON public.equipment_assets FOR UPDATE TO authenticated
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can only delete equipment in their shop"
ON public.equipment_assets FOR DELETE TO authenticated
USING (shop_id = public.get_current_user_shop_id());
