CREATE TABLE public.account_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  actor_role text NOT NULL,
  field text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_audit_target ON public.account_audit_log(target_user_id, created_at DESC);
CREATE INDEX idx_account_audit_actor ON public.account_audit_log(actor_id, created_at DESC);

ALTER TABLE public.account_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit log"
  ON public.account_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sales view audit log"
  ON public.account_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Staff write audit log"
  ON public.account_audit_log FOR INSERT
  WITH CHECK (
    auth.uid() = actor_id
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role))
  );