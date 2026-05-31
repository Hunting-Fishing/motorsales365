
-- 1. vanity_slug column (short URL like /b/ucatchfuels)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS vanity_slug text;

-- case-insensitive uniqueness via functional unique index
CREATE UNIQUE INDEX IF NOT EXISTS businesses_vanity_slug_lower_uidx
  ON public.businesses ((lower(vanity_slug)))
  WHERE vanity_slug IS NOT NULL;

-- format check: 3-32 chars, [a-z0-9-], cannot start/end with -
ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_vanity_slug_format_chk;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_vanity_slug_format_chk
  CHECK (vanity_slug IS NULL OR vanity_slug ~ '^[a-z0-9]([a-z0-9-]{1,30})[a-z0-9]$');

-- 2. slug history (for 301 redirects after slug/vanity_slug rename)
CREATE TABLE IF NOT EXISTS public.business_slug_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  old_slug text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('slug','vanity_slug')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_slug_history_old_slug_idx
  ON public.business_slug_history (lower(old_slug));
CREATE INDEX IF NOT EXISTS business_slug_history_business_idx
  ON public.business_slug_history (business_id);

GRANT SELECT ON public.business_slug_history TO anon;
GRANT SELECT ON public.business_slug_history TO authenticated;
GRANT ALL ON public.business_slug_history TO service_role;

ALTER TABLE public.business_slug_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slug history is public for redirects"
  ON public.business_slug_history FOR SELECT
  USING (true);

CREATE POLICY "owners can insert slug history"
  ON public.business_slug_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_slug_history.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- 3. reserved word table (so /b/admin, /b/api etc. can't be claimed)
CREATE TABLE IF NOT EXISTS public.business_reserved_slugs (
  slug text PRIMARY KEY
);

GRANT SELECT ON public.business_reserved_slugs TO anon;
GRANT SELECT ON public.business_reserved_slugs TO authenticated;
GRANT ALL ON public.business_reserved_slugs TO service_role;

ALTER TABLE public.business_reserved_slugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reserved slugs are public"
  ON public.business_reserved_slugs FOR SELECT USING (true);

INSERT INTO public.business_reserved_slugs (slug) VALUES
  ('admin'),('api'),('app'),('auth'),('login'),('signup'),('logout'),
  ('dashboard'),('settings'),('billing'),('checkout'),('payments'),
  ('businesses'),('business'),('shop'),('listings'),('listing'),
  ('rides'),('ride'),('seller'),('search'),('browse'),('map'),
  ('about'),('contact'),('support'),('help'),('terms'),('privacy'),
  ('refund-policy'),('guidelines'),('affiliate-disclosure'),('pricing'),
  ('sell'),('export'),('tow'),('passport'),('verify-email'),
  ('reset-password'),('forgot-password'),('invites'),('unsubscribe'),
  ('boost'),('advertise'),('lovable'),('static'),('public'),('assets'),
  ('img'),('images'),('cdn'),('www'),('mail'),('blog'),('news'),
  ('b'),('r'),('go'),('my-qr'),('sitemap'),('robots')
ON CONFLICT (slug) DO NOTHING;
