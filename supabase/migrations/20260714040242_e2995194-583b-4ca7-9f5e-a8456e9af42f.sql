
-- 1. Grants + policies for existing HR/automation tables
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.staff_certificates TO authenticated;
GRANT ALL ON shop_manager.staff_certificates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.staff_certificate_types TO authenticated;
GRANT ALL ON shop_manager.staff_certificate_types TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.employee_leave_balances TO authenticated;
GRANT ALL ON shop_manager.employee_leave_balances TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.customer_automation_preferences TO authenticated;
GRANT ALL ON shop_manager.customer_automation_preferences TO service_role;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='staff_certificates') THEN
    EXECUTE 'CREATE POLICY auth_all_staff_certificates ON shop_manager.staff_certificates FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='staff_certificate_types') THEN
    EXECUTE 'CREATE POLICY auth_all_staff_certificate_types ON shop_manager.staff_certificate_types FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='employee_leave_balances') THEN
    EXECUTE 'CREATE POLICY auth_all_employee_leave_balances ON shop_manager.employee_leave_balances FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='customer_automation_preferences') THEN
    EXECUTE 'CREATE POLICY auth_all_customer_automation_preferences ON shop_manager.customer_automation_preferences FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- 2. Leave types lookup
CREATE TABLE IF NOT EXISTS shop_manager.leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID,
  name TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  default_hours_per_year NUMERIC NOT NULL DEFAULT 0,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.leave_types TO authenticated;
GRANT ALL ON shop_manager.leave_types TO service_role;
ALTER TABLE shop_manager.leave_types ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='leave_types') THEN
    EXECUTE 'CREATE POLICY auth_all_leave_types ON shop_manager.leave_types FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- 3. Chart of accounts + double-entry journal
CREATE TABLE IF NOT EXISTS shop_manager.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.chart_of_accounts TO authenticated;
GRANT ALL ON shop_manager.chart_of_accounts TO service_role;
ALTER TABLE shop_manager.chart_of_accounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='chart_of_accounts') THEN
    EXECUTE 'CREATE POLICY auth_all_chart_of_accounts ON shop_manager.chart_of_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS shop_manager.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft','posted','void')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.journal_entries TO authenticated;
GRANT ALL ON shop_manager.journal_entries TO service_role;
ALTER TABLE shop_manager.journal_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='journal_entries') THEN
    EXECUTE 'CREATE POLICY auth_all_journal_entries ON shop_manager.journal_entries FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS shop_manager.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES shop_manager.journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES shop_manager.chart_of_accounts(id),
  account_code TEXT,
  description TEXT,
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  line_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.journal_entry_lines TO authenticated;
GRANT ALL ON shop_manager.journal_entry_lines TO service_role;
ALTER TABLE shop_manager.journal_entry_lines ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='journal_entry_lines') THEN
    EXECUTE 'CREATE POLICY auth_all_journal_entry_lines ON shop_manager.journal_entry_lines FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_je_lines_entry ON shop_manager.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_je_date ON shop_manager.journal_entries(entry_date DESC);
