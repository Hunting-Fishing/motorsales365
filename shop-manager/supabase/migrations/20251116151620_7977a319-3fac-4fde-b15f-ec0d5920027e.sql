-- Step 1: Add new marine role values to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'deckhand';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'boson';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'mate';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'captain';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'chief_engineer';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'marine_engineer';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'fishing_master';