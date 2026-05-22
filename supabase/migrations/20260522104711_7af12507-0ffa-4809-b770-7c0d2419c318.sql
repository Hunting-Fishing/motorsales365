
-- 1. Remove the weekly free-listing cap
DROP TRIGGER IF EXISTS trg_enforce_free_listing_quota ON public.listings;

-- 2. Add export availability to listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS export_available boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_listings_export_available ON public.listings(export_available) WHERE export_available = true;

-- 3. Business Trial plan
INSERT INTO public.subscription_plans (name, price_php, listings_per_month, max_photos_per_listing, active, sort_order)
SELECT 'Business Trial', 0, NULL, 30, true, 5
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'Business Trial');

-- 4. Auto-grant trial
CREATE OR REPLACE FUNCTION public.grant_business_trial()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  trial_plan_id uuid;
  business_kinds text[] := ARRAY['dealer','repair_shop','insurance'];
BEGIN
  IF NEW.business_kind IS NULL OR NEW.business_kind::text <> ANY(business_kinds) THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = NEW.id AND status = 'active') THEN RETURN NEW; END IF;
  SELECT id INTO trial_plan_id FROM public.subscription_plans WHERE name = 'Business Trial' LIMIT 1;
  IF trial_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status, complimentary, current_period_end, notes)
    VALUES (NEW.id, trial_plan_id, 'active', true, now() + interval '6 months', 'Auto-granted 6-month business trial')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_grant_business_trial ON public.profiles;
CREATE TRIGGER trg_grant_business_trial
AFTER INSERT OR UPDATE OF business_kind, verification_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_business_trial();

-- 5. Types (idempotent)
DO $$ BEGIN
  CREATE TYPE ad_placement AS ENUM ('home_carousel','browse_top','rides_top','listing_sidebar','export_top');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ad_status AS ENUM ('draft','scheduled','active','paused','ended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE export_inquiry_status AS ENUM ('new','qualified','quoted','won','lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Advertisements
CREATE TABLE IF NOT EXISTS public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  advertiser_name text,
  advertiser_email text,
  image_url text NOT NULL,
  target_url text NOT NULL,
  placement ad_placement NOT NULL,
  caption text,
  starts_at timestamptz,
  ends_at timestamptz,
  priority int NOT NULL DEFAULT 0,
  status ad_status NOT NULL DEFAULT 'draft',
  impressions_count int NOT NULL DEFAULT 0,
  clicks_count int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advertisements_active_placement ON public.advertisements(placement, priority DESC) WHERE status = 'active';

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active ads" ON public.advertisements;
CREATE POLICY "Anyone can view active ads" ON public.advertisements FOR SELECT
  USING (status = 'active' AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
DROP POLICY IF EXISTS "Ad managers can view all" ON public.advertisements;
CREATE POLICY "Ad managers can view all" ON public.advertisements FOR SELECT TO authenticated
  USING (public.can_manage_ads(auth.uid()));
DROP POLICY IF EXISTS "Ad managers can insert" ON public.advertisements;
CREATE POLICY "Ad managers can insert" ON public.advertisements FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_ads(auth.uid()));
DROP POLICY IF EXISTS "Ad managers can update" ON public.advertisements;
CREATE POLICY "Ad managers can update" ON public.advertisements FOR UPDATE TO authenticated
  USING (public.can_manage_ads(auth.uid()));
DROP POLICY IF EXISTS "Ad managers can delete" ON public.advertisements;
CREATE POLICY "Ad managers can delete" ON public.advertisements FOR DELETE TO authenticated
  USING (public.can_manage_ads(auth.uid()));

DROP TRIGGER IF EXISTS trg_advertisements_updated_at ON public.advertisements;
CREATE TRIGGER trg_advertisements_updated_at BEFORE UPDATE ON public.advertisements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Ad events
CREATE TABLE IF NOT EXISTS public.ad_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('impression','click')),
  visitor_id uuid,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_events_ad_id_created_at ON public.ad_events(ad_id, created_at DESC);

ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can record ad events" ON public.ad_events;
CREATE POLICY "Anyone can record ad events" ON public.ad_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Ad managers view events" ON public.ad_events;
CREATE POLICY "Ad managers view events" ON public.ad_events FOR SELECT TO authenticated
  USING (public.can_manage_ads(auth.uid()));

CREATE OR REPLACE FUNCTION public.ad_events_increment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.event_type = 'impression' THEN
    UPDATE public.advertisements SET impressions_count = impressions_count + 1 WHERE id = NEW.ad_id;
  ELSIF NEW.event_type = 'click' THEN
    UPDATE public.advertisements SET clicks_count = clicks_count + 1 WHERE id = NEW.ad_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ad_events_increment ON public.ad_events;
CREATE TRIGGER trg_ad_events_increment AFTER INSERT ON public.ad_events
FOR EACH ROW EXECUTE FUNCTION public.ad_events_increment();

-- 8. Export inquiries
CREATE TABLE IF NOT EXISTS public.export_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  buyer_phone text,
  country text NOT NULL,
  destination_port text,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  vehicle_interest text,
  budget_usd numeric,
  message text NOT NULL,
  status export_inquiry_status NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_notes text,
  submitter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_export_inquiries_status ON public.export_inquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_inquiries_listing ON public.export_inquiries(listing_id);

ALTER TABLE public.export_inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit export inquiry" ON public.export_inquiries;
CREATE POLICY "Anyone can submit export inquiry" ON public.export_inquiries FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Staff can view export inquiries" ON public.export_inquiries;
CREATE POLICY "Staff can view export inquiries" ON public.export_inquiries FOR SELECT TO authenticated
  USING (public.can_support(auth.uid()));
DROP POLICY IF EXISTS "Staff can update export inquiries" ON public.export_inquiries;
CREATE POLICY "Staff can update export inquiries" ON public.export_inquiries FOR UPDATE TO authenticated
  USING (public.can_support(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete export inquiries" ON public.export_inquiries;
CREATE POLICY "Admins can delete export inquiries" ON public.export_inquiries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_export_inquiries_updated_at ON public.export_inquiries;
CREATE TRIGGER trg_export_inquiries_updated_at BEFORE UPDATE ON public.export_inquiries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-media','ad-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Ad media public read" ON storage.objects;
CREATE POLICY "Ad media public read" ON storage.objects FOR SELECT USING (bucket_id = 'ad-media');
DROP POLICY IF EXISTS "Ad managers can upload ad media" ON storage.objects;
CREATE POLICY "Ad managers can upload ad media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ad-media' AND public.can_manage_ads(auth.uid()));
DROP POLICY IF EXISTS "Ad managers can update ad media" ON storage.objects;
CREATE POLICY "Ad managers can update ad media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ad-media' AND public.can_manage_ads(auth.uid()));
DROP POLICY IF EXISTS "Ad managers can delete ad media" ON storage.objects;
CREATE POLICY "Ad managers can delete ad media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ad-media' AND public.can_manage_ads(auth.uid()));
