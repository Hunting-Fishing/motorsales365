CREATE TABLE public.route_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  role_required text NOT NULL,
  route_label text NOT NULL,
  method text,
  outcome text NOT NULL CHECK (outcome IN ('allowed','denied','error')),
  error_message text,
  ip text,
  user_agent text,
  duration_ms integer,
  target_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_route_audit_actor ON public.route_audit_log (actor_id, created_at DESC);
CREATE INDEX idx_route_audit_label ON public.route_audit_log (route_label, created_at DESC);
CREATE INDEX idx_route_audit_created ON public.route_audit_log (created_at DESC);
CREATE INDEX idx_route_audit_outcome ON public.route_audit_log (outcome, created_at DESC) WHERE outcome <> 'allowed';

GRANT SELECT ON public.route_audit_log TO authenticated;
GRANT ALL ON public.route_audit_log TO service_role;

ALTER TABLE public.route_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read route audit"
  ON public.route_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Support read route audit"
  ON public.route_audit_log FOR SELECT
  USING (can_support(auth.uid()));
