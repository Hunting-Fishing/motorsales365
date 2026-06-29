# Parts System Audit

Below is what's built vs. what's missing or not wired up across the Parts surface (storefront, partner feeds, affiliate revenue, B2B onboarding, OEM ordering, admin tools).

## 1. Storefront / discovery — built but thin

Working:
- `/parts` hub with Find / Browse / Order OEM tabs, vehicle wizard, partner product tiles, affiliate row.
- `/parts/search` VIN + make/model/year search with JDM chassis code lookup.
- Used parts browse pulls real listings, map/grid/density toggle.
- `/wanted-parts` flow.

Gaps:
- No category landing pages (e.g. `/parts/brakes`, `/parts/engine`) — wizard is the only entry path; bad for SEO.
- No part-detail page for ingested `partner_products` rows — clicks go straight outbound, we never own the SERP.
- No "compare OEM number" UX surfacing `parts_catalog` results next to affiliate tiles.
- Used-parts listing card and partner-product card aren't unified — same query returns two visually different stacks.
- No saved-part / price-drop alert on partner products.

## 2. Partner feeds (Lazada / Shopee / AliExpress via Involve Asia)

Working:
- `partner_product_feeds` table, admin page `/admin/parts/feeds` to enable/disable + manual sync.
- `syncFeed` / `syncAllEnabledFeeds` honor `parts_countries.is_active`.
- Country gating on outbound clicks (`affiliate_links.allowed_countries`).

Gaps (significant):
- **No cron schedule** for `syncAllEnabledFeeds`. There is no pg_cron job and no `/api/public/cron/*` route — feeds only refresh when an admin clicks "Sync now".
- **Only one adapter (Involve Asia).** `syncFeed` hard-calls `fetchInvolveAsiaFeed` regardless of `feed.network`. eBay Partner Network, Amazon PA-API, Rakuten, AliExpress Portals, etc. aren't implemented.
- **Involve Asia credentials** (`INVOLVE_ASIA_KEY`, `INVOLVE_ASIA_SECRET`) — need to confirm both secrets are set; without them every sync errors with "credentials not configured".
- No per-feed schedule / rate-limit / pagination cap visible in admin.
- No image cache — we serve merchant CDN URLs directly; broken when merchants rotate.
- No de-dupe across merchants for the same SKU/EAN.

## 3. Affiliate revenue / attribution

Working:
- `/api/public/go/$slug` redirect with click logging, country gate.
- `/api/public/postback/$network` with HMAC verification.
- `affiliate_commission_rules`, `affiliate_conversions`, `/admin/parts/commissions` dashboard.
- `affiliate_postback_secrets` table.

Gaps:
- **No merchant has actually been configured to POST to our postback URL.** No documentation page or admin field showing the per-network postback URL + secret for ops to paste into Involve Asia / eBay dashboards.
- `affiliate_commission_rules` seeded but per-merchant rates likely still placeholders — no UI to edit rates from admin (only insert-time).
- No reconciliation report (postback conversions vs. clicks vs. merchant statement).
- No payout / invoicing surface for when merchants actually pay.
- Click→conversion attribution window not defined anywhere (`click_id` is optional on postback).

## 4. B2B partner onboarding

Working:
- `/partners/parts` info page, `/partners/parts/onboarding` form, document upload, admin review queue (`/admin/parts` applications tab).
- `parts_supplier_applications`, `parts_supplier_contacts`, `parts_supplier_outreach`, `parts_supplier_tasks`.
- `/admin/parts/outreach` pipeline view.

Gaps:
- No supplier-side portal after approval — approved suppliers can't log in to upload inventory, see clicks, or get paid.
- No automated email on application submit / approval (template not scaffolded).
- No SLA / status badge on the storefront for approved suppliers.
- No link from approved `parts_supplier_applications` row → live `parts_suppliers` entry (manual handoff today).

## 5. OEM ordering ("Order OEM" tab)

Working:
- `oem_parts_interest` capture form, `parts_catalog` admin CRUD, VIN decode (NHTSA + JDM table).

Gaps:
- Labeled "Coming soon" — there is no actual ordering, payment, or fulfillment path.
- No supplier matching: a captured interest record doesn't notify any supplier or create a quote request.
- No bridge from `oem_parts_interest` → `part_quote_requests` (separate tables, not joined in any flow).

## 6. Used parts (Banawe / salvage)

Working:
- `parts_wanted` + matches, browse, listing detail.

Gaps:
- No salvage-yard inventory ingest — yards must hand-list each part.
- No "scrap a vehicle / I'm parting this out" workflow that auto-creates multiple listings from one VIN.

## 7. Admin / analytics

Working:
- `/admin/parts` (suppliers + applications), `/admin/parts/feeds`, `/admin/parts/outreach`, `/admin/parts/analytics` (CTR, filters, top makes/models/years, per-merchant breakdown), `/admin/parts/commissions`.

Gaps:
- No alerting when a feed last_status flips to `error` or item_count drops sharply.
- No "feeds health" summary on the main admin index.
- No data-quality report (% products missing image, price, brand).

## 8. Cross-cutting / infra

- No cron schedule for feed sync (called out above).
- No background job runner for image re-validation, broken-link detection on `affiliate_links`.
- No structured data (JSON-LD `Product` / `Offer`) on partner product tiles for SEO.
- No analytics for `/parts/search` query strings → we don't know what users type but can't find.
- `partner_products` has no fitment columns — we filter by ILIKE on `title`, which is noisy. Need parsed make/model/year per product (current parse only happens at click time via wizard).

---

## Recommended next slices (pick any)

1. **Cron + adapter framework** — add `/api/public/cron/sync-feeds` (token-gated), schedule via pg_cron hourly; refactor `syncFeed` to dispatch by `feed.network` (involve_asia, ebay_epn, amazon_paapi, manual_csv).
2. **Postback ops page** — admin view that shows each network's postback URL + current secret + last 20 events, with "rotate secret" and copy-to-clipboard.
3. **Category landing pages + Product detail** — own SEO for `/parts/{category}` and `/parts/p/{network}/{sku}`.
4. **Supplier portal MVP** — `/dashboard/supplier` for approved partners to view clicks, conversions, and upload a CSV inventory.
5. **OEM → quote bridge** — on `oem_parts_interest` insert, fan out a `part_quote_requests` row to matched salvage suppliers + email notify.
6. **Feed health alerts** — daily job that posts to `ops_alerts` when a feed errors or item_count drops > 30%.

Tell me which to build first (one or several) and I'll scope the implementation plan.
