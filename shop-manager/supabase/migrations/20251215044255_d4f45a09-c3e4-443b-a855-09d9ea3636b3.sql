-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the milestone notification processor to run daily at 8 AM UTC
SELECT cron.schedule(
  'process-milestone-notifications-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://oudkbrnvommbvtuispla.supabase.co/functions/v1/process-milestone-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91ZGticm52b21tYnZ0dWlzcGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MTgzODgsImV4cCI6MjA1ODQ5NDM4OH0.Hyo-lkI96GBLt-zp5zZLvCL1bSEWTomIIrzvKRO4LF4"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);