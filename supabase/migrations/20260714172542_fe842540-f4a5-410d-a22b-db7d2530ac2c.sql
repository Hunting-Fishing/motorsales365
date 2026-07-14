
-- Automation run logs (shop_manager schema)
CREATE TABLE IF NOT EXISTS shop_manager.automation_run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NULL,
  rule_id uuid NULL,
  ran_at timestamptz NOT NULL DEFAULT now(),
  customers_scanned integer NOT NULL DEFAULT 0,
  vehicles_scanned integer NOT NULL DEFAULT 0,
  reminders_created integer NOT NULL DEFAULT 0,
  skipped_duplicate integer NOT NULL DEFAULT 0,
  error text NULL,
  triggered_by text NOT NULL DEFAULT 'cron'
);

CREATE INDEX IF NOT EXISTS automation_run_logs_shop_ran_at_idx
  ON shop_manager.automation_run_logs (shop_id, ran_at DESC);

GRANT SELECT ON shop_manager.automation_run_logs TO authenticated;
GRANT ALL ON shop_manager.automation_run_logs TO service_role;

ALTER TABLE shop_manager.automation_run_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'shop_manager'
      AND tablename = 'automation_run_logs'
      AND policyname = 'Shop members can read own automation logs'
  ) THEN
    CREATE POLICY "Shop members can read own automation logs"
      ON shop_manager.automation_run_logs
      FOR SELECT
      TO authenticated
      USING (
        shop_id IS NOT NULL
        AND shop_id = shop_manager.get_current_user_shop_id()
      );
  END IF;
END $$;
