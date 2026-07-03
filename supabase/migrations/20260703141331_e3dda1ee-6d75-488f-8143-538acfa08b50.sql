INSERT INTO public.pricing_settings (key, value, label, description) VALUES
  ('club_member_discount_coupon_duration', 0, 'Club coupon duration',
   'Stripe coupon duration for the club-member discount. 0 = auto (once for one-time payments, forever for subscriptions), 1 = once (single invoice only), 2 = forever (applies to every renewal).'),
  ('club_member_discount_require_verified', 1, 'Require verified club',
   'When 1, only members of clubs marked verified=true qualify. When 0, any active club counts.'),
  ('club_member_discount_include_pending_clubs', 0, 'Include pending clubs',
   'When 1, members of clubs in status=pending also qualify. Default 0 (active clubs only).'),
  ('club_member_discount_include_pending_members', 0, 'Include pending members',
   'When 1, memberships in status=pending also qualify. Default 0 (active members only).')
ON CONFLICT (key) DO NOTHING;