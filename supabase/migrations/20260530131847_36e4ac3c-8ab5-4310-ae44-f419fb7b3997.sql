
-- Phase 2 (Gallery) + Phase 4 (Contact channels) + featured video

-- GALLERY ALBUMS
CREATE TABLE public.business_gallery_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 400),
  cover_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_business_gallery_albums_biz ON public.business_gallery_albums(business_id, sort_order);

GRANT SELECT ON public.business_gallery_albums TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_gallery_albums TO authenticated;
GRANT ALL ON public.business_gallery_albums TO service_role;

ALTER TABLE public.business_gallery_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read gallery albums of active businesses"
ON public.business_gallery_albums FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_gallery_albums.business_id
      AND (b.status = 'active' OR b.owner_id = auth.uid() OR public.can_moderate(auth.uid()))
  )
);

CREATE POLICY "Owner/org/mod manage gallery albums"
ON public.business_gallery_albums FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_gallery_albums.business_id
      AND (
        b.owner_id = auth.uid()
        OR public.can_moderate(auth.uid())
        OR (b.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = b.organization_id AND m.user_id = auth.uid()
        ))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_gallery_albums.business_id
      AND (
        b.owner_id = auth.uid()
        OR public.can_moderate(auth.uid())
        OR (b.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = b.organization_id AND m.user_id = auth.uid()
        ))
      )
  )
);

CREATE TRIGGER trg_business_gallery_albums_updated
BEFORE UPDATE ON public.business_gallery_albums
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- GALLERY PHOTOS
CREATE TABLE public.business_gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.business_gallery_albums(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  url TEXT NOT NULL CHECK (char_length(url) BETWEEN 1 AND 1000),
  caption TEXT CHECK (caption IS NULL OR char_length(caption) <= 300),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_business_gallery_photos_album ON public.business_gallery_photos(album_id, sort_order);
CREATE INDEX idx_business_gallery_photos_biz ON public.business_gallery_photos(business_id);

GRANT SELECT ON public.business_gallery_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_gallery_photos TO authenticated;
GRANT ALL ON public.business_gallery_photos TO service_role;

ALTER TABLE public.business_gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read gallery photos of active businesses"
ON public.business_gallery_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_gallery_photos.business_id
      AND (b.status = 'active' OR b.owner_id = auth.uid() OR public.can_moderate(auth.uid()))
  )
);

CREATE POLICY "Owner/org/mod manage gallery photos"
ON public.business_gallery_photos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_gallery_photos.business_id
      AND (
        b.owner_id = auth.uid()
        OR public.can_moderate(auth.uid())
        OR (b.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = b.organization_id AND m.user_id = auth.uid()
        ))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_gallery_photos.business_id
      AND (
        b.owner_id = auth.uid()
        OR public.can_moderate(auth.uid())
        OR (b.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = b.organization_id AND m.user_id = auth.uid()
        ))
      )
  )
);

-- CONTACT CHANNELS
CREATE TABLE public.business_contact_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('phone','whatsapp','viber','telegram','instagram','tiktok','email','facebook','x','linkedin')),
  label TEXT CHECK (label IS NULL OR char_length(label) <= 40),
  value TEXT NOT NULL CHECK (char_length(value) BETWEEN 1 AND 200),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_business_contact_channels_biz ON public.business_contact_channels(business_id, sort_order);

GRANT SELECT ON public.business_contact_channels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_contact_channels TO authenticated;
GRANT ALL ON public.business_contact_channels TO service_role;

ALTER TABLE public.business_contact_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read contact channels of active businesses"
ON public.business_contact_channels FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_contact_channels.business_id
      AND (b.status = 'active' OR b.owner_id = auth.uid() OR public.can_moderate(auth.uid()))
  )
);

CREATE POLICY "Owner/org/mod manage contact channels"
ON public.business_contact_channels FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_contact_channels.business_id
      AND (
        b.owner_id = auth.uid()
        OR public.can_moderate(auth.uid())
        OR (b.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = b.organization_id AND m.user_id = auth.uid()
        ))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_contact_channels.business_id
      AND (
        b.owner_id = auth.uid()
        OR public.can_moderate(auth.uid())
        OR (b.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = b.organization_id AND m.user_id = auth.uid()
        ))
      )
  )
);

-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-gallery', 'business-gallery', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read business gallery"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-gallery');

CREATE POLICY "Authenticated upload to business gallery"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'business-gallery');

CREATE POLICY "Authenticated update own business gallery"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'business-gallery' AND owner = auth.uid())
WITH CHECK (bucket_id = 'business-gallery' AND owner = auth.uid());

CREATE POLICY "Authenticated delete own business gallery"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'business-gallery' AND owner = auth.uid());

-- TOGGLES + FEATURED VIDEO
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS show_gallery BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_contact BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS featured_video_url TEXT,
  ADD COLUMN IF NOT EXISTS featured_video_provider TEXT CHECK (featured_video_provider IS NULL OR featured_video_provider IN ('youtube','vimeo','facebook'));
