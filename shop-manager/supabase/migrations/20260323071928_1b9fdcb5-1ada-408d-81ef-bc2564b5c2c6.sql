
ALTER TABLE septic_inspection_template_items
  ADD COLUMN IF NOT EXISTS allows_notes boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS allows_photos boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS allows_videos boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS response_type text DEFAULT 'pass_fail_na';
