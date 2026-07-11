-- Make category_id nullable to allow products without categories
ALTER TABLE products ALTER COLUMN category_id DROP NOT NULL;