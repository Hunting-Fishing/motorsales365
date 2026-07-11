-- Create analytics tracking for shopping behavior
CREATE TABLE IF NOT EXISTS public.product_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'click', 'add_to_cart', 'save', 'share', 'purchase')),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  user_agent TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_product_analytics_product_id ON public.product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_interaction_type ON public.product_analytics(interaction_type);
CREATE INDEX IF NOT EXISTS idx_product_analytics_created_at ON public.product_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_product_analytics_category ON public.product_analytics(category);
CREATE INDEX IF NOT EXISTS idx_product_analytics_user_id ON public.product_analytics(user_id);

-- Create reviews table for products
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  helpful_count INTEGER DEFAULT 0,
  review_images TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for reviews
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON public.product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON public.product_reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON public.product_reviews(is_approved);

-- Create review helpfulness tracking
CREATE TABLE IF NOT EXISTS public.review_helpfulness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Create recently viewed products table
CREATE TABLE IF NOT EXISTS public.recently_viewed_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_image_url TEXT,
  category TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create index for recently viewed
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_id ON public.recently_viewed_products(user_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_viewed_at ON public.recently_viewed_products(viewed_at);

-- Create product comparison table
CREATE TABLE IF NOT EXISTS public.product_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL DEFAULT 'My Comparison',
  product_ids UUID[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create saved searches table
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  search_query TEXT,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create inventory tracking for products (connect to existing inventory system)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES public.inventory_items(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT true;

-- Enable RLS on new tables
ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpfulness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recently_viewed_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_analytics
CREATE POLICY "Users can view all analytics" ON public.product_analytics FOR SELECT USING (true);
CREATE POLICY "Users can insert their own analytics" ON public.product_analytics FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policies for product_reviews
CREATE POLICY "Anyone can view approved reviews" ON public.product_reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can insert their own reviews" ON public.product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.product_reviews FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for review_helpfulness
CREATE POLICY "Users can view review helpfulness" ON public.review_helpfulness FOR SELECT USING (true);
CREATE POLICY "Users can manage their own helpfulness votes" ON public.review_helpfulness FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for recently_viewed_products
CREATE POLICY "Users can manage their own recently viewed" ON public.recently_viewed_products FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for product_comparisons
CREATE POLICY "Users can manage their own comparisons" ON public.product_comparisons FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for saved_searches
CREATE POLICY "Users can manage their own saved searches" ON public.saved_searches FOR ALL USING (auth.uid() = user_id);

-- Functions for analytics
CREATE OR REPLACE FUNCTION public.track_product_interaction(
  p_product_id UUID,
  p_product_name TEXT,
  p_category TEXT,
  p_interaction_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.product_analytics (
    product_id, product_name, category, interaction_type, 
    user_id, session_id, metadata
  ) VALUES (
    p_product_id, p_product_name, p_category, p_interaction_type,
    COALESCE(p_user_id, auth.uid()), p_session_id, p_metadata
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get product stats
CREATE OR REPLACE FUNCTION public.get_product_stats(p_product_id UUID)
RETURNS TABLE(
  total_views BIGINT,
  total_clicks BIGINT,
  total_cart_adds BIGINT,
  total_saves BIGINT,
  avg_rating NUMERIC,
  review_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN pa.interaction_type = 'view' THEN 1 ELSE 0 END), 0) as total_views,
    COALESCE(SUM(CASE WHEN pa.interaction_type = 'click' THEN 1 ELSE 0 END), 0) as total_clicks,
    COALESCE(SUM(CASE WHEN pa.interaction_type = 'add_to_cart' THEN 1 ELSE 0 END), 0) as total_cart_adds,
    COALESCE(SUM(CASE WHEN pa.interaction_type = 'save' THEN 1 ELSE 0 END), 0) as total_saves,
    COALESCE(AVG(pr.rating), 0) as avg_rating,
    COALESCE(COUNT(pr.id), 0) as review_count
  FROM public.product_analytics pa
  LEFT JOIN public.product_reviews pr ON pr.product_id = pa.product_id AND pr.is_approved = true
  WHERE pa.product_id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update recently viewed
CREATE OR REPLACE FUNCTION public.add_recently_viewed_product(
  p_product_id UUID,
  p_product_name TEXT,
  p_product_image_url TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.recently_viewed_products (
    user_id, product_id, product_name, product_image_url, category
  ) VALUES (
    auth.uid(), p_product_id, p_product_name, p_product_image_url, p_category
  )
  ON CONFLICT (user_id, product_id) 
  DO UPDATE SET 
    viewed_at = now(),
    product_name = EXCLUDED.product_name,
    product_image_url = EXCLUDED.product_image_url,
    category = EXCLUDED.category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update product stats
CREATE OR REPLACE FUNCTION update_product_review_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update product average rating and review count
  UPDATE public.products 
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0) 
      FROM public.product_reviews 
      WHERE product_id = NEW.product_id AND is_approved = true
    ),
    review_count = (
      SELECT COUNT(*) 
      FROM public.product_reviews 
      WHERE product_id = NEW.product_id AND is_approved = true
    )
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_review_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_review_stats();

-- Create trigger to update helpfulness count
CREATE OR REPLACE FUNCTION update_review_helpfulness_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.product_reviews 
    SET helpful_count = (
      SELECT COUNT(*) 
      FROM public.review_helpfulness 
      WHERE review_id = NEW.review_id AND is_helpful = true
    )
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.product_reviews 
    SET helpful_count = (
      SELECT COUNT(*) 
      FROM public.review_helpfulness 
      WHERE review_id = OLD.review_id AND is_helpful = true
    )
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_review_helpfulness_count
  AFTER INSERT OR UPDATE OR DELETE ON public.review_helpfulness
  FOR EACH ROW EXECUTE FUNCTION update_review_helpfulness_count();