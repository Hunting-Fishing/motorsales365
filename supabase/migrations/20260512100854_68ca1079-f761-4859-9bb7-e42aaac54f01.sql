
-- Audit log for staff referral changes
CREATE TABLE public.staff_referral_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_referral_id uuid,
  staff_email text,
  actor_id uuid,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sr_audit_staff ON public.staff_referral_audit(staff_referral_id, created_at DESC);
CREATE INDEX idx_sr_audit_created ON public.staff_referral_audit(created_at DESC);

ALTER TABLE public.staff_referral_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read sr audit" ON public.staff_referral_audit
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert sr audit" ON public.staff_referral_audit
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = actor_id);

-- Trigger logs activate/deactivate and qr regeneration
CREATE OR REPLACE FUNCTION public.tg_staff_referral_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.active IS DISTINCT FROM OLD.active THEN
    INSERT INTO public.staff_referral_audit(staff_referral_id, staff_email, actor_id, action, details)
    VALUES (NEW.id, NEW.email, auth.uid(),
      CASE WHEN NEW.active THEN 'activated' ELSE 'deactivated' END,
      jsonb_build_object('referral_code', NEW.referral_code, 'full_name', NEW.full_name));
  END IF;
  IF NEW.qr_storage_path IS DISTINCT FROM OLD.qr_storage_path AND NEW.qr_storage_path IS NOT NULL THEN
    INSERT INTO public.staff_referral_audit(staff_referral_id, staff_email, actor_id, action, details)
    VALUES (NEW.id, NEW.email, auth.uid(), 'qr_generated',
      jsonb_build_object('referral_code', NEW.referral_code, 'storage_path', NEW.qr_storage_path));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER staff_referral_audit_trg
AFTER UPDATE ON public.staff_referrals
FOR EACH ROW EXECUTE FUNCTION public.tg_staff_referral_audit();

-- Trigger logs creation
CREATE OR REPLACE FUNCTION public.tg_staff_referral_audit_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff_referral_audit(staff_referral_id, staff_email, actor_id, action, details)
  VALUES (NEW.id, NEW.email, auth.uid(), 'created',
    jsonb_build_object('referral_code', NEW.referral_code, 'full_name', NEW.full_name, 'active', NEW.active));
  RETURN NEW;
END $$;

CREATE TRIGGER staff_referral_audit_insert_trg
AFTER INSERT ON public.staff_referrals
FOR EACH ROW EXECUTE FUNCTION public.tg_staff_referral_audit_insert();
