-- =====================================================
-- CRITICAL SECURITY FIX: Complete RLS Policy Cleanup
-- Drop ALL dangerous policies and recreate secure ones
-- =====================================================

-- First, ensure the helper function exists
CREATE OR REPLACE FUNCTION public.get_current_user_shop_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid() LIMIT 1;
$$;

-- =====================================================
-- ACTIVITY_TYPES - Drop all, recreate secure
-- =====================================================
DROP POLICY IF EXISTS "Users can manage activity types for their shop" ON activity_types;
DROP POLICY IF EXISTS "Users can view activity types for their shop" ON activity_types;
DROP POLICY IF EXISTS "Users can only view activity types in their shop" ON activity_types;

CREATE POLICY "activity_types_select" ON activity_types FOR SELECT
  USING (shop_id IS NULL OR shop_id = get_current_user_shop_id());
CREATE POLICY "activity_types_insert" ON activity_types FOR INSERT
  WITH CHECK (shop_id = get_current_user_shop_id());
CREATE POLICY "activity_types_update" ON activity_types FOR UPDATE
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "activity_types_delete" ON activity_types FOR DELETE
  USING (shop_id = get_current_user_shop_id());

-- =====================================================
-- INVENTORY_ITEMS - Drop all, recreate secure
-- =====================================================
DROP POLICY IF EXISTS "Allow all users to view inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Allow users to delete inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Allow users to insert inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Allow users to update inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Staff can manage inventory" ON inventory_items;
DROP POLICY IF EXISTS "Staff can view inventory" ON inventory_items;
DROP POLICY IF EXISTS "Users can view inventory in their shop" ON inventory_items;
DROP POLICY IF EXISTS "Users can only view inventory in their shop" ON inventory_items;
DROP POLICY IF EXISTS "Users can only insert inventory in their shop" ON inventory_items;
DROP POLICY IF EXISTS "Users can only update inventory in their shop" ON inventory_items;
DROP POLICY IF EXISTS "Users can only delete inventory in their shop" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_select" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_insert" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_update" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_delete" ON inventory_items;

CREATE POLICY "inventory_items_select" ON inventory_items FOR SELECT
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "inventory_items_insert" ON inventory_items FOR INSERT
  WITH CHECK (shop_id = get_current_user_shop_id());
CREATE POLICY "inventory_items_update" ON inventory_items FOR UPDATE
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "inventory_items_delete" ON inventory_items FOR DELETE
  USING (shop_id = get_current_user_shop_id());

-- =====================================================
-- CUSTOMERS - Drop all, recreate secure
-- =====================================================
DROP POLICY IF EXISTS "customers_shop_access" ON customers;
DROP POLICY IF EXISTS "Users can only view customers in their shop" ON customers;
DROP POLICY IF EXISTS "Users can only insert customers in their shop" ON customers;
DROP POLICY IF EXISTS "Users can only update customers in their shop" ON customers;
DROP POLICY IF EXISTS "Users can only delete customers in their shop" ON customers;
DROP POLICY IF EXISTS "customers_select" ON customers;
DROP POLICY IF EXISTS "customers_insert" ON customers;
DROP POLICY IF EXISTS "customers_update" ON customers;
DROP POLICY IF EXISTS "customers_delete" ON customers;

CREATE POLICY "customers_select" ON customers FOR SELECT
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "customers_insert" ON customers FOR INSERT
  WITH CHECK (shop_id = get_current_user_shop_id());
CREATE POLICY "customers_update" ON customers FOR UPDATE
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "customers_delete" ON customers FOR DELETE
  USING (shop_id = get_current_user_shop_id());

-- =====================================================
-- WORK_ORDERS - Drop all, recreate secure
-- =====================================================
DROP POLICY IF EXISTS "work_orders_shop_access" ON work_orders;
DROP POLICY IF EXISTS "Users can view work orders in their shop" ON work_orders;
DROP POLICY IF EXISTS "Users can only view work orders in their shop" ON work_orders;
DROP POLICY IF EXISTS "Users can only insert work orders in their shop" ON work_orders;
DROP POLICY IF EXISTS "Users can only update work orders in their shop" ON work_orders;
DROP POLICY IF EXISTS "Users can only delete work orders in their shop" ON work_orders;
DROP POLICY IF EXISTS "work_orders_select" ON work_orders;
DROP POLICY IF EXISTS "work_orders_insert" ON work_orders;
DROP POLICY IF EXISTS "work_orders_update" ON work_orders;
DROP POLICY IF EXISTS "work_orders_delete" ON work_orders;

