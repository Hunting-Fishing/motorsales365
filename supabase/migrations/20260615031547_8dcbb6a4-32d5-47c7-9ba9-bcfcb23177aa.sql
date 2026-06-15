
-- 1. Sequence + column
CREATE SEQUENCE IF NOT EXISTS public.profiles_member_number_seq;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS member_number BIGINT;

-- 2. Backfill in created_at order so older users get lower numbers
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.profiles
  WHERE member_number IS NULL
)
UPDATE public.profiles p
SET member_number = o.rn
FROM ordered o
WHERE p.id = o.id;

-- 3. Advance the sequence past existing max
SELECT setval(
  'public.profiles_member_number_seq',
  GREATEST(COALESCE((SELECT MAX(member_number) FROM public.profiles), 0), 1),
  true
);

-- 4. Default + unique
ALTER TABLE public.profiles
  ALTER COLUMN member_number SET DEFAULT nextval('public.profiles_member_number_seq');

ALTER SEQUENCE public.profiles_member_number_seq OWNED BY public.profiles.member_number;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_member_number_key
  ON public.profiles(member_number);

-- 5. Trigger to assign on insert if NULL was passed
CREATE OR REPLACE FUNCTION public.assign_profile_member_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.member_number IS NULL THEN
    NEW.member_number := nextval('public.profiles_member_number_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_profile_member_number ON public.profiles;
CREATE TRIGGER trg_assign_profile_member_number
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_profile_member_number();
