
## Audit findings

I walked the listing pipeline (DB → `browse-listings.functions.ts` → `ListingCard` + `PricingWidget` + `ListingBadges`) against each signal you listed. Here's what's already wired and what's missing:

| Signal | Status today | Gap |
|---|---|---|
| **Boost (Featured)** | ✅ `boost_until` shown as "Featured" badge; browse sorts boosted first | Card never shows *how long* the boost lasts; expired boosts silently drop |
| **Renew** | ⚠️ Boost dialog says "Renew + Boost"; `dashboard.boosts` shows renewal state | Card has no "Just renewed" signal; no surfacing of `expires_at` proximity for owners |
| **Promotions** | ⚠️ `promotions` table = checkout promo codes only (admin) | No listing-level promo (e.g. "10% off this week") on cards/detail |
| **New listings** | ❌ `published_at` selected but unused on card | No "New" badge for listings published in last 48h |
| **Price changes ↑/↓** | ⚠️ `listing_price_history` table + trigger exist (0 rows so far). Trigger only watches `price_php` — ignores `monthly_php` and `down_payment_php` | No UI anywhere. No arrow/color on card or detail page |
| **Private vs Dealer** | ⚠️ Tier system + `DealerSubscriptionBadge` exist, but **browse query hard-codes `seller_dealer_plan: null`** — so dealer badge never shows on browse cards (only on seller/detail pages) | Browse never joins dealer subscription → all dealers look "private/verified" in browse |

## Plan

### 1. Database (1 migration)

- Extend `tg_listing_price_history` to also log changes to `monthly_php` and `down_payment_php` (new nullable columns `kind text`, `field text` on `listing_price_history`; default `'asking'` for legacy rows).
- Add index `idx_listing_price_history_listing_recent` on `(listing_id, changed_at desc)` (already exists — confirm).
- Add `listing_promotions` table (optional, per-listing promo): `listing_id`, `label`, `percent_off` *or* `amount_off_php`, `starts_at`, `ends_at`, `created_by`. RLS: owners/staff write, public read when active + listing visible. Includes GRANTs for `anon`/`authenticated`/`service_role`.
- Add helper RPC `get_listing_price_trend(_listing_id uuid)` → returns most recent `{ delta_php, delta_pct, direction, changed_at, field }` within last 30 days (SECURITY DEFINER, gated by listing visibility).

### 2. Browse query (`src/lib/browse-listings.functions.ts`)

- Join `subscriptions` (active business plan) into the seller profile fetch so cards can show the real dealer plan + period end instead of the hard-coded `null`.
- Select `published_at` into the mapped `ListingCardData` (currently dropped).
- Batch-fetch latest price trend + active listing promo for the page's listing ids (one RPC each, keyed by id) and attach to each card row.

### 3. `ListingCardData` shape (`src/components/listing-card.tsx`)

Add optional fields:
- `published_at?: string | null`
- `price_trend?: { direction: "up" | "down"; delta_pct: number; field: "asking" | "monthly" | "down_payment"; changed_at: string } | null`
- `promotion?: { label: string; percent_off?: number; amount_off_php?: number; ends_at: string } | null`
- `boost_until` already present — also derive `boost_days_left`.

### 4. New badge components (`src/components/listings/`)

- `NewBadge.tsx` — green "NEW" pill when `published_at` is within 48h (and not boosted, to avoid double-decoration).
- `PriceTrendBadge.tsx` — arrow + percent:
  - **Down** = green (`ArrowDown`, `bg-emerald-500/15 text-emerald-700`) — "↓ 8% price drop"
  - **Up** = red (`ArrowUp`, `bg-rose-500/15 text-rose-700`) — "↑ 5%"
  - Renders inside `PricingWidget` next to the headline pill so it sits on the price it actually changed.
- `PromoBadge.tsx` — accent pill "10% OFF · ends Sat" with countdown if <72h.
- `RenewedBadge.tsx` — subtle "Renewed" pill when boost was created within last 24h AND listing `expires_at` was bumped (detected via `listing_boosts.created_at` vs `listings.updated_at`).

### 5. Card rendering order (top-left overlay stack)

```text
[NEW] [FEATURED] [RENEWED] [PROMO] [PENDING SALE] [CATEGORY] [DEALER PLAN]
```

Rules:
- `NEW` suppressed when `FEATURED` is showing (avoid stacking promo-on-promo).
- `RENEWED` suppressed when `NEW` is showing.
- Dealer plan badge stays bottom of the stack (already does).
- Private sellers: keep current `ListingBadges` tier pill ("Verified seller" / "Unverified") — no dealer badge.

### 6. Detail page (`src/routes/listing.$id.tsx`)

- Add a compact "Price history" disclosure under the price block: last 3 changes with date, old → new, ↑/↓ pct, color-coded.
- Show promo banner above price when active.
- Show "Boosted until {date}" line for the owner only.

### 7. Owner dashboard (`src/routes/dashboard.index.tsx`)

- On each owner listing row: small badges mirroring public ones (NEW / FEATURED / PROMO / price ↑↓) so sellers see what buyers see.

### 8. Admin

- `admin.listings.tsx`: column for "Last price change" with arrow + pct.
- `admin.promotions.tsx`: new tab "Listing promos" to create/end per-listing promotions.

### 9. Policy pages

- `/terms`: add a clause that price-change history is publicly visible for active listings.
- `/privacy`: no change (no new PII).
- Bump "Last updated" on `/terms`.

## Out of scope (not touching this turn)

- Email/notification dispatch for price drops to favoriters (worth doing later, separate ask).
- Saved-search alerts wiring for new promos (already partially exists).
- Boost auto-renew subscriptions (already covered by `boost_products.recurring`).

## Files

**New:** migration, `src/components/listings/new-badge.tsx`, `price-trend-badge.tsx`, `promo-badge.tsx`, `renewed-badge.tsx`, `src/hooks/use-listing-price-trend.ts`, `src/hooks/use-listing-promo.ts`.

**Edited:** `browse-listings.functions.ts`, `listing-card.tsx`, `pricing-widget.tsx`, `listing.$id.tsx`, `dashboard.index.tsx`, `admin.listings.tsx`, `admin.promotions.tsx`, `terms.tsx`.

Approve and I'll implement in one pass.
