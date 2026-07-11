
-- 1. audit_logs — drop blanket view
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.audit_logs;

-- 2. customer_interactions — scope via customers.shop_id
DROP POLICY IF EXISTS "Enable full access to customer_interactions" ON public.customer_interactions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='customer_interactions' AND policyname='Shop users manage customer_interactions') THEN
    CREATE POLICY "Shop users manage customer_interactions"
      ON public.customer_interactions FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_interactions.customer_id AND c.shop_id = public.get_current_user_shop_id()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_interactions.customer_id AND c.shop_id = public.get_current_user_shop_id()));
  END IF;
END $$;
REVOKE ALL ON public.customer_interactions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_interactions TO authenticated;

-- 3. equipment_future_plans — scope via equipment_assets.shop_id
DROP POLICY IF EXISTS "Anyone can view equipment future plans" ON public.equipment_future_plans;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='equipment_future_plans' AND policyname='Shop users view equipment_future_plans') THEN
    CREATE POLICY "Shop users view equipment_future_plans"
      ON public.equipment_future_plans FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.equipment_assets e WHERE e.id = equipment_future_plans.equipment_id AND e.shop_id = public.get_current_user_shop_id()));
  END IF;
END $$;
REVOKE ALL ON public.equipment_future_plans FROM anon;

-- 4. follow_ups — scope via customers OR work_orders
DROP POLICY IF EXISTS "Allow all users to view follow ups" ON public.follow_ups;
DROP POLICY IF EXISTS "Allow all users to insert follow ups" ON public.follow_ups;
DROP POLICY IF EXISTS "Allow all users to update follow ups" ON public.follow_ups;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='follow_ups' AND policyname='Shop users manage follow_ups') THEN
    CREATE POLICY "Shop users manage follow_ups"
      ON public.follow_ups FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.customers c WHERE c.id = follow_ups.customer_id AND c.shop_id = public.get_current_user_shop_id())
        OR EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = follow_ups.work_order_id AND w.shop_id = public.get_current_user_shop_id())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.customers c WHERE c.id = follow_ups.customer_id AND c.shop_id = public.get_current_user_shop_id())
        OR EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = follow_ups.work_order_id AND w.shop_id = public.get_current_user_shop_id())
      );
  END IF;
END $$;
REVOKE ALL ON public.follow_ups FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_ups TO authenticated;

-- 5. shop_settings + company_settings — direct shop_id
DROP POLICY IF EXISTS "Allow authenticated users full access to shop_settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Allow authenticated users full access to company_settings" ON public.company_settings;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shop_settings' AND policyname='Shop users manage shop_settings') THEN
    CREATE POLICY "Shop users manage shop_settings"
      ON public.shop_settings FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_settings' AND policyname='Shop users manage company_settings') THEN
    CREATE POLICY "Shop users manage company_settings"
      ON public.company_settings FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;
REVOKE ALL ON public.shop_settings FROM anon;
REVOKE ALL ON public.company_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;

-- 6. work_order_job_lines — drop USING(true) policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.work_order_job_lines;
DROP POLICY IF EXISTS "Users can view job lines" ON public.work_order_job_lines;
DROP POLICY IF EXISTS "Users can insert job lines" ON public.work_order_job_lines;
DROP POLICY IF EXISTS "Users can update job lines" ON public.work_order_job_lines;
DROP POLICY IF EXISTS "Users can delete job lines" ON public.work_order_job_lines;
REVOKE ALL ON public.work_order_job_lines FROM anon;

-- 7. work_order_parts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.work_order_parts;
REVOKE ALL ON public.work_order_parts FROM anon;

-- 8. work_order_time_entries
DROP POLICY IF EXISTS "Allow all access to work_order_time_entries" ON public.work_order_time_entries;
REVOKE ALL ON public.work_order_time_entries FROM anon;
