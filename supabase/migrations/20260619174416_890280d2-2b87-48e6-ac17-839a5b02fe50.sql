-- 1. role_permissions table
CREATE TABLE public.role_permissions (
  role public.app_role NOT NULL,
  permission_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (role, permission_key)
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read role permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert role permissions"
  ON public.role_permissions FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update role permissions"
  ON public.role_permissions FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete role permissions"
  ON public.role_permissions FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_role_permissions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_role_permissions_updated_at();

-- 2. has_permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp
        ON rp.role = ur.role AND rp.permission_key = _key
      WHERE ur.user_id = _user_id AND rp.enabled = true
    );
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, anon, service_role;

-- 3. Seed nav permissions from current ADMIN_NAV roles (per non-admin role)
INSERT INTO public.role_permissions (role, permission_key, enabled) VALUES
  -- sales
  ('sales','nav.overview',true),
  ('sales','nav.sales',true),
  ('sales','nav.accounts',true),
  ('sales','nav.analytics',true),
  ('sales','nav.advertisements',true),
  ('sales','nav.shop',true),
  ('sales','nav.referrals',true),
  ('sales','nav.qr-ads',true),
  ('sales','nav.reports',true),
  -- moderator
  ('moderator','nav.overview',true),
  ('moderator','nav.businesses',true),
  ('moderator','nav.discover-businesses',true),
  ('moderator','nav.claims',true),
  ('moderator','nav.verifications',true),
  ('moderator','nav.listings',true),
  ('moderator','nav.reports',true),
  ('moderator','nav.location-corrections',true),
  ('moderator','nav.education',true),
  ('moderator','nav.qr-ads',true),
  -- support
  ('support','nav.overview',true),
  ('support','nav.sales',true),
  ('support','nav.accounts',true),
  ('support','nav.analytics',true),
  ('support','nav.listings',true),
  ('support','nav.reports',true),
  ('support','nav.dispatch',true),
  ('support','nav.qr-ads',true),
  -- advertising
  ('advertising','nav.overview',true),
  ('advertising','nav.sales',true),
  ('advertising','nav.advertisements',true),
  ('advertising','nav.shop',true),
  ('advertising','nav.qr-ads',true)
ON CONFLICT DO NOTHING;

-- 4. Widen admin_audit_log
ALTER TABLE public.admin_audit_log
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE public.admin_audit_log ALTER COLUMN target_user_id DROP NOT NULL;
ALTER TABLE public.admin_audit_log ALTER COLUMN field DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON public.admin_audit_log (entity_type, entity_id, created_at DESC);
