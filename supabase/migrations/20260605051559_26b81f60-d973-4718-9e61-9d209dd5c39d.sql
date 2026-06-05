
CREATE TABLE public.sales_rep_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  rep_user_id uuid,
  prev_rep_user_id uuid,
  subject_type text,
  subject_id uuid,
  territory_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_rep_audit_created ON public.sales_rep_audit_log (created_at DESC);
CREATE INDEX idx_sales_rep_audit_rep ON public.sales_rep_audit_log (rep_user_id);
CREATE INDEX idx_sales_rep_audit_subject ON public.sales_rep_audit_log (subject_type, subject_id);

GRANT SELECT, INSERT ON public.sales_rep_audit_log TO authenticated;
GRANT ALL ON public.sales_rep_audit_log TO service_role;

ALTER TABLE public.sales_rep_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sales rep audit log"
  ON public.sales_rep_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert sales rep audit log"
  ON public.sales_rep_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND actor_id = auth.uid());
