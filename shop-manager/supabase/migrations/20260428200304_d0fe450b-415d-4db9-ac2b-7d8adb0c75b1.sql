-- Customer categorization
ALTER TABLE public.welding_customers
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assigned_rep uuid;

-- Sales activity enrichments
ALTER TABLE public.welding_sales_activities
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS estimated_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pipeline_order int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Deposits table
CREATE TABLE IF NOT EXISTS public.welding_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  customer_id uuid REFERENCES public.welding_customers(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES public.welding_quotes(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.welding_invoices(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  received_date date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'held',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_deposits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='welding_deposits' AND policyname='welding_deposits_shop_select') THEN
    CREATE POLICY welding_deposits_shop_select ON public.welding_deposits FOR SELECT
      USING (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='welding_deposits' AND policyname='welding_deposits_shop_insert') THEN
    CREATE POLICY welding_deposits_shop_insert ON public.welding_deposits FOR INSERT
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='welding_deposits' AND policyname='welding_deposits_shop_update') THEN
    CREATE POLICY welding_deposits_shop_update ON public.welding_deposits FOR UPDATE
      USING (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='welding_deposits' AND policyname='welding_deposits_shop_delete') THEN
    CREATE POLICY welding_deposits_shop_delete ON public.welding_deposits FOR DELETE
      USING (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

CREATE TRIGGER update_welding_deposits_updated_at
  BEFORE UPDATE ON public.welding_deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Time entries table
CREATE TABLE IF NOT EXISTS public.welding_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  customer_id uuid REFERENCES public.welding_customers(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES public.welding_quotes(id) ON DELETE SET NULL,
  user_id uuid,
  category text NOT NULL DEFAULT 'general',
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  minutes integer NOT NULL DEFAULT 0,
  billable boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_time_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='welding_time_entries' AND policyname='welding_time_entries_shop_select') THEN
    CREATE POLICY welding_time_entries_shop_select ON public.welding_time_entries FOR SELECT
      USING (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='welding_time_entries' AND policyname='welding_time_entries_shop_insert') THEN
    CREATE POLICY welding_time_entries_shop_insert ON public.welding_time_entries FOR INSERT
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='welding_time_entries' AND policyname='welding_time_entries_shop_update') THEN
    CREATE POLICY welding_time_entries_shop_update ON public.welding_time_entries FOR UPDATE
      USING (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='welding_time_entries' AND policyname='welding_time_entries_shop_delete') THEN
    CREATE POLICY welding_time_entries_shop_delete ON public.welding_time_entries FOR DELETE
      USING (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_welding_deposits_shop ON public.welding_deposits(shop_id);
CREATE INDEX IF NOT EXISTS idx_welding_deposits_customer ON public.welding_deposits(customer_id);
CREATE INDEX IF NOT EXISTS idx_welding_time_entries_shop ON public.welding_time_entries(shop_id);
CREATE INDEX IF NOT EXISTS idx_welding_time_entries_customer ON public.welding_time_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_welding_time_entries_date ON public.welding_time_entries(entry_date);