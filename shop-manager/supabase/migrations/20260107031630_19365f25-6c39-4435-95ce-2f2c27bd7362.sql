-- Add tier column to module_subscriptions table
ALTER TABLE public.module_subscriptions 
ADD COLUMN IF NOT EXISTS tier text DEFAULT 'pro';

-- Add usage tracking table
CREATE TABLE IF NOT EXISTS public.module_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  module_slug text NOT NULL,
  period_start date NOT NULL DEFAULT date_trunc('month', now())::date,
  period_end date NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month - 1 day')::date,
  work_orders_created integer DEFAULT 0,
  invoices_created integer DEFAULT 0,
  customers_created integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, module_slug, period_start)
);

-- Enable RLS
ALTER TABLE public.module_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for module_usage
CREATE POLICY "Users can view their shop's usage"
  ON public.module_usage FOR SELECT
  USING (shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "System can insert usage records"
  ON public.module_usage FOR INSERT
  WITH CHECK (shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "System can update usage records"
  ON public.module_usage FOR UPDATE
  USING (shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_module_usage_shop_period 
  ON public.module_usage(shop_id, module_slug, period_start);

-- Function to increment usage
CREATE OR REPLACE FUNCTION public.increment_module_usage(
  p_shop_id uuid,
  p_module_slug text,
  p_usage_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start date := date_trunc('month', now())::date;
  v_period_end date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
  v_result json;
BEGIN
  -- Insert or update usage record
  INSERT INTO module_usage (shop_id, module_slug, period_start, period_end)
  VALUES (p_shop_id, p_module_slug, v_period_start, v_period_end)
  ON CONFLICT (shop_id, module_slug, period_start) DO NOTHING;

  -- Increment the appropriate counter
  IF p_usage_type = 'work_order' THEN
    UPDATE module_usage 
    SET work_orders_created = work_orders_created + 1, updated_at = now()
    WHERE shop_id = p_shop_id AND module_slug = p_module_slug AND period_start = v_period_start;
  ELSIF p_usage_type = 'invoice' THEN
    UPDATE module_usage 
    SET invoices_created = invoices_created + 1, updated_at = now()
    WHERE shop_id = p_shop_id AND module_slug = p_module_slug AND period_start = v_period_start;
  ELSIF p_usage_type = 'customer' THEN
    UPDATE module_usage 
    SET customers_created = customers_created + 1, updated_at = now()
    WHERE shop_id = p_shop_id AND module_slug = p_module_slug AND period_start = v_period_start;
  END IF;

  -- Return current usage
  SELECT json_build_object(
    'work_orders_created', work_orders_created,
    'invoices_created', invoices_created,
    'customers_created', customers_created
  ) INTO v_result
  FROM module_usage
  WHERE shop_id = p_shop_id AND module_slug = p_module_slug AND period_start = v_period_start;

  RETURN v_result;
END;
$$;