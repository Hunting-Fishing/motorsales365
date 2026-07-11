-- Status log for service orders
CREATE TABLE public.septic_order_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  service_order_id UUID NOT NULL REFERENCES public.septic_service_orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

ALTER TABLE public.septic_order_status_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'septic_order_status_log' AND policyname = 'septic_order_status_log_shop_isolation') THEN
    CREATE POLICY septic_order_status_log_shop_isolation ON public.septic_order_status_log
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

-- Time entries for service orders
CREATE TABLE public.septic_order_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  service_order_id UUID NOT NULL REFERENCES public.septic_service_orders(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.septic_employees(id),
  employee_name TEXT,
  arrived_at TIMESTAMPTZ,
  departed_at TIMESTAMPTZ,
  duration_minutes NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.septic_order_time_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'septic_order_time_entries' AND policyname = 'septic_order_time_entries_shop_isolation') THEN
    CREATE POLICY septic_order_time_entries_shop_isolation ON public.septic_order_time_entries
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

-- Materials used for service orders
CREATE TABLE public.septic_order_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  service_order_id UUID NOT NULL REFERENCES public.septic_service_orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.septic_order_materials ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'septic_order_materials' AND policyname = 'septic_order_materials_shop_isolation') THEN
    CREATE POLICY septic_order_materials_shop_isolation ON public.septic_order_materials
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

-- Extend septic_inspections with richer fields
ALTER TABLE public.septic_inspections
  ADD COLUMN IF NOT EXISTS maintenance_items JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS parts_requested JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS work_performed TEXT,
  ADD COLUMN IF NOT EXISTS customer_remarks TEXT,
  ADD COLUMN IF NOT EXISTS inspection_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.septic_inspection_templates(id),
  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS departed_at TIMESTAMPTZ;