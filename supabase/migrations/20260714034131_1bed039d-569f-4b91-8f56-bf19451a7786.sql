
ALTER TABLE shop_manager.expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

DROP POLICY IF EXISTS "shop-receipts read authenticated" ON storage.objects;
DROP POLICY IF EXISTS "shop-receipts write authenticated" ON storage.objects;
DROP POLICY IF EXISTS "shop-receipts update authenticated" ON storage.objects;
DROP POLICY IF EXISTS "shop-receipts delete authenticated" ON storage.objects;

CREATE POLICY "shop-receipts read authenticated" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'shop-receipts');
CREATE POLICY "shop-receipts write authenticated" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'shop-receipts');
CREATE POLICY "shop-receipts update authenticated" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'shop-receipts');
CREATE POLICY "shop-receipts delete authenticated" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'shop-receipts');

CREATE TABLE IF NOT EXISTS shop_manager.customer_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID,
  customer_id UUID NOT NULL,
  vehicle_id UUID,
  reminder_type TEXT NOT NULL DEFAULT 'follow_up',
  title TEXT NOT NULL,
  notes TEXT,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.customer_reminders TO authenticated;
GRANT ALL ON shop_manager.customer_reminders TO service_role;

ALTER TABLE shop_manager.customer_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminders_all_authenticated" ON shop_manager.customer_reminders;
CREATE POLICY "reminders_all_authenticated" ON shop_manager.customer_reminders
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS customer_reminders_customer_idx ON shop_manager.customer_reminders(customer_id);
CREATE INDEX IF NOT EXISTS customer_reminders_due_idx ON shop_manager.customer_reminders(due_date) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION shop_manager.touch_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS customer_reminders_touch ON shop_manager.customer_reminders;
CREATE TRIGGER customer_reminders_touch BEFORE UPDATE ON shop_manager.customer_reminders
FOR EACH ROW EXECUTE FUNCTION shop_manager.touch_updated_at();
