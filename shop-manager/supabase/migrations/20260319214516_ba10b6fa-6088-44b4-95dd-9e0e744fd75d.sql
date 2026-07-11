ALTER TABLE pt_exercises
ADD COLUMN IF NOT EXISTS secondary_muscles text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS movement_pattern text,
ADD COLUMN IF NOT EXISTS spinal_loading boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_compound boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contraindicated_for text[] DEFAULT '{}';