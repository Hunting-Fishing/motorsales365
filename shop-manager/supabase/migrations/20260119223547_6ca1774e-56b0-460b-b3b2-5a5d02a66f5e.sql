-- Add the missing updated_at column to product_submissions
ALTER TABLE public.product_submissions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Backfill existing records with submitted_at value
UPDATE public.product_submissions 
SET updated_at = submitted_at 
WHERE updated_at IS NULL;

-- Make the column NOT NULL after backfill
ALTER TABLE public.product_submissions 
ALTER COLUMN updated_at SET NOT NULL;