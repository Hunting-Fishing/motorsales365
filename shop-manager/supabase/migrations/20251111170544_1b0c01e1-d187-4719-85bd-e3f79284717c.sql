-- Remove test/demo data from equipment table
DELETE FROM equipment WHERE id = 'EQ-2023-001' AND customer = 'Acme Corporation';

-- Verify the equipment table is ready for real data
-- The table structure is already correct with all necessary columns