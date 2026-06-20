
-- =========================================================================
-- ENUMS
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE public.ad_order_status AS ENUM (
    'pending_payment','paid','submitted','in_review',
    'approved','rejected','live','expired','refunded','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_creative_kind AS ENUM ('advertiser','placeholder');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_creative_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_order_event_type AS ENUM (
    'submitted','payment_verified','package_verified','image_verified',
    'approved','rejected','paused','resumed','expired','refunded','note'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- Shared updated_at trigger fn (idempotent)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================================
-- 1. AD PACKAGES
-- =========================================================================
CREATE TABLE public.ad_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  placement public.ad_placement NOT NULL,
  duration_days int NOT NULL CHECK (duration_days > 0),
  price_cents int NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'PHP',
  max_impressions int,
  priority_weight int NOT NULL DEFAULT 0,
  min_width int NOT NULL DEFAULT 800,
  min_height int NOT NULL DEFAULT 400,
  aspect_ratio text,
  max_bytes int NOT NULL DEFAULT 5242880,
  allowed_mime text[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','image/webp'],
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_packages TO authenticated;
GRANT ALL ON public.ad_packages TO service_role;
ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active packages"
  ON public.ad_packages FOR SELECT TO anon, authenticated
  USING (active = true OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Admins manage packages"
  ON public.ad_packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE TRIGGER trg_ad_packages_updated BEFORE UPDATE ON public.ad_packages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 2. AD ORDERS
-- =========================================================================
CREATE TABLE public.ad_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.ad_packages(id) ON DELETE RESTRICT,
  placement public.ad_placement NOT NULL,
  category_slug text,
  status public.ad_order_status NOT NULL DEFAULT 'pending_payment',
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  amount_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PHP',
  requested_start timestamptz,
  requested_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  rejection_reason text,
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_orders_advertiser ON public.ad_orders(advertiser_id);
CREATE INDEX idx_ad_orders_status ON public.ad_orders(status);
CREATE INDEX idx_ad_orders_placement ON public.ad_orders(placement);

GRANT SELECT, INSERT, UPDATE ON public.ad_orders TO authenticated;
GRANT ALL ON public.ad_orders TO service_role;
ALTER TABLE public.ad_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers read own orders"
  ON public.ad_orders FOR SELECT TO authenticated
  USING (advertiser_id = auth.uid()
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Advertisers create own orders"
  ON public.ad_orders FOR INSERT TO authenticated
  WITH CHECK (advertiser_id = auth.uid());

CREATE POLICY "Advertisers update own draft orders"
  ON public.ad_orders FOR UPDATE TO authenticated
  USING (advertiser_id = auth.uid() AND status IN ('pending_payment','paid','submitted'))
  WITH CHECK (advertiser_id = auth.uid());

CREATE POLICY "Admins manage orders"
  ON public.ad_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE TRIGGER trg_ad_orders_updated BEFORE UPDATE ON public.ad_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 3. AD CREATIVES (advertiser uploads + admin placeholders)
-- =========================================================================
CREATE TABLE public.ad_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.ad_orders(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  kind public.ad_creative_kind NOT NULL DEFAULT 'advertiser',
  storage_path text NOT NULL,
  image_url text NOT NULL,
  image_width int,
  image_height int,
  file_size_bytes int,
  mime_type text,
  headline text,
  caption text,
  alt_text text,
  target_url text,
  spec_ok boolean NOT NULL DEFAULT false,
  spec_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.ad_creative_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind = 'placeholder' OR order_id IS NOT NULL)
);
CREATE INDEX idx_ad_creatives_order ON public.ad_creatives(order_id);
CREATE INDEX idx_ad_creatives_kind ON public.ad_creatives(kind);
CREATE INDEX idx_ad_creatives_status ON public.ad_creatives(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_creatives TO authenticated;
GRANT ALL ON public.ad_creatives TO service_role;
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own creatives; staff read all"
  ON public.ad_creatives FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid()
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Owners insert own creatives"
  ON public.ad_creatives FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid()
           OR public.has_role(auth.uid(),'admin')
           OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Owners update own pending creatives"
  ON public.ad_creatives FOR UPDATE TO authenticated
  USING ((uploaded_by = auth.uid() AND status = 'pending')
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'advertising'))
  WITH CHECK (uploaded_by = auth.uid()
           OR public.has_role(auth.uid(),'admin')
           OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Owners delete own pending creatives"
  ON public.ad_creatives FOR DELETE TO authenticated
  USING ((uploaded_by = auth.uid() AND status = 'pending')
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'advertising'));

CREATE TRIGGER trg_ad_creatives_updated BEFORE UPDATE ON public.ad_creatives
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 4. AD SLOTS (visible positions on the site)
-- =========================================================================
CREATE TABLE public.ad_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key text NOT NULL UNIQUE,
  placement public.ad_placement NOT NULL,
  category_slug text,
  label text NOT NULL,
  description text,
  min_width int NOT NULL DEFAULT 800,
  min_height int NOT NULL DEFAULT 200,
  aspect_ratio text,
  max_bytes int NOT NULL DEFAULT 5242880,
  allowed_mime text[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','image/webp'],
  position int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_slots_placement ON public.ad_slots(placement);

GRANT SELECT ON public.ad_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_slots TO authenticated;
GRANT ALL ON public.ad_slots TO service_role;
ALTER TABLE public.ad_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active slots"
  ON public.ad_slots FOR SELECT TO anon, authenticated
  USING (active = true OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Admins manage slots"
  ON public.ad_slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE TRIGGER trg_ad_slots_updated BEFORE UPDATE ON public.ad_slots
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 5. AD SLOT ASSIGNMENTS
-- =========================================================================
CREATE TABLE public.ad_slot_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.ad_slots(id) ON DELETE CASCADE,
  creative_id uuid NOT NULL REFERENCES public.ad_creatives(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.ad_orders(id) ON DELETE SET NULL,
  position int NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_slot_assign_slot ON public.ad_slot_assignments(slot_id);
CREATE INDEX idx_ad_slot_assign_creative ON public.ad_slot_assignments(creative_id);
CREATE INDEX idx_ad_slot_assign_active ON public.ad_slot_assignments(slot_id, position) WHERE active;

GRANT SELECT ON public.ad_slot_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_slot_assignments TO authenticated;
GRANT ALL ON public.ad_slot_assignments TO service_role;
ALTER TABLE public.ad_slot_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active assignments"
  ON public.ad_slot_assignments FOR SELECT TO anon, authenticated
  USING (active = true
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Admins manage assignments"
  ON public.ad_slot_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE TRIGGER trg_ad_slot_assignments_updated BEFORE UPDATE ON public.ad_slot_assignments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 6. AD ORDER EVENTS (audit)
-- =========================================================================
CREATE TABLE public.ad_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.ad_orders(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type public.ad_order_event_type NOT NULL,
  notes text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_order_events_order ON public.ad_order_events(order_id);

GRANT SELECT, INSERT ON public.ad_order_events TO authenticated;
GRANT ALL ON public.ad_order_events TO service_role;
ALTER TABLE public.ad_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner+staff read order events"
  ON public.ad_order_events FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.ad_orders o WHERE o.id = order_id AND o.advertiser_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'advertising')
  );

CREATE POLICY "Staff write order events"
  ON public.ad_order_events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'advertising')
    OR EXISTS (SELECT 1 FROM public.ad_orders o WHERE o.id = order_id AND o.advertiser_id = auth.uid())
  );

-- =========================================================================
-- 7. STORAGE policies for `advertisements` bucket
-- Path convention: {advertiser_id}/{order_id}/{filename}
-- =========================================================================
CREATE POLICY "Advertisers upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'advertisements'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'advertising'))
  );

CREATE POLICY "Advertisers read own folder; staff read all"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'advertisements'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'advertising'))
  );

