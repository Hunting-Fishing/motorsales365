-- Add columns for staff responses and feedback categorization
ALTER TABLE feedback_responses 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'responded', 'resolved')),
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general' CHECK (category IN ('service', 'staff', 'pricing', 'facility', 'general')),
ADD COLUMN IF NOT EXISTS comment text,
ADD COLUMN IF NOT EXISTS response_text text,
ADD COLUMN IF NOT EXISTS responded_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS responded_at timestamp with time zone;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_feedback_responses_status ON feedback_responses(status);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_category ON feedback_responses(category);

-- Add RLS policies for feedback responses management
DO $$
BEGIN
  -- Drop existing policies if they exist (to avoid conflicts)
  DROP POLICY IF EXISTS "feedback_responses_select_policy" ON feedback_responses;
  DROP POLICY IF EXISTS "feedback_responses_insert_policy" ON feedback_responses;
  DROP POLICY IF EXISTS "feedback_responses_update_policy" ON feedback_responses;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- Allow authenticated users to view all feedback responses
CREATE POLICY "feedback_responses_select_policy" ON feedback_responses
FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert feedback responses  
CREATE POLICY "feedback_responses_insert_policy" ON feedback_responses
FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update feedback responses
CREATE POLICY "feedback_responses_update_policy" ON feedback_responses
FOR UPDATE TO authenticated USING (true);