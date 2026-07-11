-- Add ro_number column for sequential repair order numbers
ALTER TABLE public.gunsmith_jobs 
ADD COLUMN ro_number TEXT;

-- Create a function to generate sequential RO numbers per shop
CREATE OR REPLACE FUNCTION public.generate_gunsmith_ro_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  shop_prefix TEXT;
BEGIN
  -- Get the next sequential number for this shop
  SELECT COALESCE(MAX(
    CASE 
      WHEN ro_number ~ '^RO-[0-9]+$' 
      THEN CAST(SUBSTRING(ro_number FROM 4) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM public.gunsmith_jobs
  WHERE shop_id = NEW.shop_id;
  
  -- Format as RO-0001, RO-0002, etc.
  NEW.ro_number := 'RO-' || LPAD(next_num::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate RO number on insert
CREATE TRIGGER trigger_generate_gunsmith_ro_number
BEFORE INSERT ON public.gunsmith_jobs
FOR EACH ROW
WHEN (NEW.ro_number IS NULL)
EXECUTE FUNCTION public.generate_gunsmith_ro_number();

-- Backfill existing jobs with sequential RO numbers
WITH numbered_jobs AS (
  SELECT id, shop_id, 
         ROW_NUMBER() OVER (PARTITION BY shop_id ORDER BY created_at) as rn
  FROM public.gunsmith_jobs
  WHERE ro_number IS NULL
)
UPDATE public.gunsmith_jobs j
SET ro_number = 'RO-' || LPAD(nj.rn::TEXT, 4, '0')
FROM numbered_jobs nj
WHERE j.id = nj.id;

-- Make ro_number NOT NULL after backfill
ALTER TABLE public.gunsmith_jobs 
ALTER COLUMN ro_number SET NOT NULL;

-- Add unique constraint per shop
CREATE UNIQUE INDEX idx_gunsmith_jobs_ro_number_shop 
ON public.gunsmith_jobs(shop_id, ro_number);