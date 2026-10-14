
-- ============================================================================
-- SOURCE MIGRATION: 20260501224406_1fde4d15-467c-4a50-a39e-089c25417e52.sql
-- ============================================================================

-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.seller_type AS ENUM ('private', 'business');
CREATE TYPE public.listing_status AS ENUM ('draft', 'pending_payment', 'active', 'expired', 'hidden', 'sold');
CREATE TYPE public.listing_plan AS ENUM ('standard', 'upgraded');
CREATE TYPE public.media_type AS ENUM ('photo', 'video');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE public.payment_kind AS ENUM ('listing', 'upgrade', 'boost', 'subscription');

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  seller_type public.seller_type NOT NULL DEFAULT 'private',
  avatar_url TEXT,
  business_name TEXT,
  business_logo_url TEXT,
  business_address TEXT,
  business_region TEXT,
  business_city TEXT,
  business_lat NUMERIC,
  business_lng NUMERIC,
  business_hours JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- USER ROLES (separate table for security)
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================
-- CATEGORIES
-- =========================================
CREATE TABLE public.categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO public.categories (slug, name, icon, sort_order) VALUES
  ('car', 'Cars', 'car', 1),
  ('motorcycle', 'Motorcycles', 'bike', 2),
  ('boat', 'Boats', 'ship', 3),
  ('airplane', 'Airplanes', 'plane', 4),
  ('equipment', 'Heavy Equipment', 'truck', 5),
  ('other', 'Other Transport', 'caravan', 6);

-- =========================================
-- LISTINGS
-- =========================================
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES public.categories(slug),
  title TEXT NOT NULL,
  description TEXT,
  price_php NUMERIC(14,2) NOT NULL DEFAULT 0,
  condition TEXT,
  region TEXT,
  city TEXT,
  lat NUMERIC,
  lng NUMERIC,
  status public.listing_status NOT NULL DEFAULT 'draft',
  plan public.listing_plan NOT NULL DEFAULT 'standard',
  seller_type public.seller_type NOT NULL DEFAULT 'private',
  boost_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  view_count INT NOT NULL DEFAULT 0,
  contact_phone TEXT,
  allow_messages BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_category ON public.listings(category_slug);
CREATE INDEX idx_listings_user ON public.listings(user_id);
CREATE INDEX idx_listings_boost ON public.listings(boost_until DESC NULLS LAST);

-- =========================================
-- LISTING MEDIA
-- =========================================
CREATE TABLE public.listing_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  type public.media_type NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_listing ON public.listing_media(listing_id);

-- =========================================
-- FAVORITES
-- =========================================
CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

-- =========================================
-- MESSAGES
-- =========================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id, created_at DESC);
CREATE INDEX idx_messages_listing ON public.messages(listing_id);

