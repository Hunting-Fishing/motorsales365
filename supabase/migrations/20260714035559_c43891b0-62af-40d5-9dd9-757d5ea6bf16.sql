
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['shift_templates','shift_swap_requests','employee_availability','discount_codes','discount_code_usage','discount_types','stock_alerts','service_automation_rules']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON shop_manager.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_all_%s" ON shop_manager.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_all_%s" ON shop_manager.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;
