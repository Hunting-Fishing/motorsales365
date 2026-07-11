-- Update Business tier with proper caps (not unlimited)
UPDATE public.tier_api_limits 
SET 
  openai_calls_limit = 2000,
  openai_tokens_limit = 2000000,
  email_limit = 25000,
  updated_at = now()
WHERE tier_slug = 'business';