CREATE POLICY "Advertisers update/delete own folder; staff all"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'advertisements'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'advertising'))
  );

CREATE POLICY "Advertisers delete own folder; staff all"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'advertisements'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'advertising'))
  );

-- =========================================================================
-- 8. SEED SLOTS that match today's placement-preview.tsx layout
-- =========================================================================
INSERT INTO public.ad_slots (slot_key, placement, category_slug, label, description, min_width, min_height, aspect_ratio, position) VALUES
  ('marketplace_home_hero_1','home_carousel',NULL,'Marketplace Home — Hero 1','Top of marketplace homepage, slot 1 of 3.',1600,600,'8:3',0),
  ('marketplace_home_hero_2','home_carousel',NULL,'Marketplace Home — Hero 2','Top of marketplace homepage, slot 2 of 3.',1600,600,'8:3',1),
  ('marketplace_home_hero_3','home_carousel',NULL,'Marketplace Home — Hero 3','Top of marketplace homepage, slot 3 of 3.',1600,600,'8:3',2),
  ('marketplace_category_banner','category_banner',NULL,'Category Page — Wide Banner','Top of any category page (Cars, Motorcycles, Parts, etc).',1920,384,'5:1',0),
  ('browse_top_banner','browse_top',NULL,'Browse Results — Top Banner','Top of browse/search results page.',1600,300,'16:3',0),
  ('rides_top_banner','rides_top',NULL,'Rides Feed — Top Banner','Top of rides feed.',1200,300,'4:1',0),
  ('export_top_banner','export_top',NULL,'Export — Top Banner','Top of export brokerage section.',1600,400,'4:1',0),
  ('listing_sidebar_1','listing_sidebar',NULL,'Listing — Sidebar 1','Sidebar of listing detail page.',400,500,'4:5',0),
  ('shop_top_banner','shop_top',NULL,'Shop — Top Banner','Top of shop section.',1200,300,'4:1',0),
  ('shop_sidebar_1','shop_sidebar',NULL,'Shop — Sidebar 1','Shop sidebar slot 1.',400,400,'1:1',0),
  ('shop_sidebar_2','shop_sidebar',NULL,'Shop — Sidebar 2','Shop sidebar slot 2.',400,400,'1:1',1),
  ('newsletter_main','newsletter',NULL,'Newsletter — Main Slot','Featured slot in the weekly newsletter.',1200,400,'3:1',0)
ON CONFLICT (slot_key) DO NOTHING;
