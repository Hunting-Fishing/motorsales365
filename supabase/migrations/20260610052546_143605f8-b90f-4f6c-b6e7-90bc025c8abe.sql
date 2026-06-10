
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS monthly_php numeric(14,2),
  ADD COLUMN IF NOT EXISTS down_payment_php numeric(14,2);

CREATE OR REPLACE FUNCTION public.listings_price_floor_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_floor numeric;
BEGIN
  IF NEW.status = 'draft' THEN RETURN NEW; END IF;

  -- Per-category floor on the cash asking price (when > 0).
  IF NEW.price_php IS NOT NULL AND NEW.price_php > 0 THEN
    IF NEW.category_slug = 'motorcycle' THEN
      v_floor := 5000;
    ELSIF NEW.category_slug IN ('car','truck','equipment','boat','airplane') THEN
      v_floor := 20000;
    ELSE
      v_floor := 0;
    END IF;
    IF v_floor > 0 AND NEW.price_php < v_floor THEN
      RAISE EXCEPTION 'Asking price ₱% is below the minimum ₱% for this category.', NEW.price_php, v_floor
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.monthly_php IS NOT NULL AND NEW.monthly_php > 0 AND NEW.monthly_php < 1000 THEN
    RAISE EXCEPTION 'Monthly payment ₱% is below the minimum ₱1,000.', NEW.monthly_php
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.down_payment_php IS NOT NULL AND NEW.down_payment_php > 0 AND NEW.down_payment_php < 5000 THEN
    RAISE EXCEPTION 'Down payment ₱% is below the minimum ₱5,000.', NEW.down_payment_php
      USING ERRCODE = 'check_violation';
  END IF;

  -- Require at least one real price on published listings unless price is hidden.
  IF COALESCE(NEW.price_hidden, false) IS NOT TRUE THEN
    IF COALESCE(NEW.price_php, 0) <= 0
       AND COALESCE(NEW.monthly_php, 0) <= 0
       AND COALESCE(NEW.down_payment_php, 0) <= 0 THEN
      RAISE EXCEPTION 'Set an asking price, monthly payment, or down payment — or check "Hide price".'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_price_floor ON public.listings;
CREATE TRIGGER trg_listings_price_floor
  BEFORE INSERT OR UPDATE OF price_php, monthly_php, down_payment_php, price_hidden, category_slug, status
  ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.listings_price_floor_check();
