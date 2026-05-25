
-- 1. Drop the over-broad public SELECT policy on profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- 2. Add an own-row SELECT policy so users can still read their own full profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 3. Create a SECURITY DEFINER public view exposing only non-sensitive fields.
--    Postgres views run as the view owner by default, which lets anon/auth
--    clients read these safe columns without exposing phone numbers or
--    Facebook verification codes through the underlying table.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT
  id,
  full_name,
  avatar_url,
  seller_type,
  business_name,
  business_logo_url,
  business_address,
  business_region,
  business_province,
  business_city,
  business_barangay,
  business_lat,
  business_lng,
  business_hours,
  business_kind,
  verification_status,
  verified_at,
  fb_profile_url,
  fb_profile_id,
  fb_verified_at,
  is_founding_member,
  founding_member_number,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
