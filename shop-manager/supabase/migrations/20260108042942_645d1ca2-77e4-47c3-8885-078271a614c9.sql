-- Add slug and invite_code columns to shops table for customer acquisition
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shops_slug ON public.shops(slug);
CREATE INDEX IF NOT EXISTS idx_shops_invite_code ON public.shops(invite_code);

-- Function to generate a random invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate slug from shop name
CREATE OR REPLACE FUNCTION generate_shop_slug(shop_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(shop_name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Update existing shops with slugs and invite codes
UPDATE public.shops 
SET 
  slug = generate_shop_slug(name) || '-' || substr(id::text, 1, 4),
  invite_code = generate_invite_code()
WHERE slug IS NULL OR invite_code IS NULL;

-- Trigger to auto-generate slug and invite_code for new shops
CREATE OR REPLACE FUNCTION set_shop_slug_and_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_shop_slug(NEW.name) || '-' || substr(NEW.id::text, 1, 4);
  END IF;
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_shop_slug_and_code ON public.shops;
CREATE TRIGGER trigger_set_shop_slug_and_code
BEFORE INSERT ON public.shops
FOR EACH ROW
EXECUTE FUNCTION set_shop_slug_and_code();