CREATE POLICY "work_orders_select" ON work_orders FOR SELECT
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "work_orders_insert" ON work_orders FOR INSERT
  WITH CHECK (shop_id = get_current_user_shop_id());
CREATE POLICY "work_orders_update" ON work_orders FOR UPDATE
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "work_orders_delete" ON work_orders FOR DELETE
  USING (shop_id = get_current_user_shop_id());

-- =====================================================
-- EQUIPMENT_ASSETS - Drop all, recreate secure
-- =====================================================
DROP POLICY IF EXISTS "equipment_assets_shop_access" ON equipment_assets;
DROP POLICY IF EXISTS "Users can view equipment in their shop" ON equipment_assets;
DROP POLICY IF EXISTS "Users can only view equipment in their shop" ON equipment_assets;
DROP POLICY IF EXISTS "Users can only insert equipment in their shop" ON equipment_assets;
DROP POLICY IF EXISTS "Users can only update equipment in their shop" ON equipment_assets;
DROP POLICY IF EXISTS "Users can only delete equipment in their shop" ON equipment_assets;
DROP POLICY IF EXISTS "equipment_assets_select" ON equipment_assets;
DROP POLICY IF EXISTS "equipment_assets_insert" ON equipment_assets;
DROP POLICY IF EXISTS "equipment_assets_update" ON equipment_assets;
DROP POLICY IF EXISTS "equipment_assets_delete" ON equipment_assets;

CREATE POLICY "equipment_assets_select" ON equipment_assets FOR SELECT
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "equipment_assets_insert" ON equipment_assets FOR INSERT
  WITH CHECK (shop_id = get_current_user_shop_id());
CREATE POLICY "equipment_assets_update" ON equipment_assets FOR UPDATE
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "equipment_assets_delete" ON equipment_assets FOR DELETE
  USING (shop_id = get_current_user_shop_id());

-- =====================================================
-- CONTACTS - Drop all, recreate secure
-- =====================================================
DROP POLICY IF EXISTS "Users can view contacts" ON contacts;
DROP POLICY IF EXISTS "Users can create contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts" ON contacts;
DROP POLICY IF EXISTS "Users can only view contacts in their shop" ON contacts;
DROP POLICY IF EXISTS "Users can only insert contacts in their shop" ON contacts;
DROP POLICY IF EXISTS "Users can only update contacts in their shop" ON contacts;
DROP POLICY IF EXISTS "Users can only delete contacts in their shop" ON contacts;
DROP POLICY IF EXISTS "contacts_select" ON contacts;
DROP POLICY IF EXISTS "contacts_insert" ON contacts;
DROP POLICY IF EXISTS "contacts_update" ON contacts;
DROP POLICY IF EXISTS "contacts_delete" ON contacts;

CREATE POLICY "contacts_select" ON contacts FOR SELECT
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "contacts_insert" ON contacts FOR INSERT
  WITH CHECK (shop_id = get_current_user_shop_id());
CREATE POLICY "contacts_update" ON contacts FOR UPDATE
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "contacts_delete" ON contacts FOR DELETE
  USING (shop_id = get_current_user_shop_id());

-- =====================================================
-- CONTACT_CATEGORIES - Drop all, recreate secure
-- =====================================================
DROP POLICY IF EXISTS "Users can view contact categories" ON contact_categories;
DROP POLICY IF EXISTS "Users can create contact categories" ON contact_categories;
DROP POLICY IF EXISTS "Users can update contact categories" ON contact_categories;
DROP POLICY IF EXISTS "Users can delete contact categories" ON contact_categories;
DROP POLICY IF EXISTS "Users can only view contact categories in their shop" ON contact_categories;
DROP POLICY IF EXISTS "contact_categories_select" ON contact_categories;
DROP POLICY IF EXISTS "contact_categories_insert" ON contact_categories;
DROP POLICY IF EXISTS "contact_categories_update" ON contact_categories;
DROP POLICY IF EXISTS "contact_categories_delete" ON contact_categories;

CREATE POLICY "contact_categories_select" ON contact_categories FOR SELECT
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "contact_categories_insert" ON contact_categories FOR INSERT
  WITH CHECK (shop_id = get_current_user_shop_id());
CREATE POLICY "contact_categories_update" ON contact_categories FOR UPDATE
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "contact_categories_delete" ON contact_categories FOR DELETE
  USING (shop_id = get_current_user_shop_id());

