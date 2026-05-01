
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
