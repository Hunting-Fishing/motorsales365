
-- Phone verification mirror columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

-- OTP rate limiting log
CREATE TABLE IF NOT EXISTS public.otp_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('verify','recovery')),
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_send_log_phone_sent_idx
  ON public.otp_send_log (phone, sent_at DESC);

ALTER TABLE public.otp_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own otp log"
  ON public.otp_send_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own otp log"
  ON public.otp_send_log FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
