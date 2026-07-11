-- Fix missing display_order column in help_categories
ALTER TABLE help_categories ADD COLUMN display_order INTEGER DEFAULT 0;

-- Update existing categories with display_order
UPDATE help_categories SET display_order = 1 WHERE name = 'Getting Started';
UPDATE help_categories SET display_order = 2 WHERE name = 'Account Management';
UPDATE help_categories SET display_order = 3 WHERE name = 'Troubleshooting';
UPDATE help_categories SET display_order = 4 WHERE name = 'Advanced Features';