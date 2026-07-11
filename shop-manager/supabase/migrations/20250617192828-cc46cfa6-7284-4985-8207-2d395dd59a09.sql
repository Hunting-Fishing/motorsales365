
-- Add missing service sectors to the database
INSERT INTO service_sectors (name, description, position, is_active) VALUES
('Marine', 'Boat, yacht, and watercraft maintenance and repair services', 2, true),
('Lawn Care', 'Landscaping, lawn maintenance, and grounds keeping services', 3, true),
('Heavy Duty', 'Commercial trucks, construction equipment, and industrial machinery services', 4, true),
('Small Engines', 'Generators, chainsaws, lawnmowers, and portable equipment services', 5, true),
('Motorcycle', 'Motorcycle, ATV, and recreational vehicle services', 6, true),
('RV/Recreational Vehicle', 'Motorhomes, travel trailers, and recreational vehicle services', 7, true),
('Agricultural', 'Farm equipment and agricultural machinery services', 8, true),
('Industrial', 'Factory equipment and industrial systems maintenance', 9, true);

-- Update the existing Automotive sector to have position 1
UPDATE service_sectors 
SET position = 1 
WHERE name = 'Automotive';
