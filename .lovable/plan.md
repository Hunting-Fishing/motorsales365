
## Phase A — Region-correct partner display

Audit of current `affiliate_links`:

| Partner | Reality | Action |
|---|---|---|
| Shopee PH | PH only | keep, allowed = PH |
| Lazada PH | PH only | keep, allowed = PH |
| AliExpress | Ships PH (global) | keep, allowed = PH, SEA |
| **eBay Motors** | US‑centric, no PH shipping on most listings | **hide for PH**, allowed = US, CA, AU, GB |
| Amazon | Patchy PH delivery for parts | allowed = US, CA, GB (not PH) |
| RockAuto | US, CA only | allowed = US, CA (already inactive) |
| Amayama | Global incl PH | allowed = all |
| PartSouq | Global incl PH | allowed = all |
| Megazip | Global incl PH | allowed = all |

`parts_suppliers` already has `region`; the B2B outreach list is correctly PH-only. No data change needed there — only display filtering by active country.

Changes:
1. Migration: add `allowed_countries text[]` (NULL = all) to `affiliate_links`, backfill per table above.
2. `listAffiliateSuppliers` accepts `country` (default `PH`, taken from `parts_countries.is_active`) and filters `allowed_countries IS NULL OR country = ANY(allowed_countries)`.
3. `AffiliateShopRow` + `/parts` + listing detail pass current PH country; only PH-eligible partners render. eBay/Amazon disappear for PH visitors.
4. Admin `/admin/parts` affiliate editor gains a multi-country chip picker for `allowed_countries`.

## Phase B — Autopull product feeds (Lazada + Shopee + AliExpress via Involve Asia)

Goal: ingest real SKUs (title, price, image, deeplink) instead of only sending users to search pages, so the parts page shows actual shoppable items matched to a vehicle.

Approach: use the **Involve Asia Datafeed API** (key already saved). It exposes per-merchant product feeds for Lazada PH, Shopee PH, AliExpress, with daily refresh. No separate Lazada Open Platform app needed.

1. Migration — two new tables:
   - `partner_product_feeds(network, merchant_slug, last_synced_at, last_status, item_count, ...)`
   - `partner_products(network, sku, title, price, currency, image_url, deeplink, brand, category_path, country, raw jsonb, ...)` with unique `(network, sku)` and trigram index on `title`.
2. Server module `src/lib/partner-feed.server.ts`:
   - `fetchInvolveAsiaFeed(merchant, page)` paginated pull
   - `upsertPartnerProducts(rows)` chunked upsert
   - Logs per-feed result to `partner_product_feeds`
3. Public cron route `/api/public/hooks/sync-parts-feeds` (apikey-guarded) — runs all enabled feeds for active countries; scheduled via `pg_cron` daily 02:00 PH.
4. Admin page `/admin/parts/feeds`:
   - List feeds with last sync, item count, status
   - "Sync now" button per feed
   - Enable/disable per merchant
5. Universal Shop widget: if `partner_products` has matches for the query (filtered by vehicle make/model and active country), show real product cards (image + price + Shop button → tracked /go redirect). Falls back to today's deep-link cards when no matches yet.

### Technical notes

- All product clicks continue to flow through the existing `/api/public/go/:slug` so commission attribution stays intact.
- `partner_products` is RLS public-read (anon SELECT) since it's a public catalog; writes restricted to service role / cron route.
- Country filter chains through: `parts_countries.is_active` → `affiliate_links.allowed_countries` → `partner_products.country`. PH is the only active country today, so non-PH partners and non-PH SKUs stay hidden until those countries flip active.
- Out of scope this round: Shopee Open Platform direct API, Lazada seller-app onboarding (both require partner approval); we use the affiliate datafeed path instead.

## Deliverables
- 1 migration (schema + backfill)
- ~4 new files (feed server module, cron route, admin feeds page, country-aware affiliate filter)
- Updates to 3 existing files (`affiliate.functions.ts`, `AffiliateShopRow`, admin affiliate editor)
