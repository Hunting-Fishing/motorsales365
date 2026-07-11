-- Delete duplicate products, keeping the oldest one per affiliate_link
DELETE FROM public.products p1
USING public.products p2
WHERE p1.affiliate_link = p2.affiliate_link
  AND p1.affiliate_link IS NOT NULL
  AND p1.created_at > p2.created_at;

-- Add unique constraint on affiliate_link to prevent future duplicates
-- (partial index to allow multiple NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_unique_affiliate_link 
ON public.products (affiliate_link) 
WHERE affiliate_link IS NOT NULL;