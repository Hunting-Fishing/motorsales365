
-- Add explicit admin-only SELECT policies to make intent clear and auditable
-- These tables already have RLS enabled with no SELECT policies; service_role bypasses RLS.
-- Adding explicit admin policies prevents accidental exposure if broader policies are added later.

CREATE POLICY "Admins read cron tokens"
ON public.internal_cron_tokens
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read webhook keys"
ON public.internal_webhook_keys
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
