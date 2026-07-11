
-- Batch 4: Drop remaining permissive INSERT/UPDATE/DELETE policies
-- on shop_id tables that already have shop-scoped replacements

-- FUEL DELIVERY MODULE - drop old permissive INSERT policies
DROP POLICY IF EXISTS "Users can insert compartment history" ON public.fuel_delivery_compartment_history;
DROP POLICY IF EXISTS "Users can create fuel delivery equipment" ON public.fuel_delivery_equipment;
DROP POLICY IF EXISTS "Users can create fuel delivery equipment filters" ON public.fuel_delivery_equipment_filters;
DROP POLICY IF EXISTS "Users can create fuel delivery equipment usage" ON public.fuel_delivery_equipment_usage;
DROP POLICY IF EXISTS "Users can insert fuel delivery hours" ON public.fuel_delivery_hours;
DROP POLICY IF EXISTS "Users can insert fuel delivery labor rates" ON public.fuel_delivery_labor_rates;
DROP POLICY IF EXISTS "Users can create quotes" ON public.fuel_delivery_quotes;
DROP POLICY IF EXISTS "Users can insert fuel delivery settings" ON public.fuel_delivery_settings;
DROP POLICY IF EXISTS "Users can insert fuel delivery special rates" ON public.fuel_delivery_special_rates;
DROP POLICY IF EXISTS "Users can create tank fills" ON public.fuel_delivery_tank_fills;
DROP POLICY IF EXISTS "Users can create tank readings" ON public.fuel_delivery_tank_readings;
DROP POLICY IF EXISTS "Users can create tanks" ON public.fuel_delivery_tanks;
DROP POLICY IF EXISTS "Users can create tidy tanks" ON public.fuel_delivery_tidy_tanks;
DROP POLICY IF EXISTS "Users can insert fuel delivery zones" ON public.fuel_delivery_zones;

-- GUNSMITH
DROP POLICY IF EXISTS "Users can insert job part orders" ON public.gunsmith_job_part_orders;

-- MAINTENANCE
DROP POLICY IF EXISTS "Users can create maintenance budgets" ON public.maintenance_budgets;

-- SCHEDULE NOTIFICATIONS
DROP POLICY IF EXISTS "System can create notifications" ON public.schedule_notifications;

-- SHOP SETTINGS - replace permissive DELETE and INSERT
DROP POLICY IF EXISTS "Users can delete shop settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Users can insert their own shop settings" ON public.shop_settings;

-- Check if shop-scoped replacements already exist for shop_settings
-- If not, create them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shop_settings' AND policyname='Shop users can delete shop settings') THEN
    EXECUTE $p$CREATE POLICY "Shop users can delete shop settings" ON public.shop_settings FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shop_settings' AND policyname='Shop users can insert shop settings') THEN
    EXECUTE $p$CREATE POLICY "Shop users can insert shop settings" ON public.shop_settings FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id())$p$;
  END IF;
END$$;

-- WATER DELIVERY - replace permissive policies
DROP POLICY IF EXISTS "Users can delete water products for their shop" ON public.water_delivery_products;
DROP POLICY IF EXISTS "Users can insert water products for their shop" ON public.water_delivery_products;
DROP POLICY IF EXISTS "Users can update water products for their shop" ON public.water_delivery_products;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='water_delivery_products' AND policyname='Shop users can delete water products') THEN
    EXECUTE $p$CREATE POLICY "Shop users can delete water products" ON public.water_delivery_products FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='water_delivery_products' AND policyname='Shop users can insert water products') THEN
    EXECUTE $p$CREATE POLICY "Shop users can insert water products" ON public.water_delivery_products FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='water_delivery_products' AND policyname='Shop users can update water products') THEN
    EXECUTE $p$CREATE POLICY "Shop users can update water products" ON public.water_delivery_products FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id())$p$;
  END IF;
END$$;

DROP POLICY IF EXISTS "Users can delete water purchases" ON public.water_delivery_purchases;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='water_delivery_purchases' AND policyname='Shop users can delete water purchases') THEN
    EXECUTE $p$CREATE POLICY "Shop users can delete water purchases" ON public.water_delivery_purchases FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id())$p$;
  END IF;
END$$;

DROP POLICY IF EXISTS "Users can delete water trucks for their shop" ON public.water_delivery_trucks;
DROP POLICY IF EXISTS "Users can insert water trucks for their shop" ON public.water_delivery_trucks;
DROP POLICY IF EXISTS "Users can update water trucks for their shop" ON public.water_delivery_trucks;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='water_delivery_trucks' AND policyname='Shop users can delete water trucks') THEN
    EXECUTE $p$CREATE POLICY "Shop users can delete water trucks" ON public.water_delivery_trucks FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='water_delivery_trucks' AND policyname='Shop users can insert water trucks') THEN
    EXECUTE $p$CREATE POLICY "Shop users can insert water trucks" ON public.water_delivery_trucks FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='water_delivery_trucks' AND policyname='Shop users can update water trucks') THEN
    EXECUTE $p$CREATE POLICY "Shop users can update water trucks" ON public.water_delivery_trucks FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id())$p$;
  END IF;
END$$;

-- POWER WASHING QUOTES - public submissions, require shop_id NOT NULL
DROP POLICY IF EXISTS "Anyone can submit a quote request" ON public.power_washing_quotes;
CREATE POLICY "Anyone can submit a quote request" ON public.power_washing_quotes
FOR INSERT TO authenticated, anon WITH CHECK (shop_id IS NOT NULL);

-- PUBLIC APPLICATIONS - public submissions, require shop_id NOT NULL
DROP POLICY IF EXISTS "Public can submit applications" ON public.public_applications;
CREATE POLICY "Public can submit applications" ON public.public_applications
FOR INSERT TO authenticated, anon WITH CHECK (shop_id IS NOT NULL);
