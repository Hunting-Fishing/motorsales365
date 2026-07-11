-- Add Stripe product/price mapping to business_modules
ALTER TABLE business_modules 
ADD COLUMN IF NOT EXISTS stripe_product_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text,
ADD COLUMN IF NOT EXISTS monthly_price numeric(10,2) DEFAULT 0;

-- Update existing modules with Stripe IDs
UPDATE business_modules SET 
  stripe_product_id = 'prod_TjQuamW7bXdlp9',
  stripe_price_id = 'price_1Sly2TGapOfsltWt3PJVj6gu',
  monthly_price = 49.00
WHERE slug = 'automotive';

UPDATE business_modules SET 
  stripe_product_id = 'prod_TjQvjdaBkKsCDF',
  stripe_price_id = 'price_1Sly3aGapOfsltWtWLPzXWiv',
  monthly_price = 39.00
WHERE slug = 'power_washing';

UPDATE business_modules SET 
  stripe_product_id = 'prod_TjQv4acpfPjNlA',
  stripe_price_id = 'price_1Sly46GapOfsltWtUKenA0jO',
  monthly_price = 39.00
WHERE slug = 'gunsmith';

UPDATE business_modules SET 
  stripe_product_id = 'prod_TjQwLR1WwHrnDx',
  stripe_price_id = 'price_1Sly4RGapOfsltWt3cOnn8yE',
  monthly_price = 49.00
WHERE slug = 'marine';

-- Create table for tracking module subscriptions per user/shop
CREATE TABLE IF NOT EXISTS module_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  module_id uuid REFERENCES business_modules(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'trialing', -- trialing, active, canceled, past_due
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, module_id)
);

-- Enable RLS
ALTER TABLE module_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for module_subscriptions
CREATE POLICY "Users can view their shop's module subscriptions"
  ON module_subscriptions FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles 
      WHERE user_id = auth.uid() OR id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their shop's module subscriptions"
  ON module_subscriptions FOR ALL
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles 
      WHERE user_id = auth.uid() OR id = auth.uid()
    )
  );

-- Add trial settings to shops table
ALTER TABLE shops 
ADD COLUMN IF NOT EXISTS trial_started_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 14;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_module_subscriptions_shop ON module_subscriptions(shop_id);
CREATE INDEX IF NOT EXISTS idx_module_subscriptions_status ON module_subscriptions(status);