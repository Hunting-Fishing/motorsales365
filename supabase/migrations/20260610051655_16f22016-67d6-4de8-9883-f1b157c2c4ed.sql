
-- Enums
DO $$ BEGIN
  CREATE TYPE public.listing_price_kind AS ENUM ('asking','monthly','down_payment','starting_bid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.listing_registration_status AS ENUM ('registered','unregistered','for_transfer','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Columns
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS price_kind public.listing_price_kind NOT NULL DEFAULT 'asking',
  ADD COLUMN IF NOT EXISTS negotiable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_status public.listing_registration_status NOT NULL DEFAULT 'unknown';

-- Validation trigger: reject obvious placeholder prices on vehicle categories.
CREATE OR REPLACE FUNCTION public.listings_price_floor_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_floor numeric;
BEGIN
  -- Skip drafts; sellers may save partial work.
  IF NEW.status = 'draft' THEN RETURN NEW; END IF;

  IF NEW.price_kind IN ('monthly','down_payment') THEN
    v_floor := 1000;
  ELSIF NEW.category_slug = 'car' THEN
    v_floor := 20000;
  ELSIF NEW.category_slug = 'motorcycle' THEN
    v_floor := 5000;
  ELSIF NEW.category_slug IN ('truck','equipment','boat','airplane') THEN
    v_floor := 20000;
  ELSE
    v_floor := 0;
  END IF;

  IF v_floor > 0 AND NEW.price_php < v_floor THEN
    RAISE EXCEPTION 'Listing price ₱% is below the minimum ₱% for this category. Enter the real asking price (mark Negotiable or Monthly instead of using a placeholder).',
      NEW.price_php, v_floor
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_price_floor ON public.listings;
CREATE TRIGGER trg_listings_price_floor
  BEFORE INSERT OR UPDATE OF price_php, price_kind, category_slug, status
  ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.listings_price_floor_check();
