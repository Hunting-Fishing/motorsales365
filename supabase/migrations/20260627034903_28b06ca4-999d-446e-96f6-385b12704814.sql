ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personal_email text;
CREATE INDEX IF NOT EXISTS profiles_personal_email_idx ON public.profiles ((lower(personal_email)));