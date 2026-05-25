# Phase 1 — Done ✅

- Plan rename + Stripe products
- Free posting + 5-active cap trigger
- Cancel-at-period-end via Stripe
- Boost catalog (5 products live in Stripe + DB)
- Boost Purchase UI (dialog + embedded checkout + webhook activation)
- Service Inquiry leads (5 CTAs + admin inbox)
- Homepage 3-CTA repositioning + free-posting trust strip

# Phase 2 — Business Directory + Dealer SaaS

I'll ship this as **three** approvable sub-passes so each lands clean.

## 2A — Paid Business Directory (revenue lever, smallest scope)

- Migration: add `subscription_tier` (`free | listed | featured | premium`) and `featured_until` to `businesses`. New `business_subscriptions` table (mirrors `subscriptions`: stripe_customer_id, stripe_subscription_id, status, current_period_end, environment, plan slug, business_id, owner_user_id).
- Stripe products per `business_kind` (repair, towing, car-wash, parts, insurance, financing, trucking, equipment) at the tiers you specified (₱199 → ₱3,000). Create via `batch_create_product` with monthly recurring prices.
- `createBusinessSubscriptionCheckout` server function (mirrors `createBoostCheckout`). Webhook handles `customer.subscription.*` with `metadata.kind="business"` → upserts `business_subscriptions` and sets `businesses.subscription_tier`.
- UI: "Upgrade this listing" CTA on `/dashboard/businesses` rows; tier badge on `/businesses` index and `/businesses/$slug`; sort featured/premium first.
- Listing page integration: "Need inspection, insurance, parts, transport, or financing?" service strip showing 3 random `featured`/`premium` businesses of the relevant kinds.

## 2B — Dealer SaaS dashboard

- New layout route `/dealer` (gated by Dealer Starter/Pro/Enterprise plan).
- **Unified lead inbox**: query joins `messages` (where recipient = dealer staff) + `service_inquiries` (where listing.user_id = dealer) into one chronological feed with status (new/in progress/won/lost), assignable to staff member.
- **Multi-staff via `organizations` + `organization_members`** (already exists in DB). Add `dealer_organization_id` to `profiles`; an "Invite staff" form (email invite → join link). Roles: `owner | admin | sales`. Listings authored by any member roll up to the org.
- **Sales-rep QR tracking**: each member gets a personal short link `/r/$memberSlug` that adds `?rep=` to all listing URLs they share; clicks/leads attributed in a new `rep_lead_attributions` table.
- **Response-time alerts**: a SQL view + cron-style server fn surfaces unanswered leads >24h on the dashboard.
- **CSV bulk upload + Facebook lead import**: reuses existing `facebook-import.functions.ts`; adds `/dealer/import` page with column mapper.
- **Mark sold** + post-sale survey trigger (small).

## 2C — Plan gating + onboarding polish

- `requireDealerPlan` middleware for server fns under `/dealer`.
- "Upgrade to Dealer" upsell pages with feature matrix.
- Auto-create organization on first Dealer plan checkout; auto-add buyer as `owner`.

# Phase 3 — Transaction & Passive Income

## 3A — Vehicle Passport

- Extend existing `rides` table; add public route `/passport/$vin` (no auth). Free version shows: photos, basic specs, owner-provided service log entries (already in `ride_service_logs`).
- Paid: ₱99 one-off "Premium PDF passport" (Stripe one-off, generated server-side via puppeteer-free HTML→PDF — use `@react-pdf/renderer` to avoid the workerd native-binary issue).
- Paid: ₱299 "Verified inspection upload" — buyer uploads inspection PDF, partner inspector signs off via admin route.
- New `passport_purchases` table; webhook activates on `metadata.kind="passport"`.

## 3B — Partner-wired lead routing

- Add `partners` table (`name`, `inquiry_types text[]`, `webhook_url`, `webhook_secret`, `commission_pct`, `active`).
- `service_inquiries` insert trigger picks a partner round-robin within the matching `inquiry_type`; new `lead_commissions` row tracks payout.
- Admin route `/admin/partners` for CRUD + webhook test button.
- Webhook outbound: HMAC-signed POST to partner with inquiry payload; retries via pg_cron / queue.

## 3C — Affiliate parts module

- New `affiliate_products` table (sku, title, category_match `text[]`, url, image, price, source). Seed with manual rows for top 20 categories.
- `<AffiliateParts category="motorcycle" />` component rendered on every listing page below the description. Click → `/r/affiliate/$id` redirect logs `affiliate_clicks`.
- Admin route `/admin/affiliates` for CRUD.

## 3D — PayMongo / Xendit for local methods

- New `src/lib/paymongo.server.ts` (analogue of `stripe.server.ts`) with gateway-routed client.
- `createPaymongoCheckout` server fn returning their Checkout URL (redirect-based — PayMongo doesn't support embedded). Methods enabled: GCash, Maya, QR Ph, GrabPay, ShopeePay.
- New `payment_intents` table tracking PayMongo source IDs.
- Webhook at `/api/public/payments/paymongo-webhook` activates same `subscriptions` / `listing_boosts` / `passport_purchases` rows.
- UI: payment-method picker on every checkout (`Card · GCash · Maya · QR Ph`). Defaults to Stripe Card.

# Recommended order

1. **2A** (directory SaaS) — ships visible revenue with the smallest blast radius (~1 build pass).
2. **3D** (PayMongo) — unlocks Filipino payment methods that will boost all conversion rates. Touches checkout but no new business logic. (~1 pass)
3. **2B + 2C** (dealer dashboard + gating) — biggest build, most product decisions. (~2 passes)
4. **3A** (vehicle passport) — passive revenue, no partners needed. (~1 pass)
5. **3B** (partner routing) — wire when first partner is signed. (~0.5 pass)
6. **3C** (affiliate parts) — fastest passive revenue once published. (~0.5 pass)

# Decisions I need before starting 2A

1. **Directory tier names** — keep `listed / featured / premium`, or use `Basic / Featured / Top`?
2. **Per-kind pricing** — confirm the ₱199–₱3,000 ranges from the roadmap, or rationalize to 3 standard tiers across all kinds (e.g. ₱299 / ₱699 / ₱1,499)?
3. **Annual discount** — offer 2 months free on yearly billing?

After answers I'll start with **2A**.
