ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS barangay TEXT;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_province TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_barangay TEXT;

ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS barangay TEXT;

CREATE INDEX IF NOT EXISTS idx_listings_province ON public.listings(province);
CREATE INDEX IF NOT EXISTS idx_listings_region_province ON public.listings(region, province);