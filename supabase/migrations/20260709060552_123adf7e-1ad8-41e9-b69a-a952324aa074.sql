
CREATE TABLE public.franchise_application_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.franchise_applications(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('approve','reject','request_info','in_review','bulk_approve','tier_change','note_update')),
  from_status TEXT,
  to_status TEXT,
  from_tier TEXT,
  to_tier TEXT,
  reviewer_notes TEXT,
  message_to_applicant TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_franchise_app_audit_app ON public.franchise_application_audit(application_id, created_at DESC);
CREATE INDEX idx_franchise_app_audit_actor ON public.franchise_application_audit(actor_id);

GRANT SELECT ON public.franchise_application_audit TO authenticated;
GRANT ALL ON public.franchise_application_audit TO service_role;

ALTER TABLE public.franchise_application_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all franchise audit entries"
ON public.franchise_application_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Applicants can view their own franchise audit entries"
ON public.franchise_application_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.franchise_applications fa
    WHERE fa.id = franchise_application_audit.application_id
      AND fa.user_id = auth.uid()
  )
);
