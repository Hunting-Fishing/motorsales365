
# AutoTrader Philippines — Phase 1 Plan

A clean, photo-forward marketplace for listing vehicles, motorcycles, boats, airplanes, and equipment for sale across the Philippines. Built on Lovable Cloud (database, auth, storage). Payments are stubbed for this phase — every fee/subscription is wired through the data model and admin controls so we can plug in a processor later without rework.

## Design direction

- **Modern Filipino**: bright white background, deep blue primary (`#0038A8`-ish), warm yellow accent (`#FCD116`-ish), red used sparingly for alerts/sale tags.
- Photo-forward cards, big search bar, sticky filters, generous spacing.
- Inter for body, slightly heavier weight for headings. Responsive, mobile-first (most PH users are on phones).
- All prices shown as **₱ PHP**.

## Account model (unified)

One account type. Anyone can browse, save, and list. On their profile, a user toggles **Private seller** or **Business seller**. Business sellers can fill business details (name, logo, location, hours). Each listing inherits and displays a **Private** or **Business** badge.

Roles stored in a separate `user_roles` table (admin / user) — never on the profile, to prevent privilege escalation.

Auth: email + password, plus Google sign-in.

## Listing categories (all in v1)

Cars, Motorcycles, Boats, Airplanes, Heavy Equipment, Other Transport. Each has its own field schema (e.g. cars: make/model/year/mileage/transmission/fuel; boats: length/engine hours; airplanes: airframe hours; equipment: type/hours).

Shared fields: title, description, price (PHP), location (region + city), condition, contact preference (in-app message, phone, both).

## Listing flow & media

1. Pick category → fill fields → upload media → preview → publish.
2. **Free tier per listing**: up to 5 photos + 1 video.
3. **Upgraded listing**: up to 20 photos + 3 videos (extra fee).
4. **Boost**: pin to top of search; auto-renews ad every 2 weeks.
5. Listings expire after a configurable window (admin-set, default 60 days) and can be renewed.

Payments are deferred, so checkout pages collect the choice and create a `pending_payment` record + an unpaid listing in `draft` state. Admin can manually mark paid to publish (so you can still operate via GCash/bank during phase 1). When we add Stripe later, the same records/flows light up automatically.

## Browse & search

- Home: hero search (category + keyword + location), featured/boosted listings, recent listings, browse-by-category tiles.
- Category pages with filters: price range, year, location/region, condition, transmission (cars), make/model, etc.
- Listing detail: photo gallery + video, full specs, seller card (Private/Business badge), contact actions, save-to-favorites, report listing.
- Saved listings & saved searches per user.

## Seller dashboard

- My listings (active, draft, expired) with edit/renew/boost/delete.
- Messages inbox (in-app buyer↔seller messaging).
- Profile + business profile toggle.
- Payment history (placeholder rows now; real once payments enabled).
- Subscription status (placeholder tier display).

## Admin panel

Gated to `admin` role. Controls:

- **Pricing & promotions** (all editable, no code changes): per-listing fee (default ₱20), photo/video upgrade fee, boost fee, boost interval (default 14 days), listing expiry days, subscription tiers (5/10/20/unlimited listings per month) with monthly prices, promo codes / discount %.
- Listings moderation: approve, hide, feature, delete; mark a pending payment as paid.
- Users: view, suspend, grant admin role.
- Reports: see flagged listings, take action.
- Categories & vehicle attributes: add makes/models, add equipment types.
- Site-wide banners / announcements.

## Out of scope for Phase 1 (deferred, but data model leaves room)

- Repair shops & insurance map directory.
- Live payments (Stripe/GCash) — wired as stubs, real processor added next phase.
- Subscription billing automation.
- Native mobile apps.

## Data model (technical detail)

Tables (Lovable Cloud / Supabase):

- `profiles` (id → auth.users, full_name, phone, seller_type: 'private'|'business', avatar_url, business_name, business_logo_url, business_address, business_region, business_city, business_lat, business_lng, business_hours_json)
- `user_roles` (user_id, role: 'admin'|'user') — separate table, RLS via `has_role()` security-definer fn
- `categories` (slug, name, icon) — seeded: car, motorcycle, boat, airplane, equipment, other
- `vehicle_makes`, `vehicle_models` (admin-managed)
- `listings` (id, user_id, category_slug, title, description, price_php, condition, region, city, lat, lng, status: 'draft'|'active'|'expired'|'hidden', plan: 'standard'|'upgraded', boost_until, expires_at, attributes_jsonb, view_count, created_at, published_at)
- `listing_media` (listing_id, type: 'photo'|'video', url, sort_order)
- `favorites` (user_id, listing_id)
- `saved_searches` (user_id, query_jsonb)
- `messages` (sender_id, recipient_id, listing_id, body, read_at)
- `reports` (listing_id, reporter_id, reason, status)
- `pricing_settings` (singleton-ish key/value rows: listing_fee_php, upgrade_fee_php, boost_fee_php, boost_renewal_days, listing_expiry_days)
- `subscription_plans` (id, name, listings_per_month, price_php, active)
- `subscriptions` (user_id, plan_id, status, current_period_end) — placeholder rows, no live billing yet
- `payments` (user_id, listing_id nullable, kind: 'listing'|'upgrade'|'boost'|'subscription', amount_php, status: 'pending'|'paid'|'failed', method, created_at) — admin can flip to 'paid' manually for phase 1
- `promotions` (code, percent_off, applies_to, expires_at)

Storage buckets: `listing-photos` (public read), `listing-videos` (public read), `avatars`, `business-logos`. RLS so only the listing owner can write.

RLS highlights: listings publicly readable when `status='active'`; owner full access; admins full access via `has_role(auth.uid(),'admin')`. `user_roles` only writable by admins.

Routes (TanStack Start, separate route files for SEO):

```
/                          home + search
/browse/$category          category browse with filters
/listing/$id               listing detail
/sell                      create listing wizard (auth required)
/login, /signup, /reset-password
/dashboard                 my listings
/dashboard/messages
/dashboard/favorites
/dashboard/profile
/dashboard/billing         (placeholder)
/admin                     admin home
/admin/pricing
/admin/listings
/admin/users
/admin/reports
/admin/catalog             makes/models/categories
/about, /contact, /terms, /privacy
```

Server functions for: create/update listing, upload media (signed URLs), publish (checks payment), boost, renew, search with filters, admin actions. Auth-protected routes via `_authenticated` layout; admin via nested `_admin` layout using `has_role`.

## What you'll see when this ships

A working bilingual-ready (English first) marketplace where any Filipino can sign up, list a car/bike/boat/plane/equipment with up to 5 photos + 1 video for free in the data model (admin marks paid until live payments land), browse and filter listings, message sellers, save favorites, and where you as admin can change every fee, plan price, and promotion from `/admin/pricing` without any developer involvement.

After approval I'll build this in stages, starting with auth + listings + browse + admin pricing, then messaging + favorites + boost/renew logic, then admin moderation polish.
