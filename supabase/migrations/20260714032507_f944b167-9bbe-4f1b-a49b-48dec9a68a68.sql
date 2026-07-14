
-- Enable RLS + shop-scoped policies on settings tables
ALTER TABLE shop_manager.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.shop_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.shop_special_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sm_shop_settings_all ON shop_manager.shop_settings;
CREATE POLICY sm_shop_settings_all ON shop_manager.shop_settings FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

DROP POLICY IF EXISTS sm_shop_hours_all ON shop_manager.shop_hours;
CREATE POLICY sm_shop_hours_all ON shop_manager.shop_hours FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

DROP POLICY IF EXISTS sm_shop_special_days_all ON shop_manager.shop_special_days;
CREATE POLICY sm_shop_special_days_all ON shop_manager.shop_special_days FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

DROP POLICY IF EXISTS sm_company_settings_all ON shop_manager.company_settings;
CREATE POLICY sm_company_settings_all ON shop_manager.company_settings FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

-- Expense tracking
CREATE TABLE IF NOT EXISTS shop_manager.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_manager.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  category_id UUID REFERENCES shop_manager.expense_categories(id) ON DELETE SET NULL,
  vendor_id UUID,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  reference_number TEXT,
  description TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'recorded',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_shop_date ON shop_manager.expenses(shop_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON shop_manager.expenses(category_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.expense_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.expenses TO authenticated;
GRANT ALL ON shop_manager.expense_categories TO service_role;
GRANT ALL ON shop_manager.expenses TO service_role;

ALTER TABLE shop_manager.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY sm_expense_categories_all ON shop_manager.expense_categories FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

CREATE POLICY sm_expenses_all ON shop_manager.expenses FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

-- updated_at trigger for expenses
CREATE OR REPLACE FUNCTION shop_manager.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = shop_manager AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_expenses_updated ON shop_manager.expenses;
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON shop_manager.expenses
  FOR EACH ROW EXECUTE FUNCTION shop_manager.touch_updated_at();

DROP TRIGGER IF EXISTS trg_expense_categories_updated ON shop_manager.expense_categories;
CREATE TRIGGER trg_expense_categories_updated BEFORE UPDATE ON shop_manager.expense_categories
  FOR EACH ROW EXECUTE FUNCTION shop_manager.touch_updated_at();
