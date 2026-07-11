-- Migrate DEFAULT_LOYALTY_TIERS to unified settings system
-- Create configurable loyalty tier templates per shop

WITH default_loyalty_tiers AS (
  SELECT jsonb_build_array(
    jsonb_build_object(
      'name', 'Standard',
      'threshold', 0,
      'benefits', 'Basic loyalty program benefits',
      'multiplier', 1,
      'color', 'green'
    ),
    jsonb_build_object(
      'name', 'Silver',
      'threshold', 1000,
      'benefits', '5% additional points on all purchases, priority scheduling',
      'multiplier', 1.05,
      'color', 'blue'
    ),
    jsonb_build_object(
      'name', 'Gold',
      'threshold', 5000,
      'benefits', '10% additional points on all purchases, priority scheduling, free courtesy vehicles',
      'multiplier', 1.1,
      'color', 'purple'
    ),
    jsonb_build_object(
      'name', 'Platinum',
      'threshold', 10000,
      'benefits', '15% additional points on all purchases, VIP service, free courtesy vehicles, complimentary inspections',
      'multiplier', 1.15,
      'color', 'amber'
    )
  ) AS tiers
)
INSERT INTO unified_settings (shop_id, category, key, value, created_by, updated_by) 
SELECT 
  p.shop_id,
  'loyalty',
  'tier_templates',
  dt.tiers,
  p.id,
  p.id
FROM profiles p, default_loyalty_tiers dt
WHERE p.shop_id IS NOT NULL
ON CONFLICT (shop_id, category, key) DO NOTHING;

-- Add loyalty program configuration defaults
INSERT INTO unified_settings (shop_id, category, key, value, created_by, updated_by) 
SELECT 
  p.shop_id,
  'loyalty',
  'enabled',
  'false'::jsonb,
  p.id,
  p.id
FROM profiles p
WHERE p.shop_id IS NOT NULL
ON CONFLICT (shop_id, category, key) DO NOTHING;

INSERT INTO unified_settings (shop_id, category, key, value, created_by, updated_by) 
SELECT 
  p.shop_id,
  'loyalty',
  'points_per_dollar',
  '1'::jsonb,
  p.id,
  p.id
FROM profiles p
WHERE p.shop_id IS NOT NULL
ON CONFLICT (shop_id, category, key) DO NOTHING;

INSERT INTO unified_settings (shop_id, category, key, value, created_by, updated_by) 
SELECT 
  p.shop_id,
  'loyalty',
  'points_expiration_days',
  '365'::jsonb,
  p.id,
  p.id
FROM profiles p
WHERE p.shop_id IS NOT NULL
ON CONFLICT (shop_id, category, key) DO NOTHING;