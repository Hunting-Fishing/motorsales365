
-- Create a table for email system settings if it doesn't exist
CREATE TABLE IF NOT EXISTS public.email_system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for email_system_settings
DROP TRIGGER IF EXISTS set_updated_at_timestamp_email_system_settings ON public.email_system_settings;
CREATE TRIGGER set_updated_at_timestamp_email_system_settings
BEFORE UPDATE ON public.email_system_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings for email processing schedule if not exists
INSERT INTO public.email_system_settings (key, value)
VALUES ('processing_schedule', '{"enabled": false, "cron": "*/30 * * * *"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create database functions for email processing schedule
CREATE OR REPLACE FUNCTION get_email_processing_schedule()
RETURNS JSONB AS $$
DECLARE
  schedule_data JSONB;
BEGIN
  SELECT value INTO schedule_data FROM public.email_system_settings WHERE key = 'processing_schedule';
  RETURN schedule_data;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_email_processing_schedule(new_settings JSONB)
RETURNS JSONB AS $$
DECLARE
  updated_settings JSONB;
BEGIN
  UPDATE public.email_system_settings
  SET value = new_settings
  WHERE key = 'processing_schedule'
  RETURNING value INTO updated_settings;
  
  RETURN updated_settings;
END;
$$ LANGUAGE plpgsql;
