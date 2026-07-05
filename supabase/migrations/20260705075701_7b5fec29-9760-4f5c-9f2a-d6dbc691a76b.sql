CREATE TABLE public.signup_failure_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  intent text,
  phone_iso text,
  reason text NOT NULL,
  missing_fields text[] NOT NULL DEFAULT '{}',
  status_code int NOT NULL,
  ip_hash text,
  user_agent text
);

GRANT SELECT ON public.signup_failure_events TO authenticated;
GRANT ALL ON public.signup_failure_events TO service_role;

ALTER TABLE public.signup_failure_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read signup failures"
  ON public.signup_failure_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_signup_failure_created ON public.signup_failure_events (created_at DESC);
CREATE INDEX idx_signup_failure_reason ON public.signup_failure_events (reason, created_at DESC);