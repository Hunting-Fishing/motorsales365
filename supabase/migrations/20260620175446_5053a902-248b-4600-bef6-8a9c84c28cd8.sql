
-- 1. Audit log for every approve/reject (and future revoke/resubmit) action on ad creatives
CREATE TABLE public.ad_creative_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id uuid NOT NULL REFERENCES public.ad_creatives(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.ad_orders(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('approved','rejected','revoked','resubmitted')),
  previous_status public.ad_creative_status,
  new_status public.ad_creative_status,
  reason text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_creative_audit_creative ON public.ad_creative_audit_log(creative_id, created_at DESC);
CREATE INDEX idx_ad_creative_audit_actor ON public.ad_creative_audit_log(actor_id, created_at DESC);

GRANT SELECT, INSERT ON public.ad_creative_audit_log TO authenticated;
GRANT ALL ON public.ad_creative_audit_log TO service_role;

ALTER TABLE public.ad_creative_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and ads role can read audit log"
  ON public.ad_creative_audit_log FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'advertising'::app_role)
  );

CREATE POLICY "Uploaders can read audit for their own creatives"
  ON public.ad_creative_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_creatives c
      WHERE c.id = ad_creative_audit_log.creative_id
        AND c.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Admins and ads role can insert audit"
  ON public.ad_creative_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'advertising'::app_role)
  );


-- 2. Generic per-user in-app notifications inbox
CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  body text,
  link_url text,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_notifications_user ON public.user_notifications(user_id, read_at, created_at DESC);
CREATE INDEX idx_user_notifications_entity ON public.user_notifications(entity_type, entity_id);

GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
  ON public.user_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Owner may only flip read_at; block mutating other columns from the client.
CREATE OR REPLACE FUNCTION public.user_notifications_lock_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.link_url IS DISTINCT FROM OLD.link_url
     OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
     OR NEW.entity_id IS DISTINCT FROM OLD.entity_id
     OR NEW.metadata IS DISTINCT FROM OLD.metadata
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only read_at may be updated by users';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_notifications_lock_columns
  BEFORE UPDATE ON public.user_notifications
  FOR EACH ROW
  WHEN (current_setting('role', true) <> 'service_role')
  EXECUTE FUNCTION public.user_notifications_lock_columns();

CREATE POLICY "Users can update their own notifications read state"
  ON public.user_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