-- =========================================
-- REPORTS
-- =========================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- PRICING SETTINGS (admin-controlled key/value)
-- =========================================
CREATE TABLE public.pricing_settings (
  key TEXT PRIMARY KEY,
  value NUMERIC NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.pricing_settings (key, value, label, description) VALUES
  ('listing_fee_php', 20, 'Per-listing fee (₱)', 'Standard listing fee, up to 5 photos and 1 video'),
  ('upgrade_fee_php', 100, 'Upgrade fee (₱)', 'Adds up to 20 photos and 3 videos to a listing'),
  ('boost_fee_php', 150, 'Boost fee (₱)', 'Pins listing to top of search; renews ad'),
  ('boost_renewal_days', 14, 'Boost duration (days)', 'How long a boost lasts before it ends'),
  ('listing_expiry_days', 60, 'Listing expiry (days)', 'How long a listing stays active before expiring');

-- =========================================
-- SUBSCRIPTION PLANS
-- =========================================
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  listings_per_month INT,                   -- NULL = unlimited
  price_php NUMERIC(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.subscription_plans (name, listings_per_month, price_php, sort_order, features) VALUES
  ('Starter', 5, 80, 1, '["5 listings/month","Standard photo limits","Email support"]'::jsonb),
  ('Growth', 10, 150, 2, '["10 listings/month","1 free upgrade/month","Priority support"]'::jsonb),
  ('Pro', 20, 280, 3, '["20 listings/month","3 free upgrades/month","Business badge"]'::jsonb),
  ('Unlimited', NULL, 500, 4, '["Unlimited listings","Unlimited upgrades","1 free boost/month","Premium business badge"]'::jsonb);

-- =========================================
-- SUBSCRIPTIONS
-- =========================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'pending',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- PAYMENTS
-- =========================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  kind public.payment_kind NOT NULL,
  amount_php NUMERIC(10,2) NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  method TEXT,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX idx_payments_user ON public.payments(user_id, created_at DESC);
CREATE INDEX idx_payments_listing ON public.payments(listing_id);

-- =========================================
-- PROMOTIONS
-- =========================================
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  percent_off NUMERIC(5,2) NOT NULL,
  applies_to TEXT NOT NULL DEFAULT 'any',  -- listing/upgrade/boost/subscription/any
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- TRIGGERS: updated_at
-- =========================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER set_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_listings_updated BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile + default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- RLS
-- =========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- profiles: anyone can view (sellers are public); user updates own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: users see own; admins manage all
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- categories: public read; admins write
CREATE POLICY "Categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- listings: public read active; owner full; admin full
CREATE POLICY "Active listings public read" ON public.listings FOR SELECT USING (status = 'active' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners insert listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update listings" ON public.listings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owners delete listings" ON public.listings FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage listings" ON public.listings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- listing_media: read if parent listing is readable (mirrors listings policy)
CREATE POLICY "Media readable with listing" ON public.listing_media FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id
    AND (l.status = 'active' OR l.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Owners manage media" ON public.listing_media FOR ALL USING (
  EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
);
CREATE POLICY "Admins manage media" ON public.listing_media FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- favorites
CREATE POLICY "Users see own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- messages
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Recipients mark read" ON public.messages FOR UPDATE USING (auth.uid() = recipient_id);

-- reports
CREATE POLICY "Users create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users see own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage reports" ON public.reports FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- pricing_settings: public read; admins write
CREATE POLICY "Pricing public read" ON public.pricing_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage pricing" ON public.pricing_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- subscription_plans: public read active; admins manage
CREATE POLICY "Plans public read" ON public.subscription_plans FOR SELECT USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage plans" ON public.subscription_plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- subscriptions: user own; admin all
CREATE POLICY "Users see own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- payments: user own; admin all
CREATE POLICY "Users see own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- promotions: public read active; admins manage
CREATE POLICY "Promotions public read" ON public.promotions FOR SELECT USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage promotions" ON public.promotions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- STORAGE BUCKETS
-- =========================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('listing-photos', 'listing-photos', true),
  ('listing-videos', 'listing-videos', true),
  ('avatars', 'avatars', true),
  ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (use storage.objects)
CREATE POLICY "Public read listing photos" ON storage.objects FOR SELECT USING (bucket_id = 'listing-photos');
CREATE POLICY "Public read listing videos" ON storage.objects FOR SELECT USING (bucket_id = 'listing-videos');
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Public read logos" ON storage.objects FOR SELECT USING (bucket_id = 'business-logos');

CREATE POLICY "Auth upload listing photos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Auth update own listing photos" ON storage.objects FOR UPDATE USING (
  bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Auth delete own listing photos" ON storage.objects FOR DELETE USING (
  bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Auth upload listing videos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Auth update own listing videos" ON storage.objects FOR UPDATE USING (
  bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Auth delete own listing videos" ON storage.objects FOR DELETE USING (
  bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Auth upload own avatar" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Auth update own avatar" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Auth upload own logo" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Auth update own logo" ON storage.objects FOR UPDATE USING (
  bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]
);


-- ============================================================================
-- SOURCE MIGRATION: 20260501224438_ca85ed23-9689-4604-8f3c-b709823c9510.sql
-- ============================================================================

-- Fix search_path on functions
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Lock down EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
-- (RLS policies that call has_role still work because RLS executes as the table owner)

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Tighten storage SELECT: still public read of files (URLs work) but scope listing/SELECT
-- on storage.objects to either anon-via-public-URL fetches (which don't go through this policy)
-- or to the owner's folder.
DROP POLICY IF EXISTS "Public read listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read listing videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read logos" ON storage.objects;

-- Anyone (incl. anon) can read files from these public buckets via getPublicUrl,
-- but the SELECT-on-objects policy below only allows listing files within your own folder.
CREATE POLICY "Owners list listing photos" ON storage.objects FOR SELECT USING (
  bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Owners list listing videos" ON storage.objects FOR SELECT USING (
  bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Owners list avatars" ON storage.objects FOR SELECT USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Owners list business logos" ON storage.objects FOR SELECT USING (
  bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]
);


-- ============================================================================
-- SOURCE MIGRATION: 20260501230554_3b5b6d77-5384-48ee-b77e-615fc2263ad5.sql
-- ============================================================================
-- Saved searches table
CREATE TABLE public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category_slug text,
  query jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own saved searches"
ON public.saved_searches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users manage own saved searches"
ON public.saved_searches FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add 'sold' to listing_status enum if not present
DO $$ BEGIN
  ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'sold';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add 'pending_payment' to listing_status enum if not present
DO $$ BEGIN
  ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'pending_payment';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;


-- ============================================================================
-- SOURCE MIGRATION: 20260502024123_33ed76c1-367a-4457-9e86-d2934f2bcdf6.sql
-- ============================================================================
-- Verification status enum
CREATE TYPE public.verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE public.verification_request_status AS ENUM ('pending', 'approved', 'rejected', 'more_info');
CREATE TYPE public.business_kind AS ENUM ('repair_shop', 'insurance', 'dealer', 'other');

-- Profiles columns
ALTER TABLE public.profiles
  ADD COLUMN verification_status public.verification_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN verified_at timestamptz,
  ADD COLUMN business_kind public.business_kind;

-- Verification requests table
CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_kind public.business_kind NOT NULL,
  legal_name text NOT NULL,
  dti_sec_registration text,
  tax_id text,
  contact_phone text,
  contact_email text,
  address text,
  region text,
  city text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.verification_request_status NOT NULL DEFAULT 'pending',
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own verification requests"
  ON public.verification_requests FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own verification requests"
  ON public.verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pending requests"
  ON public.verification_requests FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('pending','more_info'));

CREATE POLICY "Admins manage verification requests"
  ON public.verification_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER tg_verification_requests_updated_at
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Sync trigger: when admin approves/rejects, mirror to profiles
CREATE OR REPLACE FUNCTION public.sync_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles
      SET verification_status = 'verified',
          verified_at = now(),
          business_kind = NEW.business_kind
      WHERE id = NEW.user_id;
  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    UPDATE public.profiles
      SET verification_status = 'rejected'
      WHERE id = NEW.user_id;
  ELSIF NEW.status = 'pending' AND (OLD.status IS DISTINCT FROM 'pending') THEN
    UPDATE public.profiles
      SET verification_status = 'pending'
      WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_sync_profile_verification
  AFTER INSERT OR UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_verification();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('verification-docs', 'verification-docs', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own verification docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Users delete own verification docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins manage verification docs"
  ON storage.objects FOR ALL
  USING (bucket_id = 'verification-docs' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'verification-docs' AND has_role(auth.uid(), 'admin'::app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260502024147_d2cf7bf3-d920-4028-b024-5bd0b7e724bb.sql
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.sync_profile_verification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260502030212_7849af71-732e-40a4-be5c-71c138e5c486.sql
-- ============================================================================
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'pending_sale';


-- ============================================================================
-- SOURCE MIGRATION: 20260502030335_505ceed8-bb6b-48ba-be97-3fa579c15f4b.sql
-- ============================================================================
DROP POLICY IF EXISTS "Active listings public read" ON public.listings;
CREATE POLICY "Active listings public read"
  ON public.listings
  FOR SELECT
  USING (
    status IN ('active'::listing_status, 'pending_sale'::listing_status)
    OR auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Media readable with listing" ON public.listing_media;
CREATE POLICY "Media readable with listing"
  ON public.listing_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_media.listing_id
        AND (
          l.status IN ('active'::listing_status, 'pending_sale'::listing_status)
          OR l.user_id = auth.uid()
          OR has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );


-- ============================================================================
-- SOURCE MIGRATION: 20260502031101_a769b2a0-ddbb-4232-ba1f-7aa472edcc16.sql
-- ============================================================================
-- Add admin-tunable settings for Pending Sale behavior
INSERT INTO public.pricing_settings (key, label, value, description) VALUES
  ('pending_sale_boost_eligible', 'Pending Sale boost eligible', 1, 'Set to 1 to allow sellers to boost listings while they are in Pending Sale status, or 0 to restrict boosts to Active listings only.'),
  ('pending_sale_max_days', 'Pending Sale max days', 14, 'Maximum number of days a listing can stay in Pending Sale before automatically reverting to Active.')
ON CONFLICT (key) DO NOTHING;

-- Auto-expire stale Pending Sale listings back to Active
CREATE OR REPLACE FUNCTION public.expire_stale_pending_sales()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_days numeric;
  expiry_days numeric;
  affected integer;
BEGIN
  SELECT value INTO max_days FROM public.pricing_settings WHERE key = 'pending_sale_max_days';
  SELECT value INTO expiry_days FROM public.pricing_settings WHERE key = 'listing_expiry_days';
  IF max_days IS NULL THEN max_days := 14; END IF;
  IF expiry_days IS NULL THEN expiry_days := 60; END IF;

  WITH updated AS (
    UPDATE public.listings
    SET status = 'active',
        expires_at = now() + (expiry_days || ' days')::interval,
        updated_at = now()
    WHERE status = 'pending_sale'
      AND updated_at < now() - (max_days || ' days')::interval
    RETURNING 1
  )
  SELECT count(*) INTO affected FROM updated;
  RETURN affected;
END;
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260502031120_56b14483-cbfe-4bae-9ba3-f16ab3ffe699.sql
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.expire_stale_pending_sales() FROM PUBLIC, anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260502032748_83cbfac7-ac61-4d0a-bd58-3416e27a269f.sql
-- ============================================================================
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS barangay TEXT;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_province TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_barangay TEXT;

ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS barangay TEXT;

CREATE INDEX IF NOT EXISTS idx_listings_province ON public.listings(province);
CREATE INDEX IF NOT EXISTS idx_listings_region_province ON public.listings(region, province);


-- ============================================================================
-- SOURCE MIGRATION: 20260503001732_93b27f60-91cb-488a-9181-9514e987ea97.sql
-- ============================================================================

-- Reorder existing 'other' and add towing
UPDATE public.categories SET sort_order = 7 WHERE slug = 'other';
INSERT INTO public.categories (slug, name, icon, sort_order)
VALUES ('towing', 'Towing & Trucking', 'truck', 6)
ON CONFLICT (slug) DO NOTHING;

-- tow_requests table
CREATE TABLE public.tow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  provider_id uuid,
  listing_id uuid,
  pickup_region text,
  pickup_province text,
  pickup_city text,
  pickup_address text,
  dropoff_region text,
  dropoff_province text,
  dropoff_city text,
  dropoff_address text,
  vehicle_summary text NOT NULL,
  needed_at timestamptz,
  notes text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tow_requests_requester ON public.tow_requests(requester_id);
CREATE INDEX idx_tow_requests_provider ON public.tow_requests(provider_id);
CREATE INDEX idx_tow_requests_status ON public.tow_requests(status);

ALTER TABLE public.tow_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER tow_requests_updated_at
BEFORE UPDATE ON public.tow_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Helper: is the user a towing provider (has any towing listing)?
CREATE OR REPLACE FUNCTION public.is_towing_provider(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings
    WHERE user_id = _user_id
      AND category_slug = 'towing'
      AND status IN ('active','pending_sale')
  )
$$;

-- Policies
CREATE POLICY "Requesters insert own tow requests"
ON public.tow_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Requesters view own tow requests"
ON public.tow_requests FOR SELECT
USING (
  auth.uid() = requester_id
  OR auth.uid() = provider_id
  OR (provider_id IS NULL AND status = 'open' AND public.is_towing_provider(auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Requesters update own tow requests"
ON public.tow_requests FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = provider_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Requesters delete own tow requests"
ON public.tow_requests FOR DELETE
USING (auth.uid() = requester_id OR has_role(auth.uid(), 'admin'::app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260503001802_6a5c8817-437e-46cb-bb8b-4a1ed8a82269.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_towing_provider(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings
    WHERE user_id = _user_id
      AND category_slug = 'towing'
      AND status IN ('active','pending_sale')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_towing_provider(uuid) FROM anon;


-- ============================================================================
-- SOURCE MIGRATION: 20260503003237_3682dcfb-dd9d-4fde-9173-a4e8b22c9182.sql
-- ============================================================================

-- Fan-out notifications for broadcast tow requests
CREATE OR REPLACE FUNCTION public.notify_towing_providers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  body text;
BEGIN
  -- Only fan out broadcast (no specific provider) open requests
  IF NEW.provider_id IS NOT NULL OR NEW.status <> 'open' THEN
    RETURN NEW;
  END IF;

  body := 'New tow request: ' || NEW.vehicle_summary
    || E'\nFrom ' || COALESCE(NEW.pickup_city, NEW.pickup_region, '?')
    || ' to ' || COALESCE(NEW.dropoff_city, NEW.dropoff_region, '?')
    || CASE WHEN NEW.needed_at IS NOT NULL THEN E'\nNeeded by ' || NEW.needed_at::text ELSE '' END
    || CASE WHEN NEW.notes IS NOT NULL THEN E'\n\n' || NEW.notes ELSE '' END;

  -- For each active towing listing whose owner covers the pickup region,
  -- pick the most recent listing per provider and notify them.
  FOR rec IN
    SELECT DISTINCT ON (l.user_id) l.id, l.user_id
    FROM public.listings l
    WHERE l.category_slug = 'towing'
      AND l.status IN ('active', 'pending_sale')
      AND l.user_id <> NEW.requester_id
      AND (
        NEW.pickup_region IS NULL
        OR l.region IS NULL
        OR l.region = NEW.pickup_region
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(
            COALESCE(l.attributes->'coverage_regions', '[]'::jsonb)
          ) AS cr(region)
          WHERE cr.region = NEW.pickup_region
        )
      )
    ORDER BY l.user_id, l.created_at DESC
  LOOP
    INSERT INTO public.messages (listing_id, sender_id, recipient_id, body)
    VALUES (rec.id, NEW.requester_id, rec.user_id, body);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_notify_towing_providers ON public.tow_requests;
CREATE TRIGGER tg_notify_towing_providers
AFTER INSERT ON public.tow_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_towing_providers();

-- Realtime updates so the provider dashboard sees changes live
ALTER TABLE public.tow_requests REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tow_requests'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tow_requests';
  END IF;
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260503003259_85c2e1ba-b298-47dc-80c9-d38ed60fb392.sql
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.notify_towing_providers() FROM PUBLIC, anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260503004302_d77ec04f-172f-4cf6-abf7-612fb83d6d93.sql
-- ============================================================================

-- =========================
-- tow_bids
-- =========================
CREATE TABLE public.tow_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.tow_requests(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  price_php numeric NOT NULL CHECK (price_php >= 0),
  eta_minutes integer,
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, provider_id)
);

CREATE INDEX idx_tow_bids_request ON public.tow_bids(request_id);
CREATE INDEX idx_tow_bids_provider ON public.tow_bids(provider_id);

ALTER TABLE public.tow_bids ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER tg_tow_bids_updated_at
BEFORE UPDATE ON public.tow_bids
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Providers see/manage their own bids; requesters see bids on their requests; admins manage all.
CREATE POLICY "Providers manage own bids"
ON public.tow_bids
FOR ALL
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id AND public.is_towing_provider(auth.uid()));

CREATE POLICY "Requesters view bids on own requests"
ON public.tow_bids
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tow_requests r
    WHERE r.id = tow_bids.request_id AND r.requester_id = auth.uid()
  )
);

CREATE POLICY "Requesters accept bids on own requests"
ON public.tow_bids
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tow_requests r
    WHERE r.id = tow_bids.request_id AND r.requester_id = auth.uid()
  )
);

CREATE POLICY "Admins manage tow_bids"
ON public.tow_bids
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Acceptance trigger
-- =========================
CREATE OR REPLACE FUNCTION public.handle_tow_bid_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req record;
  loser record;
BEGIN
  IF NEW.status <> 'accepted' OR OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO req FROM public.tow_requests WHERE id = NEW.request_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Update parent request
  UPDATE public.tow_requests
  SET status = 'accepted', provider_id = NEW.provider_id, updated_at = now()
  WHERE id = NEW.request_id;

  -- Decline siblings
  UPDATE public.tow_bids
  SET status = 'declined', updated_at = now()
  WHERE request_id = NEW.request_id AND id <> NEW.id AND status = 'pending';

  -- Notify winner
  INSERT INTO public.messages (sender_id, recipient_id, listing_id, body)
  VALUES (
    req.requester_id, NEW.provider_id, req.listing_id,
    'Your bid of ₱' || NEW.price_php || ' was accepted for "' || req.vehicle_summary
      || '". I''ll be in touch with the next steps.'
  );

  -- Notify losers
  FOR loser IN
    SELECT provider_id FROM public.tow_bids
    WHERE request_id = NEW.request_id AND id <> NEW.id AND status = 'declined'
  LOOP
    INSERT INTO public.messages (sender_id, recipient_id, listing_id, body)
    VALUES (
      req.requester_id, loser.provider_id, req.listing_id,
      'Thanks for bidding on "' || req.vehicle_summary || '" — the customer chose another provider this time.'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_tow_bid_accepted() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tg_handle_tow_bid_accepted
AFTER UPDATE ON public.tow_bids
FOR EACH ROW
EXECUTE FUNCTION public.handle_tow_bid_accepted();

-- Realtime
ALTER TABLE public.tow_bids REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tow_bids'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tow_bids';
  END IF;
END $$;

-- =========================
-- provider_tow_rates
-- =========================
CREATE TABLE public.provider_tow_rates (
  user_id uuid PRIMARY KEY,
  flat_base_php numeric,
  per_km_php numeric,
  min_php numeric,
  available_24_7 boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_tow_rates ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER tg_provider_tow_rates_updated_at
BEFORE UPDATE ON public.provider_tow_rates
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "Provider rates public read"
ON public.provider_tow_rates FOR SELECT USING (true);

CREATE POLICY "Owners manage own rates"
ON public.provider_tow_rates FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage rates"
ON public.provider_tow_rates FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- SOURCE MIGRATION: 20260503011334_7446ee59-2782-4eed-b1fc-e99720bf3bec.sql
-- ============================================================================

ALTER TABLE public.tow_requests
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS dropped_off_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS eta_minutes integer,
  ADD COLUMN IF NOT EXISTS final_price_php numeric,
  ADD COLUMN IF NOT EXISTS completion_notes text;

CREATE OR REPLACE FUNCTION public.enforce_tow_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean := has_role(uid, 'admin'::app_role);
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF is_admin THEN
    -- admins bypass transition restrictions but still get auto-stamps below
    NULL;
  ELSE
    -- Validate transitions
    IF OLD.status = 'open' AND NEW.status IN ('accepted','cancelled') THEN
      NULL;
    ELSIF OLD.status = 'accepted' AND NEW.status IN ('picked_up','cancelled') THEN
      IF NEW.status = 'picked_up' AND uid <> NEW.provider_id THEN
        RAISE EXCEPTION 'Only the assigned provider can mark a job as picked up';
      END IF;
    ELSIF OLD.status = 'picked_up' AND NEW.status = 'dropped_off' THEN
      IF uid <> NEW.provider_id THEN
        RAISE EXCEPTION 'Only the assigned provider can mark a job as dropped off';
      END IF;
      IF NEW.final_price_php IS NULL OR NEW.final_price_php < 0 THEN
        RAISE EXCEPTION 'A final bill amount is required to mark dropped off';
      END IF;
    ELSIF OLD.status = 'dropped_off' AND NEW.status = 'completed' THEN
      IF uid <> NEW.requester_id THEN
        RAISE EXCEPTION 'Only the customer can confirm completion';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid tow request status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  -- Auto-stamp timestamps
  IF NEW.status = 'picked_up' AND NEW.picked_up_at IS NULL THEN
    NEW.picked_up_at := now();
  END IF;
  IF NEW.status = 'dropped_off' AND NEW.dropped_off_at IS NULL THEN
    NEW.dropped_off_at := now();
  END IF;
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_tow_status_transitions ON public.tow_requests;
CREATE TRIGGER trg_enforce_tow_status_transitions
  BEFORE UPDATE OF status ON public.tow_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.enforce_tow_status_transitions();

CREATE OR REPLACE FUNCTION public.notify_tow_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  body text;
  recipient uuid;
  sender uuid;
BEGIN
  IF NEW.status = OLD.status THEN
    -- Status didn't change; check if eta_minutes changed while picked_up
    IF NEW.status = 'picked_up' AND COALESCE(NEW.eta_minutes, -1) <> COALESCE(OLD.eta_minutes, -1) AND NEW.provider_id IS NOT NULL THEN
      INSERT INTO public.messages (sender_id, recipient_id, listing_id, body)
      VALUES (
        NEW.provider_id, NEW.requester_id, NEW.listing_id,
        'Updated drop-off ETA for "' || NEW.vehicle_summary || '": ' || COALESCE(NEW.eta_minutes::text, '?') || ' minutes.'
      );
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'picked_up' THEN
    sender := NEW.provider_id; recipient := NEW.requester_id;
    body := 'Your tow for "' || NEW.vehicle_summary || '" has been picked up.'
      || CASE WHEN NEW.eta_minutes IS NOT NULL THEN ' ETA to drop-off: ' || NEW.eta_minutes || ' minutes.' ELSE '' END;
  ELSIF NEW.status = 'dropped_off' THEN
    sender := NEW.provider_id; recipient := NEW.requester_id;
    body := 'Your vehicle "' || NEW.vehicle_summary || '" has been dropped off. Final bill: ₱'
      || COALESCE(NEW.final_price_php::text, '0') || '. Please confirm completion in your dashboard.'
      || CASE WHEN NEW.completion_notes IS NOT NULL THEN E'\n\n' || NEW.completion_notes ELSE '' END;
  ELSIF NEW.status = 'completed' THEN
    sender := NEW.requester_id; recipient := NEW.provider_id;
    body := 'Customer confirmed completion for "' || NEW.vehicle_summary || '". Final bill: ₱'
      || COALESCE(NEW.final_price_php::text, '0') || '. Thanks!';
  ELSIF NEW.status = 'cancelled' AND OLD.status IN ('accepted','picked_up') THEN
    sender := NEW.requester_id; recipient := NEW.provider_id;
    body := 'The customer cancelled the tow for "' || NEW.vehicle_summary || '".';
  ELSE
    RETURN NEW;
  END IF;

  IF sender IS NOT NULL AND recipient IS NOT NULL AND sender <> recipient THEN
    INSERT INTO public.messages (sender_id, recipient_id, listing_id, body)
    VALUES (sender, recipient, NEW.listing_id, body);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_tow_status_change ON public.tow_requests;
CREATE TRIGGER trg_notify_tow_status_change
  AFTER UPDATE ON public.tow_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tow_status_change();


-- ============================================================================
-- SOURCE MIGRATION: 20260503011356_e724ceb2-451c-4b3f-a421-88d02d31079b.sql
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.enforce_tow_status_transitions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_tow_status_change() FROM PUBLIC, anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260510005334_4ee23b71-094a-4057-bd91-67be0767c459.sql
-- ============================================================================

-- Phone verification mirror columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

-- OTP rate limiting log
CREATE TABLE IF NOT EXISTS public.otp_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('verify','recovery')),
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_send_log_phone_sent_idx
  ON public.otp_send_log (phone, sent_at DESC);

ALTER TABLE public.otp_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own otp log"
  ON public.otp_send_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own otp log"
  ON public.otp_send_log FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- ============================================================================
-- SOURCE MIGRATION: 20260510014232_email_infra.sql
-- ============================================================================
-- Email infrastructure
-- Creates the queue system, send log, send state, suppression, and unsubscribe
-- tables used by both auth and transactional emails.

-- Extensions required for queue processing
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create email queues (auth = high priority, transactional = normal)
-- Wrapped in DO blocks to handle "queue already exists" errors idempotently.
DO $$ BEGIN PERFORM pgmq.create('auth_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Dead-letter queues for messages that exceed max retries
DO $$ BEGIN PERFORM pgmq.create('auth_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Email send log table (audit trail for all send attempts)
-- UPDATE is allowed for the service role so the suppression edge function
-- can update a log record's status when a bounce/complaint/unsubscribe occurs.
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read send log"
    ON public.email_send_log FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert send log"
    ON public.email_send_log FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can update send log"
    ON public.email_send_log FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);

-- Backfill: add message_id column to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_log ADD COLUMN message_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log(message_id);

-- Prevent duplicate sends: only one 'sent' row per message_id.
-- If VT expires and another worker picks up the same message, the pre-send
-- check catches it. This index is a DB-level safety net for race conditions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique
  ON public.email_send_log(message_id) WHERE status = 'sent';

-- Backfill: update status CHECK constraint for existing tables that predate new statuses
DO $$ BEGIN
  ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
  ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check
    CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq'));
END $$;

-- Rate-limit state and queue config (single row, tracks Retry-After cooldown + throughput settings)
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until TIMESTAMPTZ,
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Backfill: add config columns to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN batch_size INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN send_delay_ms INTEGER NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage send state"
    ON public.email_send_state FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RPC wrappers so Edge Functions can interact with pgmq via supabase.rpc()
-- (PostgREST only exposes functions in the public schema; pgmq functions are in the pgmq schema)
-- All wrappers auto-create the queue on undefined_table (42P01) so emails
-- are never lost if the queue was dropped (extension upgrade, restore, etc.).
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)
RETURNS TABLE(msg_id BIGINT, read_ct INT, message JSONB)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, message_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

-- Restrict queue RPC wrappers to service_role only (SECURITY DEFINER runs as owner,
-- so without this any authenticated user could manipulate the email queues)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;

-- Suppressed emails table (tracks unsubscribes, bounces, complaints)
-- Append-only: no DELETE or UPDATE policies to prevent bypassing suppression.
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read suppressed emails"
    ON public.suppressed_emails FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert suppressed emails"
    ON public.suppressed_emails FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);

-- Email unsubscribe tokens table (one token per email address for unsubscribe links)
-- No DELETE policy to prevent removing tokens. UPDATE allowed only to mark tokens as used.
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read tokens"
    ON public.email_unsubscribe_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert tokens"
    ON public.email_unsubscribe_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can mark tokens as used"
    ON public.email_unsubscribe_tokens FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);

-- ============================================================
-- POST-MIGRATION STEPS (applied dynamically by setup_email_infra)
-- These steps contain project-specific secrets and URLs and
-- cannot be expressed as static SQL. They are applied via the
-- Supabase Management API (ExecuteSQL) each time the tool runs.
-- ============================================================
--
-- 1. VAULT SECRET
--    Stores (or updates) the Supabase service_role key in
--    vault as 'email_queue_service_role_key'.
--    Uses vault.create_secret / vault.update_secret (upsert).
--    To revert: DELETE FROM vault.secrets WHERE name = 'email_queue_service_role_key';
--
-- 2. CRON JOB (pg_cron)
--    Creates job 'process-email-queue' with a 5-second interval.
--    The job checks:
--      a) rate-limit cooldown (email_send_state.retry_after_until)
--      b) whether auth_emails or transactional_emails queues have messages
--    If conditions are met, it calls the process-email-queue Edge Function
--    via net.http_post using the vault-stored service_role key.
--    To revert: SELECT cron.unschedule('process-email-queue');


-- ============================================================================
-- SOURCE MIGRATION: 20260510020733_db491d51-a07e-4ef7-9ebc-41ab90b42872.sql
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;


-- ============================================================================
-- SOURCE MIGRATION: 20260510033922_5e16a679-3788-4cdd-bc80-225ffefc0c38.sql
-- ============================================================================

-- Add "free" to listing_plan enum
ALTER TYPE listing_plan ADD VALUE IF NOT EXISTS 'free' BEFORE 'standard';

-- Insert Free subscription plan
INSERT INTO public.subscription_plans (name, price_php, listings_per_month, features, sort_order, active)
VALUES (
  'Free',
  0,
  4,
  '["1 listing per week","1 photo per listing","No video","Community support"]'::jsonb,
  0,
  true
)
ON CONFLICT DO NOTHING;

-- Function: check if user has any active paid subscription
CREATE OR REPLACE FUNCTION public.user_has_paid_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE s.user_id = _user_id
      AND s.status = 'active'
      AND p.price_php > 0
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  )
$$;

-- Trigger: enforce 1 free listing per rolling 7 days
CREATE OR REPLACE FUNCTION public.enforce_free_listing_quota()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  -- Only enforce on free plan listings
  IF NEW.plan IS DISTINCT FROM 'free'::listing_plan THEN
    RETURN NEW;
  END IF;

  -- Users with paid subscription bypass the weekly cap
  IF public.user_has_paid_subscription(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO recent_count
  FROM public.listings
  WHERE user_id = NEW.user_id
    AND plan = 'free'::listing_plan
    AND created_at > now() - interval '7 days'
    AND id <> NEW.id;

  IF recent_count >= 1 THEN
    RAISE EXCEPTION 'Free plan is limited to 1 listing per week. Please wait or upgrade your plan.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_free_listing_quota ON public.listings;
CREATE TRIGGER trg_enforce_free_listing_quota
BEFORE INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_free_listing_quota();


-- ============================================================================
-- SOURCE MIGRATION: 20260511111920_33ce198e-af1c-4b5a-8d89-065a9c398a7d.sql
-- ============================================================================

-- Likes
CREATE TABLE public.listing_likes (
  listing_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, user_id)
);
CREATE INDEX idx_listing_likes_user ON public.listing_likes(user_id);
CREATE INDEX idx_listing_likes_listing ON public.listing_likes(listing_id);

ALTER TABLE public.listing_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes public read" ON public.listing_likes
  FOR SELECT USING (true);

CREATE POLICY "Users like on own behalf" ON public.listing_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users unlike own" ON public.listing_likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins manage likes" ON public.listing_likes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Views
CREATE TABLE public.listing_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL,
  viewer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_listing_views_listing_created ON public.listing_views(listing_id, created_at DESC);

ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own listing views" ON public.listing_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_views.listing_id AND l.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Increment function (security definer so anon can call)
CREATE OR REPLACE FUNCTION public.increment_listing_view(_listing_id uuid, _viewer_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.listing_views (listing_id, viewer_id) VALUES (_listing_id, _viewer_id);
  UPDATE public.listings SET view_count = COALESCE(view_count, 0) + 1 WHERE id = _listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid, uuid) TO anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260511112009_3b3d56cb-9813-45ae-ae0c-a75b83a4528a.sql
-- ============================================================================

CREATE POLICY "Listing owners read saves on own listings" ON public.favorites
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = favorites.listing_id AND l.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );


-- ============================================================================
-- SOURCE MIGRATION: 20260511140502_bce2adb4-7c11-477f-89ef-bdf9ce1b4185.sql
-- ============================================================================
-- Add 'sales' to app_role enum (must be its own transaction before usage)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales';


-- ============================================================================
-- SOURCE MIGRATION: 20260511140558_454c66c4-559a-4ae6-8a0b-2474942813d1.sql
-- ============================================================================
-- 1. profiles columns
DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('active','paused','banned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status public.account_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_founding_member boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_member_number int UNIQUE;

-- 2. subscription_plans columns
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS max_photos_per_listing int NOT NULL DEFAULT 5;

-- 3. subscriptions columns
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS complimentary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text;

-- 4. Rename existing plans + set photo limits
UPDATE public.subscription_plans SET max_photos_per_listing = 3,
  features = '["3 photos per listing","1 listing per week","Community support"]'::jsonb
  WHERE name = 'Free';
UPDATE public.subscription_plans SET name = 'Bronze', max_photos_per_listing = 5,
  features = '["5 listings/month","Up to 5 photos","Email support"]'::jsonb
  WHERE name = 'Starter';
UPDATE public.subscription_plans SET name = 'Silver', max_photos_per_listing = 8,
  features = '["10 listings/month","Up to 8 photos","1 free upgrade/month","Priority support"]'::jsonb
  WHERE name = 'Growth';
UPDATE public.subscription_plans SET name = 'Gold', max_photos_per_listing = 12,
  features = '["20 listings/month","Up to 12 photos","3 free upgrades/month","Business badge"]'::jsonb
  WHERE name = 'Pro';
UPDATE public.subscription_plans SET name = 'Platinum', max_photos_per_listing = 20,
  features = '["Unlimited listings","Up to 20 photos","Unlimited upgrades","1 free boost/month","Premium business badge"]'::jsonb
  WHERE name = 'Unlimited';

INSERT INTO public.subscription_plans (name, price_php, listings_per_month, max_photos_per_listing, features, sort_order, active)
SELECT 'Business', 1200, NULL, 20,
  '["Everything in Platinum","Multi-user access (coming soon)","Top-tier business badge","Dedicated account manager"]'::jsonb,
  5, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'Business');

-- 5. Founding member trigger
CREATE OR REPLACE FUNCTION public.assign_founding_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count int;
  bronze_id uuid;
BEGIN
  SELECT count(*) INTO current_count FROM public.profiles WHERE is_founding_member = true;
  IF current_count < 1000 THEN
    NEW.is_founding_member := true;
    NEW.founding_member_number := current_count + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_assign_founding_member ON public.profiles;
CREATE TRIGGER tg_assign_founding_member
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_founding_member();

CREATE OR REPLACE FUNCTION public.grant_founding_bronze()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE bronze_id uuid;
BEGIN
  IF NEW.is_founding_member = true THEN
    SELECT id INTO bronze_id FROM public.subscription_plans WHERE name = 'Bronze' LIMIT 1;
    IF bronze_id IS NOT NULL THEN
      INSERT INTO public.subscriptions (user_id, plan_id, status, complimentary, current_period_end)
      VALUES (NEW.id, bronze_id, 'active', true, NULL)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_grant_founding_bronze ON public.profiles;
CREATE TRIGGER tg_grant_founding_bronze
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.grant_founding_bronze();

-- 6. Backfill existing users as founding members (up to 1000)
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn FROM public.profiles
)
UPDATE public.profiles p
SET is_founding_member = true, founding_member_number = r.rn
FROM ranked r
WHERE p.id = r.id AND r.rn <= 1000 AND p.is_founding_member = false;

