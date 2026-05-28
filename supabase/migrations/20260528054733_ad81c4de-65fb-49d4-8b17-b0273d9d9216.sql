
-- =========================================================
-- 1) Extend businesses
-- =========================================================
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS theme_color text,
  ADD COLUMN IF NOT EXISTS show_services boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_products boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_posts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cta_primary text NOT NULL DEFAULT 'inquiry';

-- =========================================================
-- Helper: is_business_editor(business_id, user_id)
-- Owner OR member of the linked organization
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_business_editor(_business_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = _business_id
      AND (
        b.owner_id = _user_id
        OR (
          b.organization_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = b.organization_id
              AND om.user_id = _user_id
          )
        )
      )
  );
$$;

-- =========================================================
-- updated_at trigger fn (reuse if exists)
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================
-- 2) business_services
-- =========================================================
CREATE TABLE IF NOT EXISTS public.business_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price_label text,
  photo_url text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_business_services_biz ON public.business_services(business_id, sort_order);

GRANT SELECT ON public.business_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_services TO authenticated;
GRANT ALL ON public.business_services TO service_role;

ALTER TABLE public.business_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active services public read"
  ON public.business_services FOR SELECT
  USING (active = true OR public.is_business_editor(business_id, auth.uid()));

CREATE POLICY "Editors manage services"
  ON public.business_services FOR ALL
  TO authenticated
  USING (public.is_business_editor(business_id, auth.uid()))
  WITH CHECK (public.is_business_editor(business_id, auth.uid()));

CREATE TRIGGER trg_business_services_updated
  BEFORE UPDATE ON public.business_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 3) business_products
-- =========================================================
CREATE TABLE IF NOT EXISTS public.business_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price_php numeric(12,2),
  sale_price_php numeric(12,2),
  photo_url text,
  in_stock boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_business_products_biz ON public.business_products(business_id, sort_order);

GRANT SELECT ON public.business_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_products TO authenticated;
GRANT ALL ON public.business_products TO service_role;

ALTER TABLE public.business_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active products public read"
  ON public.business_products FOR SELECT
  USING (active = true OR public.is_business_editor(business_id, auth.uid()));

CREATE POLICY "Editors manage products"
  ON public.business_products FOR ALL
  TO authenticated
  USING (public.is_business_editor(business_id, auth.uid()))
  WITH CHECK (public.is_business_editor(business_id, auth.uid()));

CREATE TRIGGER trg_business_products_updated
  BEFORE UPDATE ON public.business_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 4) business_posts
-- =========================================================
CREATE TABLE IF NOT EXISTS public.business_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  body text NOT NULL,
  photo_url text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_business_posts_biz ON public.business_posts(business_id, created_at DESC);

GRANT SELECT ON public.business_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_posts TO authenticated;
GRANT ALL ON public.business_posts TO service_role;

ALTER TABLE public.business_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published posts public read"
  ON public.business_posts FOR SELECT
  USING (published = true OR public.is_business_editor(business_id, auth.uid()));

CREATE POLICY "Editors manage posts"
  ON public.business_posts FOR ALL
  TO authenticated
  USING (public.is_business_editor(business_id, auth.uid()))
  WITH CHECK (public.is_business_editor(business_id, auth.uid()));

CREATE TRIGGER trg_business_posts_updated
  BEFORE UPDATE ON public.business_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 5) business_inquiries
-- =========================================================
CREATE TABLE IF NOT EXISTS public.business_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_business_inquiries_biz ON public.business_inquiries(business_id, created_at DESC);

-- Anyone (anon + authed) can INSERT, but cannot SELECT (only editors).
GRANT INSERT ON public.business_inquiries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_inquiries TO authenticated;
GRANT ALL ON public.business_inquiries TO service_role;

ALTER TABLE public.business_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit inquiry"
  ON public.business_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(name) BETWEEN 1 AND 120
    AND length(message) BETWEEN 1 AND 4000
    AND (phone IS NULL OR length(phone) <= 40)
    AND (email IS NULL OR length(email) <= 200)
  );

CREATE POLICY "Editors read inquiries"
  ON public.business_inquiries FOR SELECT
  TO authenticated
  USING (public.is_business_editor(business_id, auth.uid()));

CREATE POLICY "Editors update inquiries"
  ON public.business_inquiries FOR UPDATE
  TO authenticated
  USING (public.is_business_editor(business_id, auth.uid()))
  WITH CHECK (public.is_business_editor(business_id, auth.uid()));

CREATE POLICY "Editors delete inquiries"
  ON public.business_inquiries FOR DELETE
  TO authenticated
  USING (public.is_business_editor(business_id, auth.uid()));

CREATE TRIGGER trg_business_inquiries_updated
  BEFORE UPDATE ON public.business_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 6) Storage bucket for vendor media
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-media', 'business-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "business-media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-media');

-- Authenticated users can write into a folder matching their uid
-- Path convention: <user_id>/<business_id>/<filename>
CREATE POLICY "business-media authed insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "business-media authed update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'business-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "business-media authed delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'business-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
