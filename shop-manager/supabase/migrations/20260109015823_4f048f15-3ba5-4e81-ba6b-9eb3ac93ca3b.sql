-- Insert Darren as a gunsmith team member with Shop Owner role
INSERT INTO gunsmith_team_members (
  shop_id,
  profile_id,
  role_id,
  is_active,
  hire_date
)
VALUES (
  'c690aa6b-4361-47d4-8748-6026d6c10271',
  '15771cce-cbee-4263-8a36-0a0b9d6f02fc',
  'bfd271d7-b5c8-4181-a523-58082270b618', -- Shop Owner role
  true,
  CURRENT_DATE
)
ON CONFLICT (shop_id, profile_id) DO NOTHING;