## Goal

Turn `/parts` into a shoppable hub by pulling real product tiles from our affiliate partners (Shopee PH, Lazada PH, AliExpress PH via Involve Asia) on top of the existing "search at partner" buttons.

## What you'll see on /parts

1. **Existing supplier row** (logos that link out with your search) — kept as-is.
2. **New "Trending parts from our partners" grid** — 12 real product tiles with image, title, price, merchant badge, and a Shop button that opens the partner's product page using your affiliate deeplink.
3. **Vehicle-aware mode**: once a shopper picks a make/model in the Find-a-part wizard, the same grid re-queries with that vehicle context so tiles match.
4. **Smart empty state**: if no products have been synced yet, the grid is hidden (no empty boxes); the supplier row alone shows.

The grid is country-gated — visitors in PH see PH merchants, others only see partners allowed in their region (already enforced by the country rules we added).

## Backend status

- `partner_products` table and `searchPartnerProducts` server function already exist and already filter by country.
- 3 PH feeds are enabled but **0 products have been synced yet**, so the grid will be empty on first load.
- First-time fill: run a manual sync from `/admin/parts/feeds` (Sync now button) for each PH merchant. After that the daily cron keeps it fresh.

No new tables, no new secrets.

---

## Technical section

### 1. New component: `src/components/parts/partner-products-grid.tsx`
- Props: `query: string`, `country?: string`, `limit?: number`, `title?: string`.
- Calls `searchPartnerProducts` via `useServerFn`. Returns `null` when result is empty (clean fallback).
- Renders a responsive grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`) of tiles:
  - 1:1 image (lazy-loaded), 2-line clamped title, price + currency, merchant badge (Shopee / Lazada / AliExpress).
  - Outbound `<a>` to the product's `deeplink` with `target="_blank" rel="nofollow sponsored noopener"`.
  - Fire-and-forget click log via a new tiny logger so we get per-product analytics in `affiliate_clicks` (reuse existing table — add `partner_sku` column-less write under the existing `supplier_slug`, with `query` carrying the product title).

### 2. Click logging endpoint
Extend the existing `/api/public/go/$slug` to accept an optional `?dl=<base64-encoded deeplink>` so the redirect is consistent with the supplier-row clicks (one analytics path, same country gate, same Involve Asia logging). Tile click → `/api/public/go/shopee-ph?dl=...&q=<title>&sku=<sku>`. Falls back to the templated URL if `dl` missing.

### 3. Wire into `src/routes/parts.tsx`
- Add `<PartnerProductsGrid query={...} title="Trending parts from our partners" />` directly under the existing `<AffiliateShopRow>` block (line ~171).
- Default query: `"auto parts"`. When the Find-a-part wizard has picked a make/model, lift that state up and pass `query` as `"{make} {model} parts"`.
- Keep the existing Browse / Find / Order tabs untouched.

### 4. No DB migration required
All tables, RLS, grants, and country filters are in place from previous turns.

### 5. After ship — one-time seeding
Open `/admin/parts/feeds` and click "Sync now" on each enabled PH feed. The grid populates immediately. After that, the daily cron at `/api/public/hooks/sync-parts-feeds` keeps it fresh.

### Files touched

- **new** `src/components/parts/partner-products-grid.tsx`
- **edit** `src/routes/parts.tsx` (mount the grid, lift wizard make/model)
- **edit** `src/routes/api/public/go.$slug.ts` (accept optional `?dl=` passthrough)
- **edit** `src/components/parts/parts-wizard.tsx` (expose an `onContextChange?(make, model)` callback so the grid can react)

### Out of scope (call out as next steps if you want them)

- Per-tile "Add to wanted ad" shortcut.
- Pulling tiles into individual listing detail pages (already have the supplier row there — could be a follow-up).
- Fitment-matched filtering (we'd need OEM/category tags on partner products — only `category_path` is currently ingested).