CREATE INDEX IF NOT EXISTS idx_listings_browse
  ON public.listings (category_slug, status, boost_until DESC NULLS LAST, published_at DESC NULLS LAST);