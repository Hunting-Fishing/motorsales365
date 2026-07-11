-- Add Change Log columns to feature_requests table
ALTER TABLE feature_requests 
ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS reason_for_change TEXT,
ADD COLUMN IF NOT EXISTS progress_notes TEXT,
ADD COLUMN IF NOT EXISTS developer_actions TEXT;

-- Create a sequence for request numbers if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'feature_request_number_seq') THEN
    CREATE SEQUENCE feature_request_number_seq START 1;
  END IF;
END $$;

-- Add request_number column with default from sequence
ALTER TABLE feature_requests 
ADD COLUMN IF NOT EXISTS request_number INTEGER DEFAULT nextval('feature_request_number_seq');

-- Update existing rows to have request numbers if they don't
UPDATE feature_requests 
SET request_number = nextval('feature_request_number_seq') 
WHERE request_number IS NULL;

-- Make request_number NOT NULL after populating
ALTER TABLE feature_requests 
ALTER COLUMN request_number SET NOT NULL;

-- Add index for module filtering
CREATE INDEX IF NOT EXISTS idx_feature_requests_module ON feature_requests(module);

-- Add index for request_number
CREATE INDEX IF NOT EXISTS idx_feature_requests_request_number ON feature_requests(request_number);

-- Add comment for documentation
COMMENT ON COLUMN feature_requests.module IS 'Which app module this request relates to (gunsmith, power_washing, pos, etc.)';
COMMENT ON COLUMN feature_requests.reason_for_change IS 'Why the user wants this change';
COMMENT ON COLUMN feature_requests.progress_notes IS 'Developer updates on progress or reason for rejection';
COMMENT ON COLUMN feature_requests.developer_actions IS 'Actions taken or planned by developer';
COMMENT ON COLUMN feature_requests.request_number IS 'Auto-incrementing readable ID for display (FR-001, etc.)';