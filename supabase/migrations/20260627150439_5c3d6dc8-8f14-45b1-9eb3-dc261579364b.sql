
-- =========================================================
-- Phase 1: Parts Supplier Outreach / CRM layer
-- =========================================================

-- Extend parts_suppliers with operational columns
ALTER TABLE public.parts_suppliers
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lead_score INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lost_reason TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
  ADD COLUMN IF NOT EXISTS business_hours TEXT;

CREATE INDEX IF NOT EXISTS parts_suppliers_pipeline_stage_idx
  ON public.parts_suppliers(pipeline_stage);
CREATE INDEX IF NOT EXISTS parts_suppliers_next_action_at_idx
  ON public.parts_suppliers(next_action_at);
CREATE INDEX IF NOT EXISTS parts_suppliers_owner_user_id_idx
  ON public.parts_suppliers(owner_user_id);

-- updated_at helper (reuse if it exists)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------
-- parts_supplier_contacts
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parts_supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.parts_suppliers(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  viber TEXT,
  whatsapp TEXT,
  messenger TEXT,
  preferred_channel TEXT,
  preferred_time TEXT,
  language TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  do_not_contact BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_supplier_contacts TO authenticated;
GRANT ALL ON public.parts_supplier_contacts TO service_role;

ALTER TABLE public.parts_supplier_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and sales can read supplier contacts"
  ON public.parts_supplier_contacts FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE POLICY "Admins and sales can write supplier contacts"
  ON public.parts_supplier_contacts FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE INDEX IF NOT EXISTS psc_supplier_idx ON public.parts_supplier_contacts(supplier_id);
CREATE INDEX IF NOT EXISTS psc_primary_idx ON public.parts_supplier_contacts(supplier_id) WHERE is_primary;

CREATE TRIGGER psc_set_updated_at
  BEFORE UPDATE ON public.parts_supplier_contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------------------------------------------------------
-- parts_supplier_outreach
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parts_supplier_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.parts_suppliers(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.parts_supplier_contacts(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.parts_supplier_applications(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'call',
  direction TEXT NOT NULL DEFAULT 'outbound',
  outcome TEXT NOT NULL DEFAULT 'spoke',
  duration_sec INT,
  summary TEXT,
  next_action TEXT,
  next_action_at TIMESTAMPTZ,
  owner_user_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_supplier_outreach TO authenticated;
GRANT ALL ON public.parts_supplier_outreach TO service_role;

ALTER TABLE public.parts_supplier_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and sales can read outreach"
  ON public.parts_supplier_outreach FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE POLICY "Admins and sales can write outreach"
  ON public.parts_supplier_outreach FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE INDEX IF NOT EXISTS pso_supplier_idx ON public.parts_supplier_outreach(supplier_id);
CREATE INDEX IF NOT EXISTS pso_owner_idx ON public.parts_supplier_outreach(owner_user_id);
CREATE INDEX IF NOT EXISTS pso_occurred_idx ON public.parts_supplier_outreach(occurred_at DESC);
CREATE INDEX IF NOT EXISTS pso_next_action_idx ON public.parts_supplier_outreach(next_action_at);

CREATE TRIGGER pso_set_updated_at
  BEFORE UPDATE ON public.parts_supplier_outreach
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- When an outreach row is created, roll the supplier's last_contacted_at /
-- next_action_at forward so the "Today" queue stays accurate.
CREATE OR REPLACE FUNCTION public.tg_outreach_roll_supplier()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.parts_suppliers s
     SET last_contacted_at = GREATEST(COALESCE(s.last_contacted_at, NEW.occurred_at), NEW.occurred_at),
         next_action_at    = COALESCE(NEW.next_action_at, s.next_action_at),
         owner_user_id     = COALESCE(NEW.owner_user_id, s.owner_user_id),
         updated_at        = now()
   WHERE s.id = NEW.supplier_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pso_roll_supplier
  AFTER INSERT ON public.parts_supplier_outreach
  FOR EACH ROW EXECUTE FUNCTION public.tg_outreach_roll_supplier();

-- ---------------------------------------------------------
-- parts_supplier_tasks
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parts_supplier_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.parts_suppliers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  due_at TIMESTAMPTZ,
  owner_user_id UUID,
  status TEXT NOT NULL DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_supplier_tasks TO authenticated;
GRANT ALL ON public.parts_supplier_tasks TO service_role;

ALTER TABLE public.parts_supplier_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and sales can read supplier tasks"
  ON public.parts_supplier_tasks FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE POLICY "Admins and sales can write supplier tasks"
  ON public.parts_supplier_tasks FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE INDEX IF NOT EXISTS pst_supplier_idx ON public.parts_supplier_tasks(supplier_id);
CREATE INDEX IF NOT EXISTS pst_due_idx ON public.parts_supplier_tasks(due_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS pst_owner_idx ON public.parts_supplier_tasks(owner_user_id);

CREATE TRIGGER pst_set_updated_at
  BEFORE UPDATE ON public.parts_supplier_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
