DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='shop_manager' LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA shop_manager TO authenticated, service_role');
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.%I TO authenticated', r.tablename);
    EXECUTE format('GRANT ALL ON shop_manager.%I TO service_role', r.tablename);
    EXECUTE format('ALTER TABLE shop_manager.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA shop_manager TO authenticated, service_role;