-- Add module_id column to product_submissions table
ALTER TABLE product_submissions 
ADD COLUMN module_id TEXT;

-- Create index for efficient filtering by module
CREATE INDEX idx_product_submissions_module_id ON product_submissions(module_id);