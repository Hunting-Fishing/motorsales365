
ALTER TABLE public.flashcard_content
  ADD COLUMN IF NOT EXISTS auto_sync_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_sync_interval text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS auto_sync_last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_sync_last_status text,
  ADD COLUMN IF NOT EXISTS auto_sync_last_error text;

ALTER TABLE public.flashcard_content
  DROP CONSTRAINT IF EXISTS flashcard_content_auto_sync_interval_check;

ALTER TABLE public.flashcard_content
  ADD CONSTRAINT flashcard_content_auto_sync_interval_check
  CHECK (auto_sync_interval IN ('daily','weekly','biweekly','monthly'));
