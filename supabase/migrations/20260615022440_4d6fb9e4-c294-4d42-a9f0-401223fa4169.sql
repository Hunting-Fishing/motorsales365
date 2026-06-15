
-- Enum for request status
DO $$ BEGIN
  CREATE TYPE public.staff_contact_request_status AS ENUM ('pending','approved','denied','expired','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.staff_contact_audit_action AS ENUM ('created','approved','denied','revoked','expired','accessed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Requests table
CREATE TABLE IF NOT EXISTS public.staff_client_contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id UUID,
  ad_inquiry_id UUID,
  reason TEXT NOT NULL,
  status public.staff_contact_request_status NOT NULL DEFAULT 'pending',
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (requester_id <> owner_id),
  CHECK (client_profile_id IS NOT NULL OR lead_id IS NOT NULL OR ad_inquiry_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_scc_requests_owner_status ON public.staff_client_contact_requests(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_scc_requests_requester_status ON public.staff_client_contact_requests(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_scc_requests_client ON public.staff_client_contact_requests(client_profile_id);

GRANT SELECT, INSERT, UPDATE ON public.staff_client_contact_requests TO authenticated;
GRANT ALL ON public.staff_client_contact_requests TO service_role;

ALTER TABLE public.staff_client_contact_requests ENABLE ROW LEVEL SECURITY;

-- Audit table (append-only)
CREATE TABLE IF NOT EXISTS public.staff_client_contact_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.staff_client_contact_requests(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action public.staff_contact_audit_action NOT NULL,
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scc_audit_request ON public.staff_client_contact_audit(request_id, created_at DESC);

GRANT SELECT, INSERT ON public.staff_client_contact_audit TO authenticated;
GRANT ALL ON public.staff_client_contact_audit TO service_role;

ALTER TABLE public.staff_client_contact_audit ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_scc_requests_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_scc_requests_updated_at ON public.staff_client_contact_requests;
CREATE TRIGGER trg_scc_requests_updated_at
  BEFORE UPDATE ON public.staff_client_contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_scc_requests_set_updated_at();

-- Helper: is_365_staff (admin/moderator OR @365motorsales.com email)
CREATE OR REPLACE FUNCTION public.is_365_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','moderator')
  ) OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id AND lower(email) LIKE '%@365motorsales.com'
  );
$$;

-- Helper: active client access
CREATE OR REPLACE FUNCTION public.has_active_client_access(_requester UUID, _owner UUID, _client UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_client_contact_requests
    WHERE requester_id = _requester
      AND owner_id = _owner
      AND client_profile_id = _client
      AND status = 'approved'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- RLS policies: requests
DROP POLICY IF EXISTS "scc_requests_select" ON public.staff_client_contact_requests;
CREATE POLICY "scc_requests_select" ON public.staff_client_contact_requests
  FOR SELECT TO authenticated
  USING (
    auth.uid() = requester_id
    OR auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "scc_requests_insert" ON public.staff_client_contact_requests;
CREATE POLICY "scc_requests_insert" ON public.staff_client_contact_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND public.is_365_staff(auth.uid())
    AND public.is_365_staff(owner_id)
  );

DROP POLICY IF EXISTS "scc_requests_update" ON public.staff_client_contact_requests;
CREATE POLICY "scc_requests_update" ON public.staff_client_contact_requests
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id
    OR auth.uid() = requester_id
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR auth.uid() = requester_id
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS policies: audit
DROP POLICY IF EXISTS "scc_audit_select" ON public.staff_client_contact_audit;
CREATE POLICY "scc_audit_select" ON public.staff_client_contact_audit
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.staff_client_contact_requests r
      WHERE r.id = request_id
        AND (r.requester_id = auth.uid() OR r.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "scc_audit_insert" ON public.staff_client_contact_audit;
CREATE POLICY "scc_audit_insert" ON public.staff_client_contact_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.staff_client_contact_requests r
      WHERE r.id = request_id
        AND (r.requester_id = auth.uid() OR r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
