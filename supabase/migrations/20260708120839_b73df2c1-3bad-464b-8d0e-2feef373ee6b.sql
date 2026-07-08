ALTER TABLE public.signup_failure_events
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS error_message text;

CREATE INDEX IF NOT EXISTS idx_signup_failure_error_code
  ON public.signup_failure_events (error_code, created_at DESC)
  WHERE error_code IS NOT NULL;