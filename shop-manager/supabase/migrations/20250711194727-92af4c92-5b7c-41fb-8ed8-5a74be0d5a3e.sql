-- Create products system tables
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_category_id UUID REFERENCES public.product_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  sku TEXT UNIQUE,
  category_id UUID REFERENCES public.product_categories(id),
  price NUMERIC(10,2),
  compare_price NUMERIC(10,2),
  cost_price NUMERIC(10,2),
  inventory_quantity INTEGER DEFAULT 0,
  weight NUMERIC(8,2),
  images JSONB DEFAULT '[]',
  features JSONB DEFAULT '[]',
  specifications JSONB DEFAULT '{}',
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  average_rating NUMERIC(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create API endpoints table for integration system
CREATE TABLE public.api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.shop_integrations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  headers JSONB DEFAULT '{}',
  parameters JSONB DEFAULT '{}',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  last_called_at TIMESTAMP WITH TIME ZONE,
  response_time_ms INTEGER,
  success_rate NUMERIC(5,2) DEFAULT 100.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product submissions table
CREATE TABLE public.product_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  product_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  suggested_price NUMERIC(10,2),
  images JSONB DEFAULT '[]',
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for products system
CREATE POLICY "Everyone can view active product categories" ON public.product_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Everyone can view active products" ON public.products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Customers can view approved reviews" ON public.product_reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Customers can create reviews" ON public.product_reviews
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Admin policies for products
CREATE POLICY "Admins can manage product categories" ON public.product_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
    )
  );

-- API endpoints policies
CREATE POLICY "Shop members can view API endpoints" ON public.api_endpoints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shop_integrations si
      JOIN public.profiles p ON p.shop_id = si.shop_id
      WHERE si.id = api_endpoints.integration_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "Shop admins can manage API endpoints" ON public.api_endpoints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shop_integrations si
      JOIN public.profiles p ON p.shop_id = si.shop_id
      JOIN public.user_roles ur ON ur.user_id = p.id
      JOIN public.roles r ON r.id = ur.role_id
      WHERE si.id = api_endpoints.integration_id 
      AND p.id = auth.uid() 
      AND r.name IN ('admin', 'owner')
    )
  );

-- Product submissions policies
CREATE POLICY "Customers can view own submissions" ON public.product_submissions
  FOR SELECT USING (customer_id IN (
    SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Customers can create submissions" ON public.product_submissions
  FOR INSERT WITH CHECK (customer_id IN (
    SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all submissions" ON public.product_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_endpoints_updated_at
  BEFORE UPDATE ON public.api_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_submissions_updated_at
  BEFORE UPDATE ON public.product_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample product categories
INSERT INTO public.product_categories (name, description) VALUES
('Hand Tools', 'Manual tools for various automotive tasks'),
('Power Tools', 'Electric and pneumatic tools'),
('Diagnostic Equipment', 'Tools for vehicle diagnosis and testing'),
('Lifting Equipment', 'Jacks, lifts, and hoists'),
('Safety Equipment', 'Personal protective equipment'),
('Cleaning Supplies', 'Automotive cleaning products');

-- Insert sample products
INSERT INTO public.products (name, description, short_description, sku, category_id, price, features, specifications) 
SELECT 
  'Professional Socket Set',
  'Complete 120-piece socket set with metric and standard sizes',
  '120-piece professional socket set',
  'SOCKET-120-PRO',
  id,
  299.99,
  '["120 pieces", "Metric and standard", "Chrome vanadium steel", "Lifetime warranty"]',
  '{"pieces": 120, "material": "Chrome vanadium steel", "case": "Blow molded"}'
FROM public.product_categories WHERE name = 'Hand Tools' LIMIT 1;

INSERT INTO public.products (name, description, short_description, sku, category_id, price, features, specifications)
SELECT 
  'OBD2 Scanner Pro',
  'Advanced diagnostic scanner with live data streaming',
  'Professional OBD2 diagnostic scanner',
  'OBD2-SCAN-PRO',
  id,
  449.99,
  '["Live data", "All protocols", "Color display", "Wi-Fi updates"]',
  '{"protocols": "All OBD2", "display": "4.3 inch color", "connectivity": "Wi-Fi, USB"}'
FROM public.product_categories WHERE name = 'Diagnostic Equipment' LIMIT 1;