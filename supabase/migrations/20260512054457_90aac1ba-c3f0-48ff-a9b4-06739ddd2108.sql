
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
