
## Context

Phase 1 already shipped: multi-category join table, nested `parent_id` taxonomy, multi-select filtering server-side, expanded seeded categories (Detailing → Car Washing/Polishing/Waxes/etc., Tools → Hand/Power/Diagnostics, Performance, Off-Road, EV, etc.), and the filter drawer now exposes sub-category chips, price range, brand, and sort.

This plan covers what's still missing to make the shop genuinely discoverable and to start driving real affiliate revenue.

## 1. Category UX & Discovery

- **Persistent sidebar filters on desktop** (`/shop` + `/shop/$category`). Drawer stays on mobile/tablet. Sidebar shows: Category tree (expandable parents → children), Brand, Price range, Tags, Universal-fit toggle, Marketplace source.
- **Active filter chips row** above the product grid with one-click removal and "Clear all".
- **Category tree page (`/shop/categories`)**: visual grid of all top-level categories with child chips underneath, product counts per node, hero icon per parent. Becomes the primary browsing entry.
- **Breadcrumbs** on `/shop/$category` and product pages showing parent → child path (driven by `parent_id`).
- **Related categories** strip on category and product pages ("People shopping Car Washing also browse Waxes, Microfiber, Wheel & Tire").

## 2. SEO Category Landers

- Per-category `head()` with unique title/description/canonical/og:image derived from category record (add `hero_image_url`, `seo_title`, `seo_description`, `intro_md` columns to `shop_categories`).
- JSON-LD `ItemList` of products on category pages.
- Sitemap entries for every category and sub-category slug.

## 3. Garage-Aware Recommendations

- New `/shop` rail: **"Recommended for your {Year Make Model Engine}"** when the visitor has a primary garage vehicle. Server-side: pick products whose fitment matches the primary vehicle, ordered by click_count.
- Product page: **"Fits your garage"** badge + **"Also fits"** list (other vehicles in the user's garage that match this product's fitment rules).
- Empty-garage CTA: "Add your ride to see parts that fit" → links to `/dashboard/rides/new`.

## 4. Maintenance-Driven Marketing

- Use `rides.mileage_km` + service log cadence to surface **"Time for an oil change?"** / **"Brake pads due"** cards on the dashboard, each linking to a pre-filtered shop search (category=lubricants, fits=this vehicle).
- Seed a small `maintenance_reminders` table (interval_km, interval_months, default category slug).

## 5. Monetization Features (build now)

- **Featured/Sponsored slots**: add `is_featured boolean`, `featured_until timestamptz`, `featured_rank int` to `shop_products`. Featured products pin to the top of `/shop` and matching category pages with a subtle "Featured" badge. Admin toggle in product dialog.
- **Brand pages (`/shop/brand/$slug`)**: auto-generated from distinct `brand` values, with logo (new `shop_brands` table: slug, name, logo_url, description, affiliate_disclosure). Filterable like category pages.
- **Deal of the week**: `is_deal boolean` + `deal_ends_at` on products. Homepage + shop hero rail.
- **Affiliate disclosure**: small disclosure line on every product card linking to an `/affiliate-disclosure` page; required by FTC/most networks.
- **Outbound click tracking already exists** (`tg_shop_click_increment`) — add a `shop_click_events` row per click (user_id, product_id, referrer, utm) so we can report top earners and optimize.

## 6. Monetization Features (deferred — note only)

Bundles/kits, price-drop alerts, comparison tool, newsletter "Deal of the week" automation, sponsored-billing UI, user-submitted finds, local services marketplace. Out of scope this round.

## Technical Notes

**Migrations**
- `shop_categories`: add `hero_image_url text`, `icon text`, `seo_title text`, `seo_description text`, `intro_md text`, `sort_order int default 0`.
- `shop_products`: add `is_featured boolean default false`, `featured_until timestamptz`, `featured_rank int`, `is_deal boolean default false`, `deal_ends_at timestamptz`.
- New table `shop_brands` (slug PK, name, logo_url, description, affiliate_disclosure) + RLS (public select, admin write) + GRANTs.
- New table `maintenance_reminders` (id, interval_km, interval_months, category_slug, label) + GRANTs.
- New table `shop_click_events` (id, product_id, user_id nullable, referrer, utm_source, utm_medium, utm_campaign, created_at) + GRANTs (insert: anon+authenticated, select: admin only).

**Server functions** (`src/lib/shop.functions.ts`)
- `listShopCategories()` returns nested tree with product counts.
- `listShopProducts` accepts `featuredFirst boolean`, `dealsOnly boolean`, `brandSlug string`.
- `getCategoryTree(slug)` for breadcrumbs.
- `recommendForVehicle({vehicleId})` server fn for the garage rail.
- `trackShopClick({productId, utm})` — already increments counter, also insert `shop_click_events`.

**UI**
- New `ShopSidebarFilters` component used on `/shop` and `/shop/$category`.
- New `CategoryTree` page + `BrandPage` route + `ShopBreadcrumbs` component.
- Admin: featured toggle + brand picker + deal fields in `ProductDialog`; new `/admin/shop/brands` and `/admin/shop/categories` editors.

## Out of Scope

- Bundles, comparison, price-drop alerts, automated newsletter, sponsored-ad billing flow, mobile redesign beyond reusing the existing drawer, changes to affiliate scraping logic.
