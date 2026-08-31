-- security_invoker views require source-column privileges in addition to RLS.
-- Expose only the fields required to identify approved Associate businesses.
GRANT SELECT (business_id, track, status, approved_at)
  ON public.business_associate_applications TO anon;
