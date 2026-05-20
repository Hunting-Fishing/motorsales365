# Audit findings

## How the system works today

**Catalog** — `subscription_plans` has 6 plans (Free, Bronze ₱80, Silver ₱150, Gold ₱280, Platinum ₱500, Business ₱1200). Each paid plan has a `stripe_lookup_key` (e.g. `bronze_monthly`). Listing/boost fees live in `pricing_settings`.

**Auth** — Supabase email + Google + magic link. Roles in `user_roles`, checked via `has_role()`.

**Payment flow (intended)**
1. `/pricing` → user confirms a plan
2. New subscriber → `createCheckoutSession` opens Stripe embedded checkout → returns `client_secret`
3. Existing subscriber → `updateSubscriptionPlan` modifies the existing Stripe subscription with `always_invoice` (upgrades) or `create_prorations` (downgrades)
4. Stripe → webhook `/api/public/payments/webhook?env=sandbox` → upserts into `subscriptions` (resolving `lookup_key` → `plan_id`) and inserts a `payments` row on `invoice.paid`
5. `/dashboard/billing` shows current plan, cancel/reactivate, Stripe portal for card management, downloadable invoice history

**Entitlements** — Derived live from `subscriptions` joined to `subscription_plans`. Renewals managed entirely by Stripe.

## Gaps blocking the flow

1. **CRITICAL — No Stripe products exist in the sandbox.** The `stripe_lookup_key` values in the DB don't correspond to any real Stripe price. `stripe.prices.list({ lookup_keys })` in `createCheckoutSession` returns empty → throws `"Price not found"`. **Every checkout attempt currently fails before opening.** This is the single biggest reason nothing works end-to-end yet.
2. **3 stale `pending` payment rows** in the `payments` table from prior failed attempts (Bronze ₱80, Silver ₱150 ×2). Created before checkout opened, never cleaned up because checkout errored out. They pollute billing history and the prorated-credit calculation.
3. **`pricing.tsx` writes a `pending` payments row even for Stripe paid flows.** The webhook later inserts the real `paid` row (keyed by `stripe_invoice:...`), so the pending row stays orphaned. Stripe-paid flows should not write to `payments` from the client.
4. **Minor — `webhook.ts` imports `Stripe` types directly.** Already works because `stripe` is installed, but worth keeping.

# Plan

## 1. Create Stripe products + prices (sandbox)
Use `payments--batch_create_product` to create the 5 paid plans with the lookup keys already stored in the DB. Currency PHP, monthly recurring, qty 1-1.

## 2. Clean up stale pending payments
Delete the 3 pending `payments` rows that were never paid (migration with `DELETE FROM payments WHERE status='pending' AND reference IS NULL AND kind='subscription'`).

## 3. Stop writing pending `payments` rows from the client
In `pricing.tsx`, remove the client-side `payments.insert(...pending...)` calls that run before opening Stripe checkout. The webhook is the single source of truth for Stripe-paid records.

## 4. Verification + manual test plan

After the changes, the flow to test in preview:

**Setup**
- Sign in (or sign up) as a regular user
- Go to `/pricing`. You should see the orange test-mode banner with card `4242 4242 4242 4242`.

**Test card**
- Number: `4242 4242 4242 4242`
- Expiry: any future date (e.g. `12/30`)
- CVC: any 3 digits (e.g. `123`)
- ZIP: any (e.g. `12345`)

**New subscription**
1. From Free, click **Subscribe** on Bronze (₱80) → confirm in dialog
2. Embedded checkout opens → enter test card → submit
3. You're redirected to `/checkout/return`, then back to `/pricing`
4. Within ~5s the badge on Bronze should flip to "Current plan"
5. `/dashboard/billing` shows Bronze active, one invoice in history, "Cancel" + "Manage payment method" buttons

**Upgrade (Stripe-native proration)**
1. While on Bronze, click **Upgrade** on Silver
2. Confirmation dialog shows the prorated "charge now" amount (~₱70 if mid-cycle)
3. Confirm → no checkout opens (subscription is modified in place using the saved card)
4. Toast confirms; badge moves to Silver; new invoice appears in history for the difference

**Downgrade**
1. On Silver, click **Downgrade** to Bronze → confirm
2. Plan flips to Bronze immediately; no charge; credit accrues for next renewal (visible on next invoice)

**Cancel + reactivate**
1. `/dashboard/billing` → **Cancel subscription** → UI shows "Ends on <date>"
2. **Reactivate** → returns to active

**Manage card**
1. `/dashboard/billing` → **Manage payment method** opens Stripe portal in a new tab (must be the actual preview tab, not the Lovable iframe)

## Tech notes
- Webhook schema/handler is correct (resolves `lookup_key` → `plan_id`, cancels stale rows, persists `current_period_start/end`, inserts a `payments` row on `invoice.paid` with `reference='stripe_invoice:...'` for idempotency).
- `attachSupabaseAuth` is wired in `src/start.ts` so serverFn calls include the user's bearer token.
- `PAYMENTS_SANDBOX_WEBHOOK_SECRET` and `STRIPE_SANDBOX_API_KEY` are already provisioned.
