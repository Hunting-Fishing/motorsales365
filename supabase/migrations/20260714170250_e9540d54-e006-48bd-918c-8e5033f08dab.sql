-- Add optional labor economics fields to shop_manager.profiles so
-- per-technician P&L (revenue = billable hours × rate, cost = hours × cost_rate)
-- has stable columns to read from.
ALTER TABLE shop_manager.profiles
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2),
  ADD COLUMN IF NOT EXISTS cost_rate numeric(10,2);

-- Track which rule produced a reminder so audit + admin surfaces can attribute
-- automation output.
ALTER TABLE shop_manager.service_reminders
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_rule_id uuid;

-- Register the cron-driven automation runner token. Value is a random 32-byte
-- hex string; pg_cron sends it in the `x-cron-token` header.
INSERT INTO public.internal_cron_tokens (job_name, token)
VALUES ('shop_automation_run', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (job_name) DO NOTHING;
