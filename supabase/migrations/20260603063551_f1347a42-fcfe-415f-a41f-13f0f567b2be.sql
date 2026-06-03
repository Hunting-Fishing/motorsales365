-- Internal webhook signing keys (HMAC). Service-role only; no anon/auth grants.
CREATE TABLE IF NOT EXISTS public.internal_webhook_keys (
  name TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_webhook_keys TO service_role;
ALTER TABLE public.internal_webhook_keys ENABLE ROW LEVEL SECURITY;
-- No policies => default-deny for anon + authenticated.

-- Internal cron-job tokens. Service-role only.
CREATE TABLE IF NOT EXISTS public.internal_cron_tokens (
  job_name TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_cron_tokens TO service_role;
ALTER TABLE public.internal_cron_tokens ENABLE ROW LEVEL SECURITY;

-- Seed initial random secrets (idempotent).
INSERT INTO public.internal_webhook_keys (name, secret)
VALUES ('payment_events', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.internal_cron_tokens (job_name, token)
VALUES
  ('ops_alerts_digest', encode(gen_random_bytes(32), 'hex')),
  ('refresh_lazada',    encode(gen_random_bytes(32), 'hex')),
  ('fx_refresh',        encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (job_name) DO NOTHING;

-- Ensure site_settings has app_url so cron jobs can read it.
INSERT INTO public.site_settings (key, value)
VALUES ('app_url', 'https://365motorsales.com')
ON CONFLICT (key) DO NOTHING;

-- Admin-only rotation RPC. Uses has_role(); never exposes the secret to clients.
CREATE OR REPLACE FUNCTION public.rotate_internal_webhook_key(_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.internal_webhook_keys (name, secret, rotated_at)
  VALUES (_name, encode(gen_random_bytes(32), 'hex'), now())
  ON CONFLICT (name) DO UPDATE
    SET secret = EXCLUDED.secret, rotated_at = now();
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_internal_cron_token(_job_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.internal_cron_tokens (job_name, token, rotated_at)
  VALUES (_job_name, encode(gen_random_bytes(32), 'hex'), now())
  ON CONFLICT (job_name) DO UPDATE
    SET token = EXCLUDED.token, rotated_at = now();
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_internal_webhook_key(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rotate_internal_cron_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rotate_internal_webhook_key(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_internal_cron_token(TEXT) TO authenticated;