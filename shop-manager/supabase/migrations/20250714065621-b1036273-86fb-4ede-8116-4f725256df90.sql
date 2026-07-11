-- Phase 5: Advanced E-commerce Features Database Schema

-- Product Bundles Table
CREATE TABLE public.product_bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  bundle_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed', 'dynamic', 'custom'
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  minimum_quantity INTEGER DEFAULT 1,
  maximum_quantity INTEGER,
  category_id UUID,
  tags TEXT[],
  image_url TEXT,
  is_featured BOOLEAN DEFAULT false
);

-- Bundle Items (Products in bundles)
CREATE TABLE public.bundle_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.product_bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_required BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  custom_price NUMERIC(10,2), -- Override product price for bundle
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Dynamic Pricing Rules
CREATE TABLE public.pricing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL, -- 'time_based', 'quantity_based', 'customer_tier', 'inventory_based'
  target_type TEXT NOT NULL, -- 'product', 'category', 'bundle'
  target_id UUID, -- References products, product_categories, or bundles
  conditions JSONB NOT NULL DEFAULT '{}', -- Rule conditions
  actions JSONB NOT NULL DEFAULT '{}', -- Price adjustments
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  usage_limit INTEGER, -- How many times this rule can be applied
  usage_count INTEGER DEFAULT 0
);

-- Product Variants (size, color, specifications)
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  variant_type TEXT NOT NULL, -- 'size', 'color', 'material', 'specification'
  variant_value TEXT NOT NULL,
  price_adjustment NUMERIC(10,2) DEFAULT 0, -- Price difference from base product
  sku TEXT UNIQUE,
  stock_quantity INTEGER DEFAULT 0,
  weight NUMERIC(8,2),
  dimensions JSONB, -- {length, width, height, unit}
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sort_order INTEGER DEFAULT 0,
  image_url TEXT,
  UNIQUE(parent_product_id, variant_type, variant_value)
);

-- Bulk Pricing Tiers
CREATE TABLE public.bulk_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  bundle_id UUID REFERENCES public.product_bundles(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  minimum_quantity INTEGER NOT NULL,
  maximum_quantity INTEGER,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage', 'fixed_amount', 'fixed_price'
  discount_value NUMERIC(10,2) NOT NULL,
  customer_tier TEXT, -- 'retail', 'wholesale', 'contractor', 'distributor'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CHECK (
    (product_id IS NOT NULL AND bundle_id IS NULL AND variant_id IS NULL) OR
    (product_id IS NULL AND bundle_id IS NOT NULL AND variant_id IS NULL) OR
    (product_id IS NULL AND bundle_id IS NULL AND variant_id IS NOT NULL)
  )
);

-- Inventory Alerts
CREATE TABLE public.inventory_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'low_stock', 'out_of_stock', 'overstocked', 'reorder_point'
  threshold_value INTEGER NOT NULL,
  current_value INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
  message TEXT,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  notification_sent BOOLEAN DEFAULT false,
  CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL) OR
    (product_id IS NULL AND variant_id IS NOT NULL)
  )
);

-- Product Analytics Enhanced
CREATE TABLE public.product_interaction_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  bundle_id UUID REFERENCES public.product_bundles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  interaction_type TEXT NOT NULL, -- 'view', 'click', 'add_to_cart', 'purchase', 'save', 'share', 'compare'
  interaction_data JSONB DEFAULT '{}',
  referrer_url TEXT,
  user_agent TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  location_data JSONB, -- IP-based location if available
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  revenue_generated NUMERIC(10,2) DEFAULT 0
);

-- Enable RLS on all tables
ALTER TABLE public.product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_interaction_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for general access
CREATE POLICY "Public can view active bundles" ON public.product_bundles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view bundle items" ON public.bundle_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.product_bundles pb 
    WHERE pb.id = bundle_items.bundle_id AND pb.is_active = true
  ));

CREATE POLICY "Public can view active pricing rules" ON public.pricing_rules
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view available variants" ON public.product_variants
  FOR SELECT USING (is_available = true);

