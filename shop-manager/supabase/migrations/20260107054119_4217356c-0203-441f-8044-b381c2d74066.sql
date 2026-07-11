-- Update Business tier with caps instead of unlimited
UPDATE public.tier_api_limits 
SET 
  openai_calls_limit = 2000,
  openai_tokens_limit = 2000000,
  email_limit = 25000,
  updated_at = now()
WHERE tier_name = 'business';

-- Create add-on packs table
CREATE TABLE public.api_addon_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_name TEXT NOT NULL,
  pack_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  cost_cents INTEGER NOT NULL,
  stripe_price_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default add-on packs
INSERT INTO public.api_addon_packs (pack_name, pack_type, quantity, price_cents, cost_cents) VALUES
  ('AI Boost Pack', 'openai', 500, 500, 50),
  ('SMS Pack', 'sms', 500, 1000, 400),
  ('Voice Pack', 'voice', 60, 500, 78),
  ('Email Pack', 'email', 5000, 500, 150);

-- Create purchased add-ons tracking
CREATE TABLE public.api_addon_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  purchased_by UUID NOT NULL,
  addon_pack_id UUID NOT NULL REFERENCES public.api_addon_packs(id),
  quantity_purchased INTEGER NOT NULL DEFAULT 1,
  remaining_quantity INTEGER NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  stripe_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for usage tracking
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON public.api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_shop_user_date ON public.api_usage_logs(shop_id, user_id, created_at);

-- Create view for monthly usage by user
CREATE OR REPLACE VIEW public.api_usage_by_user_monthly AS
SELECT 
  shop_id,
  user_id,
  date_trunc('month', created_at) AS month,
  api_service,
  COUNT(*) AS call_count,
  COALESCE(SUM(tokens_used), 0) AS total_tokens,
  COALESCE(SUM(estimated_cost_cents), 0) AS total_cost_cents
FROM public.api_usage_logs
GROUP BY shop_id, user_id, date_trunc('month', created_at), api_service;

-- Create view for daily usage by user
CREATE OR REPLACE VIEW public.api_usage_by_user_daily AS
SELECT 
  shop_id,
  user_id,
  date_trunc('day', created_at) AS day,
  api_service,
  COUNT(*) AS call_count,
  COALESCE(SUM(tokens_used), 0) AS total_tokens,
  COALESCE(SUM(estimated_cost_cents), 0) AS total_cost_cents
FROM public.api_usage_logs
GROUP BY shop_id, user_id, date_trunc('day', created_at), api_service;

-- Create function to get user usage for current period
CREATE OR REPLACE FUNCTION public.get_user_usage_current_period(p_shop_id UUID, p_user_id UUID)
RETURNS TABLE (
  api_service TEXT,
  call_count BIGINT,
  total_tokens BIGINT,
  total_cost_cents BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.api_service,
    COUNT(*)::BIGINT AS call_count,
    COALESCE(SUM(l.tokens_used), 0)::BIGINT AS total_tokens,
    COALESCE(SUM(l.estimated_cost_cents), 0)::BIGINT AS total_cost_cents
  FROM public.api_usage_logs l
  WHERE l.shop_id = p_shop_id
    AND l.user_id = p_user_id
    AND l.created_at >= date_trunc('month', CURRENT_DATE)
    AND l.created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY l.api_service;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to get all users usage for shop (manager view)
CREATE OR REPLACE FUNCTION public.get_shop_usage_by_user(
  p_shop_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  api_service TEXT,
  call_count BIGINT,
  total_tokens BIGINT,
  total_cost_cents BIGINT
) AS $$
DECLARE
  v_start DATE;
  v_end DATE;
BEGIN
  v_start := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE)::DATE);
  v_end := COALESCE(p_end_date, (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::DATE);
  
  RETURN QUERY
  SELECT 
    l.user_id,
    l.api_service,
    COUNT(*)::BIGINT AS call_count,
    COALESCE(SUM(l.tokens_used), 0)::BIGINT AS total_tokens,
    COALESCE(SUM(l.estimated_cost_cents), 0)::BIGINT AS total_cost_cents
  FROM public.api_usage_logs l
  WHERE l.shop_id = p_shop_id
    AND l.created_at >= v_start
    AND l.created_at < v_end
  GROUP BY l.user_id, l.api_service
  ORDER BY l.user_id, l.api_service;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS for addon tables
ALTER TABLE public.api_addon_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_addon_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active addon packs" ON public.api_addon_packs
  FOR SELECT USING (is_active = true);

CREATE POLICY "Shop members can view their addon purchases" ON public.api_addon_purchases
  FOR SELECT USING (
    shop_id IN (SELECT p.shop_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Use user_roles table for manager check with correct lowercase values
CREATE POLICY "Shop owners/managers can create addon purchases" ON public.api_addon_purchases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('owner', 'manager', 'admin')
    )
    AND shop_id IN (SELECT p.shop_id FROM public.profiles p WHERE p.id = auth.uid())
  );