-- =====================================================
-- RESOURCES - Drop all, recreate secure
-- =====================================================
DROP POLICY IF EXISTS "Users can view resources" ON resources;
DROP POLICY IF EXISTS "Users can create resources" ON resources;
DROP POLICY IF EXISTS "Users can update resources" ON resources;
DROP POLICY IF EXISTS "Users can delete resources" ON resources;
DROP POLICY IF EXISTS "Users can only view resources in their shop" ON resources;
DROP POLICY IF EXISTS "Users can only insert resources in their shop" ON resources;
DROP POLICY IF EXISTS "Users can only update resources in their shop" ON resources;
DROP POLICY IF EXISTS "Users can only delete resources in their shop" ON resources;
DROP POLICY IF EXISTS "resources_select" ON resources;
DROP POLICY IF EXISTS "resources_insert" ON resources;
DROP POLICY IF EXISTS "resources_update" ON resources;
DROP POLICY IF EXISTS "resources_delete" ON resources;

CREATE POLICY "resources_select" ON resources FOR SELECT
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "resources_insert" ON resources FOR INSERT
  WITH CHECK (shop_id = get_current_user_shop_id());
CREATE POLICY "resources_update" ON resources FOR UPDATE
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "resources_delete" ON resources FOR DELETE
  USING (shop_id = get_current_user_shop_id());

-- =====================================================
-- DEPARTMENTS - Drop all, recreate secure
-- =====================================================
DROP POLICY IF EXISTS "Allow all authenticated users to view departments" ON departments;
DROP POLICY IF EXISTS "Authenticated users can view departments" ON departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;
DROP POLICY IF EXISTS "Owners, Managers, and Admins can delete departments" ON departments;
DROP POLICY IF EXISTS "Owners, Managers, and Admins can insert departments" ON departments;
DROP POLICY IF EXISTS "Owners, Managers, and Admins can update departments" ON departments;
DROP POLICY IF EXISTS "Users can only view departments in their shop" ON departments;
DROP POLICY IF EXISTS "departments_select" ON departments;
DROP POLICY IF EXISTS "departments_insert" ON departments;
DROP POLICY IF EXISTS "departments_update" ON departments;
DROP POLICY IF EXISTS "departments_delete" ON departments;

CREATE POLICY "departments_select" ON departments FOR SELECT
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "departments_insert" ON departments FOR INSERT
  WITH CHECK (shop_id = get_current_user_shop_id());
CREATE POLICY "departments_update" ON departments FOR UPDATE
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "departments_delete" ON departments FOR DELETE
  USING (shop_id = get_current_user_shop_id());

-- =====================================================
-- COMMUNICATION_TEMPLATES - Drop all, recreate secure
-- =====================================================
DROP POLICY IF EXISTS "Users can view communication templates" ON communication_templates;
DROP POLICY IF EXISTS "Users can view communication templates from their shop" ON communication_templates;
DROP POLICY IF EXISTS "Staff can delete communication templates" ON communication_templates;
DROP POLICY IF EXISTS "Staff can insert communication templates" ON communication_templates;
DROP POLICY IF EXISTS "Staff can update communication templates" ON communication_templates;
DROP POLICY IF EXISTS "Admins can manage communication templates" ON communication_templates;
DROP POLICY IF EXISTS "Users can only view templates in their shop" ON communication_templates;
DROP POLICY IF EXISTS "communication_templates_select" ON communication_templates;
DROP POLICY IF EXISTS "communication_templates_insert" ON communication_templates;
DROP POLICY IF EXISTS "communication_templates_update" ON communication_templates;
DROP POLICY IF EXISTS "communication_templates_delete" ON communication_templates;

CREATE POLICY "communication_templates_select" ON communication_templates FOR SELECT
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "communication_templates_insert" ON communication_templates FOR INSERT
  WITH CHECK (shop_id = get_current_user_shop_id());
CREATE POLICY "communication_templates_update" ON communication_templates FOR UPDATE
  USING (shop_id = get_current_user_shop_id());
CREATE POLICY "communication_templates_delete" ON communication_templates FOR DELETE
  USING (shop_id = get_current_user_shop_id());

