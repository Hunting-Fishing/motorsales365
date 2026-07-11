-- API Usage Tracking Infrastructure

-- Table to log every paid API call
CREATE TABLE public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_service TEXT NOT NULL CHECK (api_service IN ('openai', 'twilio_sms', 'twilio_voice', 'resend_email')),
  function_name TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  units_used INTEGER DEFAULT 1,
  estimated_cost_cents INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for aggregated usage per billing period
CREATE TABLE public.api_usage_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  openai_calls INTEGER DEFAULT 0,
  openai_tokens INTEGER DEFAULT 0,
  openai_cost_cents INTEGER DEFAULT 0,
  sms_count INTEGER DEFAULT 0,
  sms_cost_cents INTEGER DEFAULT 0,
  voice_minutes INTEGER DEFAULT 0,
  voice_cost_cents INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  email_cost_cents INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id, billing_period_start)
);

-- Table for configurable limits per tier
CREATE TABLE public.tier_api_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_slug TEXT NOT NULL UNIQUE,
  tier_name TEXT NOT NULL,
  openai_calls_limit INTEGER NOT NULL DEFAULT 50,
  openai_tokens_limit INTEGER NOT NULL DEFAULT 50000,
  sms_limit INTEGER NOT NULL DEFAULT 100,
  voice_minutes_limit INTEGER NOT NULL DEFAULT 10,
  email_limit INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default tier limits
INSERT INTO public.tier_api_limits (tier_slug, tier_name, openai_calls_limit, openai_tokens_limit, sms_limit, voice_minutes_limit, email_limit)
VALUES 
  ('starter', 'Starter', 50, 50000, 100, 10, 500),
  ('pro', 'Professional', 500, 500000, 500, 60, 5000),
  ('business', 'Business', 999999, 9999999, 2000, 300, 999999);

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_api_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_usage_logs
CREATE POLICY "Users can view their shop's usage logs"
ON public.api_usage_logs FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Service role can insert usage logs"
ON public.api_usage_logs FOR INSERT
WITH CHECK (true);

-- RLS Policies for api_usage_summary
CREATE POLICY "Users can view their shop's usage summary"
ON public.api_usage_summary FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Service role can manage usage summaries"
ON public.api_usage_summary FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for tier_api_limits (read-only for all authenticated users)
CREATE POLICY "Anyone can view tier limits"
ON public.tier_api_limits FOR SELECT
USING (true);

-- Indexes for performance
CREATE INDEX idx_api_usage_logs_shop_created ON public.api_usage_logs(shop_id, created_at DESC);
CREATE INDEX idx_api_usage_logs_service ON public.api_usage_logs(api_service, created_at DESC);
CREATE INDEX idx_api_usage_summary_shop_period ON public.api_usage_summary(shop_id, billing_period_start);

-- Function to get current billing period usage
CREATE OR REPLACE FUNCTION public.get_current_period_usage(p_shop_id UUID)
RETURNS TABLE (
  openai_calls BIGINT,
  openai_tokens BIGINT,
  sms_count BIGINT,
  voice_minutes BIGINT,
  emails_sent BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN api_service = 'openai' THEN units_used ELSE 0 END), 0)::BIGINT as openai_calls,
    COALESCE(SUM(CASE WHEN api_service = 'openai' THEN tokens_used ELSE 0 END), 0)::BIGINT as openai_tokens,
    COALESCE(SUM(CASE WHEN api_service = 'twilio_sms' THEN units_used ELSE 0 END), 0)::BIGINT as sms_count,
    COALESCE(SUM(CASE WHEN api_service = 'twilio_voice' THEN units_used ELSE 0 END), 0)::BIGINT as voice_minutes,
    COALESCE(SUM(CASE WHEN api_service = 'resend_email' THEN units_used ELSE 0 END), 0)::BIGINT as emails_sent
  FROM public.api_usage_logs
  WHERE shop_id = p_shop_id
    AND created_at >= date_trunc('month', CURRENT_DATE)
    AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if usage is within limits
CREATE OR REPLACE FUNCTION public.check_usage_limit(
  p_shop_id UUID,
  p_tier_slug TEXT,
  p_api_service TEXT,
  p_units INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_usage RECORD;
  v_limits RECORD;
  v_current_usage BIGINT;
  v_limit BIGINT;
  v_allowed BOOLEAN;
BEGIN
  -- Get current usage
  SELECT * INTO v_usage FROM public.get_current_period_usage(p_shop_id);
  
  -- Get tier limits
  SELECT * INTO v_limits FROM public.tier_api_limits WHERE tier_slug = p_tier_slug;
  
  IF v_limits IS NULL THEN
    -- Default to starter if tier not found
    SELECT * INTO v_limits FROM public.tier_api_limits WHERE tier_slug = 'starter';
  END IF;
  
  -- Determine current usage and limit based on service
  CASE p_api_service
    WHEN 'openai' THEN
      v_current_usage := v_usage.openai_calls;
      v_limit := v_limits.openai_calls_limit;
    WHEN 'twilio_sms' THEN
      v_current_usage := v_usage.sms_count;
      v_limit := v_limits.sms_limit;
    WHEN 'twilio_voice' THEN
      v_current_usage := v_usage.voice_minutes;
      v_limit := v_limits.voice_minutes_limit;
    WHEN 'resend_email' THEN
      v_current_usage := v_usage.emails_sent;
      v_limit := v_limits.email_limit;
    ELSE
      v_current_usage := 0;
      v_limit := 999999;
  END CASE;
  
  v_allowed := (v_current_usage + p_units) <= v_limit;
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current_usage', v_current_usage,
    'limit', v_limit,
    'remaining', GREATEST(0, v_limit - v_current_usage),
    'percentage_used', ROUND((v_current_usage::NUMERIC / NULLIF(v_limit, 0)::NUMERIC) * 100, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;