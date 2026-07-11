-- Add twilio_sid and error_message columns to sms_logs if not exist
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS twilio_sid TEXT;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;