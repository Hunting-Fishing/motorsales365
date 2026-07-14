
-- Grants + RLS for CRM segments, service reminders, loyalty
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customer_segments','customer_segment_assignments','service_reminders','service_reminder_tags','customer_loyalty','customer_activities','customer_touchpoints']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON shop_manager.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_all_%s" ON shop_manager.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_all_%s" ON shop_manager.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;
