## Goal

Three problems on `/dispatch`:
1. Pricing is wrong and seat counts don't match the new model.
2. There's no actual sign-up form for joining the dispatch network — the page jumps straight to checkout.
3. The **Subscribe** button silently fails (the checkout iframe loads but no payment form ever renders).

## 1. Re-price to the new model

New plans (PHP, monthly, driver-seat based):

| Slug | Name | Price | Drivers | Notes |
|---|---|---|---|---|
| `dispatch_solo_monthly` | Solo | ₱250/mo | 1 driver | Single-operator owner-driver |
| `dispatch_team_monthly` | Team | ₱500/mo | Up to 5 drivers | Small shop |
| `dispatch_unlimited_monthly` | Unlimited | ₱1,000/mo | Unlimited drivers | Fleet operator |

Apply this everywhere a tier is referenced:
- `src/routes/dispatch.tsx` — rewrite `PLANS` array, hero copy ("from ₱250/month"), feature matrix `TIERS`, `FEATURE_GROUPS` rows (price, driver seats, regions, perks).
- `src/routes/dispatch.checkout.tsx` — update `VALID_PRICES` set.
- `src/routes/dashboard.dispatch.tsx` — rewrite `PLAN_LABELS` and the `maxRegions` mapping (Solo=1, Team=3, Unlimited=99); update `PLAN_LABELS` keys (`dispatch_solo`, `dispatch_team`, `dispatch_unlimited`).
- `src/routes/admin.dispatch.tsx` — same `PLAN_LABELS` rename.
- `src/routes/api/public/payments/webhook.ts` — fallback `dispatch_starter` → `dispatch_solo`.
- `src/lib/dispatch.functions.ts` and the match function — anywhere `plan_slug` is read for region/driver caps.

Bump the "Last updated" date on `/terms` and `/refund-policy` since fee tiers changed (project memory rule).

## 2. Create the Stripe products + prices

The slugs above don't exist in Stripe yet — that's the root cause of the "Subscribe does nothing" bug (`prices.list({ lookup_keys: [slug] })` returns empty and `createCheckoutSession` throws "Price not found", which the iframe swallows).

Use `payments--batch_create_product` to register all three at once with `recurring_interval: "month"`, `currency: "php"`, amounts `25000` / `50000` / `100000` (centavos), `tax_code: "txcd_10103001"` (SaaS).

## 3. Add a real "Join 365 Dispatch" sign-up form

New route `src/routes/dispatch.join.tsx` (under `_authenticated` gate redirect from `/dispatch` Subscribe buttons → `/login?redirect=/dispatch/join?priceId=…`).

The form collects, in one step:
- Company / operator name *
- Primary contact name * + phone * (PH-format) + email (prefilled from auth)
- Service regions (multi-select from `REGION_OPTIONS`, capped by chosen plan)
- Driver / truck count (number)
- Services offered (multi-check: tow car, motorcycle, flatbed, long-distance, heavy, recovery/winch-out)
- Accepted payments (GCash, Maya, Cash, Bank)
- 24/7 availability toggle
- Optional logo upload (reuses `AvatarUploader`)
- Agree-to-terms checkbox linking to `/terms`

On submit, a new server function `joinDispatchNetwork` (in `src/lib/dispatch.functions.ts`) does:
1. Upserts a `businesses` row (`type_slug='towing'`, `owner_id=userId`, `status='pending'`, fields above).
2. Upserts `provider_tow_rates` with `dispatch_enabled=false` (flips to `true` once Stripe webhook records active subscription), `dispatch_regions`, services, payments.
3. Returns `{ businessId }`.

After success, redirect to `/dispatch/checkout?priceId=...`. The checkout route's `useEffect` already redirects unauthenticated users — extend it to also redirect users with **no** `provider_tow_rates` row to `/dispatch/join?priceId=...` so checkout is only reachable when a profile exists.

The "Subscribe" buttons on `/dispatch` change from `/dispatch/checkout?priceId=…` → `/dispatch/join?priceId=…`. The Subscribe button label becomes **"Continue → Subscribe"** to set expectation that a profile step happens first.

## 4. Make the checkout error visible (not silent)

Two fixes so future Stripe errors stop being invisible:

**`src/utils/payments.functions.ts`** — wrap `createCheckoutSession` handler body in `try/catch`, import `getStripeErrorMessage` from `@/lib/stripe.server`, return `{ clientSecret } | { error }` instead of a bare string. (Per `stripe-checkout` knowledge: server-fn throws get swallowed by global middleware → generic 500.)

**`src/components/StripeEmbeddedCheckout.tsx`** — update `fetchClientSecret` to handle the new shape (`if ('error' in result) throw new Error(result.error)`), wrap the `<EmbeddedCheckoutProvider>` mount in an error boundary that shows the error message + retry button, and show a skeleton while loading. So if Stripe still can't find a price, the user sees "Price not configured — contact support" instead of a blank box.

## 5. Out of scope

- No changes to the dispatch matching algorithm.
- No changes to existing live `dispatch_subscriptions` rows — the new slugs are additive; existing rows keep their old plan_slug values. (None exist yet in live, only sandbox test data.)
- Annual / yearly billing — keep deferred behind `/pricing`.

## Files touched

- `src/routes/dispatch.tsx` — rewrite plans, copy, feature matrix
- `src/routes/dispatch.checkout.tsx` — new VALID_PRICES + profile-exists guard
- `src/routes/dispatch.join.tsx` — **new** sign-up form route
- `src/routes/dashboard.dispatch.tsx` — PLAN_LABELS + maxRegions
- `src/routes/admin.dispatch.tsx` — PLAN_LABELS
- `src/routes/api/public/payments/webhook.ts` — fallback slug
- `src/lib/dispatch.functions.ts` — add `joinDispatchNetwork` server fn
- `src/utils/payments.functions.ts` — `{ clientSecret | error }` shape + try/catch
- `src/components/StripeEmbeddedCheckout.tsx` — handle error shape + boundary UI
- `src/routes/terms.tsx`, `src/routes/refund-policy.tsx` — bump "Last updated"
- Stripe product/price creation via `payments--batch_create_product`
