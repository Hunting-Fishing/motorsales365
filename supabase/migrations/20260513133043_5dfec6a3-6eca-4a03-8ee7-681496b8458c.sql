-- Audit log for admin changes to user roles and verification status
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL, -- 'role_granted','role_revoked','verification_changed','seller_type_changed'
  field text NOT NULL,  -- 'role','verification_status','seller_type'
  old_value text,
  new_value text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_target ON public.admin_audit_log (target_user_id, created_at DESC);
CREATE INDEX idx_admin_audit_actor ON public.admin_audit_log (actor_id, created_at DESC);
CREATE INDEX idx_admin_audit_created ON public.admin_audit_log (created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read admin audit"
  ON public.admin_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Support read admin audit"
  ON public.admin_audit_log FOR SELECT
  USING (can_support(auth.uid()));

CREATE POLICY "Admins write admin audit"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = actor_id);
