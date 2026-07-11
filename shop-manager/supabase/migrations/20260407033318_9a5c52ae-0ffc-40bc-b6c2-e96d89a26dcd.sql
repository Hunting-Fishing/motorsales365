INSERT INTO business_modules (name, slug, description, icon, category, is_premium, default_enabled, related_industries, display_order, stripe_product_id, stripe_price_id, monthly_price)
VALUES (
  'Game Development',
  'game-development',
  'Complete game design planning and production management platform',
  'Gamepad2',
  'Creative',
  true,
  false,
  ARRAY['gaming', 'software', 'entertainment'],
  13,
  'prod_game_dev_starter',
  'price_game_dev_starter',
  9.00
);