
# /parts overhaul — professional catalog + commerce-ready

## Benchmark takeaways

- **RockAuto** — persistent Year/Make/Model/Engine picker as the hero, then a rigid Category → Sub-category → Part tree. Dense results table with brand, price, condition, warranty, in stock.
- **NAPA** — clean brand-forward hero, prominent YMM selector, category tiles, "Store near me" pickup toggle, deals rail.
- **PartSouq** — VIN decoder is the primary entry; OEM exploded diagrams; part number, superseded numbers, applicable models.
- **PartsPro.ph** — PH-local trust cues (COD, GCash, warranty, ship nationwide), curated brand grid, category mega-menu, product cards with SKU + stock badge, cart/checkout.

## What /parts has today

- Hero + button cluster + "market availability" strip.
- 3 tabs (Find / Browse / Order OEM soon) plus an always-visible "Browse by category" banner and two partner rails stacked above the tabs.
- Wizard, OEM search, affiliate rows, partner product grid, used-parts browse grid — all rendered on one long page.

Problems: no single hero fitment selector; category tree hidden behind a link; no product-card commerce affordances (stock, brand, warranty, condition, ship-from); no VIN entry on the landing; PH trust cues missing; visual density looks like a dashboard, not a catalog.

## Goal

Convert /parts into a category-first, YMM/VIN-first storefront that reads as a real parts store and is structurally ready to plug in cart + checkout when we turn on D2C from outlets.

## Design directions

Before implementing, present 3 rendered directions (create_directions) built from a screenshot of the current /parts, with the palette/type/layout locked. Themes:

1. **Catalog Rigor** — RockAuto-style density, table-forward results, engineering feel.
2. **PH Storefront** — PartsPro.ph-style trust-rich retail, brand grid, deals rail, warm palette.
3. **VIN-First** — PartSouq-style VIN hero, exploded-diagram teaser, OEM number search prominent.

User picks one; we build it.

## Structural changes (regardless of direction)

### 1. New hero: unified fitment bar
Replace the current hero button cluster with a single sticky fitment bar containing three tabs:
- **By Vehicle** — Year / Make / Model / (Engine/Trim) selects, persisted in `sessionStorage` so it survives navigation across `/parts`, `/parts/c/:slug`, `/parts/search`, `/parts/p/:network/:sku`.
- **By VIN** — 17-char VIN input → routes to `/parts/search?vin=…` (already exists).
- **By Part Number** — OEM/SKU input → uses existing `OemSearch` handler.

### 2. Category mega-grid as the primary browse surface
Promote the 10 curated categories from `src/data/parts-categories.ts` into a proper card grid directly on `/parts` (icon + title + short + top-3 sub-keywords), instead of the single "Browse by category" banner. Keep the dedicated `/parts/categories` page but make it feel like a continuation.

### 3. Consolidate the three tabs
Drop the "Find (wizard) / Browse all / Order OEM" tab strip. Instead:
- Wizard becomes an optional "Guided finder" collapsible under the fitment bar.
- Browse-all used-parts grid moves into its own section labeled **Used & salvage parts (Banawe network)** further down.
- "Order OEM (Soon)" becomes a banner card, not a tab.

### 4. Upgrade product cards
Extend `PartnerProductsGrid` cards to show:
- Brand / partner logo, condition (New/OEM/Aftermarket/Used), price + strike-through if promo, stock badge, ship-from region, warranty text when known, and a compact fitment line ("Fits: 2015–2020 Toyota Vios").
- Wire a "Save" heart and an "Ask seller / Buy" primary action. Buy stays as affiliate redirect today; the same slot becomes Add-to-Cart when D2C launches (no additional refactor needed).

### 5. Deals + brand rails
Two horizontal scroll rails between hero and category grid:
- **Featured brands** (sourced from distinct `partner_products.brand` where non-null, capped 12).
- **Deals & new arrivals** (server fn ordering by `created_at` desc / discount if present).

### 6. PH trust strip
Small icon row below hero: COD available at select outlets · GCash accepted · Ships nationwide via Lalamove/J&T · 7-day return on defects · Verified partners. Wording only — no new backend behavior.

### 7. Sticky compare + recently viewed
- Track last 8 viewed `parts.p.$network.$sku` items in `localStorage`, render a "Recently viewed" rail near the bottom of `/parts` and category pages.
- Add "Compare" checkbox on product cards; when 2–4 selected, a floating bar links to a lightweight compare drawer (client-only, no schema).

### 8. SEO polish
- Add `ItemList` JSON-LD listing the 10 categories on `/parts`.
- Ensure each category page (`parts.c.$slug.tsx`) emits `BreadcrumbList` + `ItemList` of products.
- Add `Product` JSON-LD on `parts.p.$network.$sku.tsx` (many fields already known: name, image, price, availability).

### 9. Commerce readiness (structural only, no live checkout yet)
- Introduce a shared `PartCard` component so future cart wiring only touches one file.
- Add a `useCart()` stub hook + local-storage cart drawer, hidden behind an existing feature flag (e.g. `parts_cart_beta`). Add-to-cart buttons appear only when the flag is on; nothing changes for current users.

## Out of scope (do not touch this pass)

- Real checkout, payments, tax, shipping quotes.
- Partner-program business rules or fee changes → no `/terms` update needed.
- Any privacy/data-collection change → no `/privacy` update.
- Backend schema changes (all additions read existing tables).

## Technical notes

- All work stays in `src/routes/parts.tsx`, `src/routes/parts.categories.tsx`, `src/routes/parts.c.$slug.tsx`, `src/routes/parts.p.$network.$sku.tsx`, `src/components/parts/*`, plus a new `PartCard`, `FitmentBar`, `PhTrustStrip`, `BrandRail`, `RecentlyViewedRail`, and `useCart` stub.
- Reuse `browseUsedParts`, `getPartsForVehicle`, `listPartsCountries` server fns as-is; add one server fn `listFeaturedBrands` (SELECT DISTINCT brand… LIMIT 12) — pure read against `partner_products`.
- Fitment selection persisted to `sessionStorage` under key `365_parts_ymm` and read by all `/parts/*` pages on mount so vehicle context follows the user.
- Vehicle context in the URL as `?y=&mk=&md=` on category/search pages so links are shareable.

## Delivery order

1. Present 3 design directions built from a current /parts screenshot; user picks one.
2. Build the picked direction: fitment bar, category mega-grid, `PartCard`, PH trust strip, brand + deals rails.
3. Refactor `/parts/c/:slug` and product detail to use `PartCard` and the persistent fitment.
4. Add JSON-LD, recently-viewed, compare drawer.
5. Land `useCart` stub behind `parts_cart_beta` flag.
