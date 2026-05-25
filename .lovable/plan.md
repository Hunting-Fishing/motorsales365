
# 365 Motor Sales — Monetization Roadmap

Strategy: free for normal sellers, powerful for dealers, profitable through services around each transaction. Build in 3 phases. Phase 1 + the inquiry forms from Phase 3 ship in the first build pass; Phase 2 and 3 follow.

---

## Phase 1 — Free posting + plan restructure (build first)

### 1.1 Rename plans (DB + UI)

Migration on `subscription_plans`:

| Old name  | New name        | Price (PHP/mo) | stripe_lookup_key      |
| --------- | --------------- | -------------- | ---------------------- |
| Free      | Private Seller  | 0              | —                      |
| Bronze    | Verified Seller | 149            | verified_monthly       |
| Silver    | Dealer Starter  | 499            | dealer_starter_monthly |
| Gold      | Dealer Pro      | 1,499          | dealer_pro_monthly     |
| Platinum  | (retire, grandfather)  | —       | —                      |
| Business  | Enterprise (custom, contact sales) | — | —          |

- Update `listings_per_month`, `max_photos_per_listing`, `max_videos_per_listing` per spec.
- Grandfather existing subscribers: keep their `plan_id`/price; only display name changes for them.
- Add new Stripe products (`payments--batch_create_product`) with new `lookup_key`s in PHP/month, single-quantity, tax_code `txcd_10103001` (SaaS).
- Update `src/routes/pricing.tsx`, `src/routes/dashboard.billing.tsx`, `src/lib/plan-limits.ts`, plan recommendation engine, `monetization-directory.ts` copy.

### 1.2 Free posting for everyone

- Remove ₱20 standard listing fee and 1-photo free tier from `sell.tsx` flow and pricing config.
- Default new listing → free, 12 photos, 1 video, 60-day duration.
- Keep paid one-off **Boost** as a separate add-on (see 1.4); drop the "Upgraded" tier.
- Update `enforce_free_listing_quota` trigger: Private Seller cap = 5 active (not 1/week).

### 1.3 Cancel-at-period-end

- `cancelSubscription` server fn: set `cancel_at_period_end = true` in Stripe instead of immediate cancel.
- Webhook already handles `customer.subscription.updated`; surface "Access until {date}" banner in `dashboard.billing.tsx`.

### 1.4 Boost catalog (one-off + recurring)

New `boost_products` table seeded with:

| Slug                | Label              | Price | Duration |
| ------------------- | ------------------ | ----- | -------- |
| search_boost        | Search Boost       | 99    | 7 days   |
| province_boost      | Province Boost     | 199   | 7 days   |
| homepage_spotlight  | Homepage Spotlight | 499   | 7 days   |
| category_sponsor    | Category Sponsor   | 999   | monthly  |
| dealer_of_the_week  | Dealer of the Week | 1500  | 7 days   |

- New table `listing_boosts(listing_id, product_slug, starts_at, ends_at, payment_id)`.
- Stripe one-off + recurring prices via `payments--batch_create_product`.
- "Boost this listing" CTA on `dashboard.index.tsx` and `listing.$id.edit.tsx`.
- Homepage + browse pages read active boosts and sort/inject sponsored slots.

### 1.5 Homepage repositioning

Rework `src/routes/index.tsx` hero to 3 primary CTAs:
- **Buy a Vehicle** → `/businesses` + category grid
- **Sell for Free** → `/sell`
- **Find Services** → `/businesses?type=services` (Phase 2 directory)

Secondary nav row: Cars, Motorcycles, Trucks, Heavy Equipment, Boats, Parts, Repair Shops, Financing, Insurance, OR/CR Help.

### 1.6 Lead-capture inquiry forms (from Phase 3, built now)

New table `service_inquiries`:
- `id, user_id (nullable), listing_id (nullable), inquiry_type, vehicle_summary, contact_name, email, phone, message, status, assigned_to, created_at`
- `inquiry_type enum`: `financing | insurance | or_cr | title_transfer | inspection | towing`
- RLS: insert public (rate-limited via trigger), select own / admin / sales role.

Buttons on every `listing.$id.tsx`:
- Get Financing / Check Monthly Payment
- Get Insurance Quote
- OR/CR Renewal Help
- Title Transfer Help
- Request Inspection

Each opens a sheet/dialog with a Zod-validated form, posts to a `createServiceInquiry` server fn, emails `partners@365motorsales.ph` (reuse `enqueue_email` pattern).