-- 7. Sales role helper (uses existing has_role)
-- Update listings public-read RLS to hide paused accounts
DROP POLICY IF EXISTS "Active listings public read" ON public.listings;
CREATE POLICY "Active listings public read" ON public.listings
FOR SELECT USING (
  (
    (status = ANY (ARRAY['active'::listing_status, 'pending_sale'::listing_status]))
    AND EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = listings.user_id AND pr.account_status = 'active')
  )
  OR auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 8. Sales role policies
CREATE POLICY "Sales view all profiles" ON public.profiles
FOR SELECT USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales update account status" ON public.profiles
FOR UPDATE USING (has_role(auth.uid(), 'sales'::app_role))
WITH CHECK (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales view subscriptions" ON public.subscriptions
FOR SELECT USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales manage subscriptions" ON public.subscriptions
FOR UPDATE USING (has_role(auth.uid(), 'sales'::app_role))
WITH CHECK (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales insert subscriptions" ON public.subscriptions
FOR INSERT WITH CHECK (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales view payments" ON public.payments
FOR SELECT USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales view listings" ON public.listings
FOR SELECT USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales view user_roles" ON public.user_roles
FOR SELECT USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales view subscription_plans" ON public.subscription_plans
FOR SELECT USING (has_role(auth.uid(), 'sales'::app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260512021904_0a43255b-8b86-4442-ad94-e22fd2819e6a.sql
-- ============================================================================
CREATE TABLE public.account_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  actor_role text NOT NULL,
  field text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_audit_target ON public.account_audit_log(target_user_id, created_at DESC);
CREATE INDEX idx_account_audit_actor ON public.account_audit_log(actor_id, created_at DESC);

ALTER TABLE public.account_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit log"
  ON public.account_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sales view audit log"
  ON public.account_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Staff write audit log"
  ON public.account_audit_log FOR INSERT
  WITH CHECK (
    auth.uid() = actor_id
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role))
  );


-- ============================================================================
-- SOURCE MIGRATION: 20260512022424_db17ca36-985d-4405-8d4a-6f8fe8e8b124.sql
-- ============================================================================
-- 1) Add fixed search_path to email queue helpers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;

-- 2) Revoke public EXECUTE on trigger-only / service-only SECURITY DEFINER functions.
--    These are invoked by triggers, cron, or service_role only — never by app users.
REVOKE EXECUTE ON FUNCTION public.assign_founding_member()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_founding_bronze()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_free_listing_quota()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_tow_status_transitions()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_tow_bid_accepted()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_tow_status_change()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_towing_providers()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_verification()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_pending_sales()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_paid_subscription(uuid)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260512023916_08c3429a-e992-4bc3-ae1c-118ace98df45.sql
-- ============================================================================

-- Add new staff roles. ALTER TYPE ADD VALUE cannot be used in the same
-- transaction as its values, so all subsequent code references role::text.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advertising';

-- Helper: any non-user role
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text <> 'user'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_moderate(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin','moderator')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_support(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin','moderator','support','sales')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_ads(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin','advertising')
  )
$$;

CREATE OR REPLACE FUNCTION public.current_plan_tier(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT p.name FROM public.subscriptions s
       JOIN public.subscription_plans p ON p.id = s.plan_id
      WHERE s.user_id = _user_id
        AND s.status = 'active'
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
      ORDER BY p.price_php DESC LIMIT 1),
    'Free'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_business_account(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND verification_status = 'verified'
      AND business_kind IN ('dealer','repair_shop','insurance')
  )
$$;

-- Lock down EXECUTE: revoke from public/anon, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_moderate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_moderate(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_support(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_support(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_manage_ads(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_ads(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.current_plan_tier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_plan_tier(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_business_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_business_account(uuid) TO authenticated;

-- Ad placement + status enums
DO $$ BEGIN
  CREATE TYPE public.ad_placement AS ENUM (
    'homepage_banner','category_banner','listing_sidebar','newsletter','sponsored_post','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_inquiry_status AS ENUM (
    'new','in_review','quoted','won','lost','spam'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ad inquiries table
CREATE TABLE IF NOT EXISTS public.ad_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  company text,
  email text NOT NULL,
  phone text,
  placement public.ad_placement NOT NULL DEFAULT 'other',
  budget_range text,
  start_date date,
  message text NOT NULL,
  status public.ad_inquiry_status NOT NULL DEFAULT 'new',
  assigned_to uuid,
  internal_notes text,
  submitter_user_id uuid,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_inquiries_status_idx ON public.ad_inquiries(status);
CREATE INDEX IF NOT EXISTS ad_inquiries_email_idx ON public.ad_inquiries(lower(email));

ALTER TABLE public.ad_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit
CREATE POLICY "Anyone can submit ad inquiry"
ON public.ad_inquiries FOR INSERT
WITH CHECK (true);

-- Ad staff (admin or advertising) can read all
CREATE POLICY "Ad staff read all inquiries"
ON public.ad_inquiries FOR SELECT
USING (public.can_manage_ads(auth.uid()));

-- Submitter can read their own (signed-in + matching email or user id)
CREATE POLICY "Submitter reads own inquiry"
ON public.ad_inquiries FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    submitter_user_id = auth.uid()
    OR lower(email) = lower(COALESCE((auth.jwt() ->> 'email'),''))
  )
);

-- Ad staff update
CREATE POLICY "Ad staff update inquiries"
ON public.ad_inquiries FOR UPDATE
USING (public.can_manage_ads(auth.uid()))
WITH CHECK (public.can_manage_ads(auth.uid()));

-- Only admin delete
CREATE POLICY "Admins delete inquiries"
ON public.ad_inquiries FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Threaded replies
CREATE TABLE IF NOT EXISTS public.ad_inquiry_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.ad_inquiries(id) ON DELETE CASCADE,
  sender_id uuid,
  sender_name text,
  sender_email text,
  body text NOT NULL,
  from_staff boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_inquiry_messages_inquiry_idx ON public.ad_inquiry_messages(inquiry_id);

ALTER TABLE public.ad_inquiry_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can post a non-staff reply
CREATE POLICY "Anyone can reply to inquiry"
ON public.ad_inquiry_messages FOR INSERT
WITH CHECK (
  from_staff = false
  OR public.can_manage_ads(auth.uid())
);

-- Ad staff read all
CREATE POLICY "Ad staff read all messages"
ON public.ad_inquiry_messages FOR SELECT
USING (public.can_manage_ads(auth.uid()));

-- Submitter reads their thread
CREATE POLICY "Submitter reads own thread"
ON public.ad_inquiry_messages FOR SELECT
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ad_inquiries i
    WHERE i.id = ad_inquiry_messages.inquiry_id
      AND (
        i.submitter_user_id = auth.uid()
        OR lower(i.email) = lower(COALESCE((auth.jwt() ->> 'email'),''))
      )
  )
);

-- updated_at trigger on ad_inquiries
DROP TRIGGER IF EXISTS set_ad_inquiries_updated_at ON public.ad_inquiries;
CREATE TRIGGER set_ad_inquiries_updated_at
BEFORE UPDATE ON public.ad_inquiries
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Extend account_audit_log INSERT to include moderator/support staff (admin+sales were original)
DROP POLICY IF EXISTS "Staff write audit log" ON public.account_audit_log;
CREATE POLICY "Staff write audit log"
ON public.account_audit_log FOR INSERT
WITH CHECK (auth.uid() = actor_id AND public.can_support(auth.uid()));

-- Allow moderator/support read on audit log + listings + reports + verification_requests
CREATE POLICY "Support read audit log"
ON public.account_audit_log FOR SELECT
USING (public.can_support(auth.uid()));

CREATE POLICY "Support read listings"
ON public.listings FOR SELECT
USING (public.can_support(auth.uid()));

CREATE POLICY "Support read reports"
ON public.reports FOR SELECT
USING (public.can_support(auth.uid()));

CREATE POLICY "Moderators update reports"
ON public.reports FOR UPDATE
USING (public.can_moderate(auth.uid()))
WITH CHECK (public.can_moderate(auth.uid()));

CREATE POLICY "Support read verification requests"
ON public.verification_requests FOR SELECT
USING (public.can_support(auth.uid()));

CREATE POLICY "Moderators update verification requests"
ON public.verification_requests FOR UPDATE
USING (public.can_moderate(auth.uid()))
WITH CHECK (public.can_moderate(auth.uid()));

CREATE POLICY "Moderators update listings"
ON public.listings FOR UPDATE
USING (public.can_moderate(auth.uid()))
WITH CHECK (public.can_moderate(auth.uid()));

CREATE POLICY "Support read profiles"
ON public.profiles FOR SELECT
USING (public.can_support(auth.uid()));


-- ============================================================================
-- SOURCE MIGRATION: 20260512025805_b3d154de-ab7f-47ca-a554-005070df0844.sql
-- ============================================================================
-- 1. Length / format checks via BEFORE INSERT/UPDATE trigger on ad_inquiries
CREATE OR REPLACE FUNCTION public.validate_ad_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.contact_name := btrim(NEW.contact_name);
  NEW.email := lower(btrim(NEW.email));
  IF NEW.company IS NOT NULL THEN NEW.company := btrim(NEW.company); END IF;
  IF NEW.phone IS NOT NULL THEN NEW.phone := btrim(NEW.phone); END IF;
  IF NEW.budget_range IS NOT NULL THEN NEW.budget_range := btrim(NEW.budget_range); END IF;
  NEW.message := btrim(NEW.message);

  IF char_length(NEW.contact_name) < 1 OR char_length(NEW.contact_name) > 100 THEN
    RAISE EXCEPTION 'contact_name must be 1-100 characters';
  END IF;
  IF NEW.company IS NOT NULL AND char_length(NEW.company) > 120 THEN
    RAISE EXCEPTION 'company must be at most 120 characters';
  END IF;
  IF char_length(NEW.email) > 255 OR NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'email is invalid';
  END IF;
  IF NEW.phone IS NOT NULL AND char_length(NEW.phone) > 30 THEN
    RAISE EXCEPTION 'phone must be at most 30 characters';
  END IF;
  IF NEW.budget_range IS NOT NULL AND char_length(NEW.budget_range) > 60 THEN
    RAISE EXCEPTION 'budget_range must be at most 60 characters';
  END IF;
  IF char_length(NEW.message) < 10 OR char_length(NEW.message) > 2000 THEN
    RAISE EXCEPTION 'message must be 10-2000 characters';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_ad_inquiry ON public.ad_inquiries;
CREATE TRIGGER trg_validate_ad_inquiry
BEFORE INSERT OR UPDATE OF contact_name, email, company, phone, budget_range, message ON public.ad_inquiries
FOR EACH ROW EXECUTE FUNCTION public.validate_ad_inquiry();

-- 2. Status transition trigger
CREATE OR REPLACE FUNCTION public.enforce_ad_inquiry_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean := has_role(uid, 'admin'::app_role);
  old_s text;
  new_s text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF is_admin THEN RETURN NEW; END IF;

  old_s := OLD.status::text;
  new_s := NEW.status::text;

  IF NOT (
    (old_s = 'new'       AND new_s IN ('in_review','spam')) OR
    (old_s = 'in_review' AND new_s IN ('quoted','lost','spam')) OR
    (old_s = 'quoted'    AND new_s IN ('won','lost'))
  ) THEN
    RAISE EXCEPTION 'Invalid ad inquiry status transition: % -> %', old_s, new_s;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ad_inquiry_status ON public.ad_inquiries;
CREATE TRIGGER trg_ad_inquiry_status
BEFORE UPDATE OF status ON public.ad_inquiries
FOR EACH ROW EXECUTE FUNCTION public.enforce_ad_inquiry_status_transitions();

-- 3. Enqueue confirmation + staff notice on new inquiry
CREATE OR REPLACE FUNCTION public.on_ad_inquiry_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Advertiser confirmation
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', 'ad-inquiry-received',
    'to', NEW.email,
    'data', jsonb_build_object(
      'contact_name', NEW.contact_name,
      'placement', NEW.placement::text,
      'inquiry_id', NEW.id
    )
  ));
  -- Staff notice
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', 'ad-inquiry-staff-notice',
    'to', 'partners@365motorsales.ph',
    'data', jsonb_build_object(
      'contact_name', NEW.contact_name,
      'company', NEW.company,
      'email', NEW.email,
      'phone', NEW.phone,
      'placement', NEW.placement::text,
      'budget_range', NEW.budget_range,
      'start_date', NEW.start_date::text,
      'message', NEW.message,
      'inquiry_id', NEW.id
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ad_inquiry_created ON public.ad_inquiries;
CREATE TRIGGER trg_ad_inquiry_created
AFTER INSERT ON public.ad_inquiries
FOR EACH ROW EXECUTE FUNCTION public.on_ad_inquiry_created();

-- 4. Enqueue staff reply email on ad_inquiry_messages insert (from_staff = true)
CREATE OR REPLACE FUNCTION public.on_ad_inquiry_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.ad_inquiries%ROWTYPE;
BEGIN
  IF NEW.from_staff IS NOT TRUE THEN RETURN NEW; END IF;
  SELECT * INTO rec FROM public.ad_inquiries WHERE id = NEW.inquiry_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', 'ad-inquiry-reply',
    'to', rec.email,
    'data', jsonb_build_object(
      'contact_name', rec.contact_name,
      'sender_name', NEW.sender_name,
      'body', NEW.body,
      'inquiry_id', rec.id
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ad_inquiry_reply ON public.ad_inquiry_messages;
CREATE TRIGGER trg_ad_inquiry_reply
AFTER INSERT ON public.ad_inquiry_messages
FOR EACH ROW EXECUTE FUNCTION public.on_ad_inquiry_reply();


-- ============================================================================
-- SOURCE MIGRATION: 20260512025827_2d85b756-12f2-4e65-87f4-fee2381ce3f8.sql
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.validate_ad_inquiry() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_ad_inquiry_status_transitions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_ad_inquiry_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_ad_inquiry_reply() FROM PUBLIC, anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260512030721_58a27109-fdba-49db-b9cb-234df9070e9c.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ad_inquiry_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.ad_inquiries(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  from_value text,
  to_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ad_inquiry_audit_inquiry_idx
  ON public.ad_inquiry_audit(inquiry_id, created_at DESC);

ALTER TABLE public.ad_inquiry_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ad staff read audit" ON public.ad_inquiry_audit;
CREATE POLICY "Ad staff read audit" ON public.ad_inquiry_audit
  FOR SELECT USING (public.can_manage_ads(auth.uid()));

CREATE OR REPLACE FUNCTION public.tg_audit_ad_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, to_value)
      VALUES (NEW.id, NEW.submitter_user_id, 'created', NEW.status::text);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value)
        VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status::text, NEW.status::text);
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value)
        VALUES (NEW.id, auth.uid(), 'assigned',
                COALESCE(OLD.assigned_to::text,''), COALESCE(NEW.assigned_to::text,''));
    END IF;
    IF COALESCE(NEW.internal_notes,'') IS DISTINCT FROM COALESCE(OLD.internal_notes,'') THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action)
        VALUES (NEW.id, auth.uid(), 'notes_updated');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.tg_audit_ad_inquiry() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_audit_ad_inquiry() FROM anon;
REVOKE EXECUTE ON FUNCTION public.tg_audit_ad_inquiry() FROM authenticated;

DROP TRIGGER IF EXISTS trg_ad_inquiry_audit ON public.ad_inquiries;
CREATE TRIGGER trg_ad_inquiry_audit
  AFTER INSERT OR UPDATE ON public.ad_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_ad_inquiry();

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


-- ============================================================================
-- SOURCE MIGRATION: 20260512034115_20d8dec1-5c0e-44b9-b23b-bf899ef89f48.sql
-- ============================================================================

-- ENUM
DO $$ BEGIN
  CREATE TYPE public.referral_kind AS ENUM ('promo','deal','rate','incentive','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- staff_referrals
CREATE TABLE public.staff_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  referral_code text NOT NULL UNIQUE,
  qr_storage_path text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_referrals_code ON public.staff_referrals(referral_code);
CREATE INDEX idx_staff_referrals_user ON public.staff_referrals(staff_user_id);

ALTER TABLE public.staff_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage staff_referrals" ON public.staff_referrals
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Sales read staff_referrals" ON public.staff_referrals
  FOR SELECT USING (has_role(auth.uid(),'sales'::app_role));
CREATE POLICY "Staff read own referral row" ON public.staff_referrals
  FOR SELECT USING (
    auth.uid() = staff_user_id
    OR lower(email) = lower(COALESCE(auth.jwt()->>'email',''))
  );

-- referral_visits
CREATE TABLE public.referral_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL,
  first_referral_code text,
  last_referral_code text,
  credited_referral_code text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  landing_page text,
  user_agent text,
  ip_hash text,
  UNIQUE(visitor_id)
);
CREATE INDEX idx_referral_visits_credit ON public.referral_visits(credited_referral_code);

ALTER TABLE public.referral_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage referral_visits" ON public.referral_visits
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Sales read referral_visits" ON public.referral_visits
  FOR SELECT USING (has_role(auth.uid(),'sales'::app_role));

-- qr_scans (append-only)
CREATE TABLE public.qr_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  visitor_id uuid,
  device_type text,
  browser text,
  country text,
  scanned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_qr_scans_code ON public.qr_scans(referral_code);
CREATE INDEX idx_qr_scans_visitor ON public.qr_scans(visitor_id);

ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage qr_scans" ON public.qr_scans
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Sales read qr_scans" ON public.qr_scans
  FOR SELECT USING (has_role(auth.uid(),'sales'::app_role));
CREATE POLICY "Staff read own qr_scans" ON public.qr_scans
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.referral_code = qr_scans.referral_code
      AND (s.staff_user_id = auth.uid()
           OR lower(s.email) = lower(COALESCE(auth.jwt()->>'email','')))
  ));

-- user_referrals
CREATE TABLE public.user_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_by_staff_id uuid REFERENCES public.staff_referrals(id) ON DELETE SET NULL,
  first_referral_code text,
  last_referral_code text,
  credited_referral_code text,
  signup_date timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_referrals_staff ON public.user_referrals(referred_by_staff_id);
CREATE INDEX idx_user_referrals_credit ON public.user_referrals(credited_referral_code);

ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage user_referrals" ON public.user_referrals
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Sales read user_referrals" ON public.user_referrals
  FOR SELECT USING (has_role(auth.uid(),'sales'::app_role));
CREATE POLICY "User reads own referral row" ON public.user_referrals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff read own credited signups" ON public.user_referrals
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = user_referrals.referred_by_staff_id
      AND (s.staff_user_id = auth.uid()
           OR lower(s.email) = lower(COALESCE(auth.jwt()->>'email','')))
  ));

-- staff_promotions
CREATE TABLE public.staff_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_referral_id uuid NOT NULL REFERENCES public.staff_referrals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  kind public.referral_kind NOT NULL DEFAULT 'promo',
  percent_off numeric,
  flat_amount_php numeric,
  applies_to text NOT NULL DEFAULT 'any',
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  terms text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_promotions_staff ON public.staff_promotions(staff_referral_id);

