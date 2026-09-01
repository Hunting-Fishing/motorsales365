-- Explicit API-role hardening for projects with inherited legacy function grants.
REVOKE ALL ON FUNCTION public.apply_business_associate(uuid,text,text) FROM anon;
REVOKE ALL ON FUNCTION public.review_business_associate_application(uuid,text,text) FROM anon;

CREATE INDEX IF NOT EXISTS business_associate_reviewer_idx
  ON public.business_associate_applications(reviewed_by)
  WHERE reviewed_by IS NOT NULL;
