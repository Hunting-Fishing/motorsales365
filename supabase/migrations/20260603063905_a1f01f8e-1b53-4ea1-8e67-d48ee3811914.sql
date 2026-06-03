-- Unschedule old jobs, then re-create them reading URL+token from DB.
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname IN ('ops-alerts-digest', 'refresh-lazada-prices', 'refresh-fx-rates');
END;
$$;

-- ops-alerts-digest: every 15 minutes
SELECT cron.schedule(
  'ops-alerts-digest',
  '*/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT value FROM public.site_settings WHERE key = 'app_url') || '/api/public/hooks/ops-alerts-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE job_name = 'ops_alerts_digest')
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- refresh-lazada-prices: every 6 hours
SELECT cron.schedule(
  'refresh-lazada-prices',
  '0 */6 * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT value FROM public.site_settings WHERE key = 'app_url') || '/api/public/hooks/refresh-lazada',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE job_name = 'refresh_lazada')
    ),
    body := '{"limit":25}'::jsonb
  );
  $cron$
);

-- refresh-fx-rates: daily at 3am
SELECT cron.schedule(
  'refresh-fx-rates',
  '0 3 * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT value FROM public.site_settings WHERE key = 'app_url') || '/api/public/fx/refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE job_name = 'fx_refresh')
    ),
    body := '{}'::jsonb
  );
  $cron$
);