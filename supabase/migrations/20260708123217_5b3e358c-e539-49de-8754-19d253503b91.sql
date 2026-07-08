
-- Register cron token for the signup-failure-alerts hook and schedule it.
INSERT INTO public.internal_cron_tokens (job_name, token)
VALUES ('signup_failure_alerts', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (job_name) DO NOTHING;

-- Unschedule any prior version of this job before rescheduling.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'signup-failure-alerts') THEN
    PERFORM cron.unschedule('signup-failure-alerts');
  END IF;
END $$;

SELECT cron.schedule(
  'signup-failure-alerts',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT value FROM public.site_settings WHERE key = 'app_url') || '/api/public/hooks/signup-failure-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE job_name = 'signup_failure_alerts')
    ),
    body := '{}'::jsonb
  );
  $cron$
);