ALTER TABLE public.staff_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage staff_promotions" ON public.staff_promotions
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Sales read staff_promotions" ON public.staff_promotions
  FOR SELECT USING (has_role(auth.uid(),'sales'::app_role));
CREATE POLICY "Staff read own promotions" ON public.staff_promotions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = staff_promotions.staff_referral_id
      AND (s.staff_user_id = auth.uid()
           OR lower(s.email) = lower(COALESCE(auth.jwt()->>'email','')))
  ));
CREATE POLICY "Public read active promotions" ON public.staff_promotions
  FOR SELECT USING (
    active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

-- updated_at triggers
CREATE TRIGGER trg_staff_referrals_updated BEFORE UPDATE ON public.staff_referrals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_staff_promotions_updated BEFORE UPDATE ON public.staff_promotions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- record_qr_scan RPC (public, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.record_qr_scan(
  _code text,
  _visitor_id uuid,
  _user_agent text DEFAULT NULL,
  _landing text DEFAULT NULL,
  _device text DEFAULT NULL,
  _browser text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.staff_referrals%ROWTYPE;
  v public.referral_visits%ROWTYPE;
  is_active boolean;
BEGIN
  SELECT * INTO s FROM public.staff_referrals WHERE referral_code = _code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_code');
  END IF;
  is_active := s.active;

  -- Log scan regardless (for diagnostics)
  INSERT INTO public.qr_scans(referral_code, visitor_id, device_type, browser)
    VALUES (_code, _visitor_id, _device, _browser);

  -- Upsert visitor
  SELECT * INTO v FROM public.referral_visits WHERE visitor_id = _visitor_id;
  IF NOT FOUND THEN
    INSERT INTO public.referral_visits(visitor_id, first_referral_code, last_referral_code, credited_referral_code, landing_page, user_agent)
      VALUES (_visitor_id, _code, _code, CASE WHEN is_active THEN _code ELSE NULL END, _landing, _user_agent);
  ELSE
    UPDATE public.referral_visits
      SET last_referral_code = _code,
          last_seen_at = now(),
          credited_referral_code = COALESCE(credited_referral_code, CASE WHEN is_active THEN _code ELSE NULL END),
          first_referral_code = COALESCE(first_referral_code, _code)
      WHERE visitor_id = _visitor_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'active', is_active,
    'staff_name', s.full_name,
    'first_name', split_part(s.full_name, ' ', 1),
    'code', _code
  );
END $$;

REVOKE ALL ON FUNCTION public.record_qr_scan(text,uuid,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_qr_scan(text,uuid,text,text,text,text) TO anon, authenticated;

-- Trigger: attach referral to new profile from raw_user_meta_data.referral_code
CREATE OR REPLACE FUNCTION public.attach_signup_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
  code text;
  s public.staff_referrals%ROWTYPE;
BEGIN
  SELECT raw_user_meta_data INTO meta FROM auth.users WHERE id = NEW.id;
  code := NULLIF(meta->>'referral_code','');
  IF code IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO s FROM public.staff_referrals WHERE referral_code = code AND active = true;
  IF NOT FOUND THEN RETURN NEW; END IF;

  INSERT INTO public.user_referrals(user_id, referred_by_staff_id, first_referral_code, last_referral_code, credited_referral_code)
    VALUES (NEW.id, s.id, code, code, code)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_attach_signup_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.attach_signup_referral();

-- Storage bucket for QR PNGs
INSERT INTO storage.buckets (id, name, public)
  VALUES ('qr-codes','qr-codes', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "QR codes public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'qr-codes');
CREATE POLICY "Admins upload QR codes" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'qr-codes' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins update QR codes" ON storage.objects
  FOR UPDATE USING (bucket_id = 'qr-codes' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins delete QR codes" ON storage.objects
  FOR DELETE USING (bucket_id = 'qr-codes' AND has_role(auth.uid(),'admin'::app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260512035032_ca4ac263-acec-4578-ac25-6fef9210a8fe.sql
-- ============================================================================
-- Deduplicate existing rows, keeping the earliest scan per (referral_code, visitor_id)
DELETE FROM public.qr_scans a
USING public.qr_scans b
WHERE a.referral_code = b.referral_code
  AND a.visitor_id IS NOT NULL
  AND b.visitor_id IS NOT NULL
  AND a.visitor_id = b.visitor_id
  AND a.scanned_at > b.scanned_at;

-- Unique constraint: one credited scan per visitor per referral code
CREATE UNIQUE INDEX IF NOT EXISTS qr_scans_code_visitor_unique
  ON public.qr_scans(referral_code, visitor_id)
  WHERE visitor_id IS NOT NULL;

-- Update RPC to dedupe inserts and signal whether the scan was newly counted
CREATE OR REPLACE FUNCTION public.record_qr_scan(
  _code text,
  _visitor_id uuid,
  _user_agent text DEFAULT NULL::text,
  _landing text DEFAULT NULL::text,
  _device text DEFAULT NULL::text,
  _browser text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s public.staff_referrals%ROWTYPE;
  v public.referral_visits%ROWTYPE;
  is_active boolean;
  inserted_scan boolean := false;
  new_scan_id uuid;
BEGIN
  SELECT * INTO s FROM public.staff_referrals WHERE referral_code = _code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_code');
  END IF;
  is_active := s.active;

  -- Dedupe: only first scan per (referral_code, visitor_id) is recorded
  INSERT INTO public.qr_scans(referral_code, visitor_id, device_type, browser)
    VALUES (_code, _visitor_id, _device, _browser)
    ON CONFLICT (referral_code, visitor_id) WHERE visitor_id IS NOT NULL
    DO NOTHING
    RETURNING id INTO new_scan_id;
  inserted_scan := new_scan_id IS NOT NULL;

  -- Upsert visitor record (first-touch attribution preserved)
  SELECT * INTO v FROM public.referral_visits WHERE visitor_id = _visitor_id;
  IF NOT FOUND THEN
    INSERT INTO public.referral_visits(visitor_id, first_referral_code, last_referral_code, credited_referral_code, landing_page, user_agent)
      VALUES (_visitor_id, _code, _code, CASE WHEN is_active THEN _code ELSE NULL END, _landing, _user_agent);
  ELSE
    UPDATE public.referral_visits
      SET last_referral_code = _code,
          last_seen_at = now(),
          credited_referral_code = COALESCE(credited_referral_code, CASE WHEN is_active THEN _code ELSE NULL END),
          first_referral_code = COALESCE(first_referral_code, _code)
      WHERE visitor_id = _visitor_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'active', is_active,
    'staff_name', s.full_name,
    'first_name', split_part(s.full_name, ' ', 1),
    'code', _code,
    'counted', inserted_scan
  );
END $function$;


-- ============================================================================
-- SOURCE MIGRATION: 20260512041821_2d0a7a68-1cf7-4345-a03c-5ba714443c7c.sql
-- ============================================================================
-- Storage RLS for qr-codes bucket: admin-only writes, public reads (bucket is already public).
CREATE POLICY "qr-codes admin insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'qr-codes' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "qr-codes admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'qr-codes' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'qr-codes' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "qr-codes admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'qr-codes' AND public.has_role(auth.uid(), 'admin'::public.app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260512044820_214707b8-961e-4280-ac70-df449d5fc43f.sql
-- ============================================================================

-- referral_redemptions tracks discounts applied at checkout for referred users
CREATE TABLE IF NOT EXISTS public.referral_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  staff_referral_id uuid NOT NULL,
  promotion_id uuid NOT NULL,
  referral_code text NOT NULL,
  kind text NOT NULL,                                -- 'subscription' | 'listing' | 'upgrade' | 'boost' | 'other'
  applies_to text NOT NULL,                          -- snapshot of promo applies_to at time of redemption
  subscription_id uuid,
  payment_id uuid,
  listing_id uuid,
  base_amount_php numeric NOT NULL,
  discount_amount_php numeric NOT NULL DEFAULT 0,
  final_amount_php numeric NOT NULL,
  percent_off numeric,
  flat_amount_php numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_redemptions_user ON public.referral_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_staff ON public.referral_redemptions(staff_referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_promo ON public.referral_redemptions(promotion_id);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_subscription ON public.referral_redemptions(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_payment ON public.referral_redemptions(payment_id) WHERE payment_id IS NOT NULL;

ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage referral_redemptions"
  ON public.referral_redemptions FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Sales read referral_redemptions"
  ON public.referral_redemptions FOR SELECT
  USING (has_role(auth.uid(),'sales'::app_role));

CREATE POLICY "Users read own redemptions"
  ON public.referral_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff read own redemptions"
  ON public.referral_redemptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = referral_redemptions.staff_referral_id
      AND (s.staff_user_id = auth.uid()
           OR lower(s.email) = lower(coalesce(auth.jwt() ->> 'email','')))
  ));

-- Pick best active promo for a given user + kind
CREATE OR REPLACE FUNCTION public.pick_referral_promo(_user_id uuid, _kind text, _base_amount numeric)
RETURNS TABLE(
  promotion_id uuid,
  staff_referral_id uuid,
  referral_code text,
  applies_to text,
  percent_off numeric,
  flat_amount_php numeric,
  discount_amount_php numeric,
  final_amount_php numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ur public.user_referrals%ROWTYPE;
BEGIN
  SELECT * INTO ur FROM public.user_referrals WHERE user_id = _user_id;
  IF NOT FOUND OR ur.referred_by_staff_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT p.*,
           LEAST(
             COALESCE(_base_amount * (p.percent_off/100.0), 0)
             + COALESCE(p.flat_amount_php, 0),
             _base_amount
           ) AS disc
    FROM public.staff_promotions p
    WHERE p.staff_referral_id = ur.referred_by_staff_id
      AND p.active = true
      AND (p.starts_at IS NULL OR p.starts_at <= now())
      AND (p.ends_at IS NULL OR p.ends_at >= now())
      AND (p.applies_to = 'any' OR p.applies_to = _kind)
  )
  SELECT c.id, ur.referred_by_staff_id, ur.credited_referral_code,
         c.applies_to, c.percent_off, c.flat_amount_php,
         ROUND(c.disc, 2) AS discount_amount_php,
         GREATEST(_base_amount - ROUND(c.disc, 2), 0) AS final_amount_php
  FROM candidates c
  ORDER BY c.disc DESC
  LIMIT 1;
END $$;

-- Record a redemption for the current user
CREATE OR REPLACE FUNCTION public.apply_referral_redemption(
  _kind text,
  _base_amount numeric,
  _subscription_id uuid DEFAULT NULL,
  _payment_id uuid DEFAULT NULL,
  _listing_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  pick record;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  SELECT * INTO pick FROM public.pick_referral_promo(uid, _kind, _base_amount);
  IF pick.promotion_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_promo', 'base_amount_php', _base_amount, 'final_amount_php', _base_amount);
  END IF;

  INSERT INTO public.referral_redemptions(
    user_id, staff_referral_id, promotion_id, referral_code, kind, applies_to,
    subscription_id, payment_id, listing_id,
    base_amount_php, discount_amount_php, final_amount_php,
    percent_off, flat_amount_php, metadata
  ) VALUES (
    uid, pick.staff_referral_id, pick.promotion_id, pick.referral_code, _kind, pick.applies_to,
    _subscription_id, _payment_id, _listing_id,
    _base_amount, pick.discount_amount_php, pick.final_amount_php,
    pick.percent_off, pick.flat_amount_php, COALESCE(_metadata,'{}'::jsonb)
  ) RETURNING id INTO new_id;

  RETURN jsonb_build_object(
    'ok', true,
    'redemption_id', new_id,
    'promotion_id', pick.promotion_id,
    'referral_code', pick.referral_code,
    'percent_off', pick.percent_off,
    'flat_amount_php', pick.flat_amount_php,
    'discount_amount_php', pick.discount_amount_php,
    'base_amount_php', _base_amount,
    'final_amount_php', pick.final_amount_php
  );
END $$;

-- Preview helper (read-only) usable by clients
CREATE OR REPLACE FUNCTION public.preview_referral_discount(_kind text, _base_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  pick record;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  SELECT * INTO pick FROM public.pick_referral_promo(uid, _kind, _base_amount);
  IF pick.promotion_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'final_amount_php', _base_amount, 'base_amount_php', _base_amount);
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'promotion_id', pick.promotion_id,
    'referral_code', pick.referral_code,
    'percent_off', pick.percent_off,
    'flat_amount_php', pick.flat_amount_php,
    'discount_amount_php', pick.discount_amount_php,
    'base_amount_php', _base_amount,
    'final_amount_php', pick.final_amount_php,
    'applies_to', pick.applies_to
  );
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260512050915_de9fd8bd-5aec-4ebc-95ed-e4d4fe125d16.sql
-- ============================================================================
-- Currencies table for multi-currency display
CREATE TABLE IF NOT EXISTS public.currencies (
  code text PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  rate_to_php numeric NOT NULL CHECK (rate_to_php > 0),
  decimals smallint NOT NULL DEFAULT 2,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  auto_update boolean NOT NULL DEFAULT true,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Currencies public read" ON public.currencies;
CREATE POLICY "Currencies public read" ON public.currencies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage currencies" ON public.currencies;
CREATE POLICY "Admins manage currencies" ON public.currencies
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed rates. rate_to_php = how many PHP per 1 unit of the currency.
-- Approximate snapshot; the FX refresher will keep them current.
INSERT INTO public.currencies (code, name, symbol, rate_to_php, decimals, sort_order) VALUES
  ('PHP', 'Philippine Peso',   '₱',  1.0,      2, 0),
  ('USD', 'US Dollar',          '$',  57.50,   2, 1),
  ('EUR', 'Euro',               '€',  62.00,   2, 2),
  ('JPY', 'Japanese Yen',       '¥',   0.37,   0, 3),
  ('SGD', 'Singapore Dollar',   'S$', 42.30,   2, 4),
  ('AED', 'UAE Dirham',         'د.إ',15.65,   2, 5),
  ('AUD', 'Australian Dollar',  'A$', 37.80,   2, 6),
  ('GBP', 'British Pound',      '£',  72.50,   2, 7)
ON CONFLICT (code) DO NOTHING;

-- Bulk upsert RPC, callable by service role from the FX refresher
CREATE OR REPLACE FUNCTION public.upsert_currency_rates(_rates jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n int := 0;
BEGIN
  -- Only service role can call this (RLS bypass intentional for cron-driven refresh)
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR r IN
    SELECT (e->>'code')::text AS code, (e->>'rate_to_php')::numeric AS rate
    FROM jsonb_array_elements(_rates) e
  LOOP
    UPDATE public.currencies
       SET rate_to_php = r.rate,
           last_updated_at = now()
     WHERE code = r.code AND auto_update = true AND rate > 0;
    IF FOUND THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260512054457_90aac1ba-c3f0-48ff-a9b4-06739ddd2108.sql
-- ============================================================================

-- Business types (seed)
CREATE TABLE public.business_types (
  slug text PRIMARY KEY,
  label text NOT NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0
);
ALTER TABLE public.business_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business types public read" ON public.business_types FOR SELECT USING (true);
CREATE POLICY "Admins manage business types" ON public.business_types FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.business_types(slug,label,icon,sort_order) VALUES
  ('dealership','Dealerships','Store',10),
  ('repair_shop','Repair & service shops','Wrench',20),
  ('parts_accessories','Parts & accessories','Cog',30),
  ('towing','Towing & roadside','Truck',40),
  ('insurance','Insurance','ShieldCheck',50);

-- Business tags (seed)
CREATE TABLE public.business_tags (
  slug text PRIMARY KEY,
  label text NOT NULL,
  type_slug text REFERENCES public.business_types(slug) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0
);
ALTER TABLE public.business_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business tags public read" ON public.business_tags FOR SELECT USING (true);
CREATE POLICY "Admins manage business tags" ON public.business_tags FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.business_tags(slug,label,type_slug,sort_order) VALUES
  ('cars','Cars','dealership',1),
  ('motorcycles','Motorcycles','dealership',2),
  ('trucks','Trucks','dealership',3),
  ('used','Pre-owned','dealership',4),
  ('new','Brand new','dealership',5),
  ('oil-change','Oil change','repair_shop',1),
  ('body-paint','Body & paint','repair_shop',2),
  ('aircon','Aircon service','repair_shop',3),
  ('tires','Tires & alignment','repair_shop',4),
  ('detailing','Detailing','repair_shop',5),
  ('electrical','Auto electrical','repair_shop',6),
  ('oem-parts','OEM parts','parts_accessories',1),
  ('aftermarket','Aftermarket','parts_accessories',2),
  ('batteries','Batteries','parts_accessories',3),
  ('accessories','Accessories','parts_accessories',4),
  ('flatbed','Flatbed','towing',1),
  ('heavy-duty','Heavy duty','towing',2),
  ('motorcycle-towing','Motorcycle towing','towing',3),
  ('roadside','Roadside assistance','towing',4),
  ('ctpl','CTPL','insurance',1),
  ('comprehensive','Comprehensive','insurance',2),
  ('motorcycle-insurance','Motorcycle insurance','insurance',3),
  ('24-7','Open 24/7',NULL,90),
  ('home-service','Home service',NULL,91),
  ('warranty','Warranty offered',NULL,92),
  ('cashless','Cashless transactions',NULL,93);

-- Businesses
CREATE TYPE business_status AS ENUM ('pending','active','rejected','hidden');

CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  type_slug text NOT NULL REFERENCES public.business_types(slug),
  description text,
  logo_url text,
  cover_url text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  phone text,
  email text,
  website text,
  messenger_url text,
  hours jsonb,
  region text,
  province text,
  city text,
  barangay text,
  street_address text,
  lat numeric,
  lng numeric,
  status business_status NOT NULL DEFAULT 'pending',
  featured boolean NOT NULL DEFAULT false,
  rating_avg numeric NOT NULL DEFAULT 0,
  rating_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_businesses_status ON public.businesses(status);
CREATE INDEX idx_businesses_type ON public.businesses(type_slug);
CREATE INDEX idx_businesses_region ON public.businesses(region);
CREATE INDEX idx_businesses_province ON public.businesses(province);
CREATE INDEX idx_businesses_city ON public.businesses(city);
CREATE INDEX idx_businesses_owner ON public.businesses(owner_id);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active businesses public read" ON public.businesses FOR SELECT
  USING (status = 'active' OR auth.uid() = owner_id OR can_moderate(auth.uid()));
CREATE POLICY "Owners insert businesses" ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id AND status = 'pending');
CREATE POLICY "Owners update own businesses" ON public.businesses FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id AND status <> 'active' AND featured = false);
CREATE POLICY "Owners delete own businesses" ON public.businesses FOR DELETE
  USING (auth.uid() = owner_id);
CREATE POLICY "Moderators manage businesses" ON public.businesses FOR ALL
  USING (can_moderate(auth.uid())) WITH CHECK (can_moderate(auth.uid()));

CREATE TRIGGER set_businesses_updated_at BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Tag links
CREATE TABLE public.business_tag_links (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tag_slug text NOT NULL REFERENCES public.business_tags(slug) ON DELETE CASCADE,
  PRIMARY KEY (business_id, tag_slug)
);
ALTER TABLE public.business_tag_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tag links public read" ON public.business_tag_links FOR SELECT USING (true);
CREATE POLICY "Owners manage own tag links" ON public.business_tag_links FOR ALL
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));
CREATE POLICY "Moderators manage tag links" ON public.business_tag_links FOR ALL
  USING (can_moderate(auth.uid())) WITH CHECK (can_moderate(auth.uid()));

-- Reviews
CREATE TABLE public.business_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active reviews public read" ON public.business_reviews FOR SELECT
  USING (status = 'active' OR auth.uid() = user_id OR can_moderate(auth.uid()));
CREATE POLICY "Users insert own review" ON public.business_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own review" ON public.business_reviews FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own review" ON public.business_reviews FOR DELETE
  USING (auth.uid() = user_id);
CREATE POLICY "Moderators manage reviews" ON public.business_reviews FOR ALL
  USING (can_moderate(auth.uid())) WITH CHECK (can_moderate(auth.uid()));

CREATE TRIGGER set_business_reviews_updated_at BEFORE UPDATE ON public.business_reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Rating aggregate trigger
CREATE OR REPLACE FUNCTION public.tg_business_recompute_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target uuid := COALESCE(NEW.business_id, OLD.business_id);
BEGIN
  UPDATE public.businesses b
  SET rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.business_reviews WHERE business_id = target AND status = 'active'), 0),
      rating_count = (SELECT COUNT(*) FROM public.business_reviews WHERE business_id = target AND status = 'active')
  WHERE b.id = target;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_business_reviews_aggregate
AFTER INSERT OR UPDATE OR DELETE ON public.business_reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_business_recompute_rating();


-- ============================================================================
-- SOURCE MIGRATION: 20260512070133_69984fa7-f47e-4aea-8744-9a16f730827f.sql
-- ============================================================================
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS postal_code text;


-- ============================================================================
-- SOURCE MIGRATION: 20260512071955_7309943a-34a5-4e6d-a9ee-315cb2cdb12b.sql
-- ============================================================================

-- Helper to generate a unique referral code from a name
CREATE OR REPLACE FUNCTION public.gen_referral_code(_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  i int := 0;
BEGIN
  base := lower(regexp_replace(COALESCE(_name, 'staff'), '[^a-zA-Z0-9]+', '', 'g'));
  IF base = '' THEN base := 'staff'; END IF;
  base := substr(base, 1, 12);
  LOOP
    candidate := base || lpad((100 + floor(random() * 900))::int::text, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.staff_referrals WHERE referral_code = candidate);
    i := i + 1;
    IF i > 20 THEN
      candidate := base || extract(epoch from now())::bigint::text;
      EXIT;
    END IF;
  END LOOP;
  RETURN candidate;
END $$;

-- Sync all staff (anyone with a role other than 'user') into staff_referrals
CREATE OR REPLACE FUNCTION public.sync_staff_referrals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  inserted int := 0;
  uname text;
  uemail text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR r IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role::text <> 'user'
      AND NOT EXISTS (
        SELECT 1 FROM public.staff_referrals s WHERE s.staff_user_id = ur.user_id
      )
  LOOP
    SELECT au.email INTO uemail FROM auth.users au WHERE au.id = r.user_id;
    SELECT COALESCE(NULLIF(p.full_name,''), uemail) INTO uname FROM public.profiles p WHERE p.id = r.user_id;
    IF uemail IS NULL THEN CONTINUE; END IF;
    -- skip if email already used
    IF EXISTS (SELECT 1 FROM public.staff_referrals WHERE lower(email) = lower(uemail)) THEN
      UPDATE public.staff_referrals SET staff_user_id = r.user_id WHERE lower(email) = lower(uemail) AND staff_user_id IS NULL;
      CONTINUE;
    END IF;
    INSERT INTO public.staff_referrals(staff_user_id, email, full_name, referral_code, active)
    VALUES (r.user_id, lower(uemail), COALESCE(uname, uemail), public.gen_referral_code(uname), true);
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END $$;

-- Trigger: when a staff role is granted, create a referral row
CREATE OR REPLACE FUNCTION public.tg_create_staff_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uemail text;
  uname text;
BEGIN
  IF NEW.role::text = 'user' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.staff_referrals WHERE staff_user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  SELECT email INTO uemail FROM auth.users WHERE id = NEW.user_id;
  SELECT COALESCE(NULLIF(full_name,''), uemail) INTO uname FROM public.profiles WHERE id = NEW.user_id;
  IF uemail IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.staff_referrals WHERE lower(email) = lower(uemail)) THEN
    UPDATE public.staff_referrals SET staff_user_id = NEW.user_id WHERE lower(email) = lower(uemail) AND staff_user_id IS NULL;
    RETURN NEW;
  END IF;
  INSERT INTO public.staff_referrals(staff_user_id, email, full_name, referral_code, active)
  VALUES (NEW.user_id, lower(uemail), COALESCE(uname, uemail), public.gen_referral_code(uname), true);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_create_staff_referral ON public.user_roles;
CREATE TRIGGER trg_create_staff_referral
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.tg_create_staff_referral();

-- Backfill existing staff/admins
DO $$
DECLARE
  r record;
  uemail text;
  uname text;
BEGIN
  FOR r IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role::text <> 'user'
      AND NOT EXISTS (SELECT 1 FROM public.staff_referrals s WHERE s.staff_user_id = ur.user_id)
  LOOP
    SELECT email INTO uemail FROM auth.users WHERE id = r.user_id;
    SELECT COALESCE(NULLIF(full_name,''), uemail) INTO uname FROM public.profiles WHERE id = r.user_id;
    IF uemail IS NULL THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM public.staff_referrals WHERE lower(email) = lower(uemail)) THEN
      UPDATE public.staff_referrals SET staff_user_id = r.user_id WHERE lower(email) = lower(uemail) AND staff_user_id IS NULL;
      CONTINUE;
    END IF;
    INSERT INTO public.staff_referrals(staff_user_id, email, full_name, referral_code, active)
    VALUES (r.user_id, lower(uemail), COALESCE(uname, uemail), public.gen_referral_code(uname), true);
  END LOOP;
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260512100854_68ca1079-f761-4859-9bb7-e42aaac54f01.sql
-- ============================================================================

-- Audit log for staff referral changes
CREATE TABLE public.staff_referral_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_referral_id uuid,
  staff_email text,
  actor_id uuid,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sr_audit_staff ON public.staff_referral_audit(staff_referral_id, created_at DESC);
CREATE INDEX idx_sr_audit_created ON public.staff_referral_audit(created_at DESC);

ALTER TABLE public.staff_referral_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read sr audit" ON public.staff_referral_audit
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert sr audit" ON public.staff_referral_audit
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = actor_id);

-- Trigger logs activate/deactivate and qr regeneration
CREATE OR REPLACE FUNCTION public.tg_staff_referral_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.active IS DISTINCT FROM OLD.active THEN
    INSERT INTO public.staff_referral_audit(staff_referral_id, staff_email, actor_id, action, details)
    VALUES (NEW.id, NEW.email, auth.uid(),
      CASE WHEN NEW.active THEN 'activated' ELSE 'deactivated' END,
      jsonb_build_object('referral_code', NEW.referral_code, 'full_name', NEW.full_name));
  END IF;
  IF NEW.qr_storage_path IS DISTINCT FROM OLD.qr_storage_path AND NEW.qr_storage_path IS NOT NULL THEN
    INSERT INTO public.staff_referral_audit(staff_referral_id, staff_email, actor_id, action, details)
    VALUES (NEW.id, NEW.email, auth.uid(), 'qr_generated',
      jsonb_build_object('referral_code', NEW.referral_code, 'storage_path', NEW.qr_storage_path));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER staff_referral_audit_trg
AFTER UPDATE ON public.staff_referrals
FOR EACH ROW EXECUTE FUNCTION public.tg_staff_referral_audit();

-- Trigger logs creation
CREATE OR REPLACE FUNCTION public.tg_staff_referral_audit_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff_referral_audit(staff_referral_id, staff_email, actor_id, action, details)
  VALUES (NEW.id, NEW.email, auth.uid(), 'created',
    jsonb_build_object('referral_code', NEW.referral_code, 'full_name', NEW.full_name, 'active', NEW.active));
  RETURN NEW;
END $$;

CREATE TRIGGER staff_referral_audit_insert_trg
AFTER INSERT ON public.staff_referrals
FOR EACH ROW EXECUTE FUNCTION public.tg_staff_referral_audit_insert();


-- ============================================================================
-- SOURCE MIGRATION: 20260513133043_5dfec6a3-6eca-4a03-8ee7-681496b8458c.sql
-- ============================================================================
-- Audit log for admin changes to user roles and verification status
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL, -- 'role_granted','role_revoked','verification_changed','seller_type_changed'
  field text NOT NULL,  -- 'role','verification_status','seller_type'
  old_value text,
  new_value text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_target ON public.admin_audit_log (target_user_id, created_at DESC);
CREATE INDEX idx_admin_audit_actor ON public.admin_audit_log (actor_id, created_at DESC);
CREATE INDEX idx_admin_audit_created ON public.admin_audit_log (created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read admin audit"
  ON public.admin_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Support read admin audit"
  ON public.admin_audit_log FOR SELECT
  USING (can_support(auth.uid()));

CREATE POLICY "Admins write admin audit"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = actor_id);


-- ============================================================================
-- SOURCE MIGRATION: 20260518040611_63cdca37-d85e-43c5-b2c3-71c43d5fb476.sql
-- ============================================================================

-- Lock down public storage buckets so users can only write to their own user_id/ prefix.
-- Public SELECT remains open for all public buckets (listings, avatars, business logos, QR codes
-- need to be readable by anyone to render). Admins retain full write access to qr-codes since
-- staff QR posters are stored under a flat path (e.g. <row_id>.png).

-- =====================
-- listing-photos
-- =====================
DROP POLICY IF EXISTS "listing-photos public read" ON storage.objects;
DROP POLICY IF EXISTS "listing-photos owner insert" ON storage.objects;
DROP POLICY IF EXISTS "listing-photos owner update" ON storage.objects;
DROP POLICY IF EXISTS "listing-photos owner delete" ON storage.objects;

CREATE POLICY "listing-photos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-photos');

CREATE POLICY "listing-photos owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "listing-photos owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "listing-photos owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================
-- listing-videos
-- =====================
DROP POLICY IF EXISTS "listing-videos public read" ON storage.objects;
DROP POLICY IF EXISTS "listing-videos owner insert" ON storage.objects;
DROP POLICY IF EXISTS "listing-videos owner update" ON storage.objects;
DROP POLICY IF EXISTS "listing-videos owner delete" ON storage.objects;

CREATE POLICY "listing-videos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-videos');

CREATE POLICY "listing-videos owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "listing-videos owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "listing-videos owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================
-- avatars
-- =====================
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "avatars owner insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars owner update" ON storage.objects;
DROP POLICY IF EXISTS "avatars owner delete" ON storage.objects;

CREATE POLICY "avatars public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================
-- business-logos
-- =====================
DROP POLICY IF EXISTS "business-logos public read" ON storage.objects;
DROP POLICY IF EXISTS "business-logos owner insert" ON storage.objects;
DROP POLICY IF EXISTS "business-logos owner update" ON storage.objects;
DROP POLICY IF EXISTS "business-logos owner delete" ON storage.objects;

CREATE POLICY "business-logos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-logos');

CREATE POLICY "business-logos owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "business-logos owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "business-logos owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================
-- qr-codes
-- Public read. Writes: admins (staff QR posters) OR owner-prefix uploads.
-- =====================
DROP POLICY IF EXISTS "qr-codes public read" ON storage.objects;
DROP POLICY IF EXISTS "qr-codes admin or owner insert" ON storage.objects;
DROP POLICY IF EXISTS "qr-codes admin or owner update" ON storage.objects;
DROP POLICY IF EXISTS "qr-codes admin or owner delete" ON storage.objects;

CREATE POLICY "qr-codes public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'qr-codes');

CREATE POLICY "qr-codes admin or owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'qr-codes'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "qr-codes admin or owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'qr-codes'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  )
  WITH CHECK (
    bucket_id = 'qr-codes'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "qr-codes admin or owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'qr-codes'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );


-- ============================================================================
-- SOURCE MIGRATION: 20260518044545_abd1298a-af7d-446a-af5e-80dd161af929.sql
-- ============================================================================

-- ============================================================
-- 1. Storage: drop broad public SELECT (anon LIST) on public buckets
-- ============================================================
-- Bucket-level "public" flag still allows anonymous GET via
-- /storage/v1/object/public/{bucket}/{path}. RLS SELECT on
-- storage.objects only governs LIST and signed-URL flows.
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "business-logos public read" ON storage.objects;
DROP POLICY IF EXISTS "listing-photos public read" ON storage.objects;
DROP POLICY IF EXISTS "listing-videos public read" ON storage.objects;
DROP POLICY IF EXISTS "qr-codes public read" ON storage.objects;

-- ============================================================
-- 2. SECURITY DEFINER: revoke from anon/public
-- ============================================================
-- Trigger functions are fired by Postgres internally and don't
-- need EXECUTE granted to roles. Revoke from anon + public.
REVOKE EXECUTE ON FUNCTION public.attach_signup_referral() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tg_business_recompute_rating() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tg_staff_referral_audit() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tg_staff_referral_audit_insert() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tg_create_staff_referral() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.gen_referral_code(text) FROM anon, public;

-- Helper that should only be invoked by other security-definer
-- functions (apply_referral_redemption, preview_referral_discount).
REVOKE EXECUTE ON FUNCTION public.pick_referral_promo(uuid, text, numeric) FROM anon, public;

-- Admin-only management functions.
REVOKE EXECUTE ON FUNCTION public.sync_staff_referrals() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.sync_staff_referrals() TO authenticated;

-- Service-role-only (cron-driven currency refresh).
REVOKE EXECUTE ON FUNCTION public.upsert_currency_rates(jsonb) FROM anon, public, authenticated;
GRANT  EXECUTE ON FUNCTION public.upsert_currency_rates(jsonb) TO service_role;

-- Authenticated-only: discount preview + redemption.
REVOKE EXECUTE ON FUNCTION public.preview_referral_discount(text, numeric) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.preview_referral_discount(text, numeric) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.apply_referral_redemption(text, numeric, uuid, uuid, uuid, jsonb) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.apply_referral_redemption(text, numeric, uuid, uuid, uuid, jsonb) TO authenticated;

-- Intentionally KEEP anon EXECUTE on:
--   * record_qr_scan(...)  -> QR landing page is visited by anonymous users.
--   * increment_listing_view(...) -> Anonymous listing view counter.
--   * has_role / can_* / current_plan_tier / is_*  -> Read-only role checks.


-- ============================================================================
-- SOURCE MIGRATION: 20260518070132_6d00d33a-e6c7-497f-b015-486b9d604cc1.sql
-- ============================================================================
-- 1. Storage: remove broad QR-codes listing policy (bucket is still public, getPublicUrl works)
DROP POLICY IF EXISTS "QR codes public read" ON storage.objects;

-- 2. Revoke EXECUTE on internal functions from anon/authenticated/public
-- Trigger-only functions (fired by triggers, never called directly)
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'assign_founding_member','attach_signup_referral','enforce_ad_inquiry_status_transitions',
    'enforce_free_listing_quota','enforce_tow_status_transitions','grant_founding_bronze',
    'handle_new_user','handle_tow_bid_accepted','notify_tow_status_change',
    'notify_towing_providers','on_ad_inquiry_created','on_ad_inquiry_reply',
    'sync_profile_verification','tg_audit_ad_inquiry','tg_business_recompute_rating',
    'tg_create_staff_referral','tg_org_add_creator_as_owner','tg_staff_referral_audit',
    'tg_staff_referral_audit_insert','validate_ad_inquiry',
    -- Server / cron-only
    'enqueue_email','read_email_batch','delete_email','move_to_dlq',
    'expire_stale_pending_sales','upsert_currency_rates',
    -- Internal helpers (called by other SECURITY DEFINER fns)
    'gen_referral_code','pick_referral_promo'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      -- some have non-default signatures or may not exist; skip silently
      NULL;
    END;
  END LOOP;
END $$;

-- Handle functions with specific signatures explicitly
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_currency_rates(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pick_referral_promo(uuid, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gen_referral_code(text) FROM PUBLIC, anon, authenticated;

-- 3. Tighten ad_inquiries insert: keep public form open, but reject malformed payloads via existing validate trigger
-- Ensure validation trigger fires BEFORE insert (idempotent)
DROP TRIGGER IF EXISTS trg_validate_ad_inquiry ON public.ad_inquiries;
CREATE TRIGGER trg_validate_ad_inquiry
  BEFORE INSERT OR UPDATE ON public.ad_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.validate_ad_inquiry();

-- 4. Ensure ad_inquiry status-transition + audit triggers are wired
DROP TRIGGER IF EXISTS trg_enforce_ad_inquiry_status ON public.ad_inquiries;
CREATE TRIGGER trg_enforce_ad_inquiry_status
  BEFORE UPDATE ON public.ad_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ad_inquiry_status_transitions();

DROP TRIGGER IF EXISTS trg_audit_ad_inquiry ON public.ad_inquiries;
CREATE TRIGGER trg_audit_ad_inquiry
  AFTER INSERT OR UPDATE ON public.ad_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_ad_inquiry();

DROP TRIGGER IF EXISTS trg_ad_inquiry_created_email ON public.ad_inquiries;
CREATE TRIGGER trg_ad_inquiry_created_email
  AFTER INSERT ON public.ad_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.on_ad_inquiry_created();


-- ============================================================================
-- SOURCE MIGRATION: 20260518070316_7f6c1e1d-f205-4f57-b602-f3a7266ec0c0.sql
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule if previously set (idempotent)
DO $$ BEGIN
  PERFORM cron.unschedule('expire-stale-pending-sales');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM cron.unschedule('refresh-fx-rates');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Daily: expire stale pending sales at 02:00 UTC
SELECT cron.schedule(
  'expire-stale-pending-sales',
  '0 2 * * *',
  $$ SELECT public.expire_stale_pending_sales(); $$
);

-- Daily: refresh FX rates at 03:00 UTC
SELECT cron.schedule(
  'refresh-fx-rates',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--0738c881-614d-4885-8d75-1b7c90e0835e.lovable.app/api/public/fx/refresh',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmanJuanlyb3h2bHlkYWp2bmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTc4MDcsImV4cCI6MjA5MzIzMzgwN30.5jA3w00xtR3Y975XYk4Tks4j82NpOA8XXNiB8XLYiSE"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);


-- ============================================================================
-- SOURCE MIGRATION: 20260518080908_05491b24-c7ae-411a-830c-f4b67980beac.sql
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_intent text,
  ADD COLUMN IF NOT EXISTS signup_city text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_signup_intent_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_signup_intent_check
  CHECK (signup_intent IS NULL OR signup_intent IN ('buyer','private_seller','business','service_provider'));


-- ============================================================================
-- SOURCE MIGRATION: 20260518090328_5b38b226-8d4a-44e4-839e-1b58dbdf1ab6.sql
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_first text := NULLIF(m->>'first_name', '');
  v_last  text := NULLIF(m->>'last_name', '');
  v_full  text := NULLIF(m->>'full_name', '');
  v_intent text := NULLIF(m->>'signup_intent', '');
  v_business_name text := NULLIF(m->>'business_name', '');
  v_business_address text := NULLIF(m->>'business_address', '');
  v_city text := NULLIF(m->>'signup_city', '');
  v_region text := NULLIF(m->>'signup_region', '');
  v_province text := NULLIF(m->>'signup_province', '');
  v_phone text := NULLIF(m->>'phone', '');
  v_seller_type seller_type := CASE
    WHEN v_intent IN ('business','service_provider') THEN 'dealer'::seller_type
    ELSE 'private'::seller_type
  END;
BEGIN
  IF v_full IS NULL AND (v_first IS NOT NULL OR v_last IS NOT NULL) THEN
    v_full := trim(concat_ws(' ', v_first, v_last));
  END IF;
  IF v_full IS NULL THEN
    v_full := NEW.email;
  END IF;

  INSERT INTO public.profiles (
    id, full_name, first_name, last_name, phone,
    signup_intent, signup_city,
    business_name, business_address, business_region, business_province, business_city,
    seller_type
  ) VALUES (
    NEW.id, v_full, v_first, v_last, v_phone,
    v_intent, v_city,
    v_business_name, v_business_address, v_region, v_province, v_city,
    v_seller_type
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $function$;


-- ============================================================================
-- SOURCE MIGRATION: 20260518111709_2eec0c15-3766-4b5b-bc71-05ef0b45ec15.sql
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_region   text,
  ADD COLUMN IF NOT EXISTS signup_province text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_first text := NULLIF(m->>'first_name', '');
  v_last  text := NULLIF(m->>'last_name', '');
  v_full  text := NULLIF(m->>'full_name', '');
  v_intent text := NULLIF(m->>'signup_intent', '');
  v_business_name text := NULLIF(m->>'business_name', '');
  v_business_address text := NULLIF(m->>'business_address', '');
  v_business_kind_raw text := NULLIF(m->>'business_kind', '');
  v_business_kind business_kind := NULL;
  v_city text := NULLIF(m->>'signup_city', '');
  v_region text := NULLIF(m->>'signup_region', '');
  v_province text := NULLIF(m->>'signup_province', '');
  v_phone text := NULLIF(m->>'phone', '');
  v_phone_e164 text := NULL;
  v_phone_digits text;
  v_is_business boolean := v_intent IN ('business','service_provider');
  v_seller_type seller_type := CASE WHEN v_is_business THEN 'dealer'::seller_type ELSE 'private'::seller_type END;
BEGIN
  IF v_full IS NULL AND (v_first IS NOT NULL OR v_last IS NOT NULL) THEN
    v_full := trim(concat_ws(' ', v_first, v_last));
  END IF;
  IF v_full IS NULL THEN
    v_full := NEW.email;
  END IF;

  -- Normalize PH phone to E.164
  IF v_phone IS NOT NULL THEN
    v_phone_digits := regexp_replace(v_phone, '[^0-9+]', '', 'g');
    IF v_phone_digits LIKE '+%' THEN
      v_phone_e164 := v_phone_digits;
    ELSIF v_phone_digits LIKE '09%' AND length(v_phone_digits) = 11 THEN
      v_phone_e164 := '+63' || substring(v_phone_digits from 2);
    ELSIF v_phone_digits LIKE '9%' AND length(v_phone_digits) = 10 THEN
      v_phone_e164 := '+63' || v_phone_digits;
    ELSIF v_phone_digits LIKE '63%' AND length(v_phone_digits) = 12 THEN
      v_phone_e164 := '+' || v_phone_digits;
    END IF;
  END IF;

  -- Safely cast business_kind
  IF v_is_business AND v_business_kind_raw IS NOT NULL THEN
    BEGIN
      v_business_kind := v_business_kind_raw::business_kind;
    EXCEPTION WHEN others THEN
      v_business_kind := NULL;
    END;
  END IF;

  INSERT INTO public.profiles (
    id, full_name, first_name, last_name, phone, phone_e164,
    signup_intent, signup_city, signup_region, signup_province,
    business_name, business_address, business_region, business_province, business_city,
    business_kind, seller_type
  ) VALUES (
    NEW.id, v_full, v_first, v_last, v_phone, v_phone_e164,
    v_intent, v_city, v_region, v_province,
    CASE WHEN v_is_business THEN v_business_name END,
    CASE WHEN v_is_business THEN v_business_address END,
    CASE WHEN v_is_business THEN v_region END,
    CASE WHEN v_is_business THEN v_province END,
    CASE WHEN v_is_business THEN v_city END,
    v_business_kind,
    v_seller_type
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $function$;


-- ============================================================================
-- SOURCE MIGRATION: 20260518111807_f68c8958-66eb-4605-a869-c0508088967b.sql
-- ============================================================================
ALTER TYPE business_kind ADD VALUE IF NOT EXISTS 'parts_shop';
ALTER TYPE business_kind ADD VALUE IF NOT EXISTS 'towing';
ALTER TYPE business_kind ADD VALUE IF NOT EXISTS 'body_shop';
ALTER TYPE business_kind ADD VALUE IF NOT EXISTS 'carwash';
ALTER TYPE business_kind ADD VALUE IF NOT EXISTS 'salvage';
ALTER TYPE business_kind ADD VALUE IF NOT EXISTS 'rental';


-- ============================================================================
-- SOURCE MIGRATION: 20260518122003_adc25d79-b45b-40e8-8e5f-fbe488772375.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_first text := NULLIF(m->>'first_name', '');
  v_last  text := NULLIF(m->>'last_name', '');
  v_full  text := NULLIF(m->>'full_name', '');
  v_intent text := NULLIF(m->>'signup_intent', '');
  v_business_name text := NULLIF(m->>'business_name', '');
  v_business_address text := NULLIF(m->>'business_address', '');
  v_business_kind_raw text := NULLIF(m->>'business_kind', '');
  v_business_kind business_kind := NULL;
  v_city text := NULLIF(m->>'signup_city', '');
  v_region text := NULLIF(m->>'signup_region', '');
  v_province text := NULLIF(m->>'signup_province', '');
  v_phone text := NULLIF(m->>'phone', '');
  v_phone_e164 text := NULL;
  v_phone_digits text;
  v_is_business boolean := v_intent IN ('business','service_provider');
  v_seller_type seller_type := CASE WHEN v_is_business THEN 'business'::seller_type ELSE 'private'::seller_type END;
BEGIN
  IF v_full IS NULL AND (v_first IS NOT NULL OR v_last IS NOT NULL) THEN
    v_full := trim(concat_ws(' ', v_first, v_last));
  END IF;
  IF v_full IS NULL THEN
    v_full := NEW.email;
  END IF;

  IF v_phone IS NOT NULL THEN
    v_phone_digits := regexp_replace(v_phone, '[^0-9+]', '', 'g');
    IF v_phone_digits LIKE '+%' THEN
      v_phone_e164 := v_phone_digits;
    ELSIF v_phone_digits LIKE '09%' AND length(v_phone_digits) = 11 THEN
      v_phone_e164 := '+63' || substring(v_phone_digits from 2);
    ELSIF v_phone_digits LIKE '9%' AND length(v_phone_digits) = 10 THEN
      v_phone_e164 := '+63' || v_phone_digits;
    ELSIF v_phone_digits LIKE '63%' AND length(v_phone_digits) = 12 THEN
      v_phone_e164 := '+' || v_phone_digits;
    END IF;
  END IF;

  IF v_is_business AND v_business_kind_raw IS NOT NULL THEN
    BEGIN
      v_business_kind := v_business_kind_raw::business_kind;
    EXCEPTION WHEN others THEN
      v_business_kind := NULL;
    END;
  END IF;

  INSERT INTO public.profiles (
    id, full_name, first_name, last_name, phone, phone_e164,
    signup_intent, signup_city, signup_region, signup_province,
    business_name, business_address, business_region, business_province, business_city,
    business_kind, seller_type
  ) VALUES (
    NEW.id, v_full, v_first, v_last, v_phone, v_phone_e164,
    v_intent, v_city, v_region, v_province,
    CASE WHEN v_is_business THEN v_business_name END,
    CASE WHEN v_is_business THEN v_business_address END,
    CASE WHEN v_is_business THEN v_region END,
    CASE WHEN v_is_business THEN v_province END,
    CASE WHEN v_is_business THEN v_city END,
    v_business_kind,
    v_seller_type
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $function$;


-- ============================================================================
-- SOURCE MIGRATION: 20260518130247_f5658d2d-7288-49ba-bfb8-e2591944b5f0.sql
-- ============================================================================

-- 1. Add missing business types
INSERT INTO public.business_types (slug, label, sort_order) VALUES
  ('body_paint','Body & paint shop',25),
  ('carwash','Car wash & detailing',35),
  ('salvage','Salvage / pick-a-part',45)
ON CONFLICT (slug) DO NOTHING;

-- 2. Add columns
ALTER TABLE public.business_tags
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false;

-- 3. Ensure PK on slug
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_tags_pkey') THEN
    BEGIN
      ALTER TABLE public.business_tags ADD PRIMARY KEY (slug);
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;

-- 4. Reseed
INSERT INTO public.business_tags (slug, label, type_slug, category, sort_order, is_popular) VALUES
-- REPAIR SHOP
('oil-change','Oil change','repair_shop','maintenance',1,true),
('tune-up','Tune-up','repair_shop','maintenance',2,true),
('brake-service','Brake service','repair_shop','brakes',3,true),
('brake-rotor','Brake rotor resurfacing','repair_shop','brakes',4,false),
('clutch-replacement','Clutch replacement','repair_shop','drivetrain',5,false),
('timing-belt','Timing belt','repair_shop','engine',6,false),
('timing-chain','Timing chain','repair_shop','engine',7,false),
('water-pump','Water pump','repair_shop','engine',8,false),
('radiator-service','Radiator service','repair_shop','cooling',9,false),
('coolant-flush','Coolant flush','repair_shop','cooling',10,false),
('transmission-flush','Transmission flush','repair_shop','drivetrain',11,false),
('cvt-service','CVT service','repair_shop','drivetrain',12,false),
('at-mt-repair','AT/MT repair','repair_shop','drivetrain',13,false),
('differential-service','Differential service','repair_shop','drivetrain',14,false),
('suspension-service','Suspension service','repair_shop','suspension',15,false),
('shock-strut','Shock & strut','repair_shop','suspension',16,false),
('ball-joints','Ball joints','repair_shop','suspension',17,false),
('tie-rods','Tie rods','repair_shop','suspension',18,false),
('wheel-bearings','Wheel bearings','repair_shop','suspension',19,false),
('alignment','Wheel alignment','repair_shop','wheels',20,true),
('tire-mount-balance','Tire mount & balance','repair_shop','wheels',21,true),
('tpms','TPMS service','repair_shop','wheels',22,false),
('aircon','Aircon service','repair_shop','climate',23,true),
('ac-recharge','AC recharge','repair_shop','climate',24,false),
('ac-compressor','AC compressor','repair_shop','climate',25,false),
('heater-core','Heater core','repair_shop','climate',26,false),
('electrical','Auto electrical','repair_shop','electrical',27,true),
('electrical-diagnostics','Electrical diagnostics','repair_shop','electrical',28,false),
('alternator','Alternator','repair_shop','electrical',29,false),
('starter','Starter','repair_shop','electrical',30,false),
('battery-service','Battery service','repair_shop','electrical',31,true),
('ecu-reflash','ECU scan / reflash','repair_shop','diagnostics',32,false),
('obd-diagnostics','OBD diagnostics','repair_shop','diagnostics',33,false),
('cel-diagnosis','Check-engine light','repair_shop','diagnostics',34,false),
('fuel-system-clean','Fuel system clean','repair_shop','fuel',35,false),
('fuel-pump','Fuel pump','repair_shop','fuel',36,false),
('injectors','Injectors','repair_shop','fuel',37,false),
('egr-clean','EGR clean','repair_shop','fuel',38,false),
('dpf-clean','DPF clean','repair_shop','fuel',39,false),
('turbo-service','Turbo service','repair_shop','engine',40,false),
('engine-overhaul','Engine overhaul','repair_shop','engine',41,false),
('head-gasket','Head gasket','repair_shop','engine',42,false),
('valve-adjustment','Valve adjustment','repair_shop','engine',43,false),
('exhaust-repair','Exhaust repair','repair_shop','exhaust',44,false),
('muffler','Muffler','repair_shop','exhaust',45,false),
('catalytic-converter','Catalytic converter','repair_shop','exhaust',46,false),
('pre-purchase-inspection','Pre-purchase inspection','repair_shop','inspection',47,false),
('lto-inspection','LTO inspection','repair_shop','inspection',48,false),
('emission-test','Emission test prep','repair_shop','inspection',49,false),
('roadside-assist','Roadside assist','repair_shop','mobile',50,false),
('mobile-mechanic','Mobile mechanic','repair_shop','mobile',51,false),
('scope-cars','Cars','repair_shop','vehicle_scope',60,false),
('scope-suvs','SUVs','repair_shop','vehicle_scope',61,false),
('scope-motorcycles','Motorcycles','repair_shop','vehicle_scope',62,false),
('scope-trucks','Trucks','repair_shop','vehicle_scope',63,false),
('scope-vans','Vans','repair_shop','vehicle_scope',64,false),
('scope-diesel','Diesel','repair_shop','vehicle_scope',65,false),
('scope-ev-hybrid','EV / Hybrid','repair_shop','vehicle_scope',66,false),
('scope-heavy-duty','Heavy duty','repair_shop','vehicle_scope',67,false),
-- BODY & PAINT
('collision-repair','Collision repair','body_paint','body',1,true),
('body-paint','Body & paint','body_paint','body',2,true),
('dent-removal-pdr','Dent removal (PDR)','body_paint','body',3,true),
('full-paint','Full paint','body_paint','paint',4,false),
('spot-paint','Spot paint','body_paint','paint',5,false),
('color-matching','Color matching','body_paint','paint',6,false),
('frame-straightening','Frame straightening','body_paint','body',7,false),
('bumper-repair','Bumper repair','body_paint','body',8,false),
('fender-repair','Fender repair','body_paint','body',9,false),
('plastic-welding','Plastic welding','body_paint','body',10,false),
('glass-replacement','Glass replacement','body_paint','glass',11,false),
('windshield-repair','Windshield repair','body_paint','glass',12,false),
('window-tinting','Window tinting','body_paint','glass',13,false),
('tint-removal','Tint removal','body_paint','glass',14,false),
('ceramic-coating','Ceramic coating','body_paint','protection',15,false),
('ppf','Paint protection film (PPF)','body_paint','protection',16,false),
('undercoating','Undercoating','body_paint','protection',17,false),
('rust-repair','Rust repair','body_paint','body',18,false),
('custom-paint','Custom paint','body_paint','paint',19,false),
('restoration','Restoration','body_paint','specialty',20,false),
('headlight-restoration','Headlight restoration','body_paint','specialty',21,false),
('motorcycle-paint','Motorcycle paint','body_paint','specialty',22,false),
('fleet-repair','Fleet repair','body_paint','specialty',23,false),
-- PARTS & ACCESSORIES
('oem-parts','OEM parts','parts_accessories','parts',1,true),
('aftermarket','Aftermarket','parts_accessories','parts',2,true),
('surplus-jdm','Surplus / JDM','parts_accessories','parts',3,false),
('performance-parts','Performance parts','parts_accessories','parts',4,false),
('body-kits','Body kits','parts_accessories','styling',5,false),
('led-hid','LED / HID lighting','parts_accessories','styling',6,false),
('audio-electronics','Audio & electronics','parts_accessories','electronics',7,false),
('dashcams','Dashcams','parts_accessories','electronics',8,false),
('alarms','Alarms','parts_accessories','electronics',9,false),
('gps-trackers','GPS trackers','parts_accessories','electronics',10,false),
('tires','Tires','parts_accessories','wheels',11,true),
('mags-wheels','Mags / wheels','parts_accessories','wheels',12,false),
('lift-kits','Lift kits','parts_accessories','suspension',13,false),
('lowering-kits','Lowering kits','parts_accessories','suspension',14,false),
('suspension-upgrades','Suspension upgrades','parts_accessories','suspension',15,false),
('brakes-upgrade','Brakes upgrade','parts_accessories','brakes',16,false),
('exhaust-systems','Exhaust systems','parts_accessories','performance',17,false),
('intake','Intake','parts_accessories','performance',18,false),
('ecu-tuning','ECU tuning','parts_accessories','performance',19,false),
('batteries','Batteries','parts_accessories','maintenance',20,false),
('lubricants','Lubricants','parts_accessories','maintenance',21,false),
('filters','Filters','parts_accessories','maintenance',22,false),
('belts-hoses','Belts & hoses','parts_accessories','maintenance',23,false),
('spark-plugs','Spark plugs','parts_accessories','maintenance',24,false),
('mirrors','Mirrors','parts_accessories','body',25,false),
('glass-parts','Glass','parts_accessories','body',26,false),
('interior-trim','Interior trim','parts_accessories','interior',27,false),
('seat-covers','Seat covers','parts_accessories','interior',28,false),
('floor-mats','Floor mats','parts_accessories','interior',29,false),
('roof-racks','Roof racks','parts_accessories','exterior',30,false),
('tow-hitches','Tow hitches','parts_accessories','exterior',31,false),
('motorcycle-parts','Motorcycle parts','parts_accessories','vehicle_scope',32,false),
('heavy-duty-parts','Heavy duty parts','parts_accessories','vehicle_scope',33,false),
('marine-parts','Marine parts','parts_accessories','vehicle_scope',34,false),
('accessories','General accessories','parts_accessories','styling',35,false),
-- DEALERSHIP
('brand-new','Brand new','dealership','condition',1,true),
('pre-owned','Pre-owned','dealership','condition',2,true),
('certified-pre-owned','Certified pre-owned','dealership','condition',3,false),
('repo-units','Repo units','dealership','condition',4,false),
('bank-financing','Bank financing','dealership','financing',5,true),
('inhouse-financing','In-house financing','dealership','financing',6,false),
('trade-in','Trade-in accepted','dealership','financing',7,false),
('low-downpayment','Low downpayment','dealership','financing',8,false),
('all-in-promo','All-in promo','dealership','financing',9,false),
('fleet-sales','Fleet sales','dealership','channel',10,false),
('government-bids','Government bids','dealership','channel',11,false),
('export-units','Export units','dealership','channel',12,false),
('brand-toyota','Toyota','dealership','brand',20,false),
('brand-honda','Honda','dealership','brand',21,false),
('brand-mitsubishi','Mitsubishi','dealership','brand',22,false),
('brand-nissan','Nissan','dealership','brand',23,false),
('brand-ford','Ford','dealership','brand',24,false),
('brand-hyundai','Hyundai','dealership','brand',25,false),
('brand-kia','Kia','dealership','brand',26,false),
('brand-suzuki','Suzuki','dealership','brand',27,false),
('brand-isuzu','Isuzu','dealership','brand',28,false),
('brand-mazda','Mazda','dealership','brand',29,false),
('brand-chevrolet','Chevrolet','dealership','brand',30,false),
('brand-byd','BYD','dealership','brand',31,false),
('brand-geely','Geely','dealership','brand',32,false),
('brand-mg','MG','dealership','brand',33,false),
('brand-foton','Foton','dealership','brand',34,false),
('brand-yamaha','Yamaha','dealership','brand',40,false),
('brand-kawasaki','Kawasaki','dealership','brand',41,false),
('brand-harley','Harley-Davidson','dealership','brand',42,false),
('brand-ducati','Ducati','dealership','brand',43,false),
('dealer-scope-cars','Cars','dealership','vehicle_scope',60,false),
('dealer-scope-suvs','SUVs','dealership','vehicle_scope',61,false),
('dealer-scope-motorcycles','Motorcycles','dealership','vehicle_scope',62,false),
('dealer-scope-trucks','Trucks','dealership','vehicle_scope',63,false),
('dealer-scope-vans','Vans','dealership','vehicle_scope',64,false),
-- CARWASH
('basic-wash','Basic wash','carwash','wash',1,true),
('full-detail','Full detail','carwash','detail',2,true),
('detailing','Detailing','carwash','detail',3,true),
('interior-cleaning','Interior cleaning','carwash','detail',4,false),
('leather-treatment','Leather treatment','carwash','detail',5,false),
('engine-wash','Engine wash','carwash','wash',6,false),
('underchassis-wash','Underchassis wash','carwash','wash',7,false),
('motorcycle-wash','Motorcycle wash','carwash','wash',8,false),
('hand-wax','Hand wax','carwash','protection',9,false),
('clay-bar','Clay bar','carwash','protection',10,false),
('headlight-polish','Headlight polish','carwash','detail',11,false),
('paint-correction','Paint correction','carwash','protection',12,false),
('cw-ceramic-coating','Ceramic coating','carwash','protection',13,false),
('ozone-treatment','Ozone treatment','carwash','detail',14,false),
('pet-hair-removal','Pet hair removal','carwash','detail',15,false),
-- TOWING
('flatbed','Flatbed','towing','equipment',1,true),
('wheel-lift','Wheel-lift','towing','equipment',2,false),
('heavy-duty','Heavy duty','towing','equipment',3,true),
('motorcycle-towing','Motorcycle towing','towing','equipment',4,true),
('long-distance','Long-distance','towing','service',5,false),
('accident-recovery','Accident recovery','towing','service',6,false),
('winch-out','Winch-out','towing','service',7,false),
('lockout','Lockout','towing','roadside',8,false),
('jumpstart','Jumpstart','towing','roadside',9,false),
('fuel-delivery','Fuel delivery','towing','roadside',10,false),
('tire-change-roadside','Roadside tire change','towing','roadside',11,false),
('dispatch-24-7','24/7 dispatch','towing','service',12,true),
('roadside','Roadside assistance','towing','roadside',13,true),
-- INSURANCE
('ctpl','CTPL','insurance','coverage',1,true),
('comprehensive','Comprehensive','insurance','coverage',2,true),
('motorcycle-insurance','Motorcycle insurance','insurance','coverage',3,true),
('fleet-insurance','Fleet insurance','insurance','coverage',4,false),
('tnvs-coverage','Ride-hail / TNVS coverage','insurance','coverage',5,false),
('gap-insurance','GAP insurance','insurance','coverage',6,false),
('acts-of-nature','Acts of nature','insurance','coverage',7,false),
('theft','Theft','insurance','coverage',8,false),
('third-party','Third-party','insurance','coverage',9,false),
('orcr-processing','OR/CR processing','insurance','service',10,false),
('claims-assist','Claims assist','insurance','service',11,false),
-- SALVAGE
('used-parts','Used parts','salvage','parts',1,true),
('oem-used','OEM used','salvage','parts',2,false),
('salvage-jdm','JDM surplus','salvage','parts',3,false),
('core-buyback','Core buyback','salvage','buyback',4,false),
('vehicle-buyback','Totaled vehicle buyback','salvage','buyback',5,false),
('parts-shipping','Parts shipping nationwide','salvage','logistics',6,false),
('pick-a-part','Pick-a-part yard','salvage','operations',7,false),
('motorcycle-salvage','Motorcycle salvage','salvage','vehicle_scope',8,false),
('truck-salvage','Truck salvage','salvage','vehicle_scope',9,false),
-- CROSS-CUTTING (NULL type_slug)
('pay-cash','Cash',NULL,'payment',1,true),
('pay-gcash','GCash',NULL,'payment',2,true),
('pay-maya','Maya',NULL,'payment',3,false),
('pay-credit-card','Credit card',NULL,'payment',4,false),
('pay-bank-transfer','Bank transfer',NULL,'payment',5,false),
('pay-installment','Installment',NULL,'payment',6,false),
('pay-cod','COD',NULL,'payment',7,false),
('cashless','Cashless transactions',NULL,'payment',8,true),
('24-7','Open 24/7',NULL,'hours',20,true),
('open-sundays','Open Sundays',NULL,'hours',21,false),
('by-appointment','By appointment',NULL,'hours',22,false),
('home-service','Home service',NULL,'service_mode',30,true),
('pickup-delivery','Pickup & delivery',NULL,'service_mode',31,false),
('mobile-service','Mobile service',NULL,'service_mode',32,false),
('walk-in','Walk-in welcome',NULL,'service_mode',33,false),
('warranty','Warranty offered',NULL,'trust',40,true),
('lto-accredited','LTO accredited',NULL,'trust',41,false),
('iso-certified','ISO certified',NULL,'trust',42,false),
('woman-owned','Woman-owned',NULL,'trust',43,false),
('family-owned','Family-owned',NULL,'trust',44,false),
('english-speaking','English-speaking staff',NULL,'trust',45,false),
('lang-filipino','Filipino spoken',NULL,'language',50,false),
('lang-english','English spoken',NULL,'language',51,false),
('lang-bisaya','Bisaya spoken',NULL,'language',52,false),
('lang-hokkien','Hokkien spoken',NULL,'language',53,false)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  type_slug = EXCLUDED.type_slug,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  is_popular = EXCLUDED.is_popular;


-- ============================================================================
-- SOURCE MIGRATION: 20260518130914_a13fc071-f3d6-4cd8-8b6a-1678b388f5e0.sql
-- ============================================================================
-- Make the business_tags seed bullet-proof against the type_slug FK.
-- 1. Ensure every business_type referenced by tags actually exists.
INSERT INTO public.business_types (slug, label, sort_order) VALUES
  ('dealership','Dealerships',10),
  ('repair_shop','Repair & service shops',20),
  ('parts_accessories','Parts & accessories',30),
  ('towing','Towing & roadside',40),
  ('insurance','Insurance',50),
  ('body_paint','Body & paint shop',25),
  ('carwash','Car wash & detailing',35),
  ('salvage','Salvage / pick-a-part',45)
ON CONFLICT (slug) DO NOTHING;

-- 2. Clean up any orphan tag rows that point at a missing type
--    (defensive — there shouldn't be any, but this guarantees the FK is satisfied).
DELETE FROM public.business_tags t
WHERE t.type_slug IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.business_types bt WHERE bt.slug = t.type_slug);


-- ============================================================================
-- SOURCE MIGRATION: 20260518131605_2cb87a26-8ed1-4790-b05d-f500a7a8f589.sql
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

create table if not exists public.business_type_suggestions (
  id uuid primary key default gen_random_uuid(),
  proposed_label text not null,
  notes text,
  submitter_id uuid,
  submitter_email text,
  status text not null default 'pending',
  admin_note text,
  merged_into_slug text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_type_suggestions_status_chk check (status in ('pending','approved','merged','rejected'))
);

alter table public.business_type_suggestions enable row level security;

create policy "Authenticated submit type suggestions"
  on public.business_type_suggestions for insert
  with check (auth.uid() = submitter_id);

create policy "Users read own type suggestions"
  on public.business_type_suggestions for select
  using (auth.uid() = submitter_id);

create policy "Admins manage type suggestions"
  on public.business_type_suggestions for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Support read type suggestions"
  on public.business_type_suggestions for select
  using (can_support(auth.uid()));

create trigger trg_business_type_suggestions_updated_at
  before update on public.business_type_suggestions
  for each row execute function public.set_updated_at();

create index if not exists idx_business_type_suggestions_status
  on public.business_type_suggestions(status, created_at desc);


-- ============================================================================
-- SOURCE MIGRATION: 20260519030605_6784b6c0-831a-4edc-a62d-99f0e1baa8c0.sql
-- ============================================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS gross_amount_php numeric(10,2),
  ADD COLUMN IF NOT EXISTS prorated_credit_php numeric(10,2),
  ADD COLUMN IF NOT EXISTS previous_plan text,
  ADD COLUMN IF NOT EXISTS new_plan text;


-- ============================================================================
-- SOURCE MIGRATION: 20260519032937_9dd69341-37be-40d4-9ffe-2d922c9176c9.sql
-- ============================================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS period_start timestamptz,
  ADD COLUMN IF NOT EXISTS period_end timestamptz,
  ADD COLUMN IF NOT EXISTS previous_plan_price_php numeric,
  ADD COLUMN IF NOT EXISTS credit_calculated_at timestamptz;


-- ============================================================================
-- SOURCE MIGRATION: 20260519033045_91401557-cc18-4b5f-974f-b0b24ec95cfb.sql
-- ============================================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan_price_php numeric,
  ADD COLUMN IF NOT EXISTS boost_amount_php numeric,
  ADD COLUMN IF NOT EXISTS addons_amount_php numeric,
  ADD COLUMN IF NOT EXISTS addons_description text;


-- ============================================================================
-- SOURCE MIGRATION: 20260519033702_3070aa43-bf91-4a34-b979-c330ae480864.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('plan','boost','addon','other')),
  label text NOT NULL,
  description text,
  amount_php numeric NOT NULL DEFAULT 0,
  prorated_credit_php numeric,
  previous_amount_php numeric,
  period_start timestamptz,
  period_end timestamptz,
  credit_calculated_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_line_items_payment_id
  ON public.payment_line_items(payment_id);

ALTER TABLE public.payment_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own line items"
ON public.payment_line_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.id = payment_line_items.payment_id
      AND (p.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Users insert own line items"
ON public.payment_line_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.id = payment_line_items.payment_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Admins manage line items"
ON public.payment_line_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sales view line items"
ON public.payment_line_items FOR SELECT
USING (has_role(auth.uid(), 'sales'::app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260519040516_c7384b0f-639e-4698-b5a3-6fe84e5827dd.sql
-- ============================================================================

-- Self-serve plan change: cancels any active/pending subs for the caller,
-- activates the requested plan immediately for a 30-day period, and records
-- a payment row (status=pending so finance can reconcile) carrying the
-- prorated credit derived from the user's most recent paid subscription.
CREATE OR REPLACE FUNCTION public.self_serve_change_plan(_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan public.subscription_plans%ROWTYPE;
  _prev public.subscriptions%ROWTYPE;
  _last_pay public.payments%ROWTYPE;
  _credit numeric := 0;
  _gross numeric := 0;
  _net numeric := 0;
  _new_sub_id uuid;
  _new_pay_id uuid;
  _period_start timestamptz := now();
  _period_end timestamptz := now() + interval '30 days';
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _plan FROM public.subscription_plans WHERE id = _plan_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  _gross := COALESCE(_plan.price_php, 0);

  -- Previous active/pending sub (if any) — used for proration + cancellation
  SELECT * INTO _prev
  FROM public.subscriptions
  WHERE user_id = _uid AND status IN ('active', 'paused', 'pending')
  ORDER BY created_at DESC
  LIMIT 1;

  -- Latest paid subscription payment — source of truth for credit math
  SELECT * INTO _last_pay
  FROM public.payments
  WHERE user_id = _uid
    AND kind = 'subscription'
    AND status = 'paid'
    AND period_end IS NOT NULL
  ORDER BY paid_at DESC NULLS LAST
  LIMIT 1;

  IF _prev.id IS NOT NULL AND _prev.plan_id = _plan_id AND _prev.status = 'active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_on_plan');
  END IF;

  IF _last_pay.id IS NOT NULL AND _last_pay.period_start IS NOT NULL AND _last_pay.period_end IS NOT NULL THEN
    DECLARE
      _total_ms numeric := EXTRACT(EPOCH FROM (_last_pay.period_end - _last_pay.period_start));
      _ref timestamptz := COALESCE(_last_pay.credit_calculated_at, _last_pay.paid_at, now());
      _remaining_ms numeric := EXTRACT(EPOCH FROM GREATEST(_last_pay.period_end - _ref, interval '0'));
      _plan_price numeric := COALESCE(_last_pay.plan_price_php, 0);
    BEGIN
      IF _total_ms > 0 AND _plan_price > 0 THEN
        _credit := ROUND((_plan_price * LEAST(_remaining_ms, _total_ms)) / _total_ms);
      END IF;
    END;
  END IF;

  _net := GREATEST(0, _gross - _credit);

  -- Cancel any other live subs for this user
  UPDATE public.subscriptions
  SET status = 'cancelled', updated_at = now()
  WHERE user_id = _uid AND status IN ('active', 'paused', 'pending');

  INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_end, notes)
  VALUES (
    _uid, _plan_id, 'active', _period_end,
    CASE
      WHEN _prev.id IS NULL THEN 'Self-serve new subscription'
      ELSE 'Self-serve plan change from previous plan — prorated credit ₱' || _credit::text
    END
  )
  RETURNING id INTO _new_sub_id;

  INSERT INTO public.payments (
    user_id, kind, status, amount_php, gross_amount_php, prorated_credit_php,
    plan_price_php, previous_plan_price_php, period_start, period_end,
    credit_calculated_at, new_plan, previous_plan, notes
  ) VALUES (
    _uid, 'subscription', 'pending', _net, _gross, _credit,
    _gross,
    CASE WHEN _last_pay.id IS NOT NULL THEN _last_pay.plan_price_php ELSE NULL END,
    _period_start, _period_end,
    now(), _plan.name,
    CASE WHEN _last_pay.id IS NOT NULL THEN _last_pay.new_plan ELSE NULL END,
    'Self-serve plan change'
  )
  RETURNING id INTO _new_pay_id;

  RETURN jsonb_build_object(
    'ok', true,
    'subscription_id', _new_sub_id,
    'payment_id', _new_pay_id,
    'gross_php', _gross,
    'credit_php', _credit,
    'net_php', _net,
    'period_end', _period_end
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.self_serve_change_plan(uuid) TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260519053821_05fe7439-d883-455d-a23e-137886b58648.sql
-- ============================================================================

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_lookup_key text;

UPDATE public.subscription_plans SET stripe_lookup_key = 'bronze_monthly'   WHERE name = 'Bronze';
UPDATE public.subscription_plans SET stripe_lookup_key = 'silver_monthly'   WHERE name = 'Silver';
UPDATE public.subscription_plans SET stripe_lookup_key = 'gold_monthly'     WHERE name = 'Gold';
UPDATE public.subscription_plans SET stripe_lookup_key = 'platinum_monthly' WHERE name = 'Platinum';
UPDATE public.subscription_plans SET stripe_lookup_key = 'business_monthly' WHERE name = 'Business';

CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_stripe_lookup_key_uidx
  ON public.subscription_plans (stripe_lookup_key) WHERE stripe_lookup_key IS NOT NULL;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx
  ON public.subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx
  ON public.subscriptions (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260519054723_5240c8fa-4d7f-4e43-9409-ba5417f672d5.sql
-- ============================================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS current_period_start timestamp with time zone;

-- Backfill from existing data: set start = created_at where missing
UPDATE public.subscriptions
SET current_period_start = created_at
WHERE current_period_start IS NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260521080657_c8af3a11-70d2-4287-9298-36a238334b1d.sql
-- ============================================================================
-- 1) Free-text brands carried on businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS brands_carried text;

-- 2) Seed business_tags for parts_accessories and inventory-type across service providers.
-- Idempotent: ON CONFLICT (slug) DO NOTHING so re-runs are safe.

INSERT INTO public.business_tags (slug, label, type_slug, category, sort_order, is_popular) VALUES
  -- Parts sold
  ('parts-tires',           'Tires',                 'parts_accessories', 'parts_sold', 10, true),
  ('parts-wheels',          'Wheels & rims',         'parts_accessories', 'parts_sold', 20, true),
  ('parts-batteries',       'Batteries',             'parts_accessories', 'parts_sold', 30, true),
  ('parts-brake-pads',      'Brake pads & rotors',   'parts_accessories', 'parts_sold', 40, true),
  ('parts-filters',         'Filters',               'parts_accessories', 'parts_sold', 50, true),
  ('parts-belts-hoses',     'Belts & hoses',         'parts_accessories', 'parts_sold', 60, false),
  ('parts-lights',          'Lights & bulbs',        'parts_accessories', 'parts_sold', 70, true),
  ('parts-spark-plugs',     'Spark plugs',           'parts_accessories', 'parts_sold', 80, false),
  ('parts-fluids-oils',     'Fluids & oils',         'parts_accessories', 'parts_sold', 90, true),
  ('parts-body-panels',     'Body panels',           'parts_accessories', 'parts_sold', 100, false),
  ('parts-glass',           'Glass',                 'parts_accessories', 'parts_sold', 110, false),
  ('parts-mirrors',         'Mirrors',               'parts_accessories', 'parts_sold', 120, false),
  ('parts-bumpers',         'Bumpers',               'parts_accessories', 'parts_sold', 130, false),
  ('parts-engines',         'Engines',               'parts_accessories', 'parts_sold', 140, false),
  ('parts-transmissions',   'Transmissions',         'parts_accessories', 'parts_sold', 150, false),
  ('parts-suspension',      'Suspension parts',      'parts_accessories', 'parts_sold', 160, false),
  ('parts-exhaust',         'Exhaust',               'parts_accessories', 'parts_sold', 170, false),
  ('parts-electrical',      'Electrical parts',      'parts_accessories', 'parts_sold', 180, false),
  ('parts-interior-trim',   'Interior trim',         'parts_accessories', 'parts_sold', 190, false),
  ('parts-heavy-duty',      'Heavy duty parts',      'parts_accessories', 'parts_sold', 200, false),
  ('parts-performance',     'Performance parts',     'parts_accessories', 'parts_sold', 210, false),
  ('parts-audio-electronics','Audio & electronics',  'parts_accessories', 'parts_sold', 220, false),
  ('parts-accessories-misc','Accessories',           'parts_accessories', 'parts_sold', 230, false),

  -- Vehicle scope for parts shops
  ('parts-scope-cars',          'Cars',           'parts_accessories', 'vehicle_scope', 10, true),
  ('parts-scope-motorcycles',   'Motorcycles',    'parts_accessories', 'vehicle_scope', 20, true),
  ('parts-scope-trucks',        'Trucks',         'parts_accessories', 'vehicle_scope', 30, false),
  ('parts-scope-suvs',          'SUVs',           'parts_accessories', 'vehicle_scope', 40, false),
  ('parts-scope-vans',          'Vans',           'parts_accessories', 'vehicle_scope', 50, false),
  ('parts-scope-heavy-duty',    'Heavy duty / Commercial', 'parts_accessories', 'vehicle_scope', 60, false),
  ('parts-scope-diesel',        'Diesel',         'parts_accessories', 'vehicle_scope', 70, false),
  ('parts-scope-ev-hybrid',     'EV / Hybrid',    'parts_accessories', 'vehicle_scope', 80, false),
  ('parts-scope-boats',         'Boats',          'parts_accessories', 'vehicle_scope', 90, false),
  ('parts-scope-heavy-equipment','Heavy equipment','parts_accessories', 'vehicle_scope', 100, false),

  -- Inventory type — parts_accessories
  ('inv-parts-new',         'Brand new',          'parts_accessories', 'inventory_type', 10, true),
  ('inv-parts-used',        'Pre-owned / used',   'parts_accessories', 'inventory_type', 20, true),
  ('inv-parts-oem',         'OEM',                'parts_accessories', 'inventory_type', 30, true),
  ('inv-parts-aftermarket', 'Aftermarket',        'parts_accessories', 'inventory_type', 40, true),
  ('inv-parts-rebuilt',     'Rebuilt',            'parts_accessories', 'inventory_type', 50, false),
  ('inv-parts-performance', 'Performance',        'parts_accessories', 'inventory_type', 60, false),

  -- Inventory type — repair_shop (uses OEM/aftermarket parts)
  ('inv-repair-oem',         'Uses OEM parts',         'repair_shop', 'inventory_type', 10, true),
  ('inv-repair-aftermarket', 'Uses aftermarket parts', 'repair_shop', 'inventory_type', 20, true),
  ('inv-repair-rebuilt',     'Uses rebuilt parts',     'repair_shop', 'inventory_type', 30, false),

  -- Inventory type — body_paint
  ('inv-body-oem',         'OEM panels',         'body_paint', 'inventory_type', 10, false),
  ('inv-body-aftermarket', 'Aftermarket panels', 'body_paint', 'inventory_type', 20, false),

  -- Inventory type — salvage
  ('inv-salvage-used-parts','Used parts',         'salvage', 'inventory_type', 10, true),
  ('inv-salvage-cores',     'Cores',              'salvage', 'inventory_type', 20, false),
  ('inv-salvage-whole',     'Whole vehicles',     'salvage', 'inventory_type', 30, false)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260521083454_95a0eb1c-2bfe-4887-b9ec-66aa7b587cb0.sql
-- ============================================================================

-- Facebook import: profile linking + listing source tracking + import jobs
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fb_profile_url text,
  ADD COLUMN IF NOT EXISTS fb_profile_id text,
  ADD COLUMN IF NOT EXISTS fb_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS fb_verification_method text,
  ADD COLUMN IF NOT EXISTS fb_verification_code text,
  ADD COLUMN IF NOT EXISTS fb_verification_code_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_fb_profile_id_key
  ON public.profiles (fb_profile_id)
  WHERE fb_profile_id IS NOT NULL;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_url text;

CREATE TABLE IF NOT EXISTS public.fb_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  extracted_payload jsonb,
  error text,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fb_import_jobs_user ON public.fb_import_jobs (user_id, created_at DESC);

ALTER TABLE public.fb_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own fb import jobs"
  ON public.fb_import_jobs FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own fb import jobs"
  ON public.fb_import_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage fb import jobs"
  ON public.fb_import_jobs
  USING (has_role(auth.uid(), 'admin'::app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260521093754_d4c431fc-bd43-4d2c-8a3e-2a77ee9369b6.sql
-- ============================================================================

CREATE TYPE public.ride_status AS ENUM ('draft','published','archived');
CREATE TYPE public.ride_vehicle_type AS ENUM ('car','truck','suv','van','motorcycle','scooter','atv','utv','boat','other');
CREATE TYPE public.ride_mod_category AS ENUM ('engine','drivetrain','suspension','wheels_tires','brakes','exterior','interior','audio_electronics','lighting','tuning','other');

CREATE TABLE public.rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  year int,
  make text,
  model text,
  trim text,
  color text,
  vehicle_type public.ride_vehicle_type NOT NULL DEFAULT 'car',
  engine text,
  transmission text,
  drivetrain text,
  mileage_km int,
  description text,
  cover_photo_url text,
  region text,
  city text,
  status public.ride_status NOT NULL DEFAULT 'draft',
  is_for_sale boolean NOT NULL DEFAULT false,
  linked_listing_id uuid,
  view_count int NOT NULL DEFAULT 0,
  like_count int NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rides_user ON public.rides(user_id);
CREATE INDEX idx_rides_status ON public.rides(status);
CREATE INDEX idx_rides_published ON public.rides(published_at DESC) WHERE status='published';
CREATE INDEX idx_rides_make_model ON public.rides(make, model);
CREATE INDEX idx_rides_linked_listing ON public.rides(linked_listing_id) WHERE linked_listing_id IS NOT NULL;

CREATE TABLE public.ride_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ride_photos_ride ON public.ride_photos(ride_id, sort_order);

CREATE TABLE public.ride_mods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  category public.ride_mod_category NOT NULL DEFAULT 'other',
  part_name text NOT NULL,
  brand text,
  cost_php numeric,
  installed_on date,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ride_mods_ride ON public.ride_mods(ride_id);

CREATE TABLE public.ride_service_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  service_type text NOT NULL,
  mileage_km int,
  cost_php numeric,
  notes text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ride_service_ride ON public.ride_service_log(ride_id, service_date DESC);

CREATE TABLE public.ride_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  owner_name text NOT NULL,
  acquired_on date,
  sold_on date,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ride_ownership_ride ON public.ride_ownership(ride_id, sort_order);

CREATE TABLE public.ride_likes (
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ride_id, user_id)
);

CREATE TRIGGER trg_rides_updated BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.ride_likes_count_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.rides SET like_count = like_count + 1 WHERE id = NEW.ride_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.rides SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.ride_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_ride_likes_count
AFTER INSERT OR DELETE ON public.ride_likes
FOR EACH ROW EXECUTE FUNCTION public.ride_likes_count_sync();

CREATE OR REPLACE FUNCTION public.rides_listing_sold_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'sold' AND (OLD.status IS DISTINCT FROM 'sold') THEN
    UPDATE public.rides SET is_for_sale = false WHERE linked_listing_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rides_listing_sold
AFTER UPDATE OF status ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.rides_listing_sold_sync();

ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_mods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_service_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published rides public read" ON public.rides
  FOR SELECT USING (status = 'published' OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners insert rides" ON public.rides
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update rides" ON public.rides
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete rides" ON public.rides
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage rides" ON public.rides
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Ride photos public read" ON public.ride_photos
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_photos.ride_id
    AND (r.status='published' OR r.user_id = auth.uid() OR has_role(auth.uid(),'admin'))));
CREATE POLICY "Owners manage ride photos" ON public.ride_photos
  FOR ALL USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_photos.ride_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_photos.ride_id AND r.user_id = auth.uid()));
CREATE POLICY "Admins manage ride photos" ON public.ride_photos
  FOR ALL USING (has_role(auth.uid(),'admin'));

CREATE POLICY "Ride mods public read" ON public.ride_mods
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_mods.ride_id
    AND (r.status='published' OR r.user_id = auth.uid() OR has_role(auth.uid(),'admin'))));
CREATE POLICY "Owners manage ride mods" ON public.ride_mods
  FOR ALL USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_mods.ride_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_mods.ride_id AND r.user_id = auth.uid()));
CREATE POLICY "Admins manage ride mods" ON public.ride_mods
  FOR ALL USING (has_role(auth.uid(),'admin'));

CREATE POLICY "Ride service public read" ON public.ride_service_log
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_service_log.ride_id
    AND (r.status='published' OR r.user_id = auth.uid() OR has_role(auth.uid(),'admin'))));
