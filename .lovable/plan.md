
# Stripe scaffold — ready for keys

Goal: every Stripe code path is wired and production-shaped. The only thing missing on go-live night is pasting 4 secrets + flipping a flag. Then move on to map polish + about copy already done.

## What's already in place (no work needed)
- `src/lib/stripe.server.ts` — gateway client (`createStripeClient`)
- `src/lib/stripe.ts` — `getStripe()` + env detection
- `src/components/StripeEmbeddedCheckout.tsx` + `useStripeCheckout` hook
- `src/components/PaymentTestModeBanner.tsx`
- `src/utils/payments.functions.ts` — `createCheckoutSession` server fn
- `src/routes/api/public/payments/webhook.ts` — Stripe subscription webhook
- `src/routes/checkout.return.tsx` — return page
- `.env.development` has `VITE_PAYMENTS_CLIENT_TOKEN` (sandbox `pk_test_…`)

## What I'll scaffold now

### 1. Products & prices (test env, auto-syncs to live)
Use `payments--batch_create_product` to register the catalog so `lookup_keys` resolve in checkout. Based on `/pricing` + boost UI:
- `plan_pro` → `pro_monthly`, `pro_yearly`
- `plan_business` → `business_monthly`, `business_yearly`
- `listing_boost_7d` → `boost_7d` (one-time)
- `listing_boost_30d` → `boost_30d` (one-time)
- `featured_business_30d` → `featured_business_30d` (one-time)

All set `tax_code: txcd_10000000` (general digital). Quantity 1/1.

### 2. Add `verifyWebhook` to `stripe.server.ts`
Currently `payments/webhook.ts` exists but I'll verify it uses the canonical HMAC verifier (`verifyWebhook`) and the subscriptions table shape. Add the helper if missing.

### 3. `subscriptions` table migration
Confirm/create `public.subscriptions` with the canonical schema (user_id, stripe_subscription_id, price_id, status, environment, period dates, RLS + `has_active_subscription()` RPC). Skip if already present.

### 4. Wire `/payments` page
- Flip CC + GCash + GrabPay + Maya rows from `soon` → `live` (all handled by Stripe in PH).
- Drop methods we won't ship (PayMongo standalone, raw bank transfer "planned").
- Remove "while we finish wiring online payments…" banner.
- Gate live display on `STRIPE_SANDBOX_API_KEY` presence — until secrets land, keep methods labeled "sandbox testing" with the orange `PaymentTestModeBanner` visible.

### 5. Wire checkout into billing/boost CTAs
- `dashboard.billing.tsx` upgrade buttons → `openCheckout({ priceId: 'pro_monthly', userId, customerEmail })`
- Listing boost buttons → `openCheckout({ priceId: 'boost_7d' | 'boost_30d' })`
- Featured business CTA → `openCheckout({ priceId: 'featured_business_30d' })`

### 6. Payment-events email webhook
Replace the debug-token placeholder in `src/routes/api/public/payment-events.tsx` with real Stripe signature verification (reuse `verifyWebhook`). Keep `PAYMENT_WEBHOOK_ENABLED` gate — defaults off until go-live night.

### 7. Secrets checklist (documented, not requested tonight)
Add a short admin-visible note listing what's needed when you're ready:
- `STRIPE_SANDBOX_API_KEY`
- `STRIPE_LIVE_API_KEY`
- `PAYMENTS_SANDBOX_WEBHOOK_SECRET`
- `PAYMENTS_LIVE_WEBHOOK_SECRET`
- `.env.production` `VITE_PAYMENTS_CLIENT_TOKEN` (`pk_live_…`)
- `PAYMENT_WEBHOOK_ENABLED=1`

Won't call `add_secret` tonight per your instruction.

## Out of scope tonight
- Actually entering keys / hitting Stripe live
- Activating `managed_payments` (decide at go-live: +3.5% vs +0.5% `automatic_tax`)
- Map clustering (separate task)

## Files touched
- `supabase/migrations/*` — subscriptions table (if missing)
- `src/lib/stripe.server.ts` — add `verifyWebhook`
- `src/routes/api/public/payments/webhook.ts` — verify canonical shape
- `src/routes/api/public/payment-events.tsx` — real signature verify
- `src/routes/payments.tsx` — flip live methods, drop placeholders
- `src/routes/dashboard.billing.tsx` — wire `useStripeCheckout`
- `src/routes/listing.$id.tsx` (+ boost UI) — wire boost checkout
- `src/components/site-layout.tsx` — mount `<PaymentTestModeBanner />` if not already
- New: `docs/STRIPE_GOLIVE.md` — the 4-secret checklist

After approval I'll also call `payments--batch_create_product` to register the catalog.
