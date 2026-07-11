
-- Phase 1: Settings Architecture Consolidation
-- First, let's audit and consolidate the fragmented settings system

-- Create a unified settings schema with proper hierarchy and validation
CREATE TABLE public.unified_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'company', 'branding', 'security', 'email', etc.
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  validation_rules JSONB DEFAULT '{}',
  is_encrypted BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(shop_id, category, key)
);

-- Create indexes for better performance
CREATE INDEX idx_unified_settings_shop_category ON public.unified_settings(shop_id, category);
CREATE INDEX idx_unified_settings_key ON public.unified_settings(shop_id, key);

-- Enable RLS
ALTER TABLE public.unified_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for unified settings
CREATE POLICY "Users can view their shop's unified settings"
  ON public.unified_settings
  FOR SELECT
  USING (shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage their shop's unified settings"
  ON public.unified_settings
  FOR ALL
  USING (shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  ))
  WITH CHECK (shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Create business constants tables with proper structure
CREATE TABLE public.business_constants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'business_types', 'industries', 'payment_methods'
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(category, key)
);

-- Enable RLS for business constants (public read, admin write)
ALTER TABLE public.business_constants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active business constants"
  ON public.business_constants
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage business constants"
  ON public.business_constants
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('admin', 'owner')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('admin', 'owner')
  ));

-- Create proper UUID management table for temporary IDs
CREATE TABLE public.temp_uuid_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  temp_id UUID NOT NULL UNIQUE,
  entity_type TEXT NOT NULL, -- 'work_order', 'customer', etc.
  context JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  shop_id UUID REFERENCES public.shops(id),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  converted_to_permanent_id UUID,
  converted_at TIMESTAMP WITH TIME ZONE
);

-- Index for cleanup and lookups
CREATE INDEX idx_temp_uuid_expires ON public.temp_uuid_registry(expires_at);
CREATE INDEX idx_temp_uuid_user_shop ON public.temp_uuid_registry(user_id, shop_id);

-- Enable RLS
ALTER TABLE public.temp_uuid_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their temp UUIDs"
  ON public.temp_uuid_registry
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create comprehensive user preferences table
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'ui', 'notifications', 'workflow', etc.
  preferences JSONB NOT NULL DEFAULT '{}',
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, shop_id, category)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences"
  ON public.user_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Seed business constants with standard data
INSERT INTO public.business_constants (category, key, label, value, sort_order) VALUES
-- Business Types
('business_types', 'sole_proprietorship', 'Sole Proprietorship', 'sole_proprietorship', 1),
('business_types', 'partnership', 'Partnership', 'partnership', 2),
('business_types', 'llc', 'Limited Liability Company (LLC)', 'llc', 3),
('business_types', 'corporation', 'Corporation', 'corporation', 4),
('business_types', 's_corporation', 'S Corporation', 's_corporation', 5),
('business_types', 'nonprofit', 'Nonprofit Organization', 'nonprofit', 6),

-- Industries
('industries', 'automotive', 'Automotive', 'automotive', 1),
('industries', 'construction', 'Construction', 'construction', 2),
('industries', 'retail', 'Retail', 'retail', 3),
('industries', 'healthcare', 'Healthcare', 'healthcare', 4),
('industries', 'hospitality', 'Hospitality', 'hospitality', 5),
('industries', 'manufacturing', 'Manufacturing', 'manufacturing', 6),
('industries', 'technology', 'Technology', 'technology', 7),
('industries', 'transportation', 'Transportation', 'transportation', 8),
('industries', 'other', 'Other', 'other', 99),

-- Payment Methods
('payment_methods', 'cash', 'Cash', 'cash', 1),
('payment_methods', 'check', 'Check', 'check', 2),
('payment_methods', 'credit_card', 'Credit Card', 'credit_card', 3),
('payment_methods', 'debit_card', 'Debit Card', 'debit_card', 4),
('payment_methods', 'bank_transfer', 'Bank Transfer', 'bank_transfer', 5);

-- Create functions for settings management
CREATE OR REPLACE FUNCTION public.get_unified_setting(
  p_shop_id UUID,
  p_category TEXT,
  p_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  setting_value JSONB;
BEGIN
  SELECT value INTO setting_value
  FROM public.unified_settings
  WHERE shop_id = p_shop_id
    AND category = p_category
    AND key = p_key;
  
  RETURN COALESCE(setting_value, 'null'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_unified_setting(
  p_shop_id UUID,
  p_category TEXT,
  p_key TEXT,
  p_value JSONB,
  p_validation_rules JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  setting_id UUID;
BEGIN
  INSERT INTO public.unified_settings (
    shop_id, category, key, value, validation_rules, 
    created_by, updated_by
  ) VALUES (
    p_shop_id, p_category, p_key, p_value, p_validation_rules,
    auth.uid(), auth.uid()
  )
  ON CONFLICT (shop_id, category, key)
  DO UPDATE SET
    value = EXCLUDED.value,
    validation_rules = EXCLUDED.validation_rules,
    updated_by = auth.uid(),
    updated_at = now()
  RETURNING id INTO setting_id;
  
  RETURN setting_id;
END;
$$;

-- Create cleanup function for expired temporary UUIDs
CREATE OR REPLACE FUNCTION public.cleanup_expired_temp_uuids()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.temp_uuid_registry
  WHERE expires_at < now()
    AND converted_to_permanent_id IS NULL;
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_unified_settings_updated_at
  BEFORE UPDATE ON public.unified_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_constants_updated_at
  BEFORE UPDATE ON public.business_constants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
