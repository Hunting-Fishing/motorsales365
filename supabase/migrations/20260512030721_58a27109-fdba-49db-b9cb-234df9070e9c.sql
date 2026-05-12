CREATE TABLE IF NOT EXISTS public.ad_inquiry_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.ad_inquiries(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  from_value text,
  to_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ad_inquiry_audit_inquiry_idx
  ON public.ad_inquiry_audit(inquiry_id, created_at DESC);

ALTER TABLE public.ad_inquiry_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ad staff read audit" ON public.ad_inquiry_audit;
CREATE POLICY "Ad staff read audit" ON public.ad_inquiry_audit
  FOR SELECT USING (public.can_manage_ads(auth.uid()));

CREATE OR REPLACE FUNCTION public.tg_audit_ad_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, to_value)
      VALUES (NEW.id, NEW.submitter_user_id, 'created', NEW.status::text);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value)
        VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status::text, NEW.status::text);
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value)
        VALUES (NEW.id, auth.uid(), 'assigned',
                COALESCE(OLD.assigned_to::text,''), COALESCE(NEW.assigned_to::text,''));
    END IF;
    IF COALESCE(NEW.internal_notes,'') IS DISTINCT FROM COALESCE(OLD.internal_notes,'') THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action)
        VALUES (NEW.id, auth.uid(), 'notes_updated');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.tg_audit_ad_inquiry() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_audit_ad_inquiry() FROM anon;
REVOKE EXECUTE ON FUNCTION public.tg_audit_ad_inquiry() FROM authenticated;

DROP TRIGGER IF EXISTS trg_ad_inquiry_audit ON public.ad_inquiries;
CREATE TRIGGER trg_ad_inquiry_audit
  AFTER INSERT OR UPDATE ON public.ad_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_ad_inquiry();

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();