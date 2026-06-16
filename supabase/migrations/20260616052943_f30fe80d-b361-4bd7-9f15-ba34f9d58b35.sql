
CREATE TABLE public.service_suggestion_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES public.service_catalog_suggestions(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('approved','rejected','merged')),
  catalog_id uuid REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.service_suggestion_audit_log TO authenticated;
GRANT ALL ON public.service_suggestion_audit_log TO service_role;

ALTER TABLE public.service_suggestion_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read service suggestion audit"
  ON public.service_suggestion_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ssal_suggestion ON public.service_suggestion_audit_log(suggestion_id, created_at DESC);
CREATE INDEX idx_ssal_actor ON public.service_suggestion_audit_log(actor_id, created_at DESC);
CREATE INDEX idx_ssal_created ON public.service_suggestion_audit_log(created_at DESC);
