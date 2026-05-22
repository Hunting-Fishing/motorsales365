# Affiliate Shop + Expanded Advertising

Add two new passive revenue streams on top of the existing free-user / ad-supported model:

1. A curated **Shop** powered by affiliate links (AliExpress, Shopee, Lazada PH, Amazon, etc.) — we earn commission, the buyer pays the marketplace directly.
2. Tighter integration of **existing ad inventory** with the Shop and surrounding pages.

No checkout, no inventory, no shipping on our side — every "Buy" click leaves to the partner with our affiliate tag attached and is tracked for attribution.

---

## 1. Shop surface

**New routes**
- `/shop` — landing + featured products + category tiles (Detailing, Tools, Parts, Electronics, Accessories, Tires & Wheels, Lubricants, Safety).
- `/shop/$category` — filtered grid (price, brand, network).
- `/shop/p/$slug` — product detail (gallery, description, specs, "Buy on Shopee/Lazada/AliExpress" CTA buttons — one per network if multiple links exist).
- `/admin/shop` — staff CRUD: products, categories, affiliate networks, bulk import.

**Surfaces that link into Shop**
- Site header: new "Shop" nav item.
- Listing detail page (`/listing/$id`) — "Recommended parts & tools" rail filtered by category/make.
- Rides profile (`/rides/$slug`) — "Mod this ride" rail (detailing + accessories).
- Home page — featured shop carousel below the hero.

## 2. Affiliate networks

Each product can carry multiple outbound links (one per network). Supported networks at launch:
- Shopee PH (Shopee Affiliate Program)
- Lazada PH (Lazada Affiliate Program)
- AliExpress (AliExpress Portals)
- Amazon (Amazon Associates — optional)
- TikTok Shop PH
- Generic (any URL — for direct brand programs)

Per-network we store: name, slug, base tracking param key (e.g. `aff_id`), our tag value, optional deeplink template. Clicks are rewritten through `/go/$productId?n=$network` so we can append the tag, record the click, then 302 to the partner.

## 3. Ads — extend existing system

Reuse the existing `advertisements` + `ad_events` tables. Add two new placements to the `ad_placement` enum:
- `shop_top` — banner above /shop and /shop/$category.
- `shop_sidebar` — sidebar slot on /shop/p/$slug.

Drop `<AdCarousel placement="shop_top" />` and `<AdCarousel placement="shop_sidebar" />` into the new routes. Admin advertising console picks them up automatically.

## 4. Data model

New tables (all RLS-protected; public read for active rows, staff write):

- `affiliate_networks` — id, name, slug, tag_param, tag_value, deeplink_template, active.
- `shop_categories` — id, slug, name, description, icon, sort_order, active.
- `shop_products` — id, slug, title, description, brand, image_url, gallery (jsonb), category_id, price_php (display only, nullable), currency, tags (text[]), featured, active, click_count, created_by, timestamps.
- `shop_product_links` — id, product_id, network_id, url, sku, last_checked_at. (One product, many networks.)
- `shop_clicks` — id, product_id, network_id, visitor_id, user_id (nullable), referrer, user_agent, created_at. Powers attribution + admin analytics.

Enum extension:
- `ad_placement`: add `shop_top`, `shop_sidebar`.

Storage: reuse `ad-media` bucket for product images, or add a new public `shop-media` bucket.

## 5. Click tracking + redirect

- Server route: `src/routes/go.$productId.tsx` (or `/api/public/go/$productId`) — reads `?n=<network>`, looks up the link, appends the affiliate tag using the network's `deeplink_template`, inserts a row into `shop_clicks` (with visitor_id from cookie), then `Response.redirect(302)`.
- Client never sees the raw affiliate URL — clean, swappable, and we own the attribution log.
- Rate-limit: one click per (visitor_id, product_id, network_id) per 60s to avoid bot inflation.

## 6. Admin / staff console

`/admin/shop`:
- Products table: search, filter by category/network, toggle featured/active, bulk activate.
- Add/edit product form with multi-network link rows.
- Networks tab: manage tag values + deeplink templates.
- Categories tab: CRUD + reorder.
- Analytics tab: clicks per product / per network / per day, top performers, CTR vs impressions (we'll log `view` events on the product detail page too).

CSV import for products (title, category, image_url, network slug, url, sku) so we can bulk-seed from spreadsheets / scraping tools.

## 7. Disclosure + compliance

- Footer + every `/shop` page shows: "365 Motorsales earns a commission on qualifying purchases. Prices and availability are set by the seller."
- Outbound links use `rel="sponsored noopener"` and `target="_blank"`.
- Per-network `robots`/policy: no scraping, only official deeplinks.

## 8. Build order

1. **DB migration** — new tables, enum extension, RLS, seed default networks (Shopee/Lazada/AliExpress) and categories.
2. **Server functions** — `src/lib/shop.functions.ts` (list products, get product, list categories, admin CRUD) + redirect route.
3. **Public Shop UI** — `/shop`, `/shop/$category`, `/shop/p/$slug`, header link.
4. **Cross-surface rails** — recommended products on listing + ride pages, featured carousel on home.
5. **Ad placements** — wire `shop_top` + `shop_sidebar` AdCarousels.
6. **Admin console** — `/admin/shop` CRUD + CSV import + analytics.
7. **Disclosure copy** — footer + shop pages.

## 9. Out of scope (v1)

- No on-site checkout, cart, or payments.
- No price/stock sync via partner APIs (manual + CSV only at launch; API sync can come later per network).
- No user reviews on shop products (links out to the partner's reviews).
- No multi-currency display (PHP only at launch).

---

## Technical notes

- All writes go through `createServerFn` + `requireSupabaseAuth`; admin endpoints additionally check `has_role(uid, 'admin')` or a new `can_manage_shop(uid)` helper.
- Click insert uses `supabaseAdmin` from the redirect route (public, no auth needed) but is rate-limited and validated.
- Affiliate tag values stored as secrets per network? No — they're not secrets, they're public tracking IDs; storing in `affiliate_networks.tag_value` is fine and lets staff rotate without a deploy.
- SEO: `/shop/p/$slug` gets per-product `head()` (title, description, og:image from product image). Sitemap includes active products.
