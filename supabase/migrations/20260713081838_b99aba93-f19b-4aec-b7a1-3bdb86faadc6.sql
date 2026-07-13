
-- ============================================================
-- Profiles: user can see/update own; admins can read shop profiles
-- ============================================================
DROP POLICY IF EXISTS "sm_profiles_select_self" ON shop_manager.profiles;
DROP POLICY IF EXISTS "sm_profiles_select_shop" ON shop_manager.profiles;
DROP POLICY IF EXISTS "sm_profiles_update_self" ON shop_manager.profiles;
DROP POLICY IF EXISTS "sm_profiles_insert_self" ON shop_manager.profiles;

CREATE POLICY "sm_profiles_select_self" ON shop_manager.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "sm_profiles_select_shop" ON shop_manager.profiles
  FOR SELECT TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id() AND shop_id IS NOT NULL);

CREATE POLICY "sm_profiles_update_self" ON shop_manager.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR user_id = auth.uid())
  WITH CHECK (id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "sm_profiles_insert_self" ON shop_manager.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR user_id = auth.uid());

-- ============================================================
-- Shops: members read; owner/admin update
-- ============================================================
DROP POLICY IF EXISTS "sm_shops_select_members" ON shop_manager.shops;
DROP POLICY IF EXISTS "sm_shops_update_admins" ON shop_manager.shops;

CREATE POLICY "sm_shops_select_members" ON shop_manager.shops
  FOR SELECT TO authenticated
  USING (id = shop_manager.get_current_user_shop_id());

CREATE POLICY "sm_shops_update_admins" ON shop_manager.shops
  FOR UPDATE TO authenticated
  USING (id = shop_manager.get_current_user_shop_id() AND shop_manager.is_owner_or_admin(auth.uid()))
  WITH CHECK (id = shop_manager.get_current_user_shop_id() AND shop_manager.is_owner_or_admin(auth.uid()));

-- ============================================================
-- User roles: user reads own; owner/admin manages in same shop
-- ============================================================
DROP POLICY IF EXISTS "sm_user_roles_select_self" ON shop_manager.user_roles;
DROP POLICY IF EXISTS "sm_user_roles_admin_manage" ON shop_manager.user_roles;

CREATE POLICY "sm_user_roles_select_self" ON shop_manager.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "sm_user_roles_admin_manage" ON shop_manager.user_roles
  FOR ALL TO authenticated
  USING (shop_manager.is_owner_or_admin(auth.uid())
         AND shop_manager.user_belongs_to_shop(user_id, shop_manager.get_current_user_shop_id()))
  WITH CHECK (shop_manager.is_owner_or_admin(auth.uid())
              AND shop_manager.user_belongs_to_shop(user_id, shop_manager.get_current_user_shop_id()));

-- ============================================================
-- Shop-scoped tables (direct shop_id column)
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['customers','inventory_items','work_orders']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "sm_%1$s_shop_all" ON shop_manager.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "sm_%1$s_shop_all" ON shop_manager.%1$I FOR ALL TO authenticated
         USING (shop_id = shop_manager.get_current_user_shop_id() AND shop_id IS NOT NULL)
         WITH CHECK (shop_id = shop_manager.get_current_user_shop_id() AND shop_id IS NOT NULL)', t);
  END LOOP;
END$$;

-- Customer can view/update their own record too
DROP POLICY IF EXISTS "sm_customers_self_select" ON shop_manager.customers;
CREATE POLICY "sm_customers_self_select" ON shop_manager.customers
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- Customer-linked tables (join through shop_manager.customers)
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['vehicles','appointments','invoices','quotes']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "sm_%1$s_shop_all" ON shop_manager.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "sm_%1$s_shop_all" ON shop_manager.%1$I FOR ALL TO authenticated
         USING (customer_id IN (
           SELECT id FROM shop_manager.customers
           WHERE shop_id = shop_manager.get_current_user_shop_id()))
         WITH CHECK (customer_id IN (
           SELECT id FROM shop_manager.customers
           WHERE shop_id = shop_manager.get_current_user_shop_id()))', t);
  END LOOP;
END$$;

-- ============================================================
-- Line items: join through parent invoice / quote
-- ============================================================
DROP POLICY IF EXISTS "sm_invoice_items_shop_all" ON shop_manager.invoice_items;
CREATE POLICY "sm_invoice_items_shop_all" ON shop_manager.invoice_items
  FOR ALL TO authenticated
  USING (invoice_id IN (
    SELECT i.id FROM shop_manager.invoices i
    JOIN shop_manager.customers c ON c.id = i.customer_id
    WHERE c.shop_id = shop_manager.get_current_user_shop_id()))
  WITH CHECK (invoice_id IN (
    SELECT i.id FROM shop_manager.invoices i
    JOIN shop_manager.customers c ON c.id = i.customer_id
    WHERE c.shop_id = shop_manager.get_current_user_shop_id()));

DROP POLICY IF EXISTS "sm_quote_items_shop_all" ON shop_manager.quote_items;
CREATE POLICY "sm_quote_items_shop_all" ON shop_manager.quote_items
  FOR ALL TO authenticated
  USING (quote_id IN (
    SELECT q.id FROM shop_manager.quotes q
    JOIN shop_manager.customers c ON c.id = q.customer_id
    WHERE c.shop_id = shop_manager.get_current_user_shop_id()))
  WITH CHECK (quote_id IN (
    SELECT q.id FROM shop_manager.quotes q
    JOIN shop_manager.customers c ON c.id = q.customer_id
    WHERE c.shop_id = shop_manager.get_current_user_shop_id()));

-- ============================================================
-- Roles catalog: already granted SELECT; policy in previous migration
-- ============================================================

-- ============================================================
-- Auto-provision shop_manager.profiles on first authenticated visit
--
-- Bridge: when a signed-in user hits any shop_manager server-fn / RLS check
-- and there is no matching row in shop_manager.profiles yet, create a stub
-- pointing at their existing public.businesses row (if any) so the
-- get_current_user_shop_id() helper resolves cleanly.
-- ============================================================
CREATE OR REPLACE FUNCTION shop_manager.ensure_profile_for(_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, shop_manager AS $$
DECLARE
  _existing_shop uuid;
  _biz_id uuid;
  _email text;
  _first text;
  _last text;
BEGIN
  SELECT shop_id INTO _existing_shop FROM shop_manager.profiles WHERE id = _user_id;
  IF _existing_shop IS NOT NULL THEN
    RETURN _existing_shop;
  END IF;

  -- Best-effort: pull the first business the user owns as their "shop".
  BEGIN
    SELECT id INTO _biz_id FROM public.businesses WHERE owner_id = _user_id ORDER BY created_at LIMIT 1;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    _biz_id := NULL;
  END;

  SELECT email, raw_user_meta_data->>'first_name', raw_user_meta_data->>'last_name'
    INTO _email, _first, _last
    FROM auth.users WHERE id = _user_id;

  INSERT INTO shop_manager.profiles (id, user_id, email, first_name, last_name, shop_id)
  VALUES (_user_id, _user_id, _email, COALESCE(_first, ''), COALESCE(_last, ''), _biz_id)
  ON CONFLICT (id) DO NOTHING;

  RETURN _biz_id;
END$$;

GRANT EXECUTE ON FUNCTION shop_manager.ensure_profile_for(uuid) TO authenticated;