CREATE POLICY "Owners manage ride service" ON public.ride_service_log
  FOR ALL USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_service_log.ride_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_service_log.ride_id AND r.user_id = auth.uid()));
CREATE POLICY "Admins manage ride service" ON public.ride_service_log
  FOR ALL USING (has_role(auth.uid(),'admin'));

CREATE POLICY "Ride ownership public read" ON public.ride_ownership
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_ownership.ride_id
    AND (r.status='published' OR r.user_id = auth.uid() OR has_role(auth.uid(),'admin'))));
CREATE POLICY "Owners manage ride ownership" ON public.ride_ownership
  FOR ALL USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_ownership.ride_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_ownership.ride_id AND r.user_id = auth.uid()));
CREATE POLICY "Admins manage ride ownership" ON public.ride_ownership
  FOR ALL USING (has_role(auth.uid(),'admin'));

CREATE POLICY "Ride likes public read" ON public.ride_likes FOR SELECT USING (true);
CREATE POLICY "Users like rides" ON public.ride_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike rides" ON public.ride_likes FOR DELETE USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
  VALUES ('ride-media','ride-media', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Ride media public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'ride-media');
CREATE POLICY "Users upload own ride media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ride-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own ride media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'ride-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own ride media" ON storage.objects
  FOR DELETE USING (bucket_id = 'ride-media' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================================================
-- SOURCE MIGRATION: 20260522104711_7af12507-0ffa-4809-b770-7c0d2419c318.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260522104828_c3809a3b-82da-4574-a337-d01968648c9b.sql
-- ============================================================================

ALTER TYPE ad_placement ADD VALUE IF NOT EXISTS 'home_carousel';
ALTER TYPE ad_placement ADD VALUE IF NOT EXISTS 'browse_top';
ALTER TYPE ad_placement ADD VALUE IF NOT EXISTS 'rides_top';
ALTER TYPE ad_placement ADD VALUE IF NOT EXISTS 'export_top';


-- ============================================================================
-- SOURCE MIGRATION: 20260522111105_2c76877e-25cd-41b5-aed4-03377ce2bb42.sql
-- ============================================================================

-- Extend ad_placement enum
ALTER TYPE public.ad_placement ADD VALUE IF NOT EXISTS 'shop_top';
ALTER TYPE public.ad_placement ADD VALUE IF NOT EXISTS 'shop_sidebar';

-- can_manage_shop helper
CREATE OR REPLACE FUNCTION public.can_manage_shop(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin','advertising','sales')
  )
$$;

-- Affiliate networks
CREATE TABLE public.affiliate_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tag_param text,
  tag_value text,
  deeplink_template text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_networks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active networks public read" ON public.affiliate_networks FOR SELECT USING (active = true OR public.can_manage_shop(auth.uid()));
CREATE POLICY "Shop managers manage networks" ON public.affiliate_networks FOR ALL USING (public.can_manage_shop(auth.uid())) WITH CHECK (public.can_manage_shop(auth.uid()));

-- Shop categories
CREATE TABLE public.shop_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active categories public read" ON public.shop_categories FOR SELECT USING (active = true OR public.can_manage_shop(auth.uid()));
CREATE POLICY "Shop managers manage categories" ON public.shop_categories FOR ALL USING (public.can_manage_shop(auth.uid())) WITH CHECK (public.can_manage_shop(auth.uid()));

-- Shop products
CREATE TABLE public.shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  brand text,
  image_url text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  category_id uuid REFERENCES public.shop_categories(id) ON DELETE SET NULL,
  price_php numeric,
  currency text NOT NULL DEFAULT 'PHP',
  tags text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  click_count int NOT NULL DEFAULT 0,
  view_count int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_products_category ON public.shop_products(category_id);
CREATE INDEX idx_shop_products_active ON public.shop_products(active) WHERE active = true;
CREATE INDEX idx_shop_products_featured ON public.shop_products(featured) WHERE featured = true;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active products public read" ON public.shop_products FOR SELECT USING (active = true OR public.can_manage_shop(auth.uid()));
CREATE POLICY "Shop managers manage products" ON public.shop_products FOR ALL USING (public.can_manage_shop(auth.uid())) WITH CHECK (public.can_manage_shop(auth.uid()));

CREATE TRIGGER shop_products_updated_at BEFORE UPDATE ON public.shop_products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER affiliate_networks_updated_at BEFORE UPDATE ON public.affiliate_networks FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Shop product links (per network)
CREATE TABLE public.shop_product_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  network_id uuid NOT NULL REFERENCES public.affiliate_networks(id) ON DELETE CASCADE,
  url text NOT NULL,
  sku text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, network_id)
);
CREATE INDEX idx_shop_product_links_product ON public.shop_product_links(product_id);
ALTER TABLE public.shop_product_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product links public read" ON public.shop_product_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.shop_products p WHERE p.id = product_id AND (p.active = true OR public.can_manage_shop(auth.uid())))
);
CREATE POLICY "Shop managers manage links" ON public.shop_product_links FOR ALL USING (public.can_manage_shop(auth.uid())) WITH CHECK (public.can_manage_shop(auth.uid()));

