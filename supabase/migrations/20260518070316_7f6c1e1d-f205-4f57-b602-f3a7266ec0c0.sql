CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule if previously set (idempotent)
DO $$ BEGIN
  PERFORM cron.unschedule('expire-stale-pending-sales');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM cron.unschedule('refresh-fx-rates');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Daily: expire stale pending sales at 02:00 UTC
SELECT cron.schedule(
  'expire-stale-pending-sales',
  '0 2 * * *',
  $$ SELECT public.expire_stale_pending_sales(); $$
);

-- Daily: refresh FX rates at 03:00 UTC
SELECT cron.schedule(
  'refresh-fx-rates',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--0738c881-614d-4885-8d75-1b7c90e0835e.lovable.app/api/public/fx/refresh',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmanJuanlyb3h2bHlkYWp2bmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTc4MDcsImV4cCI6MjA5MzIzMzgwN30.5jA3w00xtR3Y975XYk4Tks4j82NpOA8XXNiB8XLYiSE"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);