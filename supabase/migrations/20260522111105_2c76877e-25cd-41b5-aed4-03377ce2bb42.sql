
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
