-- Drop the old equipment table as it's no longer used
-- All code has been migrated to use equipment_assets table instead
DROP TABLE IF EXISTS equipment CASCADE;