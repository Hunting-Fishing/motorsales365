-- Backfill: historical Vehicle Passport Premium purchases recorded before the
-- "passport_premium" payment_kind enum value existed have payment_id = NULL,
-- because the payments insert in activatePassportPremiumFromSession() was
-- silently failing (see migration 20260613042135). Create the missing
-- `payments` rows (priced from passport_premium_products) and link them back
-- via payment_id so revenue reporting ("Revenue by product") includes these
-- historical purchases.
WITH inserted AS (
  INSERT INTO public.payments (
    user_id, kind, status, amount_php, gross_amount_php, method, reference, paid_at, created_at
  )
  SELECT
    ppp.user_id,
    'passport_premium'::public.payment_kind,
    'paid'::public.payment_status,
    prod.price_php,
    prod.price_php,
    'stripe',
    COALESCE('stripe_session:' || ppp.stripe_session_id, 'backfill:passport_premium_purchases:' || ppp.id::text),
    ppp.created_at,
    ppp.created_at
  FROM public.passport_premium_purchases ppp
  JOIN public.passport_premium_products prod ON prod.slug = ppp.product_slug
  WHERE ppp.payment_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.payments p2
      WHERE p2.reference = COALESCE('stripe_session:' || ppp.stripe_session_id, 'backfill:passport_premium_purchases:' || ppp.id::text)
    )
  RETURNING id, reference
)
UPDATE public.passport_premium_purchases ppp
SET payment_id = inserted.id
FROM inserted
WHERE ppp.payment_id IS NULL
  AND COALESCE('stripe_session:' || ppp.stripe_session_id, 'backfill:passport_premium_purchases:' || ppp.id::text) = inserted.reference;
