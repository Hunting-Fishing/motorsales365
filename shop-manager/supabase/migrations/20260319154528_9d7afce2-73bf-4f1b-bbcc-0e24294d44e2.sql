
-- Add metadata columns to pt_workout_programs
ALTER TABLE pt_workout_programs 
  ADD COLUMN IF NOT EXISTS workout_style TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS training_platform TEXT DEFAULT 'gym',
  ADD COLUMN IF NOT EXISTS target_muscles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS days_per_week INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS session_duration_minutes INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS limitations TEXT,
  ADD COLUMN IF NOT EXISTS is_preset BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS preset_category TEXT;

-- Make shop_id nullable for global presets
ALTER TABLE pt_workout_programs ALTER COLUMN shop_id DROP NOT NULL;