-- Shop clicks
CREATE TABLE public.shop_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  network_id uuid REFERENCES public.affiliate_networks(id) ON DELETE SET NULL,
  visitor_id uuid,
  user_id uuid,
  referrer text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_clicks_product_date ON public.shop_clicks(product_id, created_at DESC);
ALTER TABLE public.shop_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record shop clicks" ON public.shop_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Shop managers view clicks" ON public.shop_clicks FOR SELECT USING (public.can_manage_shop(auth.uid()));

-- Increment click_count trigger
CREATE OR REPLACE FUNCTION public.tg_shop_click_increment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.shop_products SET click_count = click_count + 1 WHERE id = NEW.product_id;
  RETURN NEW;
END $$;
CREATE TRIGGER shop_clicks_increment AFTER INSERT ON public.shop_clicks FOR EACH ROW EXECUTE FUNCTION public.tg_shop_click_increment();

-- Seed networks
INSERT INTO public.affiliate_networks (slug, name, tag_param, tag_value, sort_order) VALUES
  ('shopee', 'Shopee PH', 'af_siteid', '', 1),
  ('lazada', 'Lazada PH', 'sub_aff_id', '', 2),
  ('aliexpress', 'AliExpress', 'aff_fcid', '', 3),
  ('tiktok_shop', 'TikTok Shop PH', null, null, 4),
  ('amazon', 'Amazon', 'tag', '', 5),
  ('generic', 'Direct / Other', null, null, 99)
