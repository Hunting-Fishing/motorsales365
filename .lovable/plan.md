# Pivot: Free accounts, ad-supported revenue, Export brokerage division

Shift the business model away from charging users for listings/subscriptions. Revenue moves to (1) ad inventory we sell to brands, (2) optional boosts, and (3) an international export brokerage for verified vehicles (Nikkyo / BeForward style).

## 1. Pricing changes

**Personal accounts — permanently free**
- All listing limits removed (no weekly cap, no photo cap).
- Hide "upgrade" CTAs from personal dashboards.

**Business accounts — free for 6 months from signup**
- Auto-grant a complimentary "Business 6-Month" subscription at business signup / verification.
- Show countdown banner in their dashboard ("Free until {date}").
- After 6 months: account stays active and can list, but loses business-only perks (priority placement, multi-seat, analytics) until they convert. No hard paywall on basic listings.

**Boosts — paid (kept)**
- Listing boosts / featured placement remain pay-per-use through existing Stripe flow.

**Subscriptions table**
- Keep schema. Existing paid plans become legacy/optional. Free + Business-6mo are the defaults shown on /pricing.

## 2. Advertising revenue (replaces subscription pressure)

**Homepage + browse carousel**
- New `advertisements` table: title, image, target_url, placement (home_carousel, browse_top, listing_sidebar, rides_top), starts_at, ends_at, priority, active, impressions, clicks, advertiser contact.
- New `<AdCarousel>` component on `/`, `/browse/$category`, `/rides`.
- Click + impression tracking written to `ad_events`.

**Admin advertising console**
- Extend existing `/admin/advertising` to manage ad inventory (CRUD ads, schedule campaigns, see CTR).
- Existing `ad_inquiries` flow (brands contacting us) remains the lead funnel.

**Public "Advertise with us" page**
- `/advertise` already exists — rewrite copy around new pitch: "We do not charge our users. Reach our audience instead." Show placements + sample sizes.

## 3. Export Brokerage division ("365 Export")

International buyers can purchase verified vehicles from PH sellers, brokered by us — modeled on Nikkyo Cars Japan / BeForward.

**New surface: `/export`**
- Landing page explaining the program (how we ship, inspection, documentation, payment in USD/JPY).
- Searchable catalog of "export-ready" listings (filter by make / model / year / price USD).
- Lead capture form (country, port, vehicle interest) → routed to staff.

**Eligibility**
- A listing is export-ready only if: owner has `verification_status = 'verified'`, `export_available = true` flag on the listing, photos count ≥ N, has VIN/chassis.
- New `listings.export_available` boolean + opt-in toggle in the listing editor.
- Verified sellers see an "Offer for export" banner on their listings.

**Inquiry pipeline**
- New table `export_inquiries`: buyer_name, country, port, listing_id, message, status (new/qualified/quoted/won/lost), assigned_to.
- Notifies staff via existing email queue.

**Admin console: `/admin/export`**
- Inbox of export inquiries, kanban by status, assign to broker, internal notes, audit trail (mirrors `ad_inquiries` pattern).

## 4. UI / messaging cleanup

- Update `/pricing` to: Personal Free, Business Free 6mo, Boosts (pay-per-use), Advertise with us, Export brokerage.
- Remove paywall friction from `/sell`.
- Update marketing copy on `/`, `/about`, `/advertise` to reflect "free for users, ad + brokerage funded".

## Build order

1. **DB migration** — `advertisements`, `ad_events`, `export_inquiries`, `listings.export_available`, trigger to grant Business-6mo complimentary sub on business signup, remove free-listing quota trigger.
2. **Free everything** — drop free-plan weekly cap; raise/remove photo cap for personal; complimentary Business sub auto-grant.
3. **Ad system** — admin CRUD + `<AdCarousel>` placements + tracking.
4. **Export division** — `/export` landing + catalog, `export_available` flag, inquiry form, admin inbox.
5. **Pricing + marketing pages** rewrite.

## Technical notes

- All write paths via `createServerFn` + `requireSupabaseAuth` (ad CRUD = admin gated via `has_role`; export inquiries = public submit with rate limiting).
- Ad images stored in new public bucket `ad-media`.
- Impression tracking debounced client-side (1 per ad per session) to keep `ad_events` small.
- Business 6-month grant implemented as a row in `subscriptions` with `complimentary=true`, `current_period_end = signup + 6 months`, plan = new "Business Trial" plan row.
- `current_plan_tier()` already handles complimentary subs — no change needed.
- Existing Stripe boost flow untouched.

## Out of scope (v1)

- Actual shipping/logistics integration for export (manual broker workflow first).
- Multi-currency checkout for export buyers (collect leads, quote offline).
- Programmatic ad bidding (manual sales only).
- Migrating existing paid subscribers — they keep their plan until it ends, then drop to free.
