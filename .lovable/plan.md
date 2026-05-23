# Application audit — what is not fully set up

Scanned the full codebase, routes, server fns, migrations, and integrations. The app itself is largely complete (listings, rides, businesses + map, dashboard, admin, auth, email, referral, QR, brokerage). Below are the genuinely incomplete or half-wired surfaces, grouped by severity.

---

## 1. Payments — biggest gap

The payments stack is scaffolded but effectively non-functional in production.

**`/payments` page (`src/routes/payments.tsx`)**
- 0 methods are marked `live`. Every wallet, card, bank, and OTC option is `"soon"` or `"planned"`. The page advertises "while we finish wiring online payments…" with no live path.

**Stripe checkout (`src/lib/stripe.server.ts`, `src/components/StripeEmbeddedCheckout.tsx`, `src/routes/api/public/payments/webhook.ts`)**
- Code is fully written, but requires 4 secrets that don't appear to be set: `STRIPE_SANDBOX_API_KEY`, `STRIPE_LIVE_API_KEY`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET`, `PAYMENTS_LIVE_WEBHOOK_SECRET`. Plus client token `VITE_PAYMENTS_CLIENT_TOKEN` (used to detect test mode).
- Without these, any plan upgrade / boost purchase will throw at the server fn boundary.

**Payment-events email webhook (`src/routes/api/public/payment-events.tsx`)**
- Hard-disabled: returns 503 unless `PAYMENT_WEBHOOK_ENABLED=1`.
- Even when enabled, signature verification is a debug-token placeholder with `// TODO: replace with real Stripe / PayMongo signature verification`.
- This means payment receipts / failed / refund / subscription emails never go out automatically.

**PaymongO / GCash / Maya / GrabPay**
- Listed in UI but no provider code exists. Either implement via Stripe (Stripe supports GCash/GrabPay/Maya in PH) or remove from `/payments` to stop overpromising.

## 2. Map polish — small gaps

`/map` route works (Google Maps, Places Autocomplete, radius circle, type filters, price pins, admin import), but the original plan also mentioned:
- **Clustered pins** at high counts (currently 500-row cap, no clustering — gets noisy in Metro Manila).
- **Deep-linkable URL params** (`?lat=…&lng=…&r=10&types=…`). Not yet wired — refreshing `/map` loses the filter / center state.
- **Hover sync** between sidebar row and map pin.

## 3. Email infra — works but partial wiring

- Auth + transactional email templates exist and the queue table is in place.
- Payment-related templates (`payment-receipt`, `payment-failed`, `refund-issued`, `subscription-renewed`, `subscription-cancelled`) are referenced in `payment-events.tsx` but never fire (see #1).
- Consider adding a test send / preview UI in admin to verify each template before turning the webhook on.

## 4. SEO — private routes only

All public routes have proper `head()` with title + description. Admin and dashboard routes do not, which is correct (they should be `noindex`). No action needed unless you want explicit `<meta name="robots" content="noindex">` on those.

## 5. Minor / cosmetic
- `src/routes/about.tsx` says "Coming soon: a directory of trusted repair shops…" — but that directory now ships at `/businesses` and `/map`. Update the copy.
- `src/components/listing-card.tsx` and `src/routes/listing.$id.tsx` use `alt="Vehicle photo coming soon"` as a placeholder alt — fine, but could be more descriptive for SEO.

---

## What is fully working (for reference)

- Listings CRUD + browse + categories + saved searches + favorites + likes
- Rides board (`/rides`, create, edit)
- Tow request flow + dashboard tow board
- Businesses directory + `/map` with Google Places autocomplete, radius search, type filters, price labels, admin import
- Auth (email/password + Google via Lovable broker), verification, password reset
- Referral / QR / poster system
- Admin: users, accounts, listings, businesses, verifications, currencies, pricing, ads, analytics, reports, audit, sandbox, type-suggestions, redemptions
- Dashboard: index, profile, billing UI, businesses, rides, tow, favorites, likes, messages (with realtime), searches, referral, verification
- Export brokerage
- Facebook Marketplace import (via Firecrawl)
- Currency switcher + FX refresh endpoint
- Sitemap + robots

---

## Suggested next priority

Tackle them in this order:

1. **Decide payments provider** (Stripe-only is simplest — it covers PH cards + GCash + GrabPay + Maya). Add the 4 Stripe secrets, set `VITE_PAYMENTS_CLIENT_TOKEN`, mark those methods `live` in `payments.tsx`, drop the "planned" rows we won't ship.
2. **Wire the payment-events webhook for real** — replace the debug-token check with Stripe signature verification, set `PAYMENT_WEBHOOK_ENABLED=1`, point Stripe at the `/api/public/payment-events` URL.
3. **Map URL state + clustering** — quick wins for the `/map` UX.
4. **About page copy** — 30-second fix.

Want me to start with #1 (Stripe go-live)?
