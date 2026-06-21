# PayPal payments + unified admin log

## 1. PayPal account setup (what you do)
You need a **PayPal Business account** + **Developer dashboard** access:
1. Go to https://developer.paypal.com → log in with your PayPal Business account.
2. Apps & Credentials → **Sandbox** → Create App → copy `Client ID` and `Secret`.
3. Switch to **Live** → Create App → copy `Client ID` and `Secret`.
4. In each app, enable the **Webhook** for events: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`, `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.PAYMENT.FAILED`. I'll give you the exact webhook URLs to paste in once the endpoint exists.
5. Hand me the 4 values via the secret form — I'll store them as `PAYPAL_SANDBOX_CLIENT_ID`, `PAYPAL_SANDBOX_SECRET`, `PAYPAL_LIVE_CLIENT_ID`, `PAYPAL_LIVE_SECRET` (plus two webhook IDs once webhooks are registered).

## 2. Database
One migration adds:
- `payment_provider` enum: `stripe`, `paypal`, `manual`.
- `payments.provider` column (default `stripe`, backfilled).
- `payments.provider_reference` (e.g. PayPal order/capture/subscription id) + unique index for idempotency.
- `paypal_subscriptions` table linking `user_id` → PayPal subscription id + plan kind (business/dispatch), mirroring the Stripe tables for reconciliation.
- Indexes on `payments(provider, created_at)` and a `profiles` join helper for name/email search.

## 3. Server (TanStack server functions + one public webhook route)
- `src/lib/paypal.server.ts` — REST client (OAuth token cache, sandbox/live switch, signature/webhook verification helper).
- `src/lib/paypal-checkout.functions.ts` — `createPayPalOrder({ kind, refId })` and `capturePayPalOrder({ orderId })` covering all four kinds: listing fee, boost, subscription (uses PayPal Subscriptions API), ad order. Pricing reuses existing `pricing_settings` / package tables so admin price edits apply to both rails.
- `src/routes/api/public/webhooks/paypal.ts` — verifies PayPal webhook signature, records `payments` rows via a shared `recordPaymentForPayPal` helper (mirrors the Stripe recorder), activates listings/boosts/subs.
- Existing checkout call sites (listing payment, boost, subscription, ad order) gain a `provider` param so the UI can pick Stripe or PayPal.

## 4. UI changes (minimal, additive)
- Checkout dialogs (listing fee, boost, subscription, ad order) get a **"Pay with"** toggle: Stripe card/e-wallets *or* PayPal. PayPal renders the official PayPal JS Buttons SDK using the publishable client ID.
- `/payments` info page: add PayPal to the Cards / E-wallets group as **Live**.

## 5. Admin payments log (`/admin/payments`)
Extend the existing page in place:
- Provider column + filter chips (All / Stripe / PayPal / Manual).
- Search box matching user **name OR email** (joined via `profiles`).
- Clicking a row's user name opens a **per-user purchase history drawer** (all payments across providers, totals, refund status).
- "Export CSV" button respecting active filters.
- Server-side pagination + filter pushed into one `adminListPayments` server function (admin-gated) so the table stays fast.

## 6. Verification
- Sandbox end-to-end test for each of: listing fee, boost, subscription start, ad order — confirm `payments` row is inserted once via webhook (idempotent on retry).
- Admin log filter/search/CSV smoke test.
- Switch toggle to live only after you confirm sandbox flows.

## Technical notes
- PayPal Orders v2 + Subscriptions v1 over REST (no SDK needed for Workers).
- Webhook verification uses PayPal's `/v1/notifications/verify-webhook-signature`; the webhook ID secret is stored per environment.
- `provider_reference` makes the recorder idempotent the same way `stripe_invoice:{id}` does today.
- No changes to existing Stripe code paths.

## Out of scope (ask if you want them)
- Refund initiation from the admin UI (today refunds are provider-side).
- Migrating existing Stripe subscribers to PayPal.