ON CONFLICT (slug) DO NOTHING;

-- Seed categories
INSERT INTO public.shop_categories (slug, name, icon, sort_order) VALUES
  ('detailing', 'Car Detailing', 'sparkles', 1),
  ('tools', 'Mechanic Tools', 'wrench', 2),
  ('parts', 'Parts & Spares', 'cog', 3),
  ('electronics', 'Electronics', 'cpu', 4),
  ('accessories', 'Accessories', 'sticker', 5),
  ('tires-wheels', 'Tires & Wheels', 'circle-dot', 6),
  ('lubricants', 'Lubricants & Fluids', 'droplet', 7),
  ('safety', 'Safety & Recovery', 'shield', 8)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260522114743_f950325b-850b-45ed-a26c-13ea8a733ae4.sql
-- ============================================================================

-- Add universal_fit flag to products
ALTER TABLE public.shop_products
  ADD COLUMN IF NOT EXISTS universal_fit boolean NOT NULL DEFAULT false;

-- Fitment table: a product fits a (make, model, year-range) combo.
-- Nulls mean "any" at that level (e.g. make=Toyota, model=null => fits any Toyota).
CREATE TABLE IF NOT EXISTS public.shop_product_fitment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'car' CHECK (category IN ('car','motorcycle')),
  make text,
  model text,
  year_start int,
  year_end int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fitment_product ON public.shop_product_fitment(product_id);
