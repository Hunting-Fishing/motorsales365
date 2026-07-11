
-- Add nutrition lite fields to pt_clients
ALTER TABLE pt_clients ADD COLUMN IF NOT EXISTS calorie_target INTEGER;
ALTER TABLE pt_clients ADD COLUMN IF NOT EXISTS protein_target_g INTEGER;
ALTER TABLE pt_clients ADD COLUMN IF NOT EXISTS carb_target_g INTEGER;
ALTER TABLE pt_clients ADD COLUMN IF NOT EXISTS fat_target_g INTEGER;
ALTER TABLE pt_clients ADD COLUMN IF NOT EXISTS hydration_target_ml INTEGER DEFAULT 2500;
ALTER TABLE pt_clients ADD COLUMN IF NOT EXISTS meal_guidance TEXT;
ALTER TABLE pt_clients ADD COLUMN IF NOT EXISTS supplement_notes TEXT;
ALTER TABLE pt_clients ADD COLUMN IF NOT EXISTS food_habits TEXT;
ALTER TABLE pt_clients ADD COLUMN IF NOT EXISTS preferred_workout_days TEXT[];
ALTER TABLE pt_clients ADD COLUMN IF NOT EXISTS height_cm NUMERIC;

-- Add workout_compliance and soreness to check-ins
ALTER TABLE pt_check_ins ADD COLUMN IF NOT EXISTS workout_compliance INTEGER; -- 1-10
ALTER TABLE pt_check_ins ADD COLUMN IF NOT EXISTS nutrition_compliance INTEGER; -- 1-10
ALTER TABLE pt_check_ins ADD COLUMN IF NOT EXISTS soreness_level INTEGER; -- 1-10
ALTER TABLE pt_check_ins ADD COLUMN IF NOT EXISTS pain_issues TEXT;

-- Add session_notes to sessions for trainer notes on completion
ALTER TABLE pt_sessions ADD COLUMN IF NOT EXISTS session_notes TEXT;