Admin route `/admin/inquiries` lists, assigns, marks status (`new → contacted → won/lost`). Partners get wired later — for now leads sit in the DB ready to monetize.

---

## Phase 2 — Business directory + dealer SaaS

### 2.1 Paid Business Directory

Extend existing `businesses` table with `subscription_tier` (basic/featured/premium) and a `business_subscriptions` table mirroring `subscriptions`.

Tiered monthly pricing per `business_kind`:

| Type                            | Tier range (PHP/mo) |
| ------------------------------- | ------------------- |
| Repair shop / Tire / MC repair / Towing | 299 – 999  |
| Car wash / detailing            | 199 – 699           |
| Parts store                     | 499 – 1,499         |
| Insurance agent                 | 499 – 1,499         |
| Financing agent                 | 999 – 3,000         |
| Trucking / logistics            | 499 – 1,499         |
| Equipment rental                | 499 – 2,000         |

- New Stripe products per kind/tier.
- "Need inspection, insurance, parts, transport, or financing?" service strip injected on every listing page, sourcing from active directory subscribers in the same region.

### 2.2 Dealer SaaS dashboard

For Dealer Starter / Pro / Enterprise:
- Multi-staff accounts (extend `organization_members`).
- Lead inbox unifying `messages` + `service_inquiries` for the org.
- Sales-rep QR tracking (reuse `staff_referrals` infra).
- Response-time + unanswered-lead alerts.
- Sold marking, conversion stats.
- CSV bulk listing upload (Dealer Starter+).
- Facebook lead import (reuse `facebook-import.functions.ts`).

### 2.3 Sales-rep tracking

Already partially built via `staff_referrals` + QR. Surface per-rep dashboards inside dealer org with leads → sales attribution.

---

## Phase 3 — Transaction & passive income

### 3.1 Partner-wired lead routing

Once partners are signed (BPI/BDO, AXA/Pioneer, LTO runners):
- Replace internal staff email with partner webhook per inquiry type.
- Track per-lead commission in `lead_commissions` table.

### 3.2 Vehicle Passport

Extend `rides` (already exists) → public `/passport/$vin`:
- Photos, repairs, upgrades, accident/restoration history, ownership count, sales history, maintenance records, inspection uploads.
- Free basic page; ₱99–199 one-off premium PDF; ₱199–499 verified inspection upload.

### 3.3 Affiliate parts expansion

Already have `shop_products`, `shop_clicks`, `affiliate_networks`. Add per-listing affiliate module:
- Motorcycle → helmets/gloves/tires
- Car → dash cams/floor mats/covers
- Truck → diesel additives/tools
- Equipment → grease guns/safety lights

Category-aware product picker on listing pages.

### 3.4 Payments expansion

Beyond Stripe cards:
- PayMongo or Xendit for GCash / Maya / QR Ph / GrabPay / ShopeePay (PHP local methods).
- Manual invoice + bank transfer flow for Enterprise.
- Toggle in checkout based on amount + buyer preference.

---

## Long-term revenue mix priority

1. Dealer subscriptions (Starter/Pro/Enterprise)
2. Finance + insurance lead commissions
3. Sponsored placements / boost catalog
4. Business directory subscriptions
5. Affiliate parts/tools
6. Vehicle Passport premium + inspections
7. Transport/towing referrals
8. Private seller boosts

---

## Technical notes

- All Stripe work uses existing `createStripeClient(env)` + gateway proxy; new products via `payments--batch_create_product` (sandbox auto-syncs to live on publish).
- DB changes via `supabase--migration`; data seeds via `supabase--insert`.
- All new server logic uses `createServerFn` + `requireSupabaseAuth`; public inquiry submit goes through a public server route under `/api/public/inquiries` with Zod + rate-limit.
- Existing `subscriptions.environment` filter must be preserved on all reads.
- Grandfather old plan names: don't delete rows, just relabel and stop offering them at signup.

## What ships in the first build pass

1. Plan rename migration + Stripe new products
2. Free posting (remove ₱20, raise photo/duration limits, quota = 5 active)
3. Cancel-at-period-end
4. Boost catalog (DB + Stripe + UI on listing edit)
5. Homepage 3-CTA repositioning
6. `service_inquiries` table + 5 inquiry buttons on every listing + admin inbox

Phase 2 and Phase 3 sections are roadmap only and queued for follow-up builds.