CREATE INDEX IF NOT EXISTS idx_fitment_make_model ON public.shop_product_fitment(make, model);

ALTER TABLE public.shop_product_fitment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fitment is publicly readable"
  ON public.shop_product_fitment FOR SELECT
  USING (true);

CREATE POLICY "Shop managers can insert fitment"
  ON public.shop_product_fitment FOR INSERT
  WITH CHECK (public.can_manage_shop(auth.uid()));

CREATE POLICY "Shop managers can update fitment"
  ON public.shop_product_fitment FOR UPDATE
  USING (public.can_manage_shop(auth.uid()));

CREATE POLICY "Shop managers can delete fitment"
  ON public.shop_product_fitment FOR DELETE
  USING (public.can_manage_shop(auth.uid()));


-- ============================================================================
-- SOURCE MIGRATION: 20260522154030_bd6a15a5-99ea-4f5e-a39f-93c3e1980ef9.sql
-- ============================================================================

CREATE TABLE public.ride_service_log_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id uuid NOT NULL REFERENCES public.ride_service_log(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_ride_service_log_photos_log_id ON public.ride_service_log_photos(log_id, sort_order);

ALTER TABLE public.ride_service_log_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service log photos public read"
ON public.ride_service_log_photos FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.ride_service_log s
  JOIN public.rides r ON r.id = s.ride_id
  WHERE s.id = ride_service_log_photos.log_id
    AND (r.status = 'published'::ride_status OR r.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Owners manage service log photos"
ON public.ride_service_log_photos FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.ride_service_log s
  JOIN public.rides r ON r.id = s.ride_id
  WHERE s.id = ride_service_log_photos.log_id AND r.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ride_service_log s
  JOIN public.rides r ON r.id = s.ride_id
  WHERE s.id = ride_service_log_photos.log_id AND r.user_id = auth.uid()
));

CREATE POLICY "Admins manage service log photos"
ON public.ride_service_log_photos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.enforce_service_log_photo_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.ride_service_log_photos WHERE log_id = NEW.log_id) >= 100 THEN
    RAISE EXCEPTION 'A service log entry can have at most 100 photos';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_service_log_photo_limit
BEFORE INSERT ON public.ride_service_log_photos
FOR EACH ROW EXECUTE FUNCTION public.enforce_service_log_photo_limit();


-- ============================================================================
-- SOURCE MIGRATION: 20260522154420_43b47bf7-cd96-4923-9329-2ae7dadfbef3.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_service_log_photo_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.ride_service_log_photos WHERE log_id = NEW.log_id) >= 20 THEN
    RAISE EXCEPTION 'A service log entry can have at most 20 photos';
  END IF;
  RETURN NEW;
END;
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260523101642_b10e46d3-8424-4a6c-b124-908ca9b23ea6.sql
-- ============================================================================

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS price_label text,
  ADD COLUMN IF NOT EXISTS price_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_source_external_id_unique
  ON public.businesses (source, source_external_id)
  WHERE source_external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS businesses_lat_lng_idx
  ON public.businesses (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260524133901_0b73cc17-e47e-4d09-a47b-be80c742536d.sql
-- ============================================================================
CREATE TABLE public.shop_favorites (
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE INDEX idx_shop_favorites_user ON public.shop_favorites(user_id, created_at DESC);

ALTER TABLE public.shop_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own shop favorites"
ON public.shop_favorites
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read shop favorites"
ON public.shop_favorites
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260525021220_1704181b-8d1c-446c-9098-3b6bf1b4497b.sql
-- ============================================================================

-- 1. Drop the over-broad public SELECT policy on profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- 2. Add an own-row SELECT policy so users can still read their own full profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 3. Create a SECURITY DEFINER public view exposing only non-sensitive fields.
--    Postgres views run as the view owner by default, which lets anon/auth
--    clients read these safe columns without exposing phone numbers or
--    Facebook verification codes through the underlying table.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT
  id,
  full_name,
  avatar_url,
  seller_type,
  business_name,
  business_logo_url,
  business_address,
  business_region,
  business_province,
  business_city,
  business_barangay,
  business_lat,
  business_lng,
  business_hours,
  business_kind,
  verification_status,
  verified_at,
  fb_profile_url,
  fb_profile_id,
  fb_verified_at,
  is_founding_member,
  founding_member_number,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
