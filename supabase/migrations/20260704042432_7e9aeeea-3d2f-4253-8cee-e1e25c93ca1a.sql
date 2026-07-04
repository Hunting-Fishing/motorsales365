ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS club_discount JSONB;

COMMENT ON COLUMN public.payments.club_discount IS
  'Immutable snapshot of the club-member discount applied to this payment. Shape: { club_id, club_name, club_slug, scope, discount_pct, discount_amount_php, original_amount_php, final_amount_php, applied_at, eligibility_reason, grant_id }. Written server-side when the discount is granted; do not mutate after checkout.';

CREATE INDEX IF NOT EXISTS payments_club_discount_club_id_idx
  ON public.payments ((club_discount->>'club_id'))
  WHERE club_discount IS NOT NULL;