-- =====================================================
-- VEHICLES - Link via customer_id
-- =====================================================
DROP POLICY IF EXISTS "vehicles_shop_access" ON vehicles;
DROP POLICY IF EXISTS "Users can view vehicles in their shop" ON vehicles;
DROP POLICY IF EXISTS "Users can only view vehicles in their shop" ON vehicles;
DROP POLICY IF EXISTS "Users can only insert vehicles in their shop" ON vehicles;
DROP POLICY IF EXISTS "Users can only update vehicles in their shop" ON vehicles;
DROP POLICY IF EXISTS "Users can only delete vehicles in their shop" ON vehicles;
DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;

CREATE POLICY "vehicles_select" ON vehicles FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));

-- =====================================================
-- APPOINTMENTS - Link via customer_id
-- =====================================================
DROP POLICY IF EXISTS "appointments_shop_access" ON appointments;
DROP POLICY IF EXISTS "Users can only view appointments in their shop" ON appointments;
DROP POLICY IF EXISTS "appointments_select" ON appointments;
DROP POLICY IF EXISTS "appointments_insert" ON appointments;
DROP POLICY IF EXISTS "appointments_update" ON appointments;
DROP POLICY IF EXISTS "appointments_delete" ON appointments;

CREATE POLICY "appointments_select" ON appointments FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));
CREATE POLICY "appointments_insert" ON appointments FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));
CREATE POLICY "appointments_update" ON appointments FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));
CREATE POLICY "appointments_delete" ON appointments FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));

-- =====================================================
-- INVOICES - Link via customer_id
-- =====================================================
DROP POLICY IF EXISTS "invoices_shop_access" ON invoices;
DROP POLICY IF EXISTS "Users can view invoices in their shop" ON invoices;
DROP POLICY IF EXISTS "Users can only view invoices in their shop" ON invoices;
DROP POLICY IF EXISTS "Users can only insert invoices in their shop" ON invoices;
DROP POLICY IF EXISTS "Users can only update invoices in their shop" ON invoices;
DROP POLICY IF EXISTS "Users can only delete invoices in their shop" ON invoices;
DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;

CREATE POLICY "invoices_select" ON invoices FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));
CREATE POLICY "invoices_insert" ON invoices FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));
CREATE POLICY "invoices_update" ON invoices FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));
CREATE POLICY "invoices_delete" ON invoices FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));

-- =====================================================
-- PROFILES - Secure access
-- =====================================================
DROP POLICY IF EXISTS "profiles_shop_access" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their shop" ON profiles;
DROP POLICY IF EXISTS "Users can only view profiles in their shop" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    id = auth.uid() OR 
    user_id = auth.uid() OR 
    shop_id = get_current_user_shop_id()
  );
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (id = auth.uid() OR user_id = auth.uid());

-- =====================================================
-- USER_ROLES - Secure access
-- =====================================================
DROP POLICY IF EXISTS "user_roles_shop_access" ON user_roles;
DROP POLICY IF EXISTS "Users can view user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can only view user_roles in their shop" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can read user_roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;

CREATE POLICY "user_roles_select" ON user_roles FOR SELECT
  USING (
    user_id = auth.uid() OR 
    user_id IN (SELECT id FROM profiles WHERE shop_id = get_current_user_shop_id()) OR
    user_id IN (SELECT user_id FROM profiles WHERE shop_id = get_current_user_shop_id())
  );

-- =====================================================
-- Additional high-risk tables with qual:true
-- =====================================================

-- CUSTOMER_COMMUNICATIONS
DROP POLICY IF EXISTS "Users can view customer communications" ON customer_communications;
DROP POLICY IF EXISTS "Staff can delete customer communications" ON customer_communications;
DROP POLICY IF EXISTS "Staff can update customer communications" ON customer_communications;

CREATE POLICY "customer_communications_select" ON customer_communications FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));
CREATE POLICY "customer_communications_insert" ON customer_communications FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));
CREATE POLICY "customer_communications_update" ON customer_communications FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));
CREATE POLICY "customer_communications_delete" ON customer_communications FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));

-- CUSTOMER_DOCUMENTS
DROP POLICY IF EXISTS "Users can view customer documents" ON customer_documents;
DROP POLICY IF EXISTS "Users can delete customer documents" ON customer_documents;
DROP POLICY IF EXISTS "Users can update customer documents" ON customer_documents;

CREATE POLICY "customer_documents_select" ON customer_documents FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));
CREATE POLICY "customer_documents_insert" ON customer_documents FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));
CREATE POLICY "customer_documents_update" ON customer_documents FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));
CREATE POLICY "customer_documents_delete" ON customer_documents FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE shop_id = get_current_user_shop_id()));