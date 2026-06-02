# Stripe Go-Live Checklist

The full Stripe integration is scaffolded and running in **sandbox** today
(test card `4242 4242 4242 4242`). To accept real money, complete the steps
below in order. No code changes are required.

## 1. Claim the Stripe sandbox account

In Lovable, open **Connectors → Lovable Cloud → Payments** and follow the
"Claim your Stripe account" link. Create the Stripe account (or sign in to an
existing one) and verify the email.

## 2. Activate live payments in Stripe

Complete the Stripe onboarding wizard (business details, bank account, 2FA,
review & submit). When prompted to copy products from sandbox to live,
choose **Copy** and include the **Lovable** app.

## 3. Install the Lovable app on the live account

If you skipped the copy step above, install the Lovable Stripe app on the
live account from the same Payments tab in Lovable.

## 4. Live API keys (automatic)

Once the app is installed on live, Lovable provisions these secrets
automatically — no manual action needed:

- `STRIPE_LIVE_API_KEY`
- `PAYMENTS_LIVE_WEBHOOK_SECRET`

The sandbox equivalents (`STRIPE_SANDBOX_API_KEY`,
`PAYMENTS_SANDBOX_WEBHOOK_SECRET`) are already in place.

## 5. Live publishable token

After publishing the project, Lovable writes the live publishable token to
`.env.production` as `VITE_PAYMENTS_CLIENT_TOKEN` (`pk_live_...`). The orange
"test mode" banner disappears automatically.

## 6. (Optional) Enable transactional payment emails

The custom payment-events email webhook at `/api/public/payment-events` is
disabled by default. To enable it, set:

```
PAYMENT_WEBHOOK_ENABLED=1
PAYMENT_WEBHOOK_DEBUG_TOKEN=<random-secret>
```

This endpoint is fire-and-forget — it's called internally by admin tools, not
by Stripe directly. Stripe's own webhook (`/api/public/payments/webhook`)
already handles subscription lifecycle events.

## 7. (Optional) Enable end-to-end tax / compliance

To have Stripe handle tax calculation, collection, and remittance globally
(+3.5% per transaction), add `managed_payments: { enabled: true }` to the
session in `src/utils/payments.functions.ts` → `createCheckoutSession`. For
calculation-only (+0.5%), use `automatic_tax: { enabled: true }` instead. PH
sellers without VAT registration can leave both off.

## What's already wired

- Embedded checkout (`/pricing` → upgrade buttons)
- Subscription dashboard (`/dashboard/billing`) with cancel, reactivate,
  invoices, and Stripe customer portal
- Webhook handler at `/api/public/payments/webhook?env=sandbox|live`
- Sandbox/live env detection via `VITE_PAYMENTS_CLIENT_TOKEN` prefix
- Test-mode banner site-wide while a `pk_test_…` token is active
- Subscription plans table with `stripe_lookup_key` already populated for
  Bronze / Silver / Gold / Platinum / Business

## Plan → lookup_key map

| Plan     | lookup_key         | Price (PHP/mo) |
| -------- | ------------------ | -------------- |
| Bronze   | `bronze_monthly`   | 80             |
| Silver   | `silver_monthly`   | 150            |
| Gold     | `gold_monthly`     | 280            |
| Platinum | `platinum_monthly` | 500            |
| Business | `business_monthly` | 1,200          |

Products and prices for these lookup keys need to exist in Stripe before
live checkout works. In the Stripe dashboard (sandbox or live), create a
Product for each plan, add a recurring monthly PHP price, and set the
**lookup_key** to the value above. Once set, the same key works in both
sandbox and live.
