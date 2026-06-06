
CREATE TABLE public.business_claim_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.business_claim_requests(id) ON DELETE CASCADE,
  actor_user_id UUID,
  action TEXT NOT NULL CHECK (action IN (
    'submitted','resubmitted','approved','auto_approved','rejected',
    'evidence_added','evidence_removed','reviewer_note'
  )),
  notes TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_bca_claim ON public.business_claim_audit(claim_id, created_at DESC);

GRANT SELECT, INSERT ON public.business_claim_audit TO authenticated;
GRANT ALL ON public.business_claim_audit TO service_role;

ALTER TABLE public.business_claim_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own claim audit or mod"
  ON public.business_claim_audit FOR SELECT TO authenticated
  USING (
    public.can_moderate(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.business_claim_requests c
      WHERE c.id = claim_id AND c.claimant_user_id = auth.uid()
    )
  );

-- Inserts happen via SECURITY DEFINER triggers; deny direct user inserts
CREATE POLICY "Block direct inserts"
  ON public.business_claim_audit FOR INSERT TO authenticated
  WITH CHECK (false);

-- ---------- Triggers ----------

CREATE OR REPLACE FUNCTION public.tg_claim_audit_status()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.business_claim_audit(claim_id, actor_user_id, action, details)
    VALUES (NEW.id, NEW.claimant_user_id, 'submitted',
      jsonb_build_object('contact_method', NEW.contact_method));
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN v_action := 'approved';
    ELSIF NEW.status = 'auto_approved' THEN v_action := 'auto_approved';
    ELSIF NEW.status = 'rejected' THEN v_action := 'rejected';
    ELSIF NEW.status = 'pending' AND OLD.status = 'rejected' THEN v_action := 'resubmitted';
    ELSE v_action := NULL;
    END IF;

    IF v_action IS NOT NULL THEN
      INSERT INTO public.business_claim_audit(claim_id, actor_user_id, action, notes, details)
      VALUES (NEW.id, COALESCE(NEW.reviewer_user_id, auth.uid()), v_action,
        NEW.reviewer_notes,
        jsonb_build_object('from', OLD.status, 'to', NEW.status));
    END IF;
  ELSIF COALESCE(NEW.reviewer_notes,'') IS DISTINCT FROM COALESCE(OLD.reviewer_notes,'')
        AND NEW.reviewer_notes IS NOT NULL THEN
    INSERT INTO public.business_claim_audit(claim_id, actor_user_id, action, notes)
    VALUES (NEW.id, COALESCE(NEW.reviewer_user_id, auth.uid()), 'reviewer_note', NEW.reviewer_notes);
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_claim_audit_status
AFTER INSERT OR UPDATE ON public.business_claim_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_claim_audit_status();

CREATE OR REPLACE FUNCTION public.tg_claim_audit_evidence()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.business_claim_audit(claim_id, actor_user_id, action, details)
    VALUES (NEW.claim_id, NEW.uploader_user_id, 'evidence_added',
      jsonb_build_object(
        'evidence_id', NEW.id,
        'evidence_type', NEW.evidence_type,
        'file_name', NEW.file_name,
        'file_size', NEW.file_size,
        'mime_type', NEW.mime_type
      ));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.business_claim_audit(claim_id, actor_user_id, action, details)
    VALUES (OLD.claim_id, COALESCE(auth.uid(), OLD.uploader_user_id), 'evidence_removed',
      jsonb_build_object(
        'evidence_id', OLD.id,
        'evidence_type', OLD.evidence_type,
        'file_name', OLD.file_name,
        'file_size', OLD.file_size,
        'mime_type', OLD.mime_type
      ));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_claim_audit_evidence_ins
AFTER INSERT ON public.business_claim_evidence
FOR EACH ROW EXECUTE FUNCTION public.tg_claim_audit_evidence();

CREATE TRIGGER trg_claim_audit_evidence_del
AFTER DELETE ON public.business_claim_evidence
FOR EACH ROW EXECUTE FUNCTION public.tg_claim_audit_evidence();