CREATE POLICY "Public can view bulk pricing" ON public.bulk_pricing
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can view inventory alerts" ON public.inventory_alerts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can insert product analytics" ON public.product_interaction_analytics
  FOR INSERT WITH CHECK (true);

-- Admin policies
CREATE POLICY "Admins can manage bundles" ON public.product_bundles
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
  ));

CREATE POLICY "Admins can manage bundle items" ON public.bundle_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
  ));

CREATE POLICY "Admins can manage pricing rules" ON public.pricing_rules
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
  ));

CREATE POLICY "Admins can manage variants" ON public.product_variants
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
  ));

CREATE POLICY "Admins can manage bulk pricing" ON public.bulk_pricing
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
  ));

CREATE POLICY "Admins can manage inventory alerts" ON public.inventory_alerts
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
  ));

-- Indexes for performance
CREATE INDEX idx_product_bundles_active ON public.product_bundles(is_active, start_date, end_date);
CREATE INDEX idx_bundle_items_bundle_id ON public.bundle_items(bundle_id);
CREATE INDEX idx_pricing_rules_target ON public.pricing_rules(target_type, target_id, is_active);
CREATE INDEX idx_product_variants_parent ON public.product_variants(parent_product_id, is_available);
CREATE INDEX idx_bulk_pricing_product ON public.bulk_pricing(product_id, minimum_quantity);
CREATE INDEX idx_inventory_alerts_status ON public.inventory_alerts(status, alert_type);
CREATE INDEX idx_product_analytics_product ON public.product_interaction_analytics(product_id, created_at);
CREATE INDEX idx_product_analytics_session ON public.product_interaction_analytics(session_id, created_at);

-- Triggers for updated_at
CREATE TRIGGER update_product_bundles_updated_at
  BEFORE UPDATE ON public.product_bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_shopping_tables_timestamp();

CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_shopping_tables_timestamp();

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_shopping_tables_timestamp();

CREATE TRIGGER update_bulk_pricing_updated_at
  BEFORE UPDATE ON public.bulk_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_shopping_tables_timestamp();

-- Automatically create inventory alerts when stock is low
CREATE OR REPLACE FUNCTION check_inventory_levels()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for low stock on products
  IF TG_TABLE_NAME = 'products' THEN
    IF NEW.stock_quantity <= NEW.low_stock_threshold AND OLD.stock_quantity > NEW.low_stock_threshold THEN
      INSERT INTO public.inventory_alerts (product_id, alert_type, threshold_value, current_value, message)
      VALUES (NEW.id, 'low_stock', NEW.low_stock_threshold, NEW.stock_quantity, 
              'Product "' || NEW.title || '" is running low on stock');
    END IF;
    
    IF NEW.stock_quantity = 0 AND OLD.stock_quantity > 0 THEN
      INSERT INTO public.inventory_alerts (product_id, alert_type, threshold_value, current_value, message)
      VALUES (NEW.id, 'out_of_stock', 0, 0, 
              'Product "' || NEW.title || '" is out of stock');
    END IF;
  END IF;
  
  -- Check for low stock on variants
  IF TG_TABLE_NAME = 'product_variants' THEN
    IF NEW.stock_quantity <= 5 AND OLD.stock_quantity > 5 THEN
      INSERT INTO public.inventory_alerts (variant_id, alert_type, threshold_value, current_value, message)
      VALUES (NEW.id, 'low_stock', 5, NEW.stock_quantity, 
              'Product variant "' || NEW.variant_name || '" is running low on stock');
    END IF;
    
    IF NEW.stock_quantity = 0 AND OLD.stock_quantity > 0 THEN
      INSERT INTO public.inventory_alerts (variant_id, alert_type, threshold_value, current_value, message)
      VALUES (NEW.id, 'out_of_stock', 0, 0, 
              'Product variant "' || NEW.variant_name || '" is out of stock');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_stock_check
  AFTER UPDATE OF stock_quantity ON public.products
  FOR EACH ROW EXECUTE FUNCTION check_inventory_levels();

CREATE TRIGGER variants_stock_check
  AFTER UPDATE OF stock_quantity ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION check_inventory_levels();