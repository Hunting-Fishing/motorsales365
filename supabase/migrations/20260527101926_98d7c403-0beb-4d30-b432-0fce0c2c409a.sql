DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='refresh-lazada-prices') THEN
    PERFORM cron.unschedule('refresh-lazada-prices');
  END IF;
END $$;

SELECT cron.schedule(
  'refresh-lazada-prices',
  '0 */6 * * *',
  $cron$SELECT net.http_post(
    url:='https://project--0738c881-614d-4885-8d75-1b7c90e0835e.lovable.app/api/public/hooks/refresh-lazada',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmanJuanlyb3h2bHlkYWp2bmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTc4MDcsImV4cCI6MjA5MzIzMzgwN30.5jA3w00xtR3Y975XYk4Tks4j82NpOA8XXNiB8XLYiSE"}'::jsonb,
    body:='{"limit":50}'::jsonb
  ) AS request_id;$cron$
);