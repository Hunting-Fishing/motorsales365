
-- Create standalone septic_customers table
CREATE TABLE IF NOT EXISTS septic_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE septic_customers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'septic_customers' AND policyname = 'septic_customers_shop_isolation') THEN
    CREATE POLICY septic_customers_shop_isolation ON septic_customers
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

-- Copy existing customers used by septic into septic_customers
INSERT INTO septic_customers (id, shop_id, first_name, last_name, email, phone, address, created_at, updated_at)
SELECT DISTINCT c.id, c.shop_id, c.first_name, c.last_name, c.email, c.phone, c.address, c.created_at, c.updated_at
FROM customers c
WHERE c.id IN (
  SELECT customer_id FROM septic_tanks WHERE customer_id IS NOT NULL
  UNION SELECT customer_id FROM septic_service_orders WHERE customer_id IS NOT NULL
  UNION SELECT customer_id FROM septic_invoices WHERE customer_id IS NOT NULL
  UNION SELECT customer_id FROM septic_completions WHERE customer_id IS NOT NULL
  UNION SELECT customer_id FROM septic_quotes WHERE customer_id IS NOT NULL
  UNION SELECT customer_id FROM septic_communications WHERE customer_id IS NOT NULL
  UNION SELECT customer_id FROM septic_property_systems WHERE customer_id IS NOT NULL
  UNION SELECT customer_id FROM septic_recurring_schedules WHERE customer_id IS NOT NULL
  UNION SELECT customer_id FROM septic_route_stops WHERE customer_id IS NOT NULL
  UNION SELECT source_customer_id FROM septic_disposal_records WHERE source_customer_id IS NOT NULL
  UNION SELECT customer_id FROM septic_payments WHERE customer_id IS NOT NULL
  UNION SELECT customer_id FROM septic_inspection_records WHERE customer_id IS NOT NULL
)
ON CONFLICT (id) DO NOTHING;

-- Re-point all septic FKs from customers to septic_customers
ALTER TABLE septic_tanks DROP CONSTRAINT IF EXISTS septic_tanks_customer_id_fkey;
ALTER TABLE septic_tanks ADD CONSTRAINT septic_tanks_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES septic_customers(id) ON DELETE SET NULL;

ALTER TABLE septic_service_orders DROP CONSTRAINT IF EXISTS septic_service_orders_customer_id_fkey;
ALTER TABLE septic_service_orders ADD CONSTRAINT septic_service_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES septic_customers(id) ON DELETE SET NULL;

ALTER TABLE septic_invoices DROP CONSTRAINT IF EXISTS septic_invoices_customer_id_fkey;
ALTER TABLE septic_invoices ADD CONSTRAINT septic_invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES septic_customers(id) ON DELETE SET NULL;

ALTER TABLE septic_completions DROP CONSTRAINT IF EXISTS septic_completions_customer_id_fkey;
ALTER TABLE septic_completions ADD CONSTRAINT septic_completions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES septic_customers(id) ON DELETE SET NULL;

ALTER TABLE septic_quotes DROP CONSTRAINT IF EXISTS septic_quotes_customer_id_fkey;
ALTER TABLE septic_quotes ADD CONSTRAINT septic_quotes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES septic_customers(id) ON DELETE SET NULL;

ALTER TABLE septic_communications DROP CONSTRAINT IF EXISTS septic_communications_customer_id_fkey;
ALTER TABLE septic_communications ADD CONSTRAINT septic_communications_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES septic_customers(id) ON DELETE SET NULL;

ALTER TABLE septic_property_systems DROP CONSTRAINT IF EXISTS septic_property_systems_customer_id_fkey;
ALTER TABLE septic_property_systems ADD CONSTRAINT septic_property_systems_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES septic_customers(id) ON DELETE SET NULL;

ALTER TABLE septic_recurring_schedules DROP CONSTRAINT IF EXISTS septic_recurring_schedules_customer_id_fkey;
ALTER TABLE septic_recurring_schedules ADD CONSTRAINT septic_recurring_schedules_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES septic_customers(id) ON DELETE SET NULL;

ALTER TABLE septic_route_stops DROP CONSTRAINT IF EXISTS septic_route_stops_customer_id_fkey;
ALTER TABLE septic_route_stops ADD CONSTRAINT septic_route_stops_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES septic_customers(id) ON DELETE SET NULL;

ALTER TABLE septic_disposal_records DROP CONSTRAINT IF EXISTS septic_disposal_records_source_customer_id_fkey;
ALTER TABLE septic_disposal_records ADD CONSTRAINT septic_disposal_records_source_customer_id_fkey FOREIGN KEY (source_customer_id) REFERENCES septic_customers(id) ON DELETE SET NULL;

ALTER TABLE septic_payments DROP CONSTRAINT IF EXISTS septic_payments_customer_id_fkey;
ALTER TABLE septic_payments ADD CONSTRAINT septic_payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES septic_customers(id) ON DELETE SET NULL;

ALTER TABLE septic_inspection_records DROP CONSTRAINT IF EXISTS septic_inspection_records_customer_id_fkey;
ALTER TABLE septic_inspection_records ADD CONSTRAINT septic_inspection_records_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES septic_customers(id) ON DELETE SET NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'septic_pump_outs' AND column_name = 'customer_id') THEN
    ALTER TABLE septic_pump_outs DROP CONSTRAINT IF EXISTS septic_pump_outs_customer_id_fkey;
    ALTER TABLE septic_pump_outs ADD CONSTRAINT septic_pump_outs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES septic_customers(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_septic_customers_shop_id ON septic_customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_septic_customers_last_name ON septic_customers(shop_id, last_name);
