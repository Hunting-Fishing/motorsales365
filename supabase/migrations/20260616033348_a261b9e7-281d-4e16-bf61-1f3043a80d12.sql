
-- ============ enums ============
DO $$ BEGIN
  CREATE TYPE public.business_staff_role AS ENUM
    ('owner','manager','dispatcher','driver','mechanic','clerk');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.business_asset_kind AS ENUM
    ('tow_truck','flatbed','wrecker','service_van','trailer','equipment','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.business_asset_status AS ENUM
    ('active','maintenance','out_of_service','retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ business_staff ============
CREATE TABLE IF NOT EXISTS public.business_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.business_staff_role NOT NULL DEFAULT 'driver',
  title text,
  duties text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  on_shift boolean NOT NULL DEFAULT false,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
CREATE INDEX IF NOT EXISTS business_staff_user_idx ON public.business_staff(user_id);
CREATE INDEX IF NOT EXISTS business_staff_business_idx ON public.business_staff(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_staff TO authenticated;
GRANT ALL ON public.business_staff TO service_role;
ALTER TABLE public.business_staff ENABLE ROW LEVEL SECURITY;

-- security-definer helpers (defined before policies that use them)
CREATE OR REPLACE FUNCTION public.is_business_owner(_user uuid, _business uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business AND owner_id = _user)
$$;

CREATE OR REPLACE FUNCTION public.has_business_role(_user uuid, _business uuid, _role public.business_staff_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_business_owner(_user, _business)
    OR EXISTS (
      SELECT 1 FROM public.business_staff
      WHERE business_id = _business AND user_id = _user AND active = true
        AND (role = _role OR role = 'owner' OR role = 'manager')
    )
$$;

CREATE OR REPLACE FUNCTION public.is_business_member(_user uuid, _business uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_business_owner(_user, _business)
    OR EXISTS (
      SELECT 1 FROM public.business_staff
      WHERE business_id = _business AND user_id = _user AND active = true
    )
$$;

CREATE POLICY "staff: members read" ON public.business_staff
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR user_id = auth.uid());

CREATE POLICY "staff: owner/manager insert" ON public.business_staff
  FOR INSERT TO authenticated
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

CREATE POLICY "staff: owner/manager update" ON public.business_staff
  FOR UPDATE TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager') OR user_id = auth.uid())
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager') OR user_id = auth.uid());

CREATE POLICY "staff: owner delete" ON public.business_staff
  FOR DELETE TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id));

-- ============ business_assets ============
CREATE TABLE IF NOT EXISTS public.business_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind public.business_asset_kind NOT NULL DEFAULT 'tow_truck',
  name text NOT NULL,
  plate text,
  vin text,
  capacity_kg integer,
  status public.business_asset_status NOT NULL DEFAULT 'active',
  assigned_driver_id uuid,
  photos jsonb NOT NULL DEFAULT '[]',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_assets_business_idx ON public.business_assets(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_assets TO authenticated;
GRANT ALL ON public.business_assets TO service_role;
ALTER TABLE public.business_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assets: members read" ON public.business_assets
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "assets: manager write" ON public.business_assets
  FOR ALL TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

-- ============ business_asset_maintenance ============
CREATE TABLE IF NOT EXISTS public.business_asset_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.business_assets(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  odometer_km integer,
  work_done text NOT NULL,
  cost numeric(12,2),
  next_due_date date,
  next_due_km integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_asset_maint_asset_idx ON public.business_asset_maintenance(asset_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_asset_maintenance TO authenticated;
GRANT ALL ON public.business_asset_maintenance TO service_role;
ALTER TABLE public.business_asset_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_maint: members read" ON public.business_asset_maintenance
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "asset_maint: manager write" ON public.business_asset_maintenance
  FOR ALL TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

-- ============ business_inventory_items ============
CREATE TABLE IF NOT EXISTS public.business_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  category text,
  unit text NOT NULL DEFAULT 'pc',
  qty_on_hand numeric(12,2) NOT NULL DEFAULT 0,
  reorder_at numeric(12,2),
  cost numeric(12,2),
  location text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_inv_business_idx ON public.business_inventory_items(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_inventory_items TO authenticated;
GRANT ALL ON public.business_inventory_items TO service_role;
ALTER TABLE public.business_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv: members read" ON public.business_inventory_items
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "inv: manager write" ON public.business_inventory_items
  FOR ALL TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

-- ============ business_inventory_movements ============
CREATE TABLE IF NOT EXISTS public.business_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.business_inventory_items(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  delta numeric(12,2) NOT NULL,
  reason text,
  tow_request_id uuid,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_inv_mov_item_idx ON public.business_inventory_movements(item_id);

GRANT SELECT, INSERT ON public.business_inventory_movements TO authenticated;
GRANT ALL ON public.business_inventory_movements TO service_role;
ALTER TABLE public.business_inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_mov: members read" ON public.business_inventory_movements
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "inv_mov: member insert" ON public.business_inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_member(auth.uid(), business_id));

-- ============ tow_requests lifecycle extensions ============
ALTER TABLE public.tow_requests
  ADD COLUMN IF NOT EXISTS assigned_driver_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_asset_id uuid REFERENCES public.business_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS en_route_at timestamptz,
  ADD COLUMN IF NOT EXISTS on_scene_at timestamptz,
  ADD COLUMN IF NOT EXISTS towing_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS driver_notes text;

-- ============ updated_at triggers ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_business_staff_updated ON public.business_staff;
CREATE TRIGGER trg_business_staff_updated BEFORE UPDATE ON public.business_staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_business_assets_updated ON public.business_assets;
CREATE TRIGGER trg_business_assets_updated BEFORE UPDATE ON public.business_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_business_inv_updated ON public.business_inventory_items;
CREATE TRIGGER trg_business_inv_updated BEFORE UPDATE ON public.business